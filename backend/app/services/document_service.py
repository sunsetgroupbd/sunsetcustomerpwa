"""
Document service – document upload, validation, storage, signed URL generation, and verification.
"""
from __future__ import annotations

import logging
import os
import uuid
from datetime import datetime, timezone
from typing import List, Optional

from fastapi import UploadFile
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.core.exceptions import (
    AppException,
    AuthorizationError,
    NotFoundError,
    ValidationError,
)
from app.models.application import Application
from app.models.document import Document, DocumentType, VerificationStatus
from app.models.user import User
from app.schemas.document import DocumentResponse, DocumentVerifyRequest
from app.services.audit_service import AuditService
from app.services.file_storage import FileStorageService

logger = logging.getLogger(__name__)


class DocumentService:
    def __init__(self, db: Session):
        self.db = db
        self._settings = get_settings()
        self._storage = FileStorageService()
        self._audit = AuditService(db)

    async def upload_document(
        self,
        application_id: int,
        file: UploadFile,
        document_type: str,
        user: User,
    ) -> Document:
        """
        Validate file, store in S3, and record Document row in DB.
        """
        # 1. Verify application exists and user has rights
        app = self.db.query(Application).filter(Application.id == application_id).first()
        if not app:
            raise NotFoundError(f"Application {application_id} not found")

        if user.role == "customer" and app.customer_id != user.id:
            raise AuthorizationError("You do not have permission to upload documents for this application")

        # 2. Validate document_type enum
        try:
            doc_type_enum = DocumentType(document_type)
        except ValueError:
            valid_types = [e.value for e in DocumentType]
            raise ValidationError(f"Invalid document type '{document_type}'. Valid: {valid_types}")

        # 3. Read and validate content size
        content = await file.read()
        file_size = len(content)
        max_bytes = self._settings.max_file_size_mb * 1024 * 1024
        if file_size > max_bytes:
            raise ValidationError(
                f"File size exceeds maximum allowed limit of {self._settings.max_file_size_mb} MB"
            )
        if file_size == 0:
            raise ValidationError("Cannot upload empty file")

        # 4. Validate MIME type
        content_type = file.content_type or "application/octet-stream"
        allowed_types = self._settings.allowed_doc_types + self._settings.allowed_image_types
        if content_type not in allowed_types:
            raise ValidationError(
                f"Unsupported content type '{content_type}'. Allowed: {allowed_types}"
            )

        # 5. Generate secure storage key
        ext = os.path.splitext(file.filename or "")[1].lower()
        if not ext:
            ext = ".bin"
        unique_id = uuid.uuid4().hex
        file_key = f"applications/{application_id}/{document_type}/{unique_id}{ext}"

        # 6. Upload to private S3 storage
        await self._storage.upload_file(file_key, content, content_type)

        # 7. Create DB record
        doc = Document(
            application_id=application_id,
            document_type=doc_type_enum,
            file_key=file_key,
            original_filename=file.filename or "unknown",
            mime_type=content_type,
            file_size=file_size,
            uploaded_by_id=user.id,
            verification_status=VerificationStatus.PENDING,
        )
        self.db.add(doc)
        self.db.commit()
        self.db.refresh(doc)

        # 8. Audit log
        self._audit.log(
            user_id=user.id,
            action="document.uploaded",
            entity_type="document",
            entity_id=str(doc.id),
            metadata={
                "application_id": application_id,
                "document_type": document_type,
                "filename": file.filename,
                "file_size": file_size,
            },
        )
        self.db.commit()

        logger.info(
            "Document id=%d uploaded for application_id=%d by user_id=%d",
            doc.id,
            application_id,
            user.id,
        )
        return doc

    async def list_documents(
        self, application_id: int, user: User
    ) -> List[DocumentResponse]:
        """List all documents for an application with fresh signed URLs."""
        app = self.db.query(Application).filter(Application.id == application_id).first()
        if not app:
            raise NotFoundError(f"Application {application_id} not found")

        if user.role == "customer" and app.customer_id != user.id:
            raise AuthorizationError("You cannot view documents for this application")

        docs = self.db.query(Document).filter(Document.application_id == application_id).all()
        results = []
        for doc in docs:
            signed_url = None
            try:
                signed_url = await self._storage.generate_signed_url(doc.file_key)
            except Exception as e:
                logger.warning("Could not generate signed URL for doc %d: %s", doc.id, e)

            item = DocumentResponse(
                id=doc.id,
                application_id=doc.application_id,
                document_type=doc.document_type.value,
                original_filename=doc.original_filename,
                mime_type=doc.mime_type,
                file_size=doc.file_size,
                uploaded_by_id=doc.uploaded_by_id,
                verification_status=doc.verification_status.value,
                created_at=doc.created_at,
                download_url=signed_url,
            )
            results.append(item)
        return results

    async def get_document(self, document_id: int, user: User) -> DocumentResponse:
        """Get a single document with signed download URL."""
        doc = self.db.query(Document).filter(Document.id == document_id).first()
        if not doc:
            raise NotFoundError(f"Document {document_id} not found")

        if doc.application_id:
            app = self.db.query(Application).filter(Application.id == doc.application_id).first()
            if app and user.role == "customer" and app.customer_id != user.id:
                raise AuthorizationError("Access denied")

        signed_url = await self._storage.generate_signed_url(doc.file_key)
        return DocumentResponse(
            id=doc.id,
            application_id=doc.application_id,
            document_type=doc.document_type.value,
            original_filename=doc.original_filename,
            mime_type=doc.mime_type,
            file_size=doc.file_size,
            uploaded_by_id=doc.uploaded_by_id,
            verification_status=doc.verification_status.value,
            created_at=doc.created_at,
            download_url=signed_url,
        )

    async def verify_document(
        self,
        document_id: int,
        data: DocumentVerifyRequest,
        verifier: User,
    ) -> Document:
        """Verify or reject a document (CR or Admin only)."""
        if verifier.role not in ("admin", "cr"):
            raise AuthorizationError("Only CR employees or Admins can verify documents")

        doc = self.db.query(Document).filter(Document.id == document_id).first()
        if not doc:
            raise NotFoundError(f"Document {document_id} not found")

        new_status = data.status.lower()
        if new_status not in ("verified", "rejected"):
            raise ValidationError("Status must be either 'verified' or 'rejected'")

        doc.verification_status = VerificationStatus(new_status)
        doc.verified_by_id = verifier.id
        doc.verified_at = datetime.now(timezone.utc)
        if new_status == "rejected":
            doc.rejection_reason = data.rejection_reason
        else:
            doc.rejection_reason = None

        self.db.commit()
        self.db.refresh(doc)

        self._audit.log(
            user_id=verifier.id,
            action=f"document.{new_status}",
            entity_type="document",
            entity_id=str(doc.id),
            metadata={"status": new_status, "rejection_reason": data.rejection_reason},
        )
        self.db.commit()

        return doc

    async def delete_document(self, document_id: int, user: User) -> None:
        """Delete a document from S3 and DB."""
        doc = self.db.query(Document).filter(Document.id == document_id).first()
        if not doc:
            raise NotFoundError(f"Document {document_id} not found")

        if doc.application_id:
            app = self.db.query(Application).filter(Application.id == doc.application_id).first()
            if app:
                if user.role == "customer" and (app.customer_id != user.id or app.application_status.value != "draft"):
                    raise AuthorizationError("Customers can only delete documents on draft applications")

        # Delete from S3
        try:
            await self._storage.delete_file(doc.file_key)
        except Exception as e:
            logger.warning("Failed to delete file from S3 %s: %s", doc.file_key, e)

        self._audit.log(
            user_id=user.id,
            action="document.deleted",
            entity_type="document",
            entity_id=str(doc.id),
            metadata={"file_key": doc.file_key, "filename": doc.original_filename},
        )

        self.db.delete(doc)
        self.db.commit()

