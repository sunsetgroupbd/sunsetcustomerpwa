import enum
from datetime import date, datetime

from sqlalchemy import (
    Boolean,
    Date,
    DateTime,
    Enum,
    ForeignKey,
    Index,
    Integer,
    Numeric,
    String,
    Text,
    UniqueConstraint,
    func,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship as sa_relationship

from app.db.base import Base


class ApplicationStatus(str, enum.Enum):
    DRAFT = "draft"
    SUBMITTED = "submitted"
    UNDER_REVIEW = "under_review"
    DOCUMENTS_REQUIRED = "documents_required"
    CORRECTION_REQUIRED = "correction_required"
    APPROVED = "approved"
    REJECTED = "rejected"
    CANCELLED = "cancelled"


class PaymentStatus(str, enum.Enum):
    PENDING = "pending"
    PARTIAL = "partial"
    PAID = "paid"
    REFUNDED = "refunded"


class Application(Base):
    __tablename__ = "applications"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    application_number: Mapped[str] = mapped_column(
        String(50), unique=True, nullable=False, index=True
    )
    customer_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("users.id", ondelete="RESTRICT"), nullable=False, index=True
    )
    business_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("businesses.id", ondelete="RESTRICT"), nullable=False, index=True
    )
    application_date: Mapped[date] = mapped_column(
        Date, server_default=func.current_date(), nullable=False
    )
    application_status: Mapped[ApplicationStatus] = mapped_column(
        Enum(ApplicationStatus, name="applicationstatus"),
        nullable=False,
        default=ApplicationStatus.DRAFT,
    )
    payment_status: Mapped[PaymentStatus] = mapped_column(
        Enum(PaymentStatus, name="paymentstatus"),
        nullable=False,
        default=PaymentStatus.PENDING,
    )
    assigned_cr_id: Mapped[int | None] = mapped_column(
        Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )
    sales_agent_id: Mapped[int | None] = mapped_column(
        Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True
    )
    is_edit_unlocked: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    declaration_accepted: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    submitted_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), onupdate=func.now(), nullable=True
    )

    # Relationships
    customer: Mapped["User"] = sa_relationship(  # noqa: F821
        "User", foreign_keys=[customer_id], backref="applications"
    )
    assigned_cr: Mapped["User | None"] = sa_relationship(  # noqa: F821
        "User", foreign_keys=[assigned_cr_id]
    )
    sales_agent: Mapped["User | None"] = sa_relationship(  # noqa: F821
        "User", foreign_keys=[sales_agent_id]
    )
    business: Mapped["Business"] = sa_relationship(  # noqa: F821
        "Business", back_populates="applications"
    )
    applicant_info: Mapped["ApplicantInfo | None"] = sa_relationship(
        "ApplicantInfo", back_populates="application", uselist=False
    )
    nominees: Mapped[list["Nominee"]] = sa_relationship(
        "Nominee", back_populates="application", cascade="all, delete-orphan"
    )

    @property
    def customer_id_number(self) -> str | None:
        return self.customer.customer_id_number if self.customer else None

    @property
    def customer_name(self) -> str | None:
        if self.applicant_info and self.applicant_info.full_name_en:
            return self.applicant_info.full_name_en
        return self.customer.full_name if self.customer else None

    @property
    def customer_phone(self) -> str | None:
        if self.applicant_info and self.applicant_info.mobile_number:
            return self.applicant_info.mobile_number
        return self.customer.mobile if self.customer else None

    @property
    def sales_agent_name(self) -> str | None:
        return self.sales_agent.full_name if self.sales_agent else None

    @property
    def sales_agent_employee_id(self) -> str | None:
        return self.sales_agent.employee_id if self.sales_agent else None

    @property
    def assigned_cr_name(self) -> str | None:
        return self.assigned_cr.full_name if self.assigned_cr else None

    @property
    def assigned_cr_employee_id(self) -> str | None:
        return self.assigned_cr.employee_id if self.assigned_cr else None

    @property
    def business_code(self) -> str | None:
        return self.business.code if self.business else None

    @property
    def business_name(self) -> str | None:
        return self.business.name if self.business else None
    bank_detail: Mapped["BankDetail | None"] = sa_relationship(
        "BankDetail", back_populates="application", uselist=False
    )
    ownership_detail: Mapped["OwnershipDetail | None"] = sa_relationship(
        "OwnershipDetail", back_populates="application", uselist=False
    )
    payment_detail: Mapped["PaymentDetail | None"] = sa_relationship(
        "PaymentDetail", back_populates="application", uselist=False
    )
    documents: Mapped[list["Document"]] = sa_relationship(  # noqa: F821
        "Document", back_populates="application"
    )
    remarks: Mapped[list["ApplicationRemark"]] = sa_relationship(
        "ApplicationRemark", back_populates="application", cascade="all, delete-orphan"
    )
    status_history: Mapped[list["ApplicationStatusHistory"]] = sa_relationship(
        "ApplicationStatusHistory", back_populates="application", cascade="all, delete-orphan"
    )
    cr_assignments: Mapped[list["CRAssignment"]] = sa_relationship(
        "CRAssignment",
        back_populates="application",
        foreign_keys="CRAssignment.application_id",
        cascade="all, delete-orphan",
    )


class ApplicantInfo(Base):
    __tablename__ = "applicant_infos"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    application_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("applications.id", ondelete="CASCADE"),
        unique=True,
        nullable=False,
    )
    full_name_en: Mapped[str | None] = mapped_column(String(255), nullable=True)
    full_name_bn: Mapped[str | None] = mapped_column(String(255), nullable=True)
    father_name: Mapped[str | None] = mapped_column(String(255), nullable=True)
    mother_name: Mapped[str | None] = mapped_column(String(255), nullable=True)
    spouse_name: Mapped[str | None] = mapped_column(String(255), nullable=True)
    present_address: Mapped[str | None] = mapped_column(Text, nullable=True)
    permanent_address: Mapped[str | None] = mapped_column(Text, nullable=True)
    mobile_number: Mapped[str | None] = mapped_column(String(20), nullable=True)
    phone_number: Mapped[str | None] = mapped_column(String(20), nullable=True)
    date_of_birth: Mapped[date | None] = mapped_column(Date, nullable=True)
    nationality: Mapped[str | None] = mapped_column(
        String(100), nullable=True, default="Bangladeshi"
    )
    religion: Mapped[str | None] = mapped_column(String(100), nullable=True)
    nid_number: Mapped[str | None] = mapped_column(String(50), nullable=True)
    passport_number: Mapped[str | None] = mapped_column(String(50), nullable=True)
    tin_number: Mapped[str | None] = mapped_column(String(50), nullable=True)
    personal_email: Mapped[str | None] = mapped_column(String(255), nullable=True)
    company_name: Mapped[str | None] = mapped_column(String(255), nullable=True)
    office_address: Mapped[str | None] = mapped_column(Text, nullable=True)
    designation: Mapped[str | None] = mapped_column(String(255), nullable=True)
    cell_number: Mapped[str | None] = mapped_column(String(20), nullable=True)
    photograph_file_id: Mapped[int | None] = mapped_column(
        Integer, ForeignKey("documents.id", ondelete="SET NULL"), nullable=True
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), onupdate=func.now(), nullable=True
    )

    application: Mapped[Application] = sa_relationship("Application", back_populates="applicant_info")
    photograph: Mapped["Document | None"] = sa_relationship(  # noqa: F821
        "Document", foreign_keys=[photograph_file_id]
    )

    @property
    def customer_id_number(self) -> str | None:
        return self.application.customer.customer_id_number if self.application and self.application.customer else None


class Nominee(Base):
    __tablename__ = "nominees"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    application_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("applications.id", ondelete="CASCADE"), nullable=False, index=True
    )
    nominee_number: Mapped[int] = mapped_column(Integer, nullable=False)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    father_or_husband_name: Mapped[str | None] = mapped_column(String(255), nullable=True)
    nid_or_passport: Mapped[str | None] = mapped_column(String(50), nullable=True)
    cell_number: Mapped[str | None] = mapped_column(String(20), nullable=True)
    relationship: Mapped[str | None] = mapped_column(String(100), nullable=True)
    date_of_birth: Mapped[date | None] = mapped_column(Date, nullable=True)
    photograph_file_id: Mapped[int | None] = mapped_column(
        Integer, ForeignKey("documents.id", ondelete="SET NULL"), nullable=True
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), onupdate=func.now(), nullable=True
    )

    __table_args__ = (
        UniqueConstraint("application_id", "nominee_number", name="uq_nominees_app_number"),
    )

    application: Mapped[Application] = sa_relationship("Application", back_populates="nominees")
    photograph: Mapped["Document | None"] = sa_relationship(  # noqa: F821
        "Document", foreign_keys=[photograph_file_id]
    )


class BankDetail(Base):
    __tablename__ = "bank_details"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    application_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("applications.id", ondelete="CASCADE"), unique=True, nullable=False
    )
    account_name: Mapped[str | None] = mapped_column(String(255), nullable=True)
    account_number: Mapped[str | None] = mapped_column(String(100), nullable=True)
    bank_name: Mapped[str | None] = mapped_column(String(255), nullable=True)
    branch: Mapped[str | None] = mapped_column(String(255), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), onupdate=func.now(), nullable=True
    )

    application: Mapped[Application] = sa_relationship("Application", back_populates="bank_detail")


class OwnershipDetail(Base):
    __tablename__ = "ownership_details"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    application_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("applications.id", ondelete="CASCADE"), unique=True, nullable=False
    )
    package: Mapped[str | None] = mapped_column(String(255), nullable=True)
    number_of_ownership: Mapped[int | None] = mapped_column(Integer, nullable=True)
    price_per_ownership: Mapped[Numeric | None] = mapped_column(  # type: ignore[type-arg]
        Numeric(12, 2), nullable=True
    )
    discount: Mapped[Numeric] = mapped_column(Numeric(12, 2), nullable=False, default=0)  # type: ignore[type-arg]
    total_price: Mapped[Numeric | None] = mapped_column(Numeric(12, 2), nullable=True)  # type: ignore[type-arg]
    amount_in_words: Mapped[str | None] = mapped_column(String(500), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), onupdate=func.now(), nullable=True
    )

    application: Mapped[Application] = sa_relationship(
        "Application", back_populates="ownership_detail"
    )


class PaymentDetail(Base):
    __tablename__ = "payment_details"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    application_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("applications.id", ondelete="CASCADE"), unique=True, nullable=False
    )
    token_money: Mapped[Numeric | None] = mapped_column(Numeric(12, 2), nullable=True)  # type: ignore[type-arg]
    booking_money: Mapped[Numeric | None] = mapped_column(Numeric(12, 2), nullable=True)  # type: ignore[type-arg]
    booking_money_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    installment_type: Mapped[str | None] = mapped_column(String(100), nullable=True)
    number_of_installments: Mapped[int | None] = mapped_column(Integer, nullable=True)
    installment_amount: Mapped[Numeric | None] = mapped_column(Numeric(12, 2), nullable=True)  # type: ignore[type-arg]
    installment_starting_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    dues_amount: Mapped[Numeric | None] = mapped_column(Numeric(12, 2), nullable=True)  # type: ignore[type-arg]
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), onupdate=func.now(), nullable=True
    )

    application: Mapped[Application] = sa_relationship(
        "Application", back_populates="payment_detail"
    )


class ApplicationRemark(Base):
    __tablename__ = "application_remarks"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    application_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("applications.id", ondelete="CASCADE"), nullable=False, index=True
    )
    user_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("users.id", ondelete="RESTRICT"), nullable=False
    )
    remark: Mapped[str] = mapped_column(Text, nullable=False)
    visibility: Mapped[str] = mapped_column(
        String(50), nullable=False, default="internal"
    )  # "internal" or "customer_visible"
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    application: Mapped[Application] = sa_relationship("Application", back_populates="remarks")
    user: Mapped["User"] = sa_relationship("User")  # noqa: F821


class ApplicationStatusHistory(Base):
    __tablename__ = "application_status_histories"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    application_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("applications.id", ondelete="CASCADE"), nullable=False, index=True
    )
    previous_status: Mapped[ApplicationStatus | None] = mapped_column(
        Enum(ApplicationStatus, name="applicationstatus"), nullable=True
    )
    new_status: Mapped[ApplicationStatus] = mapped_column(
        Enum(ApplicationStatus, name="applicationstatus"), nullable=False
    )
    changed_by_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("users.id", ondelete="RESTRICT"), nullable=False
    )
    reason: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    application: Mapped[Application] = sa_relationship(
        "Application", back_populates="status_history"
    )
    changed_by: Mapped["User"] = sa_relationship("User")  # noqa: F821


class CRAssignment(Base):
    __tablename__ = "cr_assignments"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    application_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("applications.id", ondelete="CASCADE"), nullable=False, index=True
    )
    cr_user_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("users.id", ondelete="RESTRICT"), nullable=False
    )
    assigned_by_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("users.id", ondelete="RESTRICT"), nullable=False
    )
    assigned_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)

    application: Mapped[Application] = sa_relationship(
        "Application",
        back_populates="cr_assignments",
        foreign_keys=[application_id],
    )
    cr_user: Mapped["User"] = sa_relationship("User", foreign_keys=[cr_user_id])  # noqa: F821
    assigned_by: Mapped["User"] = sa_relationship("User", foreign_keys=[assigned_by_id])  # noqa: F821


class EditRequestStatus(str, enum.Enum):
    PENDING = "pending"
    APPROVED = "approved"
    REJECTED = "rejected"


class ApplicationEditRequest(Base):
    __tablename__ = "application_edit_requests"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    application_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("applications.id", ondelete="CASCADE"), nullable=False, index=True
    )
    requested_by_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("users.id", ondelete="RESTRICT"), nullable=False
    )
    requester_role: Mapped[str] = mapped_column(String(50), nullable=False)  # "cr" or "customer"
    reason: Mapped[str] = mapped_column(Text, nullable=False)
    status: Mapped[EditRequestStatus] = mapped_column(
        Enum(EditRequestStatus, name="editrequeststatus"),
        nullable=False,
        default=EditRequestStatus.PENDING,
    )
    reviewed_by_id: Mapped[int | None] = mapped_column(
        Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )
    admin_notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    reviewed_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )

    application: Mapped[Application] = sa_relationship("Application", backref="edit_requests")
    requested_by: Mapped["User"] = sa_relationship("User", foreign_keys=[requested_by_id])  # noqa: F821
    reviewed_by: Mapped["User | None"] = sa_relationship("User", foreign_keys=[reviewed_by_id])  # noqa: F821

