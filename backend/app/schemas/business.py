"""
Business-related Pydantic v2 schemas.
"""

from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel, ConfigDict


# ---------------------------------------------------------------------------
# Business
# ---------------------------------------------------------------------------


class BusinessBase(BaseModel):
    name: str
    code: str
    description: str | None = None
    is_active: bool = True


class BusinessCreate(BusinessBase):
    pass


class BusinessUpdate(BaseModel):
    name: str | None = None
    description: str | None = None
    is_active: bool | None = None


class BusinessResponse(BusinessBase):
    id: int
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


BusinessCreateRequest = BusinessCreate
BusinessUpdateRequest = BusinessUpdate

