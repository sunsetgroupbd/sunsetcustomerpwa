from typing import Optional
from fastapi import APIRouter, Depends, Query, HTTPException, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.auth import get_current_user
from app.models.user import User
from app.schemas.notification import NotificationListResponse, NotificationResponse
from app.schemas.response import ResponseModel
from app.services.in_app_notification_service import InAppNotificationService

router = APIRouter()

@router.get("", response_model=ResponseModel[NotificationListResponse])
def get_notifications(
    unread_only: bool = Query(False, description="Filter unread notifications only"),
    limit: int = Query(50, ge=1, le=100, description="Max notifications to return"),
    offset: int = Query(0, ge=0, description="Offset for pagination"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Retrieve notifications for the current user and their role."""
    data = InAppNotificationService.get_user_notifications(
        db=db,
        user=current_user,
        unread_only=unread_only,
        limit=limit,
        offset=offset,
    )
    return ResponseModel(
        success=True,
        message="Notifications retrieved successfully",
        data=data,
    )

@router.patch("/{notification_id}/read", response_model=ResponseModel[NotificationResponse])
def mark_notification_as_read(
    notification_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Mark a specific notification as read."""
    notification = InAppNotificationService.mark_as_read(
        db=db,
        notification_id=notification_id,
        user=current_user,
    )
    if not notification:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Notification not found",
        )
    return ResponseModel(
        success=True,
        message="Notification marked as read",
        data=NotificationResponse.model_validate(notification),
    )

@router.post("/read-all", response_model=ResponseModel[dict])
def mark_all_notifications_as_read(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Mark all notifications for the current user and role as read."""
    count = InAppNotificationService.mark_all_as_read(
        db=db,
        user=current_user,
    )
    return ResponseModel(
        success=True,
        message=f"{count} notifications marked as read",
        data={"updated_count": count},
    )
