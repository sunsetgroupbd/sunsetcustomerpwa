"""
Service for role-wise and user-specific in-app notifications.
"""
from __future__ import annotations

import logging
from sqlalchemy import or_, desc
from sqlalchemy.orm import Session

from app.models.notification import Notification
from app.models.user import User
from app.schemas.notification import NotificationResponse

logger = logging.getLogger(__name__)


class InAppNotificationService:
    def __init__(self, db: Session | None = None):
        self.db = db

    @classmethod
    def notify(
        cls,
        db: Session,
        title: str,
        message: str,
        type: str = "info",
        role: str | None = None,
        user_id: int | None = None,
        link_url: str | None = None,
        application_id: int | None = None,
    ) -> Notification | None:
        """Create and commit an in-app notification safely."""
        try:
            notif = Notification(
                user_id=user_id,
                role=role,
                title=title,
                message=message,
                type=type,
                link_url=link_url,
                application_id=application_id,
                is_read=False,
            )
            db.add(notif)
            db.commit()
            db.refresh(notif)
            return notif
        except Exception as exc:
            db.rollback()
            logger.warning("Could not persist notification: %s", exc)
            return None

    @classmethod
    def get_user_notifications(
        cls,
        db: Session,
        user: User,
        unread_only: bool = False,
        limit: int = 50,
        offset: int = 0,
    ) -> dict:
        """Fetch notifications applicable to this user (user-specific or role broadcast)."""
        role_str = user.role.value if hasattr(user.role, "value") else str(user.role)

        conditions = [
            Notification.user_id == user.id,
            Notification.role == role_str,
        ]
        if role_str == "admin":
            conditions.append(Notification.role == "cr")

        base_query = db.query(Notification).filter(or_(*conditions))
        total_count = base_query.count()
        unread_count = base_query.filter(Notification.is_read.is_(False)).count()

        query = base_query
        if unread_only:
            query = query.filter(Notification.is_read.is_(False))

        items = query.order_by(desc(Notification.created_at)).offset(offset).limit(limit).all()

        return {
            "items": [NotificationResponse.model_validate(n) for n in items],
            "total": total_count,
            "unread_count": unread_count,
        }

    @classmethod
    def mark_as_read(
        cls,
        db: Session,
        notification_id: int,
        user: User,
    ) -> Notification | None:
        """Mark a notification as read."""
        role_str = user.role.value if hasattr(user.role, "value") else str(user.role)
        conditions = [
            Notification.user_id == user.id,
            Notification.role == role_str,
        ]
        if role_str == "admin":
            conditions.append(Notification.role == "cr")

        notif = db.query(Notification).filter(
            Notification.id == notification_id,
            or_(*conditions)
        ).first()

        if notif:
            notif.is_read = True
            db.commit()
            db.refresh(notif)
            return notif
        return None

    @classmethod
    def mark_all_as_read(
        cls,
        db: Session,
        user: User,
    ) -> int:
        """Mark all applicable notifications as read for the user."""
        role_str = user.role.value if hasattr(user.role, "value") else str(user.role)
        conditions = [
            Notification.user_id == user.id,
            Notification.role == role_str,
        ]
        if role_str == "admin":
            conditions.append(Notification.role == "cr")

        updated = db.query(Notification).filter(
            or_(*conditions),
            Notification.is_read.is_(False),
        ).update({"is_read": True}, synchronize_session="fetch")
        db.commit()
        return updated
