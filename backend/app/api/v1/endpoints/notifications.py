from typing import Optional
from fastapi import APIRouter, Depends, Query, HTTPException, status
from sqlalchemy.orm import Session

from app.core.deps import get_current_active_user, get_db
from app.core.responses import success_response
from app.models.user import User
from app.schemas.notification import NotificationListResponse, NotificationResponse
from app.services.in_app_notification_service import InAppNotificationService

router = APIRouter()

@router.get("")
def get_notifications(
    unread_only: bool = Query(False, description="Filter unread notifications only"),
    limit: int = Query(50, ge=1, le=100, description="Max notifications to return"),
    offset: int = Query(0, ge=0, description="Offset for pagination"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Retrieve notifications for the current user and their role."""
    data = InAppNotificationService.get_user_notifications(
        db=db,
        user=current_user,
        unread_only=unread_only,
        limit=limit,
        offset=offset,
    )
    return success_response(
        data=NotificationListResponse.model_validate(data).model_dump(mode="json"),
        message="Notifications retrieved successfully",
    )

@router.patch("/{notification_id}/read")
def mark_notification_as_read(
    notification_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
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
    return success_response(
        data=NotificationResponse.model_validate(notification).model_dump(mode="json"),
        message="Notification marked as read",
    )

@router.post("/read-all")
def mark_all_notifications_as_read(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Mark all notifications for the current user and role as read."""
    count = InAppNotificationService.mark_all_as_read(
        db=db,
        user=current_user,
    )
    return success_response(
        data={"updated_count": count},
        message=f"{count} notifications marked as read",
    )
