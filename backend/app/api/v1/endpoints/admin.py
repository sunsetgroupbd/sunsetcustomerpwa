"""
Admin endpoints – dashboard analytics, user management, and audit log inspection.
"""

import logging
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile, File, Form, status
from sqlalchemy import or_
from sqlalchemy.orm import Session

from app.core.deps import get_db, require_roles
from app.core.responses import paginated_response, success_response
from app.core.security import get_password_hash
from app.models.audit import AuditLog
from app.models.user import User
from app.models.application import (
    Application,
    ApplicationEditRequest,
    EditRequestStatus,
    ApplicationStatus,
    ApplicantInfo,
)
from app.schemas.admin import UserCreate, UserUpdate
from app.schemas.application import EditRequestReview
from app.services.audit_service import AuditService
from app.services.dashboard_service import DashboardService
from app.services.sales_team_service import import_sales_team_csv

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
@router.get(
    "/stats",
    status_code=status.HTTP_200_OK,
    summary="Get aggregated dashboard metrics (alias)",
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
    per_page: int = Query(500, ge=1, le=5000),
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
            query.order_by(User.id.asc())
            .offset((page - 1) * per_page)
            .limit(per_page)
            .all()
        )
        user_list = [
            {
                "id": str(u.id),
                "full_name": u.full_name,
                "mobile": u.mobile,
                "phone_number": u.mobile,
                "email": u.email,
                "username": u.username,
                "employee_id": u.employee_id,
                "customer_id_number": u.customer_id_number,
                "designation": u.designation,
                "role": u.role.value if hasattr(u.role, "value") else str(u.role),
                "is_active": u.is_active,
                "is_verified": u.is_verified,
                "created_at": u.created_at.isoformat() if u.created_at else None,
            }
            for u in users
        ]
        return paginated_response(
            items=user_list,
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
        username=payload.username,
        employee_id=payload.employee_id,
        designation=payload.designation,
        password_hash=get_password_hash(payload.password),
        role=payload.role.lower(),
        is_active=True,
        is_verified=True,
    )
    db.add(user)
    db.flush()

    if user.role == "customer":
        from app.models.customer import CustomerProfile
        profile = CustomerProfile(user_id=user.id)
        db.add(profile)

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


@router.delete(
    "/users/{user_id}",
    status_code=status.HTTP_200_OK,
    summary="Delete user (Admin only)",
)
async def delete_user(
    user_id: int,
    db: Session = Depends(get_db),
    admin_user: User = Depends(require_roles(["admin"])),
):
    """Delete a user account and cleanly cascade any related records."""
    if admin_user.id == user_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You cannot delete your own admin account.",
        )

    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found.")

    deleted_mobile = user.mobile
    deleted_role = user.role.value if hasattr(user.role, "value") else str(user.role)
    deleted_name = user.full_name

    from app.models.application import (
        Application,
        ApplicantInfo,
        BankDetail,
        OwnershipDetail,
        PaymentDetail,
        Nominee,
        ApplicationRemark,
        ApplicationStatusHistory,
        CRAssignment,
        ApplicationEditRequest,
    )
    from app.models.document import Document
    from app.models.notification import Notification
    from app.models.customer import CustomerProfile
    from app.models.user import RefreshToken, OTPVerification

    # 1. If CR officer, unassign from applications
    db.query(Application).filter(Application.assigned_cr_id == user_id).update(
        {Application.assigned_cr_id: None}, synchronize_session=False
    )
    db.query(CRAssignment).filter(CRAssignment.cr_user_id == user_id).delete(synchronize_session=False)

    # 2. Clean up edit requests, remarks, status histories, and documents authored or created by this user
    db.query(ApplicationEditRequest).filter(ApplicationEditRequest.requested_by_id == user_id).delete(synchronize_session=False)
    db.query(ApplicationRemark).filter(ApplicationRemark.user_id == user_id).delete(synchronize_session=False)
    db.query(ApplicationStatusHistory).filter(ApplicationStatusHistory.changed_by_id == user_id).delete(synchronize_session=False)
    db.query(Document).filter(Document.uploaded_by_id == user_id).delete(synchronize_session=False)

    # 3. If customer, clean up their applications and all child records
    apps = db.query(Application).filter(Application.customer_id == user_id).all()
    for app in apps:
        app_id = app.id
        db.query(ApplicationEditRequest).filter(ApplicationEditRequest.application_id == app_id).delete(synchronize_session=False)
        db.query(ApplicantInfo).filter(ApplicantInfo.application_id == app_id).delete(synchronize_session=False)
        db.query(BankDetail).filter(BankDetail.application_id == app_id).delete(synchronize_session=False)
        db.query(OwnershipDetail).filter(OwnershipDetail.application_id == app_id).delete(synchronize_session=False)
        db.query(PaymentDetail).filter(PaymentDetail.application_id == app_id).delete(synchronize_session=False)
        db.query(Nominee).filter(Nominee.application_id == app_id).delete(synchronize_session=False)
        db.query(ApplicationRemark).filter(ApplicationRemark.application_id == app_id).delete(synchronize_session=False)
        db.query(ApplicationStatusHistory).filter(ApplicationStatusHistory.application_id == app_id).delete(synchronize_session=False)
        db.query(CRAssignment).filter(CRAssignment.application_id == app_id).delete(synchronize_session=False)
        db.query(Document).filter(Document.application_id == app_id).delete(synchronize_session=False)
        db.query(Notification).filter(Notification.application_id == app_id).delete(synchronize_session=False)
        db.delete(app)

    # 4. Clean up user-related records
    db.query(Notification).filter(Notification.user_id == user_id).delete(synchronize_session=False)
    db.query(CustomerProfile).filter(CustomerProfile.user_id == user_id).delete(synchronize_session=False)
    db.query(RefreshToken).filter(RefreshToken.user_id == user_id).delete(synchronize_session=False)
    db.query(OTPVerification).filter(OTPVerification.user_id == user_id).delete(synchronize_session=False)

    db.delete(user)
    db.commit()

    audit = AuditService(db)
    audit.log(
        user_id=admin_user.id,
        action="admin.user_deleted",
        entity_type="user",
        entity_id=str(user_id),
        metadata={"mobile": deleted_mobile, "name": deleted_name, "role": deleted_role},
    )
    db.commit()

    return success_response(message=f"Account for {deleted_name} ({deleted_mobile}) was deleted successfully.")


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


# ---------------------------------------------------------------------------
# Sales Team CSV Import
# ---------------------------------------------------------------------------

@router.post(
    "/users/import-sales-csv",
    status_code=status.HTTP_200_OK,
    summary="Bulk import sales team members from CSV",
)
async def import_sales_csv(
    file: Optional[UploadFile] = File(None),
    csv_text: Optional[str] = Form(None),
    db: Session = Depends(get_db),
    admin_user: User = Depends(require_roles(["admin"])),
):
    """
    Import sales team accounts from CSV file or raw CSV text.
    Columns expected: S.L, Name, Employee ID, Username, Email, Phone Number, Designation
    """
    try:
        content = ""
        if file:
            raw_bytes = await file.read()
            content = raw_bytes.decode("utf-8-sig", errors="replace")
        elif csv_text:
            content = csv_text
        else:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Please upload a CSV file or provide CSV text.",
            )

        res = import_sales_team_csv(db, content)

        audit = AuditService(db)
        audit.log(
            user_id=admin_user.id,
            action="admin.sales_team_imported",
            entity_type="sales_team",
            entity_id=str(admin_user.id),
            metadata={
                "created": res["created"],
                "updated": res["updated"],
                "total": res["total_rows"],
                "errors_count": len(res["errors"]),
            },
        )
        db.commit()

        return success_response(
            data=res,
            message=f"Successfully imported Sales Team: {res['created']} created, {res['updated']} updated.",
        )
    except HTTPException:
        raise
    except Exception as exc:
        logger.error("Failed to import sales team CSV: %s", exc, exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to process CSV: {str(exc)}",
        )


# ---------------------------------------------------------------------------
# Application Edit Requests (CR & Customer Edit Permission Flow)
# ---------------------------------------------------------------------------

@router.get(
    "/edit-requests",
    status_code=status.HTTP_200_OK,
    summary="List all application edit requests",
)
async def list_edit_requests(
    status_filter: Optional[str] = Query(None, alias="status"),
    db: Session = Depends(get_db),
):
    """Return all edit requests submitted by CR or Customers."""
    query = db.query(ApplicationEditRequest)
    if status_filter:
        query = query.filter(ApplicationEditRequest.status == status_filter)

    requests = query.order_by(ApplicationEditRequest.id.desc()).all()
    out = []
    for req in requests:
        app = db.query(Application).filter(Application.id == req.application_id).first()
        applicant = None
        if app:
            applicant = db.query(ApplicantInfo).filter(ApplicantInfo.application_id == app.id).first()
        requester = db.query(User).filter(User.id == req.requested_by_id).first()
        reviewer = (
            db.query(User).filter(User.id == req.reviewed_by_id).first()
            if req.reviewed_by_id
            else None
        )

        out.append({
            "id": req.id,
            "application_id": req.application_id,
            "application_number": app.application_number if app else "-",
            "applicant_name": applicant.full_name_en if applicant else (app.customer.full_name if app and app.customer else "-"),
            "applicant_phone": applicant.mobile_number if applicant else (app.customer.mobile if app and app.customer else "-"),
            "application_status": app.application_status.value if app else "-",
            "requested_by_id": req.requested_by_id,
            "requester_name": requester.full_name if requester else "Unknown",
            "requester_role": req.requester_role,
            "reason": req.reason,
            "status": req.status.value if hasattr(req.status, "value") else str(req.status),
            "reviewed_by_name": reviewer.full_name if reviewer else None,
            "admin_notes": req.admin_notes,
            "created_at": req.created_at.isoformat() if req.created_at else None,
            "reviewed_at": req.reviewed_at.isoformat() if req.reviewed_at else None,
        })

    return success_response(data=out, message="Edit requests retrieved successfully.")


@router.post(
    "/edit-requests/{request_id}/review",
    status_code=status.HTTP_200_OK,
    summary="Approve or reject application edit request",
)
async def review_edit_request(
    request_id: int,
    payload: EditRequestReview,
    db: Session = Depends(get_db),
    admin_user: User = Depends(require_roles(["admin"])),
):
    """
    Admin approves or rejects an edit request.
    If approved:
    - Application is_edit_unlocked is set to True.
    - Application status is set to CORRECTION_REQUIRED (or unlocked for editing).
    - Status history is recorded.
    """
    from datetime import datetime, timezone
    from app.models.application import ApplicationStatusHistory

    req = db.query(ApplicationEditRequest).filter(ApplicationEditRequest.id == request_id).first()
    if not req:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Edit request not found.")

    app = db.query(Application).filter(Application.id == req.application_id).first()
    if not app:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Application not found.")

    action = payload.action.lower().strip()
    now = datetime.now(timezone.utc)

    if action == "approve":
        req.status = EditRequestStatus.APPROVED
        req.reviewed_by_id = admin_user.id
        req.admin_notes = payload.admin_notes
        req.reviewed_at = now

        # Unlock application for editing
        app.is_edit_unlocked = True
        old_status = app.application_status
        app.application_status = ApplicationStatus.CORRECTION_REQUIRED

        # Record history
        hist = ApplicationStatusHistory(
            application_id=app.id,
            previous_status=old_status,
            new_status=ApplicationStatus.CORRECTION_REQUIRED,
            changed_by_id=admin_user.id,
            reason=f"Edit permission granted by Admin. Reason: {req.reason}",
        )
        db.add(hist)

        audit = AuditService(db)
        audit.log(
            user_id=admin_user.id,
            action="application.edit_approved",
            entity_type="application",
            entity_id=str(app.id),
            metadata={"request_id": req.id, "requested_by": req.requested_by_id, "notes": payload.admin_notes},
        )
        db.commit()

        # In-app notification to requester & customer
        try:
            from app.services.in_app_notification_service import InAppNotificationService
            InAppNotificationService.notify(
                db=db,
                user_id=req.requested_by_id,
                title="Edit Request Approved",
                message=f"Admin approved your edit request for application #{app.application_number}. Application is now unlocked for updates.",
                type="approval",
                link_url=f"/customer/apply?application_id={app.id}",
                application_id=app.id,
            )
            if req.requested_by_id != app.customer_id:
                InAppNotificationService.notify(
                    db=db,
                    user_id=app.customer_id,
                    title="Application Unlocked for Editing",
                    message=f"Application #{app.application_number} has been unlocked for corrections by Admin.",
                    type="approval",
                    link_url=f"/customer/apply?application_id={app.id}",
                    application_id=app.id,
                )
        except Exception as exc:
            logger.warning("Failed to dispatch in-app notification on edit approval: %s", exc)

        return success_response(
            data={"status": "approved", "application_id": app.id},
            message="Edit request approved. Application is now unlocked for updates.",
        )

    elif action == "reject":
        req.status = EditRequestStatus.REJECTED
        req.reviewed_by_id = admin_user.id
        req.admin_notes = payload.admin_notes
        req.reviewed_at = now

        audit = AuditService(db)
        audit.log(
            user_id=admin_user.id,
            action="application.edit_rejected",
            entity_type="application",
            entity_id=str(app.id),
            metadata={"request_id": req.id, "notes": payload.admin_notes},
        )
        db.commit()

        # In-app notification to requester
        try:
            from app.services.in_app_notification_service import InAppNotificationService
            InAppNotificationService.notify(
                db=db,
                user_id=req.requested_by_id,
                title="Edit Request Rejected",
                message=f"Admin rejected your edit request for application #{app.application_number}. {payload.admin_notes or ''}".strip(),
                type="rejection",
                link_url=f"/customer/dashboard",
                application_id=app.id,
            )
        except Exception as exc:
            logger.warning("Failed to dispatch in-app notification on edit rejection: %s", exc)

        return success_response(
            data={"status": "rejected", "application_id": app.id},
            message="Edit request has been rejected.",
        )
    else:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Action must be either 'approve' or 'reject'.",
        )


