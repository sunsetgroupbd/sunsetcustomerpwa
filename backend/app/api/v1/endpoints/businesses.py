"""
Business routes for the Sunset Group Customer Application Platform.
Handles business listing, detail retrieval, creation, and updates.
"""

import logging
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.core.deps import get_current_active_user, get_db, require_roles
from app.core.responses import paginated_response, success_response
from app.schemas.business import BusinessCreate, BusinessUpdate, BusinessResponse
from app.services.business_service import BusinessService

logger = logging.getLogger(__name__)

router = APIRouter()


@router.get(
    "/",
    status_code=status.HTTP_200_OK,
    summary="List active businesses (public / authenticated)",
)
async def list_businesses(
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    search: Optional[str] = Query(None, description="Search by business name"),
    db: Session = Depends(get_db),
):
    """
    Return a paginated list of all active businesses.
    Accessible without authentication (or by any authenticated user).
    """
    try:
        service = BusinessService(db)
        result, total = await service.list_active_businesses(
            page=page, per_page=per_page, search=search
        )
        items = [BusinessResponse.model_validate(b).model_dump(mode="json") for b in result]
        return paginated_response(
            items=items,
            total=total,
            page=page,
            per_page=per_page,
            message="Businesses retrieved successfully.",
        )
    except Exception as exc:
        logger.error("Failed to list businesses: %s", exc, exc_info=True)
        raise


@router.get(
    "/{business_id}",
    status_code=status.HTTP_200_OK,
    summary="Get business detail with pricing and active terms (authenticated)",
)
async def get_business(
    business_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_active_user),
):
    """
    Return full business detail including pricing tiers and currently active
    terms & conditions. Requires authentication.
    """
    try:
        service = BusinessService(db)
        result = await service.get_business(business_id)
        return success_response(data=result, message="Business retrieved successfully.")
    except HTTPException:
        raise
    except Exception as exc:
        logger.error("Failed to retrieve business %s: %s", business_id, exc, exc_info=True)
        raise


@router.post(
    "/",
    status_code=status.HTTP_201_CREATED,
    summary="Create a new business (admin only)",
)
async def create_business(
    payload: BusinessCreate,
    db: Session = Depends(get_db),
    current_user=Depends(require_roles(["admin"])),
):
    """
    Create a new business entity. Admin role required.
    """
    try:
        service = BusinessService(db)
        result = await service.create_business(payload)
        return success_response(
            data=result,
            message="Business created successfully.",
            status_code=status.HTTP_201_CREATED,
        )
    except Exception as exc:
        logger.error("Failed to create business: %s", exc, exc_info=True)
        raise


@router.patch(
    "/{business_id}",
    status_code=status.HTTP_200_OK,
    summary="Update a business (admin only)",
)
async def update_business(
    business_id: int,
    payload: BusinessUpdate,
    db: Session = Depends(get_db),
    current_user=Depends(require_roles(["admin"])),
):
    """
    Update an existing business's details, pricing, or terms.
    Admin role required.
    """
    try:
        service = BusinessService(db)
        result = await service.update_business(business_id, payload)
        return success_response(data=result, message="Business updated successfully.")
    except HTTPException:
        raise
    except Exception as exc:
        logger.error("Failed to update business %s: %s", business_id, exc, exc_info=True)
        raise
