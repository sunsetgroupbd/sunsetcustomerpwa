"""
Admin-related Pydantic v2 schemas.
"""

from __future__ import annotations

from datetime import datetime

from pydantic import AliasChoices, BaseModel, ConfigDict, EmailStr, Field


class BusinessDistributionItem(BaseModel):
    business_id: str | int
    business_name: str
    business_code: str
    count: int


class DashboardStats(BaseModel):
    total_customers: int
    total_applications: int
    applications_by_status: dict[str, int]
    applications_by_business: dict[str, int]
    pending_applications: int
    approved_applications: int
    rejected_applications: int
    returned_applications: int = 0
    today_applications: int
    this_month_applications: int
    business_distribution: list[BusinessDistributionItem] = []


class UserCreate(BaseModel):
    full_name: str
    mobile: str
    email: EmailStr | None = None
    password: str
    role: str  # admin | cr | sales | customer
    employee_id: str | None = None
    designation: str | None = None
    username: str | None = None


class UserUpdate(BaseModel):
    full_name: str | None = None
    email: EmailStr | None = None
    is_active: bool | None = None
    role: str | None = None
    employee_id: str | None = None
    designation: str | None = None
    username: str | None = None


class AuditLogResponse(BaseModel):
    id: int
    user_id: int | None
    action: str
    entity_type: str
    entity_id: str | None
    metadata: dict | None = Field(default=None, validation_alias=AliasChoices("metadata", "meta_data"))
    ip_address: str | None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True, populate_by_name=True)
