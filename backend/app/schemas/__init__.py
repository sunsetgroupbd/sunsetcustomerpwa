"""
app/schemas/__init__.py

Exports all public schema classes for convenient importing.
"""

from app.schemas.admin import AuditLogResponse, DashboardStats, UserCreate, UserUpdate
from app.schemas.application import (
    ApplicantInfoCreate,
    ApplicantInfoResponse,
    ApplicantInfoUpdate,
    ApplicationCreate,
    ApplicationDetail,
    ApplicationListItem,
    ApplicationStatusHistoryResponse,
    ApplicationUpdate,
    AssignCRRequest,
    BankDetailCreate,
    BankDetailResponse,
    NomineeCreate,
    NomineeResponse,
    NomineeUpdate,
    OwnershipDetailCreate,
    OwnershipDetailResponse,
    PaymentDetailCreate,
    PaymentDetailResponse,
    RemarkCreate,
    RemarkResponse,
    StatusUpdateRequest,
)
from app.schemas.auth import (
    ForgotPasswordRequest,
    LoginRequest,
    LogoutRequest,
    OTPVerifyRequest,
    RefreshTokenRequest,
    RegisterRequest,
    ResetPasswordRequest,
    TokenResponse,
    UserResponse,
)
from app.schemas.business import BusinessCreate, BusinessResponse, BusinessUpdate
from app.schemas.customer import (
    CustomerDetail,
    CustomerListItem,
    CustomerProfileCreate,
    CustomerProfileResponse,
    CustomerProfileUpdate,
)
from app.schemas.document import DocumentResponse, DocumentVerifyRequest
from app.schemas.export import ExportFilters, ExportResponse

__all__ = [
    # auth
    "RegisterRequest",
    "OTPVerifyRequest",
    "LoginRequest",
    "RefreshTokenRequest",
    "LogoutRequest",
    "ForgotPasswordRequest",
    "ResetPasswordRequest",
    "TokenResponse",
    "UserResponse",
    # customer
    "CustomerProfileCreate",
    "CustomerProfileUpdate",
    "CustomerProfileResponse",
    "CustomerListItem",
    "CustomerDetail",
    # business
    "BusinessCreate",
    "BusinessUpdate",
    "BusinessResponse",
    # application
    "ApplicantInfoCreate",
    "ApplicantInfoUpdate",
    "ApplicantInfoResponse",
    "NomineeCreate",
    "NomineeUpdate",
    "NomineeResponse",
    "BankDetailCreate",
    "BankDetailResponse",
    "OwnershipDetailCreate",
    "OwnershipDetailResponse",
    "PaymentDetailCreate",
    "PaymentDetailResponse",
    "ApplicationCreate",
    "ApplicationUpdate",
    "ApplicationListItem",
    "ApplicationDetail",
    "StatusUpdateRequest",
    "AssignCRRequest",
    "ApplicationStatusHistoryResponse",
    "RemarkCreate",
    "RemarkResponse",
    # document
    "DocumentResponse",
    "DocumentVerifyRequest",
    # admin
    "DashboardStats",
    "UserCreate",
    "UserUpdate",
    "AuditLogResponse",
    # export
    "ExportFilters",
    "ExportResponse",
]
