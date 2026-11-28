from __future__ import annotations

import logging
import re
from datetime import datetime, timezone
from typing import List, Optional, Tuple

from sqlalchemy import desc, or_, select
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.core.exceptions import (
    BadRequestException,
    ConflictException,
    NotFoundException,
    UnauthorizedException,
)
from app.core.security import get_password_hash
from app.models.application import (
    ApplicantInfo,
    Application,
    ApplicationRemark,
    ApplicationStatus,
    ApplicationStatusHistory,
    CRAssignment,
    PaymentStatus,
)
from app.models.business import Business
from app.models.customer import CustomerProfile
from app.models.incoming_lead import IncomingLead, LeadActivationStatus
from app.models.user import User, UserRole
from app.schemas.incoming_lead import (
    ActivateLeadRequest,
    ActivateLeadResponse,
    ExternalLeadWebhookPayload,
    ExternalLeadWebhookResponse,
    IncomingLeadListItem,
)
from app.services.notification_service import NotificationService

logger = logging.getLogger(__name__)


def normalize_bd_phone(phone: str) -> str:
    cleaned = re.sub(r"[^\d+]", "", phone.strip())
    if cleaned.startswith("+880"):
        cleaned = "0" + cleaned[4:]
    elif cleaned.startswith("880"):
        cleaned = "0" + cleaned[3:]
    return cleaned


class IncomingLeadService:
    def __init__(self, db: Session):
        self.db = db
        self.settings = get_settings()
        self.notify = NotificationService()

    # -----------------------------------------------------------------------
    # 1. Ingest External Webhook Payload
    # -----------------------------------------------------------------------
    async def process_incoming_webhook(
        self, payload: ExternalLeadWebhookPayload
    ) -> ExternalLeadWebhookResponse:
        lead_data = payload.lead
        normalized_phone = normalize_bd_phone(lead_data.phone)

        if not normalized_phone:
            raise BadRequestException("A valid customer phone number is required.")

        # Check if this exact external lead ID or phone has been ingested recently
        existing = (
            self.db.query(IncomingLead)
            .filter(
                or_(
                    (IncomingLead.external_lead_id == str(lead_data.id))
                    if lead_data.id
                    else False,
                    IncomingLead.phone == normalized_phone,
                )
            )
            .order_by(desc(IncomingLead.created_at))
            .first()
        )

        is_duplicate = False
        if existing and existing.activation_status == LeadActivationStatus.pending:
            is_duplicate = True
            # Update notes, last called info and call history
            existing.notes = lead_data.notes or existing.notes
            existing.last_called_at = lead_data.last_called_at or existing.last_called_at
            existing.total_calls_count = lead_data.total_calls_count or existing.total_calls_count
            if lead_data.call_history:
                existing.call_history = [item.model_dump() for item in lead_data.call_history]
            if lead_data.owner:
                existing.owner_info = lead_data.owner.model_dump()
            if lead_data.onboarded_by:
                existing.onboarded_by_info = lead_data.onboarded_by.model_dump()
            existing.raw_payload = payload.model_dump()
            self.db.commit()
            self.db.refresh(existing)
            logger.info("Updated existing pending lead ID=%s (Phone=%s)", existing.id, normalized_phone)
            return ExternalLeadWebhookResponse(
                success=True,
                message="Lead record updated successfully.",
                incoming_lead_id=existing.id,
                is_duplicate=True,
            )

        # Create new incoming lead entry
        incoming = IncomingLead(
            external_lead_id=str(lead_data.id) if lead_data.id else None,
            event_type=payload.event or "lead.onboarded",
            name=lead_data.name.strip(),
            phone=normalized_phone,
            email=lead_data.email.strip() if lead_data.email else None,
            status_raw=lead_data.status,
            source=lead_data.source or "external_webhook",
            lead_date=lead_data.lead_date,
            last_called_at=lead_data.last_called_at,
            total_calls_count=lead_data.total_calls_count or 0,
            notes=lead_data.notes,
            owner_info=lead_data.owner.model_dump() if lead_data.owner else None,
            onboarded_by_info=lead_data.onboarded_by.model_dump() if lead_data.onboarded_by else None,
            external_onboarded_at=lead_data.onboarded_at,
            call_history=[item.model_dump() for item in lead_data.call_history] if lead_data.call_history else None,
            raw_payload=payload.model_dump(),
            activation_status=LeadActivationStatus.pending,
        )
        self.db.add(incoming)
        self.db.commit()
        self.db.refresh(incoming)

        logger.info(
            "New incoming lead registered: ID=%s Name='%s' Phone=%s",
            incoming.id,
            incoming.name,
            incoming.phone,
        )

        return ExternalLeadWebhookResponse(
            success=True,
            message="Lead successfully received and queued for CR activation.",
            incoming_lead_id=incoming.id,
            is_duplicate=False,
        )

    # -----------------------------------------------------------------------
    # 2. List Incoming Leads for CR Dashboard
    # -----------------------------------------------------------------------
    def list_incoming_leads(
        self,
        status: Optional[str] = None,
        search: Optional[str] = None,
        limit: int = 100,
        offset: int = 0,
    ) -> Tuple[List[IncomingLeadListItem], int]:
        query = self.db.query(IncomingLead)

        if status:
            query = query.filter(IncomingLead.activation_status == status)

        if search:
            s = f"%{search.strip()}%"
            query = query.filter(
                or_(
                    IncomingLead.name.ilike(s),
                    IncomingLead.phone.ilike(s),
                    IncomingLead.email.ilike(s),
                    IncomingLead.external_lead_id.ilike(s),
                )
            )

        total = query.count()
        leads = query.order_by(desc(IncomingLead.created_at)).offset(offset).limit(limit).all()

        items = []
        for l in leads:
            activated_name = l.activated_by.full_name if l.activated_by else None
            cust_number = (
                l.customer_user.customer_id_number
                if l.customer_user and hasattr(l.customer_user, "customer_id_number")
                else None
            )
            items.append(
                IncomingLeadListItem(
                    id=l.id,
                    external_lead_id=l.external_lead_id,
                    event_type=l.event_type,
                    name=l.name,
                    phone=l.phone,
                    email=l.email,
                    status_raw=l.status_raw,
                    source=l.source,
                    lead_date=l.lead_date,
                    last_called_at=l.last_called_at,
                    total_calls_count=l.total_calls_count,
                    notes=l.notes,
                    owner_info=l.owner_info,
                    onboarded_by_info=l.onboarded_by_info,
                    external_onboarded_at=l.external_onboarded_at,
                    call_history=l.call_history,
                    activation_status=l.activation_status.value if hasattr(l.activation_status, "value") else str(l.activation_status),
                    activated_by_id=l.activated_by_id,
                    activated_by_name=activated_name,
                    activated_at=l.activated_at,
                    customer_user_id=l.customer_user_id,
                    customer_id_number=cust_number,
                    application_id=l.application_id,
                    created_at=l.created_at,
                    updated_at=l.updated_at,
                )
            )
        return items, total

    # -----------------------------------------------------------------------
    # 3. Activate Lead -> Create Customer Account + Draft/Under Review Application
    # -----------------------------------------------------------------------
    async def activate_lead(
        self, req: ActivateLeadRequest, current_user: User
    ) -> ActivateLeadResponse:
        lead = self.db.query(IncomingLead).filter(IncomingLead.id == req.lead_id).first()
        if not lead:
            raise NotFoundException(detail="Incoming lead not found.")

        if lead.activation_status == LeadActivationStatus.activated:
            raise ConflictException(detail="This lead has already been activated into a Customer Account.")

        phone = lead.phone
        full_name = lead.name
        temp_pass = req.temp_password or "Sunset@123"

        # 1. Resolve or Create User
        user = self.db.query(User).filter(User.phone_number == phone).first()
        if not user:
            user = User(
                phone_number=phone,
                email=lead.email,
                full_name=full_name,
                password_hash=get_password_hash(temp_pass),
                role=UserRole.customer,
                is_active=True,
                is_verified=True,
            )
            self.db.add(user)
            self.db.flush()

            # Create CustomerProfile
            profile = CustomerProfile(
                user_id=user.id,
                full_name=full_name,
                mobile=phone,
                email=lead.email,
            )
            self.db.add(profile)
            self.db.flush()
        else:
            # If user already exists, update verified & active status
            user.is_active = True
            user.is_verified = True
            if not user.password_hash:
                user.password_hash = get_password_hash(temp_pass)

        # 2. Resolve Business (Default to the first active business if not provided)
        biz = None
        if req.business_id:
            biz = self.db.query(Business).filter(Business.id == req.business_id).first()
        if not biz:
            biz = self.db.query(Business).filter(Business.is_active == True).first()
        if not biz:
            # Create a fallback default business if DB is empty
            biz = Business(code="SSG", name="Sunset Group", slug="sunset-group", is_active=True)
            self.db.add(biz)
            self.db.flush()

        # Generate reference number
        count = self.db.query(Application).count() + 1
        ref_num = f"{biz.code}-{datetime.now().strftime('%Y%m')}-{count:04d}"

        # 3. Create Application (in UNDER_REVIEW state ready for review & sign-off)
        sales_rep_name = None
        sales_rep_email = None
        if lead.owner_info:
            sales_rep_name = lead.owner_info.get("name")
            sales_rep_email = lead.owner_info.get("email")

        sales_agent_id = None
        sales_rep_phone = lead.owner_info.get("phone") if lead.owner_info else None
        sales_rep_emp_id = lead.owner_info.get("employee_id") if lead.owner_info else None

        # Look up sales agent by email, phone, or employee_id
        if sales_rep_email or sales_rep_phone or sales_rep_emp_id:
            sales_user = (
                self.db.query(User)
                .filter(
                    or_(
                        (User.email == sales_rep_email) if sales_rep_email else False,
                        (User.phone_number == sales_rep_phone) if sales_rep_phone else False,
                        (User.employee_id == str(sales_rep_emp_id)) if sales_rep_emp_id else False,
                    )
                )
                .first()
            )
            if sales_user:
                sales_agent_id = sales_user.id

        actual_source = lead.source or "cold_lead"

        app = Application(
            customer_id=user.id,
            business_id=biz.id,
            assigned_cr_id=current_user.id if current_user.role == UserRole.cr else None,
            sales_agent_id=sales_agent_id,
            lead_source=actual_source,
            status=ApplicationStatus.under_review,
            payment_status=PaymentStatus.pending,
            current_step=4,
            is_submitted=True,
            declaration_accepted=True,
            application_number=ref_num,
            reference_number=ref_num,
            submission_date=datetime.now(timezone.utc),
            submitted_at=datetime.now(timezone.utc),
            application_date=datetime.now(timezone.utc),
        )
        self.db.add(app)
        self.db.flush()

        # Add Applicant Info
        app_info = ApplicantInfo(
            application_id=app.id,
            full_name_en=full_name,
            mobile_number=phone,
            personal_email=lead.email,
            present_address="To be updated by customer or CR",
            permanent_address="To be updated by customer or CR",
            father_name="-",
            mother_name="-",
            date_of_birth="1990-01-01",
            nationality="Bangladeshi",
            nid_or_passport="-",
        )
        self.db.add(app_info)

        # Assign CR officer audit
        if current_user.role == UserRole.cr:
            assignment = CRAssignment(
                application_id=app.id,
                cr_id=current_user.id,
                assigned_by_id=current_user.id,
                notes=f"Auto-assigned upon CR activation of external lead #{lead.id}",
            )
            self.db.add(assignment)

        # Add Status History
        history = ApplicationStatusHistory(
            application_id=app.id,
            from_status=ApplicationStatus.draft,
            to_status=ApplicationStatus.under_review,
            changed_by_id=current_user.id,
            remarks=f"Application initiated via External Lead Activation by {current_user.full_name}.",
        )
        self.db.add(history)

        # Add initial remark containing external call history & notes if any
        notes_summary = f"Initiated from External Lead #{lead.external_lead_id or lead.id}."
        if lead.notes:
            notes_summary += f"\nExternal Notes: {lead.notes}"
        if lead.owner_info:
            notes_summary += f"\nLead Owner: {lead.owner_info.get('name')} ({lead.owner_info.get('phone', '')})"
        if req.custom_notes:
            notes_summary += f"\nCR Activation Remarks: {req.custom_notes}"

        remark = ApplicationRemark(
            application_id=app.id,
            author_id=current_user.id,
            remark_text=notes_summary,
            is_internal=True,
        )
        self.db.add(remark)

        # 4. Update IncomingLead entity
        lead.activation_status = LeadActivationStatus.activated
        lead.activated_by_id = current_user.id
        lead.activated_at = datetime.now(timezone.utc)
        lead.customer_user_id = user.id
        lead.application_id = app.id
        lead.activation_notes = req.custom_notes

        self.db.commit()
        self.db.refresh(lead)

        # 5. Send Credential SMS if requested
        sms_sent = False
        if req.send_sms:
            sms_text = (
                f"Welcome to Sunset Group Customer Portal! Your account has been provisioned.\n"
                f"Login: {phone}\n"
                f"Password: {temp_pass}\n"
                f"Track Application: {ref_num}"
            )
            sms_sent = await self.notify.send_custom_sms(phone, sms_text)

        logger.info(
            "Lead ID=%s activated successfully by User=%s. App ID=%s Customer ID=%s",
            lead.id,
            current_user.id,
            app.id,
            user.id,
        )

        return ActivateLeadResponse(
            success=True,
            message="Customer account and application successfully created.",
            lead_id=lead.id,
            customer_id=user.id,
            customer_name=user.full_name,
            phone_number=phone,
            temp_password=temp_pass,
            application_id=app.id,
            reference_number=ref_num,
            sms_sent=sms_sent,
        )
