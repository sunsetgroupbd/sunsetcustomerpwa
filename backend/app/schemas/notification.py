"""
Pydantic schemas for the in-app notification system.
"""
from __future__ import annotations

from datetime import datetime
from typing import Optional
from pydantic import BaseModel, ConfigDict


class NotificationCreate(BaseModel):
    user_id: Optional[int] = None
    role: Optional[str] = None
    title: str
    message: str
    type: str = "info"  # info | success | warning | action_required
    link_url: Optional[str] = None
    application_id: Optional[int] = None

    model_config = ConfigDict(extra="ignore")


class NotificationResponse(BaseModel):
    id: int
    user_id: Optional[int] = None
    role: Optional[str] = None
    title: str
    message: str
    type: str
    link_url: Optional[str] = None
    application_id: Optional[int] = None
    is_read: bool
    created_at: datetime

    model_config = ConfigDict(from_attributes=True, extra="ignore")


class NotificationListResponse(BaseModel):
    items: list[NotificationResponse]
    unread_count: int
    total: int
