"""
Document-related Pydantic v2 schemas.
"""

from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel, ConfigDict


class DocumentResponse(BaseModel):
    id: int
    application_id: int | None
    document_type: str
    original_filename: str
    mime_type: str
    file_size: int
    uploaded_by_id: int
    verification_status: str
    created_at: datetime
    download_url: str | None = None  # signed URL added by service layer

    model_config = ConfigDict(from_attributes=True)


class DocumentVerifyRequest(BaseModel):
    status: str  # verified | rejected
    rejection_reason: str | None = None
