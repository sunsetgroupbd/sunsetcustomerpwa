"""
Customer profile routes for the Sunset Group Customer Application Platform.
Handles customer self-service profile access and admin/CR customer management.
"""

import logging
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.core.deps import get_current_active_user, get_db, require_roles
from app.core.responses import paginated_response, success_response
from app.schemas.customer import CustomerProfileUpdate
from app.services.customer_service import CustomerService

logger = logging.getLogger(__name__)

router = APIRouter()


@router.get(
    "/me",
    status_code=status.HTTP_200_OK,
    summary="Get own profile (any authenticated role)",
)
async def get_my_profile(
    db: Session = Depends(get_db),
    current_user=Depends(get_current_active_user),
):
    """
    Return the profile of the currently authenticated user.
    Accessible by admin, cr, and customer roles.
    """
    try:
        service = CustomerService(db)
        result = await service.get_profile(current_user.id)
        return success_response(data=result, message="Profile retrieved successfully.")
    except Exception as exc:
        logger.error("Failed to retrieve profile for user %s: %s", current_user.id, exc, exc_info=True)
        raise


@router.patch(
    "/me",
    status_code=status.HTTP_200_OK,
    summary="Update own profile",
)
async def update_my_profile(
    payload: CustomerProfileUpdate,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_active_user),
):
    """
    Update the authenticated user's own profile details.
    Sensitive fields (role, is_active) cannot be changed via this endpoint.
    """
    try:
        service = CustomerService(db)
        result = await service.update_profile(current_user.id, payload)
        return success_response(data=result, message="Profile updated successfully.")
    except Exception as exc:
        logger.error("Profile update failed for user %s: %s", current_user.id, exc, exc_info=True)
        raise


@router.get(
    "/",
    status_code=status.HTTP_200_OK,
    summary="List customers (admin + CR only)",
)
async def list_customers(
    page: int = Query(1, ge=1, description="Page number"),
    per_page: int = Query(20, ge=1, le=100, description="Results per page"),
    search: Optional[str] = Query(None, description="Search by name, mobile, or email"),
    db: Session = Depends(get_db),
    current_user=Depends(require_roles(["admin", "cr"])),
):
    """
    Paginated list of all customers. Admin and CR roles only.
    Supports full-text search across name, mobile, and email.
    """
    try:
        service = CustomerService(db)
        result, total = await service.list_customers(
            page=page,
            per_page=per_page,
            search=search,
        )
        return paginated_response(
            items=result,
            total=total,
            page=page,
            per_page=per_page,
            message="Customers retrieved successfully.",
        )
    except Exception as exc:
        logger.error("Failed to list customers: %s", exc, exc_info=True)
        raise


@router.get(
    "/{customer_id}",
    status_code=status.HTTP_200_OK,
    summary="Get customer detail (admin/CR, or own profile)",
)
async def get_customer(
    customer_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_active_user),
):
    """
    Retrieve a customer's full profile by ID.
    - Admin and CR can retrieve any customer.
    - Customers can only retrieve their own profile (IDOR protection).
    """
    if current_user.role == "customer" and current_user.id != customer_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have permission to view this customer's profile.",
        )
    try:
        service = CustomerService(db)
        result = await service.get_customer(customer_id)
        return success_response(data=result, message="Customer retrieved successfully.")
    except HTTPException:
        raise
    except Exception as exc:
        logger.error("Failed to retrieve customer %s: %s", customer_id, exc, exc_info=True)
        raise
