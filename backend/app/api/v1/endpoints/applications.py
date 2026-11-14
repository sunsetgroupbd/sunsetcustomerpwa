"""
Application routes for the Sunset Group Customer Application Platform.

Covers the full application lifecycle:
  - Application CRUD and submission
  - CR assignment and status transitions
  - Nested nominees, documents, and remarks sub-resources
"""

import logging
from typing import Optional

from fastapi import (
    APIRouter,
    Depends,
    File,
    Form,
    HTTPException,
    Query,
    UploadFile,
    status,
)
from sqlalchemy.orm import Session

from app.core.deps import get_current_active_user, get_db, require_roles
from app.core.responses import paginated_response, success_response
from app.schemas.application import (
    ApplicationCreate,
    ApplicationUpdate,
    AssignCRRequest,
    NomineeCreate,
    NomineeUpdate,
    RemarkCreate,
    StatusUpdateRequest,
)
from app.schemas.document import DocumentVerifyRequest
from app.services.application_service import ApplicationService
from app.services.document_service import DocumentService

logger = logging.getLogger(__name__)

router = APIRouter()


# ---------------------------------------------------------------------------
# Core application routes
# ---------------------------------------------------------------------------

@router.post(
    "/",
    status_code=status.HTTP_201_CREATED,
    summary="Create a new application (customer or CR)",
)
async def create_application(
    payload: ApplicationCreate,
    db: Session = Depends(get_db),
    current_user=Depends(require_roles(["customer", "cr", "admin"])),
):
    """
    Create a draft application for a business division.
    Customers create for themselves; CR/admin may specify or own it.
    """
    try:
        service = ApplicationService(db)
        customer_id = current_user.id
        result = await service.create_application(
            customer_id=customer_id,
            business_id=payload.business_id,
            data=payload,
        )
        return success_response(
            data=result,
            message="Application created successfully.",
            status_code=status.HTTP_201_CREATED,
        )
    except Exception as exc:
        logger.error("Failed to create application: %s", exc, exc_info=True)
        raise


@router.get(
    "/",
    status_code=status.HTTP_200_OK,
    summary="List applications (filtered by role)",
)
async def list_applications(
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    search: Optional[str] = Query(None),
    status_filter: Optional[str] = Query(None, alias="status"),
    business_id: Optional[int] = Query(None),
    payment_status: Optional[str] = Query(None),
    assigned_cr_id: Optional[int] = Query(None),
    db: Session = Depends(get_db),
    current_user=Depends(get_current_active_user),
):
    """
    Return a paginated list of applications.
    - Customers see only their own applications.
    - CR sees assigned applications.
    - Admin sees all applications.
    """
    try:
        service = ApplicationService(db)
        filters = {
            "search": search,
            "status": status_filter,
            "business_id": business_id,
            "payment_status": payment_status,
            "assigned_cr_id": assigned_cr_id,
        }
        result, total = await service.list_applications(
            user=current_user,
            filters=filters,
            page=page,
            per_page=per_page,
        )
        return paginated_response(
            items=result,
            total=total,
            page=page,
            per_page=per_page,
            message="Applications retrieved successfully.",
        )
    except Exception as exc:
        logger.error("Failed to list applications: %s", exc, exc_info=True)
        raise


@router.get(
    "/{application_id}",
    status_code=status.HTTP_200_OK,
    summary="Get application detail",
)
async def get_application(
    application_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_active_user),
):
    """Retrieve full detail of a single application, including sub-models."""
    try:
        service = ApplicationService(db)
        app = await service.get_application(application_id, current_user)
        return success_response(data=app, message="Application retrieved successfully.")
    except HTTPException:
        raise
    except Exception as exc:
        logger.error("Failed to retrieve application %s: %s", application_id, exc, exc_info=True)
        raise


@router.patch(
    "/{application_id}",
    status_code=status.HTTP_200_OK,
    summary="Update application (draft or correction_required)",
)
async def update_application(
    application_id: int,
    payload: ApplicationUpdate,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_active_user),
):
    """Update application fields."""
    try:
        service = ApplicationService(db)
        result = await service.update_application(application_id, payload, current_user)
        return success_response(data=result, message="Application updated successfully.")
    except HTTPException:
        raise
    except Exception as exc:
        logger.error("Failed to update application %s: %s", application_id, exc, exc_info=True)
        raise


@router.post(
    "/{application_id}/submit",
    status_code=status.HTTP_200_OK,
    summary="Submit application for review",
)
async def submit_application(
    application_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_active_user),
):
    """Transition an application from DRAFT to SUBMITTED."""
    try:
        service = ApplicationService(db)
        result = await service.submit_application(application_id, current_user)
        return success_response(data=result, message="Application submitted successfully.")
    except HTTPException:
        raise
    except Exception as exc:
        logger.error("Failed to submit application %s: %s", application_id, exc, exc_info=True)
        raise


@router.post(
    "/{application_id}/assign",
    status_code=status.HTTP_200_OK,
    summary="Assign CR to application (admin only)",
)
async def assign_cr(
    application_id: int,
    payload: AssignCRRequest,
    db: Session = Depends(get_db),
    current_user=Depends(require_roles(["admin"])),
):
    """Assign a Customer Relations officer to the application. Admin role required."""
    try:
        service = ApplicationService(db)
        result = await service.assign_cr(
            application_id=application_id,
            cr_user_id=payload.cr_user_id,
            assigned_by=current_user,
        )
        return success_response(data=result, message="CR assigned successfully.")
    except HTTPException:
        raise
    except Exception as exc:
        logger.error("Failed to assign CR to application %s: %s", application_id, exc, exc_info=True)
        raise


@router.post(
    "/{application_id}/status",
    status_code=status.HTTP_200_OK,
    summary="Update application status (CR / admin)",
)
async def update_status(
    application_id: int,
    payload: StatusUpdateRequest,
    db: Session = Depends(get_db),
    current_user=Depends(require_roles(["cr", "admin"])),
):
    """Transition the application's status per valid state machine transitions."""
    try:
        service = ApplicationService(db)
        result = await service.update_status(application_id, payload, current_user)
        return success_response(data=result, message="Application status updated successfully.")
    except HTTPException:
        raise
    except Exception as exc:
        logger.error("Failed to update status for application %s: %s", application_id, exc, exc_info=True)
        raise


@router.get(
    "/{application_id}/history",
    status_code=status.HTTP_200_OK,
    summary="Get application status history",
)
async def get_application_history(
    application_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_active_user),
):
    """Return the full status-change history for an application."""
    try:
        service = ApplicationService(db)
        result = await service.get_history(application_id, current_user)
        return success_response(data=result, message="Status history retrieved successfully.")
    except HTTPException:
        raise
    except Exception as exc:
        logger.error("Failed to retrieve history for application %s: %s", application_id, exc, exc_info=True)
        raise


# ---------------------------------------------------------------------------
# Nominees sub-resource
# ---------------------------------------------------------------------------

@router.post(
    "/{application_id}/nominees",
    status_code=status.HTTP_201_CREATED,
    summary="Add nominee to application",
)
async def add_nominee(
    application_id: int,
    payload: NomineeCreate,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_active_user),
):
    """Add a nominee (maximum 2 allowed) to an application."""
    try:
        service = ApplicationService(db)
        result = await service.add_nominee(application_id, payload, current_user)
        return success_response(
            data=result,
            message="Nominee added successfully.",
            status_code=status.HTTP_201_CREATED,
        )
    except HTTPException:
        raise
    except Exception as exc:
        logger.error("Failed to add nominee to application %s: %s", application_id, exc, exc_info=True)
        raise


@router.patch(
    "/{application_id}/nominees/{nominee_id}",
    status_code=status.HTTP_200_OK,
    summary="Update nominee",
)
async def update_nominee(
    application_id: int,
    nominee_id: int,
    payload: NomineeUpdate,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_active_user),
):
    """Update nominee details."""
    try:
        service = ApplicationService(db)
        result = await service.update_nominee(application_id, nominee_id, payload, current_user)
        return success_response(data=result, message="Nominee updated successfully.")
    except HTTPException:
        raise
    except Exception as exc:
        logger.error("Failed to update nominee %s on application %s: %s", nominee_id, application_id, exc, exc_info=True)
        raise


@router.delete(
    "/{application_id}/nominees/{nominee_id}",
    status_code=status.HTTP_200_OK,
    summary="Remove nominee",
)
async def delete_nominee(
    application_id: int,
    nominee_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_active_user),
):
    """Remove a nominee from an application."""
    try:
        service = ApplicationService(db)
        await service.delete_nominee(application_id, nominee_id, current_user)
        return success_response(message="Nominee deleted successfully.")
    except HTTPException:
        raise
    except Exception as exc:
        logger.error("Failed to delete nominee %s from application %s: %s", nominee_id, application_id, exc, exc_info=True)
        raise


# ---------------------------------------------------------------------------
# Documents sub-resource
# ---------------------------------------------------------------------------

@router.post(
    "/{application_id}/documents",
    status_code=status.HTTP_201_CREATED,
    summary="Upload a document for an application",
)
async def upload_document(
    application_id: int,
    document_type: str = Form(..., description="Document type (applicant_photo, nid_front, etc.)"),
    file: UploadFile = File(..., description="File to upload"),
    db: Session = Depends(get_db),
    current_user=Depends(get_current_active_user),
):
    """Upload a document to S3 storage and associate it with the application."""
    try:
        doc_service = DocumentService(db)
        result = await doc_service.upload_document(
            application_id=application_id,
            file=file,
            document_type=document_type,
            user=current_user,
        )
        return success_response(
            data=result,
            message="Document uploaded successfully.",
            status_code=status.HTTP_201_CREATED,
        )
    except HTTPException:
        raise
    except Exception as exc:
        logger.error("Failed to upload document for application %s: %s", application_id, exc, exc_info=True)
        raise


@router.get(
    "/{application_id}/documents",
    status_code=status.HTTP_200_OK,
    summary="List all documents for an application",
)
async def list_documents(
    application_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_active_user),
):
    """List all documents for an application with fresh secure signed URLs."""
    try:
        doc_service = DocumentService(db)
        result = await doc_service.list_documents(application_id, current_user)
        return success_response(data=result, message="Documents retrieved successfully.")
    except HTTPException:
        raise
    except Exception as exc:
        logger.error("Failed to list documents for application %s: %s", application_id, exc, exc_info=True)
        raise


@router.delete(
    "/{application_id}/documents/{document_id}",
    status_code=status.HTTP_200_OK,
    summary="Delete a document",
)
async def delete_document(
    application_id: int,
    document_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_active_user),
):
    """Delete a document from S3 storage and database."""
    try:
        doc_service = DocumentService(db)
        await doc_service.delete_document(document_id, current_user)
        return success_response(message="Document deleted successfully.")
    except HTTPException:
        raise
    except Exception as exc:
        logger.error("Failed to delete document %s: %s", document_id, exc, exc_info=True)
        raise


@router.post(
    "/{application_id}/documents/{document_id}/verify",
    status_code=status.HTTP_200_OK,
    summary="Verify or reject a document (CR / admin)",
)
async def verify_document(
    application_id: int,
    document_id: int,
    payload: DocumentVerifyRequest,
    db: Session = Depends(get_db),
    current_user=Depends(require_roles(["cr", "admin"])),
):
    """Mark a document as verified or rejected."""
    try:
        doc_service = DocumentService(db)
        result = await doc_service.verify_document(document_id, payload, current_user)
        return success_response(data=result, message="Document verification updated.")
    except HTTPException:
        raise
    except Exception as exc:
        logger.error("Failed to verify document %s: %s", document_id, exc, exc_info=True)
        raise


# ---------------------------------------------------------------------------
# Remarks sub-resource
# ---------------------------------------------------------------------------

@router.post(
    "/{application_id}/remarks",
    status_code=status.HTTP_201_CREATED,
    summary="Add a remark to an application",
)
async def add_remark(
    application_id: int,
    payload: RemarkCreate,
    db: Session = Depends(get_db),
    current_user=Depends(require_roles(["cr", "admin", "customer"])),
):
    """Add a remark (internal or customer-visible) to the application."""
    try:
        # Customers can only add customer_visible remarks
        visibility = payload.visibility
        if current_user.role == "customer":
            visibility = "customer_visible"

        service = ApplicationService(db)
        result = await service.add_remark(
            application_id=application_id,
            remark_text=payload.remark,
            visibility=visibility,
            user=current_user,
        )
        return success_response(
            data=result,
            message="Remark added successfully.",
            status_code=status.HTTP_201_CREATED,
        )
    except HTTPException:
        raise
    except Exception as exc:
        logger.error("Failed to add remark to application %s: %s", application_id, exc, exc_info=True)
        raise


@router.get(
    "/{application_id}/remarks",
    status_code=status.HTTP_200_OK,
    summary="Get remarks for an application",
)
async def get_remarks(
    application_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_active_user),
):
    """
    Retrieve remarks. Customers see customer_visible remarks;
    CR and Admin see all remarks.
    """
    try:
        service = ApplicationService(db)
        result = await service.list_remarks(application_id, current_user)
        return success_response(data=result, message="Remarks retrieved successfully.")
    except HTTPException:
        raise
    except Exception as exc:
        logger.error("Failed to retrieve remarks for application %s: %s", application_id, exc, exc_info=True)
        raise
