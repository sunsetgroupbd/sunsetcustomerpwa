"""
Admin endpoints – dashboard analytics, user management, and audit log inspection.
"""

import logging
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import or_
from sqlalchemy.orm import Session

from app.core.deps import get_db, require_roles
from app.core.responses import paginated_response, success_response
from app.core.security import get_password_hash
from app.models.audit import AuditLog
from app.models.user import User
from app.schemas.admin import UserCreate, UserUpdate
from app.services.audit_service import AuditService
from app.services.dashboard_service import DashboardService

logger = logging.getLogger(__name__)

router = APIRouter(dependencies=[Depends(require_roles(["admin"]))])


# ---------------------------------------------------------------------------
# Dashboard Analytics
# ---------------------------------------------------------------------------

@router.get(
    "/dashboard",
    status_code=status.HTTP_200_OK,
    summary="Get aggregated dashboard metrics",
)
async def get_dashboard_stats(
    db: Session = Depends(get_db),
):
    """Return aggregated live business metrics from PostgreSQL."""
    try:
        service = DashboardService(db)
        stats = service.get_stats()
        return success_response(data=stats, message="Dashboard metrics retrieved.")
    except Exception as exc:
        logger.error("Failed to retrieve dashboard stats: %s", exc, exc_info=True)
        raise


@router.get(
    "/dashboard/cr-performance",
    status_code=status.HTTP_200_OK,
    summary="Get CR team performance metrics",
)
async def get_cr_performance(
    db: Session = Depends(get_db),
):
    """Return application throughput and status counts per CR team member."""
    try:
        service = DashboardService(db)
        data = service.get_cr_performance()
        return success_response(data=data, message="CR performance metrics retrieved.")
    except Exception as exc:
        logger.error("Failed to retrieve CR performance: %s", exc, exc_info=True)
        raise


@router.get(
    "/dashboard/documents",
    status_code=status.HTTP_200_OK,
    summary="Get document verification breakdown",
)
async def get_document_stats(
    db: Session = Depends(get_db),
):
    """Return count of verified, pending, and rejected documents."""
    try:
        service = DashboardService(db)
        data = service.get_document_verification_stats()
        return success_response(data=data, message="Document verification metrics retrieved.")
    except Exception as exc:
        logger.error("Failed to retrieve document metrics: %s", exc, exc_info=True)
        raise


# ---------------------------------------------------------------------------
# User Management
# ---------------------------------------------------------------------------

@router.get(
    "/users",
    status_code=status.HTTP_200_OK,
    summary="List all users",
)
async def list_users(
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    role: Optional[str] = Query(None, description="Filter by role (admin, cr, customer)"),
    search: Optional[str] = Query(None, description="Search by name, mobile, email"),
    db: Session = Depends(get_db),
):
    """Return paginated list of all system users with filtering."""
    try:
        query = db.query(User)
        if role:
            query = query.filter(User.role == role.lower())
        if search:
            s = f"%{search}%"
            query = query.filter(
                or_(User.full_name.ilike(s), User.mobile.ilike(s), User.email.ilike(s))
            )

        total = query.count()
        users = (
            query.order_by(User.id.desc())
            .offset((page - 1) * per_page)
            .limit(per_page)
            .all()
        )
        return paginated_response(
            items=users,
            total=total,
            page=page,
            per_page=per_page,
            message="Users retrieved successfully.",
        )
    except Exception as exc:
        logger.error("Failed to list users: %s", exc, exc_info=True)
        raise


@router.post(
    "/users",
    status_code=status.HTTP_201_CREATED,
    summary="Create a user (Admin, CR, or Customer)",
)
async def create_user(
    payload: UserCreate,
    db: Session = Depends(get_db),
    admin_user: User = Depends(require_roles(["admin"])),
):
    """Create a new user account with specified role and active status."""
    from app.core.exceptions import ConflictError

    # Check mobile uniqueness
    if db.query(User).filter(User.mobile == payload.mobile).first():
        raise ConflictError(f"Mobile number {payload.mobile} is already registered.")

    # Check email uniqueness if provided
    if payload.email and db.query(User).filter(User.email == payload.email).first():
        raise ConflictError(f"Email {payload.email} is already registered.")

    user = User(
        full_name=payload.full_name,
        mobile=payload.mobile,
        email=payload.email,
        password_hash=get_password_hash(payload.password),
        role=payload.role.lower(),
        is_active=True,
        is_verified=True,
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    audit = AuditService(db)
    audit.log(
        user_id=admin_user.id,
        action="admin.user_created",
        entity_type="user",
        entity_id=str(user.id),
        metadata={"created_role": user.role, "mobile": user.mobile},
    )
    db.commit()

    return success_response(
        data=user,
        message="User created successfully.",
        status_code=status.HTTP_201_CREATED,
    )


@router.get(
    "/users/{user_id}",
    status_code=status.HTTP_200_OK,
    summary="Get user by ID",
)
async def get_user(
    user_id: int,
    db: Session = Depends(get_db),
):
    """Get single user profile."""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found.")
    return success_response(data=user, message="User retrieved successfully.")


@router.patch(
    "/users/{user_id}",
    status_code=status.HTTP_200_OK,
    summary="Update user",
)
async def update_user(
    user_id: int,
    payload: UserUpdate,
    db: Session = Depends(get_db),
    admin_user: User = Depends(require_roles(["admin"])),
):
    """Update user properties (role, active state, name, email)."""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found.")

    for k, v in payload.model_dump(exclude_unset=True).items():
        setattr(user, k, v)

    db.commit()
    db.refresh(user)

    audit = AuditService(db)
    audit.log(
        user_id=admin_user.id,
        action="admin.user_updated",
        entity_type="user",
        entity_id=str(user.id),
    )
    db.commit()

    return success_response(data=user, message="User updated successfully.")


# ---------------------------------------------------------------------------
# Audit Logs
# ---------------------------------------------------------------------------

@router.get(
    "/audit-logs",
    status_code=status.HTTP_200_OK,
    summary="List audit logs",
)
async def list_audit_logs(
    page: int = Query(1, ge=1),
    per_page: int = Query(50, ge=1, le=200),
    action: Optional[str] = Query(None),
    entity_type: Optional[str] = Query(None),
    user_id: Optional[int] = Query(None),
    db: Session = Depends(get_db),
):
    """Return paginated immutable system audit trail."""
    query = db.query(AuditLog)
    if action:
        query = query.filter(AuditLog.action.ilike(f"%{action}%"))
    if entity_type:
        query = query.filter(AuditLog.entity_type == entity_type)
    if user_id:
        query = query.filter(AuditLog.user_id == user_id)

    total = query.count()
    logs = (
        query.order_by(AuditLog.id.desc())
        .offset((page - 1) * per_page)
        .limit(per_page)
        .all()
    )

    return paginated_response(
        items=logs,
        total=total,
        page=page,
        per_page=per_page,
        message="Audit logs retrieved.",
    )

