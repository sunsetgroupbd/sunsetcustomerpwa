import enum
from datetime import datetime

from sqlalchemy import DateTime, Enum, ForeignKey, Integer, String, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class DocumentType(str, enum.Enum):
    NID_FRONT = "nid_front"
    NID_BACK = "nid_back"
    PASSPORT = "passport"
    PHOTOGRAPH = "photograph"
    APPLICANT_PHOTO = "applicant_photo"
    NOMINEE_PHOTO = "nominee_photo"
    NOMINEE_NID = "nominee_nid"
    SIGNATURE = "signature"
    TIN_CERTIFICATE = "tin_certificate"
    UTILITY_BILL = "utility_bill"
    BANK_STATEMENT = "bank_statement"
    OTHER = "other"
    PROFILE_PHOTO = "profile_photo"


class VerificationStatus(str, enum.Enum):
    PENDING = "pending"
    VERIFIED = "verified"
    REJECTED = "rejected"


class Document(Base):
    __tablename__ = "documents"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    application_id: Mapped[int | None] = mapped_column(
        Integer, ForeignKey("applications.id", ondelete="SET NULL"), nullable=True, index=True
    )
    document_type: Mapped[DocumentType] = mapped_column(
        Enum(DocumentType, name="documenttype"), nullable=False
    )
    file_key: Mapped[str] = mapped_column(String(500), unique=True, nullable=False)
    original_filename: Mapped[str] = mapped_column(String(500), nullable=False)
    mime_type: Mapped[str] = mapped_column(String(100), nullable=False)
    file_size: Mapped[int] = mapped_column(Integer, nullable=False)  # bytes
    uploaded_by_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("users.id", ondelete="RESTRICT"), nullable=False
    )
    verification_status: Mapped[VerificationStatus] = mapped_column(
        Enum(VerificationStatus, name="verificationstatus"),
        nullable=False,
        default=VerificationStatus.PENDING,
    )
    verified_by_id: Mapped[int | None] = mapped_column(
        Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )
    verified_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    rejection_reason: Mapped[str | None] = mapped_column(String(500), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    # Relationships
    application: Mapped["Application | None"] = relationship(  # noqa: F821
        "Application", back_populates="documents"
    )
    uploaded_by: Mapped["User"] = relationship(  # noqa: F821
        "User", foreign_keys=[uploaded_by_id]
    )
    verified_by: Mapped["User | None"] = relationship(  # noqa: F821
        "User", foreign_keys=[verified_by_id]
    )
