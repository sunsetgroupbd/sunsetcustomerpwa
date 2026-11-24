"""
Application service – create, query, update, submit, assign, and transition applications.
"""
from __future__ import annotations

import logging
from datetime import datetime, timezone
from typing import Any, Optional, Tuple

from sqlalchemy import func, or_
from sqlalchemy.orm import Session, joinedload

from app.core.exceptions import (
    AuthorizationError,
    InvalidStatusTransitionError,
    NotFoundError,
    ValidationError,
)
from app.models.application import (
    ApplicantInfo,
    Application,
    ApplicationEditRequest,
    ApplicationRemark,
    ApplicationStatus,
    ApplicationStatusHistory,
    BankDetail,
    CRAssignment,
    EditRequestStatus,
    Nominee,
    OwnershipDetail,
    PaymentDetail,
    PaymentStatus,
)
from app.models.business import Business
from app.models.user import User
from app.schemas.application import (
    ApplicationCreate,
    ApplicationOnBehalfCreate,
    ApplicationUpdate,
    StatusUpdateRequest,
    parse_optional_date,
)
from app.services.audit_service import AuditService
from app.services.in_app_notification_service import InAppNotificationService

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Valid status-transition map
# ---------------------------------------------------------------------------
VALID_TRANSITIONS: dict[str, list[str]] = {
    "draft": ["submitted", "cancelled"],
    "submitted": ["under_review", "approved", "correction_required", "documents_required", "rejected", "cancelled"],
    "under_review": ["documents_required", "correction_required", "approved", "rejected", "cancelled"],
    "documents_required": ["under_review", "submitted", "cancelled"],
    "correction_required": ["submitted", "cancelled"],
    "approved": ["approved"],
    "rejected": ["under_review", "rejected"],
    "cancelled": [],
}

# Roles permitted to trigger each target transition
TRANSITION_PERMISSIONS: dict[str, list[str]] = {
    "submitted": ["customer", "cr", "admin"],
    "cancelled": ["customer", "cr", "admin"],
    "under_review": ["cr", "admin"],
    "documents_required": ["cr", "admin"],
    "correction_required": ["cr", "admin"],
    "approved": ["admin"],
    "rejected": ["admin", "cr"],
}


def _filter_columns(model_cls: Any, data_dict: dict) -> dict:
    """Filter dictionary to only include columns that exist in the SQLAlchemy model table."""
    valid_cols = {c.name for c in model_cls.__table__.columns}
    return {k: v for k, v in data_dict.items() if k in valid_cols}


def _sanitize_applicant_info(data: Any) -> dict:
    d = data.model_dump(exclude_unset=True) if hasattr(data, "model_dump") else dict(data or {})
    if d.get("nid_or_passport") and not d.get("nid_number"):
        d["nid_number"] = d["nid_or_passport"]
    if d.get("mobile_number") and not d.get("cell_number"):
        d["cell_number"] = d["mobile_number"]
    return _filter_columns(ApplicantInfo, d)


def _sanitize_bank_detail(data: Any) -> dict:
    d = data.model_dump(exclude_unset=True) if hasattr(data, "model_dump") else dict(data or {})
    if d.get("branch_name") and not d.get("branch"):
        d["branch"] = d["branch_name"]
    return _filter_columns(BankDetail, d)


def _sanitize_ownership_detail(data: Any) -> dict:
    d = data.model_dump(exclude_unset=True) if hasattr(data, "model_dump") else dict(data or {})
    if d.get("package_type") and not d.get("package"):
        d["package"] = d["package_type"]
    if d.get("discount_amount") is not None and not d.get("discount"):
        d["discount"] = d["discount_amount"]
    return _filter_columns(OwnershipDetail, d)


def _sanitize_payment_detail(data: Any) -> dict:
    d = data.model_dump(exclude_unset=True) if hasattr(data, "model_dump") else dict(data or {})
    if d.get("booking_date") and not d.get("booking_money_date"):
        d["booking_money_date"] = d["booking_date"]
    if d.get("installment_start_date") and not d.get("installment_starting_date"):
        d["installment_starting_date"] = d["installment_start_date"]
    return _filter_columns(PaymentDetail, d)


class ApplicationService:
    def __init__(self, db: Session):
        self.db = db
        self._audit = AuditService(db)

    # -------------------------------------------------------------------------
    # Create Application
    # -------------------------------------------------------------------------
    async def create_application(
        self,
        customer_id: int,
        business_id: int,
        data: ApplicationCreate,
    ) -> Application:
        """Create a new application in DRAFT status with optional sub-models."""
        # 1. Business check
        business = self.db.query(Business).filter(Business.id == business_id).first()
        if not business:
            raise NotFoundError("Business division not found.")
        if not business.is_active:
            raise ValidationError("Selected business division is currently inactive.")

        # 2. Generate unique application number (e.g. SKH-2024-00001)
        seq = await self._get_next_sequence(business_id)
        year = datetime.now(timezone.utc).year
        app_number = f"{business.code}-{year}-{seq:05d}"

        # 3. Create Application record
        application = Application(
            application_number=app_number,
            customer_id=customer_id,
            business_id=business_id,
            application_date=datetime.now(timezone.utc).date(),
            application_status=ApplicationStatus.DRAFT,
            payment_status=PaymentStatus.PENDING,
            declaration_accepted=bool(getattr(data, "declaration_accepted", False)),
        )
        self.db.add(application)
        self.db.flush()

        # 4. Attach nested models if provided
        if data.applicant_info:
            info = ApplicantInfo(
                application_id=application.id,
                **_sanitize_applicant_info(data.applicant_info),
            )
            self.db.add(info)

        if data.bank_detail:
            bd = BankDetail(
                application_id=application.id,
                **_sanitize_bank_detail(data.bank_detail),
            )
            self.db.add(bd)

        if data.ownership_detail:
            od = OwnershipDetail(
                application_id=application.id,
                **_sanitize_ownership_detail(data.ownership_detail),
            )
            self.db.add(od)

        if data.payment_detail:
            pd = PaymentDetail(
                application_id=application.id,
                **_sanitize_payment_detail(data.payment_detail),
            )
            self.db.add(pd)

        if getattr(data, "nominees", None):
            for idx, nom in enumerate(data.nominees, 1):
                nom_dict = nom if isinstance(nom, dict) else (nom.model_dump() if hasattr(nom, "model_dump") else getattr(nom, "__dict__", {}))
                name_val = nom_dict.get("name") or nom_dict.get("full_name") or ""
                rel_val = nom_dict.get("relationship") or nom_dict.get("relation") or ""
                nid_val = nom_dict.get("nid_or_passport") or nom_dict.get("nid_number") or None
                cell_val = nom_dict.get("cell_number") or nom_dict.get("mobile_number") or None
                dob_val = parse_optional_date(nom_dict.get("date_of_birth"))
                if name_val or rel_val:
                    new_nom = Nominee(
                        application_id=application.id,
                        nominee_number=idx,
                        name=name_val,
                        relationship=rel_val,
                        father_or_husband_name=nom_dict.get("father_or_husband_name"),
                        nid_or_passport=nid_val,
                        cell_number=cell_val,
                        date_of_birth=dob_val,
                    )
                    self.db.add(new_nom)

        # 5. Record initial status history
        self._record_history(
            application.id,
            None,
            ApplicationStatus.DRAFT,
            customer_id,
            "Application created as draft.",
        )

        # 6. Audit log
        self._audit.log(
            user_id=customer_id,
            action="application.created",
            entity_type="application",
            entity_id=str(application.id),
            metadata={"application_number": app_number, "business_id": business_id},
        )

        self.db.commit()
        self.db.refresh(application)
        return application

    # -------------------------------------------------------------------------
    # Create Application on Behalf (Sales Executive / Admin / CR)
    # -------------------------------------------------------------------------
    async def create_on_behalf(
        self,
        creator_user: User,
        data: ApplicationOnBehalfCreate,
    ) -> Application:
        """
        Sales Executive, CR Officer, or Admin registers a customer profile and creates
        an application on their behalf. If customer does not exist, an account is auto-created.
        """
        from app.models.user import User, UserRole
        from app.models.customer import CustomerProfile
        from app.core.security import get_password_hash

        phone = data.customer_phone.strip()
        name = data.customer_name.strip()

        # 1. Prevent duplicate customer registration with the same mobile number
        existing_user = self.db.query(User).filter(User.mobile == phone).first()
        if existing_user:
            existing_app = (
                self.db.query(Application)
                .filter(Application.customer_id == existing_user.id)
                .order_by(Application.created_at.desc())
                .first()
            )
            app_info = f" (Application: {existing_app.application_number})" if existing_app else ""
            raise ValidationError(
                f"Customer with mobile number '{phone}' is already registered{app_info}. Multiple registrations with the same mobile number are not allowed."
            )

        existing_applicant = (
            self.db.query(ApplicantInfo)
            .filter(ApplicantInfo.mobile_number == phone)
            .first()
        )
        if existing_applicant:
            existing_app = self.db.query(Application).filter(Application.id == existing_applicant.application_id).first()
            app_info = f" (Application: {existing_app.application_number})" if existing_app else ""
            raise ValidationError(
                f"Customer with mobile number '{phone}' is already registered{app_info}. Multiple registrations with the same mobile number are not allowed."
            )

        temp_pwd = data.temporary_password or "Sunset@123"
        customer = User(
            full_name=name,
            mobile=phone,
            email=data.customer_email.strip().lower() if data.customer_email else None,
            password_hash=get_password_hash(temp_pwd),
            role=UserRole.customer,
            is_active=True,
            is_verified=True,
        )
        self.db.add(customer)
        self.db.flush()

        profile = CustomerProfile(user_id=customer.id)
        self.db.add(profile)
        self.db.flush()

        # 2. Business division
        biz_lookup = data.business_id
        if isinstance(biz_lookup, int):
            business = self.db.query(Business).filter(Business.id == biz_lookup).first()
        else:
            business = self.db.query(Business).filter(
                (Business.code == str(biz_lookup).strip().upper()) |
                (Business.name == str(biz_lookup).strip())
            ).first()
            if not business and str(biz_lookup).strip().isdigit():
                business = self.db.query(Business).filter(Business.id == int(str(biz_lookup).strip())).first()

        if not business:
            raise NotFoundError("Business division not found.")
        if not business.is_active:
            raise ValidationError("Selected business division is currently inactive.")

        # 3. Unique application number
        seq = await self._get_next_sequence(business.id)
        year = datetime.now(timezone.utc).year
        app_number = f"{business.code}-{year}-{seq:05d}"

        # 4. Create application
        is_sales = creator_user.role == UserRole.sales if hasattr(UserRole, "sales") else str(creator_user.role) == "sales"
        application = Application(
            application_number=app_number,
            customer_id=customer.id,
            business_id=business.id,
            sales_agent_id=creator_user.id if is_sales else None,
            application_date=datetime.now(timezone.utc).date(),
            application_status=ApplicationStatus.DRAFT,
            payment_status=PaymentStatus.PENDING,
            declaration_accepted=False,
            is_edit_unlocked=True,
            submitted_at=None,
        )
        self.db.add(application)
        self.db.flush()

        # 5. Populate initial ApplicantInfo
        applicant_info = ApplicantInfo(
            application_id=application.id,
            full_name_en=name,
            mobile_number=phone,
        )
        self.db.add(applicant_info)

        # 6. Populate OwnershipDetail if provided
        if data.package_type or data.number_of_shares:
            ownership_detail = OwnershipDetail(
                application_id=application.id,
                package=data.package_type or "Standard Ownership",
                number_of_ownership=data.number_of_shares or 1,
                total_price=data.total_amount,
            )
            self.db.add(ownership_detail)

        # 7. Add history
        role_label = creator_user.role.value if hasattr(creator_user.role, "value") else str(creator_user.role)
        self._record_history(
            application.id,
            None,
            ApplicationStatus.DRAFT,
            creator_user.id,
            f"Client registered by {role_label.capitalize()} ({creator_user.full_name}) as draft for CR completion.",
        )

        self._audit.log(
            user_id=creator_user.id,
            action="application.registered_on_behalf",
            entity_type="application",
            entity_id=str(application.id),
            metadata={
                "customer_phone": phone,
                "customer_name": name,
                "business_code": business.code,
                "registered_by_role": role_label,
            },
        )

        self.db.commit()
        self.db.refresh(application)
        return application

    # -------------------------------------------------------------------------
    # Get Application
    # -------------------------------------------------------------------------
    async def get_application(self, application_id: int | str, user: User) -> Application:
        """Fetch application with all related models and role-based access validation.
        Accepts integer application ID or string application_number (reference number).
        """
        query = (
            self.db.query(Application)
            .options(
                joinedload(Application.applicant_info),
                joinedload(Application.nominees),
                joinedload(Application.bank_detail),
                joinedload(Application.ownership_detail),
                joinedload(Application.payment_detail),
                joinedload(Application.business),
                joinedload(Application.assigned_cr),
            )
        )
        if isinstance(application_id, int) or (isinstance(application_id, str) and application_id.isdigit()):
            app = query.filter(Application.id == int(application_id)).first()
        else:
            app = query.filter(func.upper(Application.application_number) == str(application_id).strip().upper()).first()

        if not app:
            raise NotFoundError(f"Application {application_id} not found.")

        self._assert_access(app, user)
        return app

    # -------------------------------------------------------------------------
    # List Applications
    # -------------------------------------------------------------------------
    async def list_applications(
        self,
        user: User,
        filters: dict[str, Any],
        page: int = 1,
        per_page: int = 20,
    ) -> Tuple[list[Application], int]:
        """Return paginated applications filtered by role and optional parameters."""
        query = (
            self.db.query(Application)
            .options(
                joinedload(Application.applicant_info),
                joinedload(Application.business),
                joinedload(Application.assigned_cr),
                joinedload(Application.sales_agent),
                joinedload(Application.customer),
                joinedload(Application.ownership_detail),
            )
        )

        # Role restrictions
        user_role_str = user.role.value if hasattr(user.role, "value") else str(user.role)
        if user_role_str == "customer":
            query = query.filter(Application.customer_id == user.id)
        elif user_role_str == "sales":
            # Sales executive sees applications they initiated on behalf
            query = query.filter(Application.sales_agent_id == user.id)
        elif user_role_str == "cr":
            # If not assigned to specific, CR can view business applications or their assigned ones
            if filters.get("assigned_only"):
                query = query.filter(Application.assigned_cr_id == user.id)

        # Field filters
        if filters.get("business_id"):
            b_val = str(filters["business_id"]).strip()
            if b_val.isdigit():
                query = query.filter(Application.business_id == int(b_val))
            else:
                query = query.join(Application.business, isouter=True).filter(Business.code == b_val.upper())
        if filters.get("status"):
            query = query.filter(Application.application_status == filters["status"])
        if filters.get("payment_status"):
            query = query.filter(Application.payment_status == filters["payment_status"])
        if filters.get("assigned_cr_id"):
            query = query.filter(Application.assigned_cr_id == filters["assigned_cr_id"])
        if filters.get("date_from"):
            query = query.filter(Application.application_date >= filters["date_from"])
        if filters.get("date_to"):
            query = query.filter(Application.application_date <= filters["date_to"])

        if filters.get("search"):
            term = f"%{filters['search']}%"
            query = query.join(Application.applicant_info, isouter=True).join(Application.customer, isouter=True).filter(
                or_(
                    Application.application_number.ilike(term),
                    ApplicantInfo.full_name_en.ilike(term),
                    ApplicantInfo.mobile_number.ilike(term),
                    ApplicantInfo.phone_number.ilike(term),
                    ApplicantInfo.nid_number.ilike(term),
                    User.full_name.ilike(term),
                    User.mobile.ilike(term),
                    User.customer_id_number.ilike(term),
                )
            )

        total = query.count()
        offset = (page - 1) * per_page
        items = query.order_by(Application.id.desc()).offset(offset).limit(per_page).all()
        return items, total

    # -------------------------------------------------------------------------
    # Update Application
    # -------------------------------------------------------------------------
    async def update_application(
        self,
        application_id: int,
        data: ApplicationUpdate,
        user: User,
    ) -> Application:
        """Update draft or correction_required applications."""
        app = await self.get_application(application_id, user)

        role_str = user.role.value if hasattr(user.role, "value") else str(user.role)
        status_val = (
            app.application_status.value
            if hasattr(app.application_status, "value")
            else str(app.application_status)
        )
        is_draft_or_corr = status_val in ("draft", "correction_required")
        can_edit = is_draft_or_corr or app.is_edit_unlocked or role_str == "admin"

        if not can_edit:
            raise AuthorizationError(
                f"Application is in '{status_val}' status and locked for editing. Please request edit permission from Admin."
            )

        # Update declaration if provided
        if data.declaration_accepted is not None:
            app.declaration_accepted = data.declaration_accepted

        # Update business division if changed
        if data.business_id is not None and data.business_id != app.business_id:
            new_biz = self.db.query(Business).filter(Business.id == data.business_id).first()
            if new_biz:
                app.business_id = new_biz.id

        # Update ApplicantInfo
        if data.applicant_info:
            info = self.db.query(ApplicantInfo).filter(ApplicantInfo.application_id == app.id).first()
            if not info:
                info = ApplicantInfo(application_id=app.id)
                self.db.add(info)
            for k, v in _sanitize_applicant_info(data.applicant_info).items():
                setattr(info, k, v)

        # Update BankDetail
        if data.bank_detail:
            bank = self.db.query(BankDetail).filter(BankDetail.application_id == app.id).first()
            if not bank:
                bank = BankDetail(application_id=app.id)
                self.db.add(bank)
            for k, v in _sanitize_bank_detail(data.bank_detail).items():
                setattr(bank, k, v)

        # Update OwnershipDetail
        if data.ownership_detail:
            own = self.db.query(OwnershipDetail).filter(OwnershipDetail.application_id == app.id).first()
            if not own:
                own = OwnershipDetail(application_id=app.id)
                self.db.add(own)
            for k, v in _sanitize_ownership_detail(data.ownership_detail).items():
                setattr(own, k, v)

        # Update PaymentDetail
        if data.payment_detail:
            pay = self.db.query(PaymentDetail).filter(PaymentDetail.application_id == app.id).first()
            if not pay:
                pay = PaymentDetail(application_id=app.id)
                self.db.add(pay)
            for k, v in _sanitize_payment_detail(data.payment_detail).items():
                setattr(pay, k, v)

        # Update Nominees
        if data.nominees is not None:
            self.db.query(Nominee).filter(Nominee.application_id == app.id).delete()
            for idx, nom in enumerate(data.nominees, 1):
                nom_dict = nom if isinstance(nom, dict) else (nom.model_dump() if hasattr(nom, "model_dump") else getattr(nom, "__dict__", {}))
                name_val = nom_dict.get("name") or nom_dict.get("full_name") or ""
                rel_val = nom_dict.get("relationship") or nom_dict.get("relation") or ""
                nid_val = nom_dict.get("nid_or_passport") or nom_dict.get("nid_number") or None
                cell_val = nom_dict.get("cell_number") or nom_dict.get("mobile_number") or None
                dob_val = parse_optional_date(nom_dict.get("date_of_birth"))
                if name_val or rel_val:
                    new_nom = Nominee(
                        application_id=app.id,
                        nominee_number=idx,
                        name=name_val,
                        relationship=rel_val,
                        father_or_husband_name=nom_dict.get("father_or_husband_name"),
                        nid_or_passport=nid_val,
                        cell_number=cell_val,
                        date_of_birth=dob_val,
                    )
                    self.db.add(new_nom)

        app.updated_at = datetime.now(timezone.utc)

        self._audit.log(
            user_id=user.id,
            action="application.updated",
            entity_type="application",
            entity_id=str(app.id),
        )

        self.db.commit()
        self.db.refresh(app)
        return app

    # -------------------------------------------------------------------------
    # Submit Application
    # -------------------------------------------------------------------------
    async def submit_application(
        self, application_id: int, user: User, declaration_accepted: Optional[bool] = None
    ) -> Application:
        """Submit completed application for review with strict completeness checks."""
        app = await self.get_application(application_id, user)

        # Update declaration_accepted on the application if passed in submit request
        if declaration_accepted is not None:
            app.declaration_accepted = declaration_accepted
            self.db.commit()
            self.db.refresh(app)

        role_str = user.role.value if hasattr(user.role, "value") else str(user.role)
        status_val = (
            app.application_status.value
            if hasattr(app.application_status, "value")
            else str(app.application_status)
        )
        is_submittable = status_val in ("draft", "correction_required") or app.is_edit_unlocked or role_str == "admin"
        if not is_submittable:
            raise ValidationError(
                f"Cannot submit application in '{status_val}' status."
            )

        if not app.declaration_accepted:
            raise ValidationError("You must accept the terms declaration before submitting.")

        # Strict completeness validation
        # All fields are mandatory EXCEPT personal_email and tin_number
        missing: list[str] = []
        info = app.applicant_info
        if not info:
            missing.append("Applicant Personal Details")
        else:
            if not (info.full_name_en and info.full_name_en.strip()):
                missing.append("Full Name (English)")
            if not (info.full_name_bn and info.full_name_bn.strip()):
                missing.append("Full Name (Bangla)")
            if not (info.father_name and info.father_name.strip()):
                missing.append("Father's Name")
            if not (info.mother_name and info.mother_name.strip()):
                missing.append("Mother's Name")
            if not (info.present_address and info.present_address.strip()):
                missing.append("Present Address")
            if not (info.permanent_address and info.permanent_address.strip()):
                missing.append("Permanent Address")
            if not (info.mobile_number and info.mobile_number.strip()):
                missing.append("Mobile Number")
            if not info.date_of_birth:
                missing.append("Date of Birth")
            if not (info.nationality and info.nationality.strip()):
                missing.append("Nationality")
            if not (info.religion and info.religion.strip()):
                missing.append("Religion")
            if not (info.nid_number or info.passport_number):
                missing.append("NID or Passport Number")
            if not (info.designation and info.designation.strip()):
                missing.append("Designation")
            # Personal Email, TIN Number, Company Name, and Office Address are explicitly OPTIONAL!

        if not app.nominees or len(app.nominees) == 0:
            missing.append("Nominee Details (at least 1 nominee required)")
        else:
            for i, nom in enumerate(app.nominees, 1):
                if not (nom.name and nom.name.strip()):
                    missing.append(f"Nominee {i} Name")
                if not (nom.relationship and nom.relationship.strip()):
                    missing.append(f"Nominee {i} Relationship")

        bank = app.bank_detail
        if not bank:
            missing.append("Bank Account Details")
        else:
            if not (bank.account_name and bank.account_name.strip()):
                missing.append("Bank Account Name")
            if not (bank.account_number and bank.account_number.strip()):
                missing.append("Bank Account Number")
            if not (bank.bank_name and bank.bank_name.strip()):
                missing.append("Bank Name")
            if not (bank.branch and bank.branch.strip()):
                missing.append("Branch Name")

        own = app.ownership_detail
        if not own:
            missing.append("Ownership Details")
        else:
            if not (own.package or own.number_of_ownership):
                missing.append("Ownership Package / Shares")

        if missing:
            raise ValidationError(
                f"Cannot submit incomplete application. All fields are required except Personal Email and TIN. Missing: {', '.join(missing)}"
            )

        old_status = app.application_status
        app.application_status = ApplicationStatus.SUBMITTED
        app.is_edit_unlocked = False  # Lock application after submission
        app.submitted_at = datetime.now(timezone.utc)

        role_label = user.role.value if hasattr(user.role, "value") else str(user.role)
        if not app.assigned_cr_id and role_label == "cr":
            app.assigned_cr_id = user.id
        self._record_history(
            app.id,
            old_status,
            ApplicationStatus.SUBMITTED,
            user.id,
            f"Submitted by {role_label.upper()} ({user.full_name}). Locked for editing.",
        )

        self._audit.log(
            user_id=user.id,
            action="application.submitted",
            entity_type="application",
            entity_id=str(app.id),
        )

        self.db.commit()
        self.db.refresh(app)

        # In-app notifications
        try:
            InAppNotificationService.notify(
                db=self.db,
                role="cr",
                title="New Application Submitted",
                message=f"Application #{app.application_number} has been submitted and is ready for review.",
                type="submission",
                link_url=f"/cr/applications/{app.id}",
                application_id=app.id,
            )
            InAppNotificationService.notify(
                db=self.db,
                role="admin",
                title="Application Submitted",
                message=f"Application #{app.application_number} submitted by {user.full_name} ({role_label.upper()}).",
                type="submission",
                link_url=f"/admin/applications/{app.id}",
                application_id=app.id,
            )
            InAppNotificationService.notify(
                db=self.db,
                user_id=app.customer_id,
                title="Application Submitted Successfully",
                message=f"Your application #{app.application_number} has been submitted for review.",
                type="submission",
                link_url="/customer/dashboard",
                application_id=app.id,
            )
        except Exception as exc:
            logger.warning("Failed to dispatch in-app notification on submit: %s", exc)

        return app

    # -------------------------------------------------------------------------
    # Application Edit Requests (Permission Request)
    # -------------------------------------------------------------------------
    async def create_edit_request(
        self,
        application_id: int,
        user: User,
        reason: str,
        requested_changes: Optional[str] = None,
    ) -> ApplicationEditRequest:
        """Submit request to unlock/edit application."""
        app = await self.get_application(application_id, user)
        role_str = user.role.value if hasattr(user.role, "value") else str(user.role)

        # Check existing pending request
        pending = (
            self.db.query(ApplicationEditRequest)
            .filter(
                ApplicationEditRequest.application_id == app.id,
                ApplicationEditRequest.status == EditRequestStatus.PENDING,
            )
            .first()
        )
        if pending:
            raise ValidationError("An edit request is already pending review by Admin for this application.")

        req = ApplicationEditRequest(
            application_id=app.id,
            requested_by_id=user.id,
            requester_role=role_str,
            reason=reason.strip(),
            status=EditRequestStatus.PENDING,
        )
        self.db.add(req)
        self.db.commit()
        self.db.refresh(req)

        # In-app notification to Admin and CR
        try:
            InAppNotificationService.notify(
                db=self.db,
                role="admin",
                title="Edit Permission Requested",
                message=f"{user.full_name} ({role_str.upper()}) requested permission to edit application #{app.application_number}: {reason}",
                type="edit_request",
                link_url=f"/admin/applications/{app.id}",
                application_id=app.id,
            )
            InAppNotificationService.notify(
                db=self.db,
                role="cr",
                title="Edit Permission Requested",
                message=f"Application #{app.application_number} edit permission requested by {user.full_name}: {reason}",
                type="edit_request",
                link_url=f"/cr/applications/{app.id}",
                application_id=app.id,
            )
        except Exception as exc:
            logger.warning("Failed to dispatch in-app notification for edit request: %s", exc)

        return req


    # -------------------------------------------------------------------------
    # Update Status (Workflow State Machine)
    # -------------------------------------------------------------------------
    async def update_status(
        self,
        application_id: int,
        data: StatusUpdateRequest,
        user: User,
    ) -> Application:
        """Validate and transition application status through strict state machine."""
        app = await self.get_application(application_id, user)
        current_status_val = app.application_status.value
        target_status_val = data.new_status.lower()

        # Validate transition is permitted
        allowed = VALID_TRANSITIONS.get(current_status_val, [])
        if target_status_val not in allowed:
            raise InvalidStatusTransitionError(
                f"Invalid transition from '{current_status_val}' to '{target_status_val}'. Allowed: {allowed}"
            )

        # Validate user role can make this transition
        permitted_roles = TRANSITION_PERMISSIONS.get(target_status_val, [])
        if user.role not in permitted_roles:
            raise AuthorizationError(
                f"Role '{user.role}' is not authorized to transition to '{target_status_val}'."
            )

        old_status = app.application_status
        new_status_enum = ApplicationStatus(target_status_val)
        app.application_status = new_status_enum
        app.updated_at = datetime.now(timezone.utc)

        # Generate and assign Customer ID when application is APPROVED by Admin
        if new_status_enum == ApplicationStatus.APPROVED:
            customer = self.db.query(User).filter(User.id == app.customer_id).first()
            if customer and not customer.customer_id_number:
                year = datetime.now(timezone.utc).year
                prefix = f"SG-CUST-{year}-"
                count = (
                    self.db.query(func.count(User.id))
                    .filter(User.customer_id_number.like(f"{prefix}%"))
                    .scalar()
                    or 0
                )
                seq = count + 1
                cust_id = f"{prefix}{seq:04d}"
                while self.db.query(User).filter(User.customer_id_number == cust_id).first():
                    seq += 1
                    cust_id = f"{prefix}{seq:04d}"

                customer.customer_id_number = cust_id
                if customer.customer_profile:
                    customer.customer_profile.customer_id_number = cust_id

                self._audit.log(
                    user_id=user.id,
                    action="customer.id_assigned",
                    entity_type="user",
                    entity_id=str(customer.id),
                    metadata={"customer_id_number": cust_id, "application_id": app.id},
                )

        self._record_history(
            app.id,
            old_status,
            new_status_enum,
            user.id,
            data.reason,
        )

        self._audit.log(
            user_id=user.id,
            action=f"application.status_{target_status_val}",
            entity_type="application",
            entity_id=str(app.id),
            metadata={"from": current_status_val, "to": target_status_val, "reason": data.reason},
        )

        self.db.commit()
        self.db.refresh(app)

        # In-app notifications for status transition
        try:
            if new_status_enum == ApplicationStatus.APPROVED:
                cust_num_info = f" Customer ID: {customer.customer_id_number}." if (customer and getattr(customer, "customer_id_number", None)) else ""
                InAppNotificationService.notify(
                    db=self.db,
                    user_id=app.customer_id,
                    title="Application Approved!",
                    message=f"Congratulations! Your application #{app.application_number} has been approved.{cust_num_info}",
                    type="approval",
                    link_url="/customer/dashboard",
                    application_id=app.id,
                )
                if app.sales_agent_id:
                    InAppNotificationService.notify(
                        db=self.db,
                        user_id=app.sales_agent_id,
                        title="Client Application Approved",
                        message=f"Application #{app.application_number} has been approved by Admin.",
                        type="approval",
                        link_url="/sales/dashboard",
                        application_id=app.id,
                    )
                InAppNotificationService.notify(
                    db=self.db,
                    role="cr",
                    title="Application Approved",
                    message=f"Application #{app.application_number} was approved by Admin.",
                    type="approval",
                    link_url=f"/cr/applications/{app.id}",
                    application_id=app.id,
                )

            elif new_status_enum == ApplicationStatus.CORRECTION_REQUIRED:
                msg = f"Application #{app.application_number} requires correction: {data.reason or 'Please review remarks and update details.'}"
                InAppNotificationService.notify(
                    db=self.db,
                    user_id=app.customer_id,
                    title="Correction Required",
                    message=msg,
                    type="correction_required",
                    link_url=f"/customer/apply?application_id={app.id}",
                    application_id=app.id,
                )
                if app.sales_agent_id:
                    InAppNotificationService.notify(
                        db=self.db,
                        user_id=app.sales_agent_id,
                        title="Application Correction Required",
                        message=msg,
                        type="correction_required",
                        link_url="/sales/dashboard",
                        application_id=app.id,
                    )
                if app.assigned_cr_id:
                    InAppNotificationService.notify(
                        db=self.db,
                        user_id=app.assigned_cr_id,
                        title="Correction Requested",
                        message=msg,
                        type="correction_required",
                        link_url=f"/cr/applications/{app.id}",
                        application_id=app.id,
                    )

            elif new_status_enum == ApplicationStatus.DOCUMENTS_REQUIRED:
                InAppNotificationService.notify(
                    db=self.db,
                    user_id=app.customer_id,
                    title="Documents Required",
                    message=f"Additional documents required for application #{app.application_number}: {data.reason or 'Please review requested documents.'}",
                    type="documents_required",
                    link_url=f"/customer/apply?application_id={app.id}",
                    application_id=app.id,
                )

            elif new_status_enum == ApplicationStatus.REJECTED:
                InAppNotificationService.notify(
                    db=self.db,
                    user_id=app.customer_id,
                    title="Application Rejected",
                    message=f"Application #{app.application_number} has been rejected: {data.reason or 'Contact support for details.'}",
                    type="rejection",
                    link_url="/customer/dashboard",
                    application_id=app.id,
                )
                if app.sales_agent_id:
                    InAppNotificationService.notify(
                        db=self.db,
                        user_id=app.sales_agent_id,
                        title="Client Application Rejected",
                        message=f"Application #{app.application_number} was rejected: {data.reason or ''}",
                        type="rejection",
                        link_url="/sales/dashboard",
                        application_id=app.id,
                    )

            elif new_status_enum == ApplicationStatus.UNDER_REVIEW:
                InAppNotificationService.notify(
                    db=self.db,
                    user_id=app.customer_id,
                    title="Application Under Review",
                    message=f"Your application #{app.application_number} is currently under CR review.",
                    type="status_change",
                    link_url="/customer/dashboard",
                    application_id=app.id,
                )
        except Exception as exc:
            logger.warning("Failed to dispatch in-app notification on status change: %s", exc)

        return app

    # -------------------------------------------------------------------------
    # Assign CR Officer
    # -------------------------------------------------------------------------
    async def assign_cr(
        self,
        application_id: int,
        cr_user_id: int,
        assigned_by: User,
    ) -> Application:
        """Assign or reassign an application to a Customer Relations officer."""
        if assigned_by.role != "admin":
            raise AuthorizationError("Only administrators can assign applications.")

        app = await self.get_application(application_id, assigned_by)

        cr_user = self.db.query(User).filter(User.id == cr_user_id).first()
        if not cr_user:
            raise NotFoundError(f"User {cr_user_id} not found.")
        if cr_user.role != "cr":
            raise ValidationError(f"User {cr_user.full_name} is not a CR officer.")

        # Deactivate old assignments
        self.db.query(CRAssignment).filter(
            CRAssignment.application_id == application_id,
            CRAssignment.is_active == True,
        ).update({"is_active": False})

        # Add new active assignment
        assignment = CRAssignment(
            application_id=application_id,
            cr_user_id=cr_user_id,
            assigned_by_id=assigned_by.id,
            is_active=True,
        )
        self.db.add(assignment)
        app.assigned_cr_id = cr_user_id
        app.updated_at = datetime.now(timezone.utc)

        self._audit.log(
            user_id=assigned_by.id,
            action="application.assigned_cr",
            entity_type="application",
            entity_id=str(application_id),
            metadata={"cr_user_id": cr_user_id, "cr_name": cr_user.full_name},
        )

        self.db.commit()
        self.db.refresh(app)

        # In-app notification to assigned CR
        try:
            InAppNotificationService.notify(
                db=self.db,
                user_id=cr_user_id,
                title="Application Assigned to You",
                message=f"Application #{app.application_number} was assigned to you for verification by Admin.",
                type="assignment",
                link_url=f"/cr/applications/{app.id}",
                application_id=app.id,
            )
        except Exception as exc:
            logger.warning("Failed to send assignment notification: %s", exc)

        return app

    # -------------------------------------------------------------------------
    # Nominees Management
    # -------------------------------------------------------------------------
    async def add_nominee(
        self,
        application_id: int,
        data: Any,
        user: User,
    ) -> Nominee:
        """Add a nominee (maximum 2 allowed per application)."""
        app = await self.get_application(application_id, user)

        existing_count = self.db.query(Nominee).filter(Nominee.application_id == application_id).count()
        if existing_count >= 2:
            raise ValidationError("Maximum of 2 nominees permitted per application.")

        # Check nominee number uniqueness
        num = data.nominee_number
        exists = self.db.query(Nominee).filter(
            Nominee.application_id == application_id,
            Nominee.nominee_number == num,
        ).first()
        if exists:
            raise ValidationError(f"Nominee {num} already exists for this application.")

        nominee = Nominee(
            application_id=application_id,
            **data.model_dump(exclude_unset=True),
        )
        self.db.add(nominee)
        self.db.commit()
        self.db.refresh(nominee)
        return nominee

    async def update_nominee(
        self,
        application_id: int,
        nominee_id: int,
        data: Any,
        user: User,
    ) -> Nominee:
        """Update existing nominee."""
        await self.get_application(application_id, user)
        nominee = self.db.query(Nominee).filter(
            Nominee.id == nominee_id,
            Nominee.application_id == application_id,
        ).first()
        if not nominee:
            raise NotFoundError(f"Nominee {nominee_id} not found.")

        for k, v in data.model_dump(exclude_unset=True).items():
            setattr(nominee, k, v)

        nominee.updated_at = datetime.now(timezone.utc)
        self.db.commit()
        self.db.refresh(nominee)
        return nominee

    async def delete_nominee(
        self,
        application_id: int,
        nominee_id: int,
        user: User,
    ) -> None:
        """Delete a nominee."""
        await self.get_application(application_id, user)
        nominee = self.db.query(Nominee).filter(
            Nominee.id == nominee_id,
            Nominee.application_id == application_id,
        ).first()
        if not nominee:
            raise NotFoundError(f"Nominee {nominee_id} not found.")

        self.db.delete(nominee)
        self.db.commit()

    # -------------------------------------------------------------------------
    # Remarks
    # -------------------------------------------------------------------------
    async def add_remark(
        self,
        application_id: int,
        remark_text: str,
        visibility: str,
        user: User,
    ) -> ApplicationRemark:
        """Add an internal or customer-visible remark."""
        await self.get_application(application_id, user)
        remark = ApplicationRemark(
            application_id=application_id,
            user_id=user.id,
            remark=remark_text,
            visibility=visibility,
        )
        self.db.add(remark)
        self.db.commit()
        self.db.refresh(remark)
        return remark

    async def list_remarks(
        self,
        application_id: int,
        user: User,
    ) -> list[ApplicationRemark]:
        """List remarks filtered by user role visibility."""
        await self.get_application(application_id, user)
        query = self.db.query(ApplicationRemark).filter(
            ApplicationRemark.application_id == application_id
        )
        if user.role == "customer":
            query = query.filter(ApplicationRemark.visibility == "customer_visible")

        return query.order_by(ApplicationRemark.created_at.asc()).all()

    # -------------------------------------------------------------------------
    # Status History
    # -------------------------------------------------------------------------
    async def get_history(self, application_id: int, user: User) -> list[ApplicationStatusHistory]:
        """Return full audit history of status changes."""
        await self.get_application(application_id, user)
        return (
            self.db.query(ApplicationStatusHistory)
            .filter(ApplicationStatusHistory.application_id == application_id)
            .order_by(ApplicationStatusHistory.created_at.asc())
            .all()
        )

    # -------------------------------------------------------------------------
    # Internal Helpers
    # -------------------------------------------------------------------------
    async def _get_next_sequence(self, business_id: int) -> int:
        count = self.db.query(Application).filter(Application.business_id == business_id).count()
        return count + 1

    def _record_history(
        self,
        application_id: int,
        previous_status: Optional[ApplicationStatus],
        new_status: ApplicationStatus,
        changed_by_id: int,
        reason: Optional[str] = None,
    ) -> None:
        history = ApplicationStatusHistory(
            application_id=application_id,
            previous_status=previous_status,
            new_status=new_status,
            changed_by_id=changed_by_id,
            reason=reason,
        )
        self.db.add(history)

    def _assert_access(self, app: Application, user: User) -> None:
        role_str = user.role.value if hasattr(user.role, "value") else str(user.role)
        if role_str in ("admin", "subadmin"):
            return
        if role_str == "customer" and app.customer_id != user.id:
            raise AuthorizationError("You do not have access to this application.")
        if role_str == "sales" and app.sales_agent_id and app.sales_agent_id != user.id:
            raise AuthorizationError("You do not have access to this application.")
        if role_str == "cr" and app.assigned_cr_id and app.assigned_cr_id != user.id:
            # Note: Unassigned applications can be viewed by CR team to claim/review
            pass
