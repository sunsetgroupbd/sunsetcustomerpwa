"""
Audit logging service.
"""
from __future__ import annotations

from typing import Optional

from sqlalchemy.orm import Session

from app.models.audit import AuditLog


class AuditService:
    def __init__(self, db: Session):
        self.db = db

    def log(
        self,
        user_id: Optional[int],
        action: str,
        entity_type: str,
        entity_id: Optional[str] = None,
        metadata: Optional[dict] = None,
        ip_address: Optional[str] = None,
        user_agent: Optional[str] = None,
    ) -> None:
        """Create an AuditLog record."""
        entry = AuditLog(
            user_id=user_id,
            action=action,
            entity_type=entity_type,
            entity_id=entity_id,
            metadata=metadata or {},
            ip_address=ip_address,
            user_agent=user_agent,
        )
        self.db.add(entry)
        self.db.flush()  # persist within current transaction without committing
