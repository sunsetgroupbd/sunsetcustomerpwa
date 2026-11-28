from __future__ import annotations

import logging
from typing import Optional

from fastapi import APIRouter, Depends, Header, Query, status
from sqlalchemy.orm import Session

from app.core.deps import get_current_active_user, get_db
from app.core.config import get_settings
from app.core.exceptions import ForbiddenException, UnauthorizedException
from app.models.user import User, UserRole
from app.schemas.incoming_lead import (
    ActivateLeadRequest,
    ActivateLeadResponse,
    ExternalLeadWebhookPayload,
    ExternalLeadWebhookResponse,
    IncomingLeadListResponse,
)
from app.services.incoming_lead_service import IncomingLeadService

logger = logging.getLogger(__name__)

router = APIRouter()


# ---------------------------------------------------------------------------
# 1. External Webhook Receiver Endpoint (Secret API Key / Bearer Token Protected)
# ---------------------------------------------------------------------------
@router.post(
    "/webhook",
    response_model=ExternalLeadWebhookResponse,
    status_code=status.HTTP_200_OK,
    summary="Receive onboarded lead from external platform",
    description=(
        "Accepts POST payload from external web app when a sales person onboards a lead. "
        "Authenticates via Authorization: Bearer <key> or X-API-Key: <key>."
    ),
)
async def receive_external_lead_webhook(
    payload: ExternalLeadWebhookPayload,
    authorization: Optional[str] = Header(None, alias="Authorization"),
    x_api_key: Optional[str] = Header(None, alias="X-API-Key"),
    db: Session = Depends(get_db),
):
    settings = get_settings()
    configured_key = settings.external_lead_api_key

    # Validate secret if configured
    if configured_key:
        token = None
        if x_api_key:
            token = x_api_key.strip()
        elif authorization:
            parts = authorization.strip().split()
            if len(parts) == 2 and parts[0].lower() == "bearer":
                token = parts[1]
            else:
                token = authorization.strip()

        if not token or token != configured_key:
            logger.warning("Unauthorized external lead webhook attempt with invalid key/token.")
            raise UnauthorizedException(detail="Invalid or missing API Secret Key / Bearer Token.")

    service = IncomingLeadService(db)
    return await service.process_incoming_webhook(payload)


# ---------------------------------------------------------------------------
# 2. List Incoming Leads (Accessible by CR, Admin, Subadmin)
# ---------------------------------------------------------------------------
@router.get(
    "/",
    response_model=IncomingLeadListResponse,
    summary="List incoming external leads for CR dashboard",
)
def list_incoming_leads(
    status: Optional[str] = Query(None, description="pending, activated, or rejected"),
    search: Optional[str] = Query(None, description="Search by name, phone, or external ID"),
    page: int = Query(1, ge=1),
    limit: int = Query(50, ge=1, le=200),
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    if current_user.role not in (UserRole.cr, UserRole.admin, UserRole.subadmin):
        raise ForbiddenException(detail="Only CR officers and Administrators can access incoming leads.")

    offset = (page - 1) * limit
    service = IncomingLeadService(db)
    items, total = service.list_incoming_leads(
        status=status,
        search=search,
        limit=limit,
        offset=offset,
    )
    return IncomingLeadListResponse(items=items, total=total)


# ---------------------------------------------------------------------------
# 3. CR Action: Activate Lead & Create Customer Credential / Application
# ---------------------------------------------------------------------------
@router.post(
    "/activate",
    response_model=ActivateLeadResponse,
    status_code=status.HTTP_200_OK,
    summary="Activate incoming lead into an official customer account & application",
)
async def activate_incoming_lead(
    req: ActivateLeadRequest,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    if current_user.role not in (UserRole.cr, UserRole.admin, UserRole.subadmin):
        raise ForbiddenException(detail="Only CR officers and Administrators can activate leads.")

    service = IncomingLeadService(db)
    return await service.activate_lead(req, current_user)
