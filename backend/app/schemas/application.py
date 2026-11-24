"""
Application-related Pydantic v2 schemas.
"""

from __future__ import annotations

from datetime import date, datetime
from decimal import Decimal
from typing import Any

from pydantic import BaseModel, ConfigDict, EmailStr, field_validator, computed_field, model_validator


def parse_optional_date(v: Any) -> date | None:
    """Parse empty strings or ISO date strings safely to date or None."""
    if v is None or v == "" or (isinstance(v, str) and not v.strip()):
        return None
    if isinstance(v, date):
        return v
    if isinstance(v, str):
        try:
            return date.fromisoformat(v.strip().split("T")[0])
        except Exception:
            return None
    return v


# ---------------------------------------------------------------------------
# Applicant Info
# ---------------------------------------------------------------------------


class ApplicantInfoCreate(BaseModel):
    full_name_en: str | None = None
    full_name_bn: str | None = None
    father_name: str | None = None
    mother_name: str | None = None
    spouse_name: str | None = None
    present_address: str | None = None
    permanent_address: str | None = None
    mobile_number: str | None = None
    phone_number: str | None = None
    date_of_birth: date | None = None
    nationality: str = "Bangladeshi"
    religion: str | None = None
    nid_number: str | None = None
    nid_or_passport: str | None = None
    passport_number: str | None = None
    tin_number: str | None = None
    personal_email: str | None = None
    company_name: str | None = None
    office_address: str | None = None
    designation: str | None = None
    cell_number: str | None = None
    office_phone: str | None = None
    ownership_id: str | None = None
    application_date: str | None = None
    photograph_file_id: int | None = None

    model_config = ConfigDict(extra="ignore")

    @field_validator("date_of_birth", mode="before")
    @classmethod
    def clean_date_of_birth(cls, v: Any) -> date | None:
        return parse_optional_date(v)


class ApplicantInfoUpdate(ApplicantInfoCreate):
    pass


class ApplicantInfoResponse(ApplicantInfoCreate):
    id: int
    application_id: int
    customer_id_number: str | None = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True, extra="ignore")


# ---------------------------------------------------------------------------
# Nominee
# ---------------------------------------------------------------------------


class NomineeCreate(BaseModel):
    nominee_number: int = 1  # 1 or 2
    name: str | None = None
    full_name: str | None = None
    father_or_husband_name: str | None = None
    nid_or_passport: str | None = None
    cell_number: str | None = None
    relationship: str | None = None
    relation: str | None = None
    date_of_birth: date | None = None
    photograph_file_id: int | None = None

    model_config = ConfigDict(extra="ignore")

    @field_validator("nominee_number", mode="before")
    @classmethod
    def validate_nominee_number(cls, v: Any) -> int:
        try:
            val = int(v)
            return val if val in (1, 2) else 1
        except Exception:
            return 1

    @field_validator("date_of_birth", mode="before")
    @classmethod
    def clean_nominee_dob(cls, v: Any) -> date | None:
        return parse_optional_date(v)


class NomineeUpdate(NomineeCreate):
    pass


class NomineeResponse(NomineeCreate):
    id: int
    application_id: int
    created_at: datetime

    model_config = ConfigDict(from_attributes=True, extra="ignore")


# ---------------------------------------------------------------------------
# Bank Detail
# ---------------------------------------------------------------------------


class BankDetailCreate(BaseModel):
    account_name: str | None = None
    account_number: str | None = None
    bank_name: str | None = None
    branch: str | None = None
    branch_name: str | None = None

    model_config = ConfigDict(extra="ignore")


class BankDetailResponse(BankDetailCreate):
    id: int
    application_id: int

    model_config = ConfigDict(from_attributes=True, extra="ignore")


# ---------------------------------------------------------------------------
# Ownership Detail
# ---------------------------------------------------------------------------


class OwnershipDetailCreate(BaseModel):
    package: str | None = None
    package_type: str | None = None
    number_of_ownership: int | None = None
    price_per_ownership: Decimal | None = None
    discount: Decimal = Decimal("0")
    discount_amount: Decimal | None = None
    total_price: Decimal | None = None
    amount_in_words: str | None = None

    model_config = ConfigDict(extra="ignore")

    @field_validator("price_per_ownership", "discount", "discount_amount", "total_price", mode="before")
    @classmethod
    def clean_decimal(cls, v: Any) -> Any:
        if v is None or v == "":
            return Decimal("0")
        return v


class OwnershipDetailResponse(OwnershipDetailCreate):
    id: int
    application_id: int

    model_config = ConfigDict(from_attributes=True, extra="ignore")


# ---------------------------------------------------------------------------
# Payment Detail
# ---------------------------------------------------------------------------


class PaymentDetailCreate(BaseModel):
    token_money: Decimal | None = None
    booking_money: Decimal | None = None
    booking_money_date: date | None = None
    booking_date: date | None = None
    booking_installment_count: int | None = 1
    booking_installment_amount: Decimal | None = None
    installment_type: str | None = None
    number_of_installments: int | None = None
    installment_amount: Decimal | None = None
    installment_starting_date: date | None = None
    installment_start_date: date | None = None
    dues_amount: Decimal | None = None

    model_config = ConfigDict(extra="ignore")

    @field_validator("booking_money_date", "booking_date", "installment_starting_date", "installment_start_date", mode="before")
    @classmethod
    def clean_payment_date(cls, v: Any) -> date | None:
        return parse_optional_date(v)

    @field_validator("token_money", "booking_money", "booking_installment_amount", "installment_amount", "dues_amount", mode="before")
    @classmethod
    def clean_payment_decimal(cls, v: Any) -> Any:
        if v is None or v == "":
            return Decimal("0")
        return v


class PaymentDetailResponse(PaymentDetailCreate):
    id: int
    application_id: int

    model_config = ConfigDict(from_attributes=True, extra="ignore")


# ---------------------------------------------------------------------------
# Application
# ---------------------------------------------------------------------------


class ApplicationCreate(BaseModel):
    business_id: int
    applicant_info: ApplicantInfoCreate | None = None
    bank_detail: BankDetailCreate | None = None
    ownership_detail: OwnershipDetailCreate | None = None
    payment_detail: PaymentDetailCreate | None = None
    nominees: list[Any] | None = None
    declaration_accepted: bool | None = False
    current_step: int | None = 1

    model_config = ConfigDict(extra="ignore")


class ApplicationUpdate(BaseModel):
    business_id: int | None = None
    applicant_info: ApplicantInfoUpdate | None = None
    bank_detail: BankDetailCreate | None = None
    ownership_detail: OwnershipDetailCreate | None = None
    payment_detail: PaymentDetailCreate | None = None
    nominees: list[Any] | None = None
    declaration_accepted: bool | None = None
    current_step: int | None = None

    model_config = ConfigDict(extra="ignore")


class ApplicationListItem(BaseModel):
    id: int
    application_number: str
    reference_number: str | None = None
    status: str | None = None
    customer_id: int
    business_id: int
    application_status: str
    payment_status: str
    assigned_cr_id: int | None = None
    assigned_cr_name: str | None = None
    assigned_cr_employee_id: str | None = None
    sales_agent_id: int | None = None
    sales_agent_name: str | None = None
    sales_agent_employee_id: str | None = None
    customer_id_number: str | None = None
    customer_name: str | None = None
    customer_phone: str | None = None
    business_code: str | None = None
    business_name: str | None = None
    is_edit_unlocked: bool = False
    declaration_accepted: bool
    submitted_at: datetime | None = None
    created_at: datetime
    current_step: int = 1

    model_config = ConfigDict(from_attributes=True, extra="ignore")

    @model_validator(mode="after")
    def populate_defaults(self):
        if not getattr(self, "reference_number", None) and getattr(self, "application_number", None):
            self.reference_number = self.application_number
        if not getattr(self, "status", None) and getattr(self, "application_status", None):
            self.status = self.application_status
        return self


class ApplicationDetail(ApplicationListItem):
    applicant_info: ApplicantInfoResponse | None = None
    nominees: list[NomineeResponse] = []
    bank_detail: BankDetailResponse | None = None
    ownership_detail: OwnershipDetailResponse | None = None
    payment_detail: PaymentDetailResponse | None = None


# ---------------------------------------------------------------------------
# Status & Assignment
# ---------------------------------------------------------------------------


class StatusUpdateRequest(BaseModel):
    new_status: str | None = None
    status: str | None = None
    reason: str | None = None
    notes: str | None = None
    correction_details: str | None = None

    @model_validator(mode="after")
    def normalize_status_fields(self) -> StatusUpdateRequest:
        target = (self.new_status or self.status or "").strip().lower()
        if not target:
            raise ValueError("Status field ('new_status' or 'status') is required.")
        # Normalize frontend variant names
        if target == "action_required":
            target = "correction_required"
        self.new_status = target
        self.status = target
        self.reason = self.reason or self.notes or self.correction_details
        return self


class AssignCRRequest(BaseModel):
    cr_user_id: int


class ApplicationStatusHistoryResponse(BaseModel):
    id: int
    previous_status: str | None
    new_status: str
    changed_by_id: int
    reason: str | None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


# ---------------------------------------------------------------------------
# Remarks
# ---------------------------------------------------------------------------


class RemarkCreate(BaseModel):
    remark: str
    visibility: str = "internal"  # internal | customer_visible

    @field_validator("remark")
    @classmethod
    def validate_remark(cls, v: str) -> str:
        if len(v.strip()) < 1:
            raise ValueError("remark must not be empty.")
        return v


class RemarkResponse(RemarkCreate):
    id: int
    application_id: int
    user_id: int
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


# Request Aliases for API compatibility
ApplicationCreateRequest = ApplicationCreate
ApplicationUpdateRequest = ApplicationUpdate
ApplicationStatusUpdateRequest = StatusUpdateRequest
ApplicationAssignRequest = AssignCRRequest
class ApplicationSubmitRequest(BaseModel):
    declaration_accepted: bool = True


class ApplicationOnBehalfCreate(BaseModel):
    customer_name: str
    customer_phone: str
    customer_email: EmailStr | str | None = None
    business_id: int | str
    package_type: str | None = None
    number_of_shares: int = 1
    total_amount: Decimal | None = None
    temporary_password: str | None = None

    @field_validator("customer_email", mode="before")
    @classmethod
    def clean_email(cls, v: Any) -> Any:
        if v is None:
            return None
        if isinstance(v, str):
            v_s = v.strip()
            return v_s.lower() if v_s else None
        return v

    @field_validator("business_id", mode="before")
    @classmethod
    def clean_biz_id(cls, v: Any) -> Any:
        if isinstance(v, str) and v.strip().isdigit():
            return int(v.strip())
        return v


class EditRequestCreate(BaseModel):
    reason: str
    requested_changes: str | None = None


class EditRequestReview(BaseModel):
    action: str  # "approve" or "reject"
    admin_notes: str | None = None


class ApplicationTrackStatus(BaseModel):
    id: int
    application_number: str
    business_id: int
    business_name: str
    business_code: str
    status: str
    submission_date: date | None = None
    applicant_name: str | None = None
    customer_phone_masked: str | None = None
    created_at: datetime
    updated_at: datetime
    status_history: list[ApplicationStatusHistoryResponse] = []

    model_config = ConfigDict(from_attributes=True)



