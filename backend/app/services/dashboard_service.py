"""
Dashboard service – analytics, aggregation, and performance reporting from PostgreSQL.
"""
from __future__ import annotations

import logging
from datetime import date, datetime, timezone
from typing import Any, Dict

from sqlalchemy import func
from sqlalchemy.orm import Session

from app.models.application import Application, ApplicationStatus, PaymentStatus
from app.models.business import Business
from app.models.document import Document, VerificationStatus
from app.models.user import User
from app.schemas.admin import DashboardStats

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

