"""
Customer-related Pydantic v2 schemas.
"""

from __future__ import annotations

from datetime import date, datetime

from pydantic import BaseModel, ConfigDict, EmailStr


# ---------------------------------------------------------------------------
# Customer Profile
# ---------------------------------------------------------------------------


class CustomerProfileBase(BaseModel):
    preferred_language: str = "en"
    address: str | None = None
    district: str | None = None
    division: str | None = None
    post_code: str | None = None
    date_of_birth: date | None = None
    gender: str | None = None
    emergency_contact: str | None = None


class CustomerProfileCreate(CustomerProfileBase):
    pass


class CustomerProfileUpdate(BaseModel):
    full_name: str | None = None
    email: EmailStr | None = None
    preferred_language: str | None = None
    address: str | None = None
    district: str | None = None
    division: str | None = None
    post_code: str | None = None
    date_of_birth: date | None = None
    gender: str | None = None
    emergency_contact: str | None = None


class CustomerProfileResponse(CustomerProfileBase):
    id: int
    user_id: int

    model_config = ConfigDict(from_attributes=True)


# ---------------------------------------------------------------------------
# Customer list / detail
# ---------------------------------------------------------------------------


class CustomerListItem(BaseModel):
    id: int
    full_name: str
    mobile: str
    email: str | None
    is_active: bool
    is_verified: bool
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class CustomerDetail(CustomerListItem):
    profile: CustomerProfileResponse | None = None


CustomerUpdateRequest = CustomerProfileUpdate

