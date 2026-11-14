"""
Export-related Pydantic v2 schemas.
"""

from __future__ import annotations

from datetime import date, datetime

from pydantic import BaseModel


class ExportFilters(BaseModel):
    business_id: int | None = None
    date_from: date | None = None
    date_to: date | None = None
    application_status: str | None = None
    payment_status: str | None = None
    assigned_cr_id: int | None = None
    search: str | None = None


class ExportResponse(BaseModel):
    download_url: str
    filename: str
    record_count: int
    expires_at: datetime | None = None
