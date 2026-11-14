from datetime import datetime

from sqlalchemy import Boolean, DateTime, Integer, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class Business(Base):
    __tablename__ = "businesses"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    code: Mapped[str] = mapped_column(String(10), unique=True, nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), onupdate=func.now(), nullable=True
    )

    # Relationships
    applications: Mapped[list["Application"]] = relationship(  # noqa: F821
        "Application", back_populates="business"
    )
    pricing_configurations: Mapped[list["PricingConfiguration"]] = relationship(  # noqa: F821
        "PricingConfiguration", back_populates="business"
    )
    terms_and_conditions: Mapped[list["TermsAndConditions"]] = relationship(  # noqa: F821
        "TermsAndConditions", back_populates="business"
    )
