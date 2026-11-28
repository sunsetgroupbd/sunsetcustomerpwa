from __future__ import annotations

from datetime import datetime
from typing import Any, List, Optional
from pydantic import BaseModel, Field


# ---------------------------------------------------------------------------
# Schemas for External Lead Webhook (matching user payload)
# ---------------------------------------------------------------------------

class ExternalLeadOwner(BaseModel):
    id: Optional[Any] = None
    name: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    employee_id: Optional[str] = None
    designation: Optional[str] = None


class ExternalLeadOnboardedBy(BaseModel):
    id: Optional[Any] = None
    name: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    employee_id: Optional[str] = None


class ExternalLeadCallHistoryItem(BaseModel):
    to_status: Optional[str] = None
    called_at: Optional[str] = None
    caller_name: Optional[str] = None
    notes: Optional[str] = None


class ExternalLeadData(BaseModel):
    id: Optional[Any] = None
    name: str = Field(..., description="Customer / Lead full name")
    phone: str = Field(..., description="Bangladeshi mobile number e.g. 01720420331")
    email: Optional[str] = None
    status: Optional[str] = None
    source: Optional[str] = None
    lead_date: Optional[str] = None
    last_called_at: Optional[str] = None
    total_calls_count: Optional[int] = 0
    notes: Optional[str] = None
    owner: Optional[ExternalLeadOwner] = None
    onboarded_by: Optional[ExternalLeadOnboardedBy] = None
    onboarded_at: Optional[str] = None
    call_history: Optional[List[ExternalLeadCallHistoryItem]] = None


class ExternalLeadWebhookPayload(BaseModel):
    event: Optional[str] = "lead.onboarded"
    timestamp: Optional[str] = None
    lead: ExternalLeadData


class ExternalLeadWebhookResponse(BaseModel):
    success: bool
    message: str
    incoming_lead_id: int
    is_duplicate: bool = False


# ---------------------------------------------------------------------------
# Schemas for CR Dashboard Lead Management & Activation
# ---------------------------------------------------------------------------

class IncomingLeadListItem(BaseModel):
    id: int
    external_lead_id: Optional[str] = None
    event_type: Optional[str] = None
    name: str
    phone: str
    email: Optional[str] = None
    status_raw: Optional[str] = None
    source: Optional[str] = None
    lead_date: Optional[str] = None
    last_called_at: Optional[str] = None
    total_calls_count: int = 0
    notes: Optional[str] = None
    owner_info: Optional[dict] = None
    onboarded_by_info: Optional[dict] = None
    external_onboarded_at: Optional[str] = None
    call_history: Optional[list] = None
    activation_status: str
    activated_by_id: Optional[int] = None
    activated_by_name: Optional[str] = None
    activated_at: Optional[datetime] = None
    customer_user_id: Optional[int] = None
    customer_id_number: Optional[str] = None
    application_id: Optional[int] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class IncomingLeadListResponse(BaseModel):
    items: List[IncomingLeadListItem]
    total: int


class ActivateLeadRequest(BaseModel):
    lead_id: int
    business_id: Optional[int] = None
    temp_password: Optional[str] = "Sunset@123"
    send_sms: Optional[bool] = True
    custom_notes: Optional[str] = None


class ActivateLeadResponse(BaseModel):
    success: bool
    message: str
    lead_id: int
    customer_id: int
    customer_name: str
    phone_number: str
    temp_password: str
    application_id: int
    reference_number: str
    sms_sent: bool = False
