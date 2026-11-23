# Import all models here so Alembic can discover them for autogenerate support.
# Order matters: base models before models with FKs pointing to them.

from app.models.user import User, RefreshToken, OTPVerification, LoginAttempt  # noqa: F401
from app.models.business import Business  # noqa: F401
from app.models.document import Document, DocumentType, VerificationStatus  # noqa: F401
from app.models.customer import CustomerProfile  # noqa: F401
from app.models.application import (  # noqa: F401
    Application,
    ApplicationStatus,
    PaymentStatus,
    ApplicantInfo,
    Nominee,
    BankDetail,
    OwnershipDetail,
    PaymentDetail,
    ApplicationRemark,
    ApplicationStatusHistory,
    CRAssignment,
)
from app.models.pricing import PricingConfiguration  # noqa: F401
from app.models.terms import TermsAndConditions  # noqa: F401
from app.models.audit import AuditLog  # noqa: F401
from app.models.notification import Notification  # noqa: F401

__all__ = [
    "User",
    "RefreshToken",
    "OTPVerification",
    "LoginAttempt",
    "Business",
    "Document",
    "DocumentType",
    "VerificationStatus",
    "CustomerProfile",
    "Application",
    "ApplicationStatus",
    "PaymentStatus",
    "ApplicantInfo",
    "Nominee",
    "BankDetail",
    "OwnershipDetail",
    "PaymentDetail",
    "ApplicationRemark",
    "ApplicationStatusHistory",
    "CRAssignment",
    "PricingConfiguration",
    "TermsAndConditions",
    "AuditLog",
    "Notification",
]
