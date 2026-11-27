"""
Dashboard service – analytics, aggregation, and performance reporting from PostgreSQL.
"""
from __future__ import annotations

import logging
from datetime import date, datetime, timezone
from typing import Any, Dict

from sqlalchemy import func
from sqlalchemy.orm import Session

from app.models.application import Application, ApplicationStatus, PaymentStatus, OwnershipDetail
from app.models.business import Business
from app.models.document import Document, VerificationStatus
from app.models.user import User
from app.schemas.admin import (
    DashboardStats,
    ShareInventorySummary,
    ProjectShareInventory,
    PackageSoldStat,
)

logger = logging.getLogger(__name__)


class DashboardService:
    def __init__(self, db: Session):
        self.db = db

    def get_stats(self) -> DashboardStats:
        """Calculate live aggregated metrics directly from PostgreSQL."""
        today = date.today()
        first_of_month = today.replace(day=1)

        # 1. Total Customers: only count customers whose application has been APPROVED (or who have an allotted customer ID)
        approved_customer_ids = (
            self.db.query(Application.customer_id)
            .filter(Application.application_status == ApplicationStatus.APPROVED)
        )
        total_customers = (
            self.db.query(func.count(User.id))
            .filter(
                User.role == "customer",
                User.is_active == True,
                (User.customer_id_number != None) | (User.id.in_(approved_customer_ids)),
            )
            .scalar()
            or 0
        )

        # 1b. Total Registered Accounts (initial registered users before approval)
        total_registered_users = (
            self.db.query(func.count(User.id))
            .filter(User.role == "customer", User.is_active == True)
            .scalar()
            or 0
        )

        # 2. Total applications
        total_applications = self.db.query(func.count(Application.id)).scalar() or 0

        # 3. Applications by status
        status_rows = (
            self.db.query(Application.application_status, func.count(Application.id))
            .group_by(Application.application_status)
            .all()
        )
        applications_by_status: Dict[str, int] = {
            s.value: 0 for s in ApplicationStatus
        }
        for status_val, count in status_rows:
            key = status_val.value if hasattr(status_val, "value") else str(status_val)
            applications_by_status[key] = count

        # 4. Applications by business & business distribution
        biz_rows = (
            self.db.query(Business.id, Business.name, Business.code, func.count(Application.id))
            .join(Application, Application.business_id == Business.id, isouter=True)
            .group_by(Business.id, Business.name, Business.code)
            .all()
        )
        applications_by_business = {name: count for _, name, _, count in biz_rows}
        business_distribution = [
            {
                "business_id": str(bid),
                "business_name": bname,
                "business_code": bcode or "",
                "count": count,
            }
            for bid, bname, bcode, count in biz_rows
        ]

        # 5. Pending, Approved, Rejected, Returned (Correction Required)
        pending_statuses = [
            ApplicationStatus.SUBMITTED,
            ApplicationStatus.UNDER_REVIEW,
            ApplicationStatus.DOCUMENTS_REQUIRED,
        ]
        pending_applications = sum(
            applications_by_status.get(s.value, 0) for s in pending_statuses
        )
        returned_applications = applications_by_status.get(
            ApplicationStatus.CORRECTION_REQUIRED.value, 0
        )
        approved_applications = applications_by_status.get(
            ApplicationStatus.APPROVED.value, 0
        )
        rejected_applications = applications_by_status.get(
            ApplicationStatus.REJECTED.value, 0
        )

        # 6. Today's applications
        today_applications = (
            self.db.query(func.count(Application.id))
            .filter(Application.application_date == today)
            .scalar()
            or 0
        )

        # 7. This month's applications
        this_month_applications = (
            self.db.query(func.count(Application.id))
            .filter(
                Application.application_date >= first_of_month,
                Application.application_date <= today,
            )
            .scalar()
            or 0
        )

        # 8. Share inventory (sold / approved vs quota by project and package)
        share_inventory = self.calculate_share_inventory()

        return DashboardStats(
            total_customers=total_customers,
            total_registered_users=total_registered_users,
            total_applications=total_applications,
            applications_by_status=applications_by_status,
            applications_by_business=applications_by_business,
            pending_applications=pending_applications,
            approved_applications=approved_applications,
            rejected_applications=rejected_applications,
            returned_applications=returned_applications,
            today_applications=today_applications,
            this_month_applications=this_month_applications,
            business_distribution=business_distribution,
            share_inventory=share_inventory,
        )

    def calculate_share_inventory(self) -> ShareInventorySummary:
        """
        Calculate total sold/approved shares, pending pipeline shares,
        and project & package wise share counts without artificial capacity limits.
        """
        STANDARD_PACKAGES = ["Bronze", "Silver", "Gold", "Platinum"]
        businesses = self.db.query(Business).filter(Business.is_active == True).order_by(Business.id).all()

        # 1. Query approved shares grouped by business_id and package
        approved_rows = (
            self.db.query(
                Application.business_id,
                OwnershipDetail.package,
                func.sum(func.coalesce(OwnershipDetail.number_of_ownership, 1)),
            )
            .join(OwnershipDetail, Application.id == OwnershipDetail.application_id)
            .filter(Application.application_status == ApplicationStatus.APPROVED)
            .group_by(Application.business_id, OwnershipDetail.package)
            .all()
        )

        # 2. Query pending shares grouped by business_id and package
        pending_statuses = [
            ApplicationStatus.SUBMITTED,
            ApplicationStatus.UNDER_REVIEW,
            ApplicationStatus.DOCUMENTS_REQUIRED,
        ]
        pending_rows = (
            self.db.query(
                Application.business_id,
                OwnershipDetail.package,
                func.sum(func.coalesce(OwnershipDetail.number_of_ownership, 1)),
            )
            .join(OwnershipDetail, Application.id == OwnershipDetail.application_id)
            .filter(Application.application_status.in_(pending_statuses))
            .group_by(Application.business_id, OwnershipDetail.package)
            .all()
        )

        approved_map: dict[tuple[int, str], int] = {}
        for bid, pkg, count in approved_rows:
            if bid and pkg:
                approved_map[(bid, pkg.strip().capitalize())] = int(count or 0)

        pending_map: dict[tuple[int, str], int] = {}
        for bid, pkg, count in pending_rows:
            if bid and pkg:
                pending_map[(bid, pkg.strip().capitalize())] = int(count or 0)

        # Identify Super Combo business (SPC - 4-in-1 asset bundle)
        spc_biz = next((b for b in businesses if (b.code or "").upper().strip() == "SPC"), None)
        spc_approved_by_pkg: dict[str, int] = {}
        spc_pending_by_pkg: dict[str, int] = {}
        if spc_biz:
            for pkg_name in STANDARD_PACKAGES:
                spc_approved_by_pkg[pkg_name] = approved_map.get((spc_biz.id, pkg_name), 0)
                spc_pending_by_pkg[pkg_name] = pending_map.get((spc_biz.id, pkg_name), 0)

        spc_total_sold = sum(spc_approved_by_pkg.values())
        spc_total_pending = sum(spc_pending_by_pkg.values())

        project_inventories: list[ProjectShareInventory] = []
        total_direct_sold = 0
        total_direct_pending = 0

        for biz in businesses:
            code = (biz.code or "").upper().strip()
            is_combo = (code == "SPC")
            biz_sold = 0
            biz_pending = 0
            biz_direct_sold = 0
            biz_combo_sold = 0
            biz_direct_pending = 0
            biz_combo_pending = 0
            pkg_items: list[PackageSoldStat] = []

            for pkg_name in STANDARD_PACKAGES:
                direct_sold = approved_map.get((biz.id, pkg_name), 0)
                direct_pend = pending_map.get((biz.id, pkg_name), 0)

                if is_combo:
                    # SPC itself represents the 4-in-1 combo packages sold directly
                    combo_sold = 0
                    combo_pend = 0
                    pkg_sold = direct_sold
                    pkg_pend = direct_pend
                else:
                    # Core physical projects receive their direct sales + 1:1 allocated shares from Super Combo
                    combo_sold = spc_approved_by_pkg.get(pkg_name, 0)
                    combo_pend = spc_pending_by_pkg.get(pkg_name, 0)
                    pkg_sold = direct_sold + combo_sold
                    pkg_pend = direct_pend + combo_pend

                pkg_items.append(
                    PackageSoldStat(
                        package_name=pkg_name,
                        shares_sold=pkg_sold,
                        direct_shares_sold=direct_sold,
                        combo_shares_sold=combo_sold,
                        shares_pending=pkg_pend,
                        direct_shares_pending=direct_pend,
                        combo_shares_pending=combo_pend,
                    )
                )

                biz_sold += pkg_sold
                biz_pending += pkg_pend
                biz_direct_sold += direct_sold
                biz_combo_sold += combo_sold
                biz_direct_pending += direct_pend
                biz_combo_pending += combo_pend

            if not is_combo:
                total_direct_sold += biz_direct_sold
                total_direct_pending += biz_direct_pending

            project_inventories.append(
                ProjectShareInventory(
                    business_id=biz.id,
                    business_name=biz.name,
                    business_code=biz.code or "",
                    shares_sold=biz_sold,
                    direct_shares_sold=biz_direct_sold,
                    combo_shares_sold=biz_combo_sold,
                    shares_pending=biz_pending,
                    direct_shares_pending=biz_direct_pending,
                    combo_shares_pending=biz_combo_pending,
                    is_combo_engine=is_combo,
                    packages=pkg_items,
                )
            )

        # Total sold across all 3 physical projects
        physical_projects = [p for p in project_inventories if not p.is_combo_engine]
        overall_shares_sold = sum(p.shares_sold for p in physical_projects) if physical_projects else total_direct_sold
        overall_shares_pending = sum(p.shares_pending for p in physical_projects) if physical_projects else total_direct_pending

        return ShareInventorySummary(
            total_shares_sold=overall_shares_sold,
            total_shares_pending=overall_shares_pending,
            total_direct_sold=total_direct_sold,
            total_combo_sold=spc_total_sold,
            projects=project_inventories,
        )

    def get_cr_performance(self) -> list[dict[str, Any]]:
        """List metrics per CR team member."""
        cr_users = (
            self.db.query(User)
            .filter(User.role == "cr", User.is_active == True)
            .all()
        )
        report = []
        for cr in cr_users:
            assigned = (
                self.db.query(func.count(Application.id))
                .filter(Application.assigned_cr_id == cr.id)
                .scalar()
                or 0
            )
            approved = (
                self.db.query(func.count(Application.id))
                .filter(
                    Application.assigned_cr_id == cr.id,
                    Application.application_status == ApplicationStatus.APPROVED,
                )
                .scalar()
                or 0
            )
            rejected = (
                self.db.query(func.count(Application.id))
                .filter(
                    Application.assigned_cr_id == cr.id,
                    Application.application_status == ApplicationStatus.REJECTED,
                )
                .scalar()
                or 0
            )
            pending = (
                self.db.query(func.count(Application.id))
                .filter(
                    Application.assigned_cr_id == cr.id,
                    Application.application_status.in_([
                        ApplicationStatus.SUBMITTED,
                        ApplicationStatus.UNDER_REVIEW,
                        ApplicationStatus.DOCUMENTS_REQUIRED,
                        ApplicationStatus.CORRECTION_REQUIRED,
                    ]),
                )
                .scalar()
                or 0
            )

            report.append({
                "cr_id": cr.id,
                "cr_name": cr.full_name,
                "mobile": cr.mobile,
                "email": cr.email,
                "total_assigned": assigned,
                "pending": pending,
                "approved": approved,
                "rejected": rejected,
            })
        return report

    def get_document_verification_stats(self) -> dict[str, int]:
        """Document verification count breakdown."""
        counts = {
            VerificationStatus.PENDING.value: 0,
            VerificationStatus.VERIFIED.value: 0,
            VerificationStatus.REJECTED.value: 0,
        }
        rows = (
            self.db.query(Document.verification_status, func.count(Document.id))
            .group_by(Document.verification_status)
            .all()
        )
        for status_val, count in rows:
            key = status_val.value if hasattr(status_val, "value") else str(status_val)
            counts[key] = count
        return counts

