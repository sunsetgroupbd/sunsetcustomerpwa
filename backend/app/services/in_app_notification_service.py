"""
Service for role-wise and user-specific in-app notifications.
"""
from __future__ import annotations

import logging
from sqlalchemy import or_, desc
from sqlalchemy.orm import Session

from app.models.notification import Notification
from app.models.user import User
from app.schemas.notification import NotificationCreate

logger = logging.getLogger(__name__)


class InAppNotificationService:
    def __init__(self, db: Session):
        self.db = db

    def notify(
        self,
        title: str,
        message: str,
        type: str = "info",
        role: str | None = None,
        user_id: int | None = None,
        link_url: str | None = None,
        application_id: int | None = None,
    ) -> Notification | None:
        """Helper to create and commit an in-app notification safely."""
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
            self.db.add(notif)
            self.db.commit()
            self.db.refresh(notif)
            return notif
        except Exception as exc:
            self.db.rollback()
            logger.warning("Could not persist notification: %s", exc)
            return None

    def get_user_notifications(self, user: User, limit: int = 40) -> tuple[list[Notification], int]:
        """Fetch notifications applicable to this user (user-specific or role broadcast)."""
        role_str = user.role.value if hasattr(user.role, "value") else str(user.role)

        conditions = [
            Notification.user_id == user.id,
            Notification.role == role_str,
        ]
        if role_str == "admin":
            conditions.append(Notification.role == "cr")

        query = self.db.query(Notification).filter(or_(*conditions))
        unread_count = query.filter(Notification.is_read.is_(False)).count()
        items = query.order_by(desc(Notification.created_at)).limit(limit).all()
        return items, unread_count

    def mark_as_read(self, notification_id: int, user: User) -> bool:
        """Mark a notification as read."""
        role_str = user.role.value if hasattr(user.role, "value") else str(user.role)
        conditions = [
            Notification.user_id == user.id,
            Notification.role == role_str,
        ]
        if role_str == "admin":
            conditions.append(Notification.role == "cr")

        notif = self.db.query(Notification).filter(
            Notification.id == notification_id,
            or_(*conditions)
        ).first()

        if notif:
            notif.is_read = True
            self.db.commit()
            return True
        return False

    def mark_all_as_read(self, user: User) -> int:
        """Mark all applicable notifications as read for the user."""
        role_str = user.role.value if hasattr(user.role, "value") else str(user.role)
        conditions = [
            Notification.user_id == user.id,
            Notification.role == role_str,
        ]
        if role_str == "admin":
            conditions.append(Notification.role == "cr")

        updated = self.db.query(Notification).filter(
            or_(*conditions),
            Notification.is_read.is_(False),
        ).update({"is_read": True}, synchronize_session=False)
        self.db.commit()
        return updated
