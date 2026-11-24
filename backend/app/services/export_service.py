"""
Export service – high-performance, professionally styled CSV and Excel (XLSX) exports.
Uses pandas and openpyxl with automatic column autosizing, frozen headers, and sensitive field masking.
"""
from __future__ import annotations

import csv
import io
import logging
from datetime import date, datetime
from decimal import Decimal
from typing import Any, List, Optional

import openpyxl
from openpyxl.styles import Alignment, Border, Font, PatternFill, Side
from openpyxl.utils import get_column_letter
from sqlalchemy import or_
from sqlalchemy.orm import Session, joinedload

from app.core.exceptions import AuthorizationError
from app.models.application import (
    ApplicantInfo,
    Application,
    BankDetail,
    Nominee,
    OwnershipDetail,
    PaymentDetail,
)
from app.models.business import Business
from app.models.customer import CustomerProfile
from app.models.user import User
from app.schemas.export import ExportFilters
from app.services.audit_service import AuditService

logger = logging.getLogger(__name__)

# Colors for Excel header styling
HEADER_FILL_COLOR = "1F497D"  # Sunset Navy Blue
HEADER_FONT_COLOR = "FFFFFF"  # White
ZEBRA_FILL_COLOR = "F2F5F9"   # Subtle light blue-gray


class ExportService:
    def __init__(self, db: Session):
        self.db = db
        self._audit = AuditService(db)

    # -------------------------------------------------------------------------
    # Query building with role-based filtering
    # -------------------------------------------------------------------------
    def _build_application_query(self, filters: ExportFilters, user: User):
        query = (
            self.db.query(Application)
            .options(
                joinedload(Application.applicant_info),
                joinedload(Application.business),
                joinedload(Application.customer),
                joinedload(Application.assigned_cr),
                joinedload(Application.bank_detail),
                joinedload(Application.ownership_detail),
                joinedload(Application.payment_detail),
            )
        )

        # Role restrictions
        if user.role == "customer":
            query = query.filter(Application.customer_id == user.id)
        elif user.role == "cr":
            # CR can view assigned applications or applications in general per business rules
            pass

        # Filter criteria
        if filters.business_id:
            query = query.filter(Application.business_id == filters.business_id)
        if filters.application_status:
            query = query.filter(Application.application_status == filters.application_status)
        if filters.payment_status:
            query = query.filter(Application.payment_status == filters.payment_status)
        if filters.assigned_cr_id:
            query = query.filter(Application.assigned_cr_id == filters.assigned_cr_id)
        if filters.date_from:
            query = query.filter(Application.application_date >= filters.date_from)
        if filters.date_to:
            query = query.filter(Application.application_date <= filters.date_to)

        if filters.search:
            s = f"%{filters.search}%"
            query = query.join(Application.applicant_info).filter(
                or_(
                    Application.application_number.ilike(s),
                    ApplicantInfo.full_name_en.ilike(s),
                    ApplicantInfo.mobile_number.ilike(s),
                    ApplicantInfo.nid_number.ilike(s),
                )
            )

        return query.order_by(Application.id.desc())

    # -------------------------------------------------------------------------
    # Applications Export - CSV
    # -------------------------------------------------------------------------
    def export_applications_csv(self, filters: ExportFilters, user: User) -> bytes:
        if user.role not in ("admin", "subadmin", "cr"):
            raise AuthorizationError("Only CR team and Admins can export application data")

        apps = self._build_application_query(filters, user).all()
        records = [self._application_to_dict(a, is_admin=(user.role in ("admin", "subadmin"))) for a in apps]

        output = io.StringIO()
        if records:
            writer = csv.DictWriter(output, fieldnames=list(records[0].keys()))
            writer.writeheader()
            writer.writerows(records)

        self._audit.log(
            user_id=user.id,
            action="export.applications_csv",
            entity_type="export",
            metadata={"record_count": len(apps)},
        )
        self.db.commit()

        return output.getvalue().encode("utf-8-sig")

    # -------------------------------------------------------------------------
    # Applications Export - Excel (XLSX)
    # -------------------------------------------------------------------------
    def export_applications_xlsx(self, filters: ExportFilters, user: User) -> bytes:
        if user.role not in ("admin", "subadmin", "cr"):
            raise AuthorizationError("Only CR team and Admins can export application data")

        apps = self._build_application_query(filters, user).all()
        records = [self._application_to_dict(a, is_admin=(user.role in ("admin", "subadmin"))) for a in apps]

        wb = openpyxl.Workbook()
        ws = wb.active
        ws.title = "Applications"

        if not records:
            ws.append(["No records found matching criteria"])
            buf = io.BytesIO()
            wb.save(buf)
            return buf.getvalue()

        headers = list(records[0].keys())
        ws.append(headers)

        for row in records:
            ws.append(list(row.values()))

        self._style_worksheet(ws, headers)

        buf = io.BytesIO()
        wb.save(buf)

        self._audit.log(
            user_id=user.id,
            action="export.applications_xlsx",
            entity_type="export",
            metadata={"record_count": len(apps)},
        )
        self.db.commit()

        return buf.getvalue()

    # -------------------------------------------------------------------------
    # Customers Export - Excel (XLSX)
    # -------------------------------------------------------------------------
    def export_customers_xlsx(self, filters: ExportFilters, user: User) -> bytes:
        if user.role not in ("admin", "subadmin"):
            raise AuthorizationError("Only Administrators can export full customer directories")

        query = self.db.query(User).filter(User.role == "customer")
        if filters.search:
            s = f"%{filters.search}%"
            query = query.filter(or_(User.full_name.ilike(s), User.mobile.ilike(s), User.email.ilike(s)))

        customers = query.order_by(User.id.desc()).all()

        wb = openpyxl.Workbook()
        ws = wb.active
        ws.title = "Customers"

        headers = [
            "Customer ID",
            "Full Name",
            "Mobile",
            "Email",
            "Status",
            "Verified",
            "Registered Date",
            "District",
            "Division",
            "Address",
        ]
        ws.append(headers)

        for c in customers:
            profile: Optional[CustomerProfile] = c.customer_profile
            ws.append([
                c.id,
                c.full_name,
                c.mobile,
                c.email or "N/A",
                "Active" if c.is_active else "Inactive",
                "Yes" if c.is_verified else "No",
                c.created_at.strftime("%Y-%m-%d %H:%M") if c.created_at else "",
                profile.district if profile else "N/A",
                profile.division if profile else "N/A",
                profile.address if profile else "N/A",
            ])

        self._style_worksheet(ws, headers)

        buf = io.BytesIO()
        wb.save(buf)

        self._audit.log(
            user_id=user.id,
            action="export.customers_xlsx",
            entity_type="export",
            metadata={"record_count": len(customers)},
        )
        self.db.commit()

        return buf.getvalue()

    # -------------------------------------------------------------------------
    # Payments Export - Excel (XLSX)
    # -------------------------------------------------------------------------
    def export_payments_xlsx(self, filters: ExportFilters, user: User) -> bytes:
        if user.role not in ("admin", "subadmin"):
            raise AuthorizationError("Only Administrators can export payment ledgers")

        apps = self._build_application_query(filters, user).all()

        wb = openpyxl.Workbook()
        ws = wb.active
        ws.title = "Payment Ledger"

        headers = [
            "Application Number",
            "Business",
            "Applicant Name",
            "Mobile",
            "Payment Status",
            "Package",
            "Ownership Count",
            "Total Price (BDT)",
            "Token Money (BDT)",
            "Booking Money (BDT)",
            "Booking Date",
            "Installment Type",
            "Installments",
            "Installment Amount (BDT)",
            "Dues Amount (BDT)",
        ]
        ws.append(headers)

        total_price_sum = Decimal("0")
        dues_sum = Decimal("0")

        for a in apps:
            info = a.applicant_info
            own = a.ownership_detail
            pay = a.payment_detail
            biz = a.business

            total_p = own.total_price if (own and own.total_price is not None) else Decimal("0")
            dues = pay.dues_amount if (pay and pay.dues_amount is not None) else Decimal("0")
            total_price_sum += total_p
            dues_sum += dues

            ws.append([
                a.application_number,
                biz.name if biz else "N/A",
                info.full_name_en if info else "N/A",
                info.mobile_number if info else (a.customer.mobile if a.customer else "N/A"),
                a.payment_status.value.upper(),
                own.package if own else "N/A",
                own.number_of_ownership if own else 0,
                float(total_p),
                float(pay.token_money) if (pay and pay.token_money) else 0.0,
                float(pay.booking_money) if (pay and pay.booking_money) else 0.0,
                str(pay.booking_money_date) if (pay and pay.booking_money_date) else "N/A",
                pay.installment_type if pay else "N/A",
                pay.number_of_installments if pay else 0,
                float(pay.installment_amount) if (pay and pay.installment_amount) else 0.0,
                float(dues),
            ])

        # Append totals row
        ws.append([
            "TOTALS",
            "",
            "",
            "",
            "",
            "",
            "",
            float(total_price_sum),
            "",
            "",
            "",
            "",
            "",
            "",
            float(dues_sum),
        ])

        self._style_worksheet(ws, headers, has_totals=True)

        buf = io.BytesIO()
        wb.save(buf)
        return buf.getvalue()

    # -------------------------------------------------------------------------
    # CR Performance Export - Excel (XLSX)
    # -------------------------------------------------------------------------
    def export_cr_performance_xlsx(self, filters: ExportFilters, user: User) -> bytes:
        if user.role not in ("admin", "subadmin"):
            raise AuthorizationError("Only Administrators can export team performance reports")

        from app.services.dashboard_service import DashboardService
        dash = DashboardService(self.db)
        metrics = dash.get_cr_performance()

        wb = openpyxl.Workbook()
        ws = wb.active
        ws.title = "CR Performance"

        headers = [
            "CR ID",
            "CR Officer Name",
            "Mobile",
            "Email",
            "Total Assigned",
            "Pending Review",
            "Approved",
            "Rejected",
        ]
        ws.append(headers)

        for m in metrics:
            ws.append([
                m["cr_id"],
                m["cr_name"],
                m["mobile"],
                m["email"] or "N/A",
                m["total_assigned"],
                m["pending"],
                m["approved"],
                m["rejected"],
            ])

        self._style_worksheet(ws, headers)

        buf = io.BytesIO()
        wb.save(buf)
        return buf.getvalue()

    # -------------------------------------------------------------------------
    # Helper: Convert Application to Dict with role-based masking
    # -------------------------------------------------------------------------
    def _application_to_dict(self, app: Application, is_admin: bool) -> dict[str, Any]:
        info = app.applicant_info
        own = app.ownership_detail
        pay = app.payment_detail
        bank = app.bank_detail
        biz = app.business
        cr = app.assigned_cr

        nid_val = info.nid_number if info else ""
        if not is_admin and nid_val:
            # Mask middle characters for non-admins
            nid_val = nid_val[:3] + "******" + nid_val[-2:] if len(nid_val) > 5 else "******"

        tin_val = info.tin_number if info else ""
        if not is_admin and tin_val:
            tin_val = "******"

        acc_num = bank.account_number if bank else ""
        if not is_admin and acc_num:
            acc_num = "******" + acc_num[-4:] if len(acc_num) > 4 else "******"

        return {
            "Application Number": app.application_number,
            "Business Division": biz.name if biz else "N/A",
            "Application Date": str(app.application_date),
            "Application Status": app.application_status.value.upper(),
            "Payment Status": app.payment_status.value.upper(),
            "Assigned CR": cr.full_name if cr else "Unassigned",
            "Applicant Name (EN)": info.full_name_en if info else "",
            "Applicant Name (BN)": info.full_name_bn if info else "",
            "Mobile": info.mobile_number if info else (app.customer.mobile if app.customer else ""),
            "Email": info.personal_email if info else "",
            "NID / Passport": nid_val,
            "TIN": tin_val,
            "Date of Birth": str(info.date_of_birth) if (info and info.date_of_birth) else "",
            "Nationality": info.nationality if info else "",
            "Company": info.company_name if info else "",
            "Designation": info.designation if info else "",
            "Package": own.package if own else "",
            "Number of Ownership": own.number_of_ownership if own else 0,
            "Total Price": float(own.total_price) if (own and own.total_price) else 0.0,
            "Booking Money": float(pay.booking_money) if (pay and pay.booking_money) else 0.0,
            "Dues Amount": float(pay.dues_amount) if (pay and pay.dues_amount) else 0.0,
            "Bank Name": bank.bank_name if bank else "",
            "Account Number": acc_num,
            "Created At": app.created_at.strftime("%Y-%m-%d %H:%M") if app.created_at else "",
        }

    # -------------------------------------------------------------------------
    # Helper: Apply corporate styling to openpyxl worksheet
    # -------------------------------------------------------------------------
    def _style_worksheet(
        self,
        ws: openpyxl.worksheet.worksheet.Worksheet,
        headers: List[str],
        has_totals: bool = False,
    ) -> None:
        # Header formatting
        header_font = Font(name="Calibri", size=11, bold=True, color=HEADER_FONT_COLOR)
        header_fill = PatternFill(
            start_color=HEADER_FILL_COLOR, end_color=HEADER_FILL_COLOR, fill_type="solid"
        )
        thin_border = Border(
            left=Side(style="thin", color="D3D3D3"),
            right=Side(style="thin", color="D3D3D3"),
            top=Side(style="thin", color="D3D3D3"),
            bottom=Side(style="thin", color="D3D3D3"),
        )
        header_align = Alignment(horizontal="center", vertical="center", wrap_text=True)

        for col_num in range(1, len(headers) + 1):
            cell = ws.cell(row=1, column=col_num)
            cell.font = header_font
            cell.fill = header_fill
            cell.alignment = header_align
            cell.border = thin_border

        ws.row_dimensions[1].height = 28
        ws.freeze_panes = "A2"
        ws.auto_filter.ref = ws.dimensions

        # Data rows formatting
        zebra_fill = PatternFill(
            start_color=ZEBRA_FILL_COLOR, end_color=ZEBRA_FILL_COLOR, fill_type="solid"
        )
        regular_font = Font(name="Calibri", size=10)

        max_row = ws.max_row
        for row_idx in range(2, max_row + 1):
            is_zebra = (row_idx % 2 == 0)
            is_totals_row = (has_totals and row_idx == max_row)

            for col_idx in range(1, len(headers) + 1):
                cell = ws.cell(row=row_idx, column=col_idx)
                cell.border = thin_border

                if is_totals_row:
                    cell.font = Font(name="Calibri", size=11, bold=True)
                    cell.fill = PatternFill(
                        start_color="D9E1F2", end_color="D9E1F2", fill_type="solid"
                    )
                else:
                    cell.font = regular_font
                    if is_zebra:
                        cell.fill = zebra_fill

                # Format numbers / currency
                if isinstance(cell.value, float):
                    cell.number_format = "#,##0.00"
                    cell.alignment = Alignment(horizontal="right")

        # Auto-adjust column widths
        for col in ws.columns:
            max_len = 0
            col_letter = get_column_letter(col[0].column)
            for cell in col:
                val = str(cell.value or "")
                if len(val) > max_len:
                    max_len = len(val)
            ws.column_dimensions[col_letter].width = max(max_len + 3, 12)

