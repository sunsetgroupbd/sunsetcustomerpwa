"""
Application-related Pydantic v2 schemas.
"""

from __future__ import annotations

from datetime import date, datetime
from decimal import Decimal

from pydantic import BaseModel, ConfigDict, field_validator


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
    passport_number: str | None = None
    tin_number: str | None = None
    personal_email: str | None = None
    company_name: str | None = None
    office_address: str | None = None
    designation: str | None = None
    cell_number: str | None = None
    photograph_file_id: int | None = None


class ApplicantInfoUpdate(ApplicantInfoCreate):
    pass


class ApplicantInfoResponse(ApplicantInfoCreate):
    id: int
    application_id: int
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


# ---------------------------------------------------------------------------
# Nominee
# ---------------------------------------------------------------------------


class NomineeCreate(BaseModel):
    nominee_number: int  # 1 or 2
    name: str | None = None
    father_or_husband_name: str | None = None
    nid_or_passport: str | None = None
    cell_number: str | None = None
    relationship: str | None = None
    date_of_birth: date | None = None
    photograph_file_id: int | None = None

    @field_validator("nominee_number")
    @classmethod
    def validate_nominee_number(cls, v: int) -> int:
        if v not in (1, 2):
            raise ValueError("nominee_number must be 1 or 2.")
        return v


class NomineeUpdate(NomineeCreate):
    pass


class NomineeResponse(NomineeCreate):
    id: int
    application_id: int
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


# ---------------------------------------------------------------------------
# Bank Detail
# ---------------------------------------------------------------------------


class BankDetailCreate(BaseModel):
    account_name: str | None = None
    account_number: str | None = None
    bank_name: str | None = None
    branch: str | None = None


class BankDetailResponse(BankDetailCreate):
    id: int
    application_id: int

    model_config = ConfigDict(from_attributes=True)


# ---------------------------------------------------------------------------
# Ownership Detail
# ---------------------------------------------------------------------------


class OwnershipDetailCreate(BaseModel):
    package: str | None = None
    number_of_ownership: int | None = None
    price_per_ownership: Decimal | None = None
    discount: Decimal = Decimal("0")
    total_price: Decimal | None = None
    amount_in_words: str | None = None


class OwnershipDetailResponse(OwnershipDetailCreate):
    id: int
    application_id: int

    model_config = ConfigDict(from_attributes=True)


# ---------------------------------------------------------------------------
# Payment Detail
# ---------------------------------------------------------------------------


class PaymentDetailCreate(BaseModel):
    token_money: Decimal | None = None
    booking_money: Decimal | None = None
    booking_money_date: date | None = None
    installment_type: str | None = None
    number_of_installments: int | None = None
    installment_amount: Decimal | None = None
    installment_starting_date: date | None = None
    dues_amount: Decimal | None = None


class PaymentDetailResponse(PaymentDetailCreate):
    id: int
    application_id: int

    model_config = ConfigDict(from_attributes=True)


# ---------------------------------------------------------------------------
# Application
# ---------------------------------------------------------------------------


class ApplicationCreate(BaseModel):
    business_id: int
    applicant_info: ApplicantInfoCreate | None = None
    bank_detail: BankDetailCreate | None = None
    ownership_detail: OwnershipDetailCreate | None = None
    payment_detail: PaymentDetailCreate | None = None


class ApplicationUpdate(BaseModel):
    applicant_info: ApplicantInfoUpdate | None = None
    bank_detail: BankDetailCreate | None = None
    ownership_detail: OwnershipDetailCreate | None = None
    payment_detail: PaymentDetailCreate | None = None
    declaration_accepted: bool | None = None


class ApplicationListItem(BaseModel):
    id: int
    application_number: str
    customer_id: int
    business_id: int
    application_status: str
    payment_status: str
    assigned_cr_id: int | None
    declaration_accepted: bool
    submitted_at: datetime | None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


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
    new_status: str
    reason: str | None = None


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

