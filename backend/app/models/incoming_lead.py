from __future__ import annotations

import enum
from datetime import datetime
from typing import Any, Optional

from sqlalchemy import DateTime, Enum, ForeignKey, Index, Integer, JSON, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class LeadActivationStatus(str, enum.Enum):
    pending = "pending"
    activated = "activated"
    rejected = "rejected"


class IncomingLead(Base):
    """
    Stores leads received via external API / Webhook integration from another CRM/Web App.
    CR Officers can inspect lead particulars, notes, and call history,
    and activate the lead into an official Customer Account & Application.
    """
    __tablename__ = "incoming_leads"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)

    # External platform references
    external_lead_id: Mapped[str | None] = mapped_column(String(100), nullable=True, index=True)
    event_type: Mapped[str | None] = mapped_column(String(100), nullable=True, default="lead.onboarded")

    # Lead core info
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    phone: Mapped[str] = mapped_column(String(20), nullable=False, index=True)
    email: Mapped[str | None] = mapped_column(String(255), nullable=True)
    status_raw: Mapped[str | None] = mapped_column(String(50), nullable=True)
    source: Mapped[str | None] = mapped_column(String(100), nullable=True)
    lead_date: Mapped[str | None] = mapped_column(String(50), nullable=True)
    last_called_at: Mapped[str | None] = mapped_column(String(100), nullable=True)
    total_calls_count: Mapped[int] = mapped_column(Integer, default=0)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)

    # Sales / Owner info from external platform
    owner_info: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    onboarded_by_info: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    external_onboarded_at: Mapped[str | None] = mapped_column(String(100), nullable=True)

    # Call history records from external platform
    call_history: Mapped[list | None] = mapped_column(JSON, nullable=True)

    # Full raw payload snapshot
    raw_payload: Mapped[dict | None] = mapped_column(JSON, nullable=True)

    # Activation lifecycle in Sunset Platform
    activation_status: Mapped[LeadActivationStatus] = mapped_column(
        Enum(LeadActivationStatus, name="leadactivationstatus", native_enum=False),
        default=LeadActivationStatus.pending,
        nullable=False,
        index=True,
    )
    activated_by_id: Mapped[int | None] = mapped_column(
        Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )
    activated_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    # Linked generated entities
    customer_user_id: Mapped[int | None] = mapped_column(
        Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )
    application_id: Mapped[int | None] = mapped_column(
        Integer, ForeignKey("applications.id", ondelete="SET NULL"), nullable=True
    )

    activation_notes: Mapped[str | None] = mapped_column(Text, nullable=True)

    # Timestamps
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False
    )

    __table_args__ = (
        Index("ix_incoming_leads_phone_status", "phone", "activation_status"),
        Index("ix_incoming_leads_created_at", "created_at"),
    )

    # Relationships
    activated_by: Mapped["User | None"] = relationship("User", foreign_keys=[activated_by_id])  # noqa: F821
    customer_user: Mapped["User | None"] = relationship("User", foreign_keys=[customer_user_id])  # noqa: F821
    application: Mapped["Application | None"] = relationship("Application", foreign_keys=[application_id])  # noqa: F821
