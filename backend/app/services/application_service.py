"""
Application service – create, query, update, submit, assign, and transition applications.
"""
from __future__ import annotations

import logging
from datetime import datetime, timezone
from typing import Any, Optional, Tuple

from sqlalchemy import or_
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
    ApplicationRemark,
    ApplicationStatus,
    ApplicationStatusHistory,
    BankDetail,
    CRAssignment,
    Nominee,
    OwnershipDetail,
    PaymentDetail,
    PaymentStatus,
)
from app.models.business import Business
from app.models.user import User
from app.schemas.application import (
    ApplicationCreate,
    ApplicationUpdate,
    StatusUpdateRequest,
)
from app.services.audit_service import AuditService

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Valid status-transition map
# ---------------------------------------------------------------------------
VALID_TRANSITIONS: dict[str, list[str]] = {
    "draft": ["submitted", "cancelled"],
    "submitted": ["under_review", "cancelled"],
    "under_review": ["documents_required", "correction_required", "approved", "rejected"],
    "documents_required": ["under_review", "cancelled"],
    "correction_required": ["submitted", "cancelled"],
    "approved": [],
    "rejected": [],
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
            declaration_accepted=False,
        )
        self.db.add(application)
        self.db.flush()

        # 4. Attach nested models if provided
        if data.applicant_info:
            info = ApplicantInfo(
                application_id=application.id,
                **data.applicant_info.model_dump(exclude_unset=True),
            )
            self.db.add(info)

        if data.bank_detail:
            bd = BankDetail(
                application_id=application.id,
                **data.bank_detail.model_dump(exclude_unset=True),
            )
            self.db.add(bd)

        if data.ownership_detail:
            od = OwnershipDetail(
                application_id=application.id,
                **data.ownership_detail.model_dump(exclude_unset=True),
            )
            self.db.add(od)

        if data.payment_detail:
            pd = PaymentDetail(
                application_id=application.id,
                **data.payment_detail.model_dump(exclude_unset=True),
            )
            self.db.add(pd)

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
    # Get Application
    # -------------------------------------------------------------------------
    async def get_application(self, application_id: int, user: User) -> Application:
        """Fetch application with all related models and role-based access validation."""
        app = (
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
            .filter(Application.id == application_id)
            .first()
        )
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
            )
        )

        # Role restrictions
        if user.role == "customer":
            query = query.filter(Application.customer_id == user.id)
        elif user.role == "cr":
            # If not assigned to specific, CR can view business applications or their assigned ones
            if filters.get("assigned_only"):
                query = query.filter(Application.assigned_cr_id == user.id)

        # Field filters
        if filters.get("business_id"):
            query = query.filter(Application.business_id == filters["business_id"])
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
            query = query.join(Application.applicant_info, isouter=True).filter(
                or_(
                    Application.application_number.ilike(term),
                    ApplicantInfo.full_name_en.ilike(term),
                    ApplicantInfo.mobile_number.ilike(term),
                    ApplicantInfo.nid_number.ilike(term),
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

        status_str = app.application_status.value
        if user.role == "customer" and status_str not in ("draft", "correction_required"):
            raise AuthorizationError(
                f"You cannot edit this application while it is in '{status_str}' status."
            )

        # Update declaration if provided
        if data.declaration_accepted is not None:
            app.declaration_accepted = data.declaration_accepted

        # Update ApplicantInfo
        if data.applicant_info:
            info = self.db.query(ApplicantInfo).filter(ApplicantInfo.application_id == app.id).first()
            if not info:
                info = ApplicantInfo(application_id=app.id)
                self.db.add(info)
            for k, v in data.applicant_info.model_dump(exclude_unset=True).items():
                setattr(info, k, v)

        # Update BankDetail
        if data.bank_detail:
            bank = self.db.query(BankDetail).filter(BankDetail.application_id == app.id).first()
            if not bank:
                bank = BankDetail(application_id=app.id)
                self.db.add(bank)
            for k, v in data.bank_detail.model_dump(exclude_unset=True).items():
                setattr(bank, k, v)

        # Update OwnershipDetail
        if data.ownership_detail:
            own = self.db.query(OwnershipDetail).filter(OwnershipDetail.application_id == app.id).first()
            if not own:
                own = OwnershipDetail(application_id=app.id)
                self.db.add(own)
            for k, v in data.ownership_detail.model_dump(exclude_unset=True).items():
                setattr(own, k, v)

        # Update PaymentDetail
        if data.payment_detail:
            pay = self.db.query(PaymentDetail).filter(PaymentDetail.application_id == app.id).first()
            if not pay:
                pay = PaymentDetail(application_id=app.id)
                self.db.add(pay)
            for k, v in data.payment_detail.model_dump(exclude_unset=True).items():
                setattr(pay, k, v)

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
    async def submit_application(self, application_id: int, user: User) -> Application:
        """Customer submits application for review."""
        app = await self.get_application(application_id, user)

        if app.application_status != ApplicationStatus.DRAFT:
            raise ValidationError(
                f"Cannot submit application in '{app.application_status.value}' status."
            )
        if not app.declaration_accepted:
            raise ValidationError("You must accept the terms declaration before submitting.")

        old_status = app.application_status
        app.application_status = ApplicationStatus.SUBMITTED
        app.submitted_at = datetime.now(timezone.utc)

        self._record_history(
            app.id,
            old_status,
            ApplicationStatus.SUBMITTED,
            user.id,
            "Submitted by applicant.",
        )

        self._audit.log(
            user_id=user.id,
            action="application.submitted",
            entity_type="application",
            entity_id=str(app.id),
        )

        self.db.commit()
        self.db.refresh(app)
        return app

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
        if user.role == "admin":
            return
        if user.role == "customer" and app.customer_id != user.id:
            raise AuthorizationError("You do not have access to this application.")
        if user.role == "cr" and app.assigned_cr_id and app.assigned_cr_id != user.id:
            # Note: Unassigned applications can be viewed by CR team to claim/review
            pass
