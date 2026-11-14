"""
Authentication-related Pydantic v2 schemas.
"""

from __future__ import annotations

import re
from datetime import datetime
from typing import Any

from pydantic import BaseModel, ConfigDict, EmailStr, field_validator, model_validator


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

BD_MOBILE_RE = re.compile(r"^01[3-9]\d{8}$")
PASSWORD_RE = re.compile(
    r"^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=\[\]{}|;':\",./<>?]).{8,}$"
)
OTP_RE = re.compile(r"^\d{6}$")


def _validate_bd_mobile(value: str) -> str:
    if not BD_MOBILE_RE.match(value):
        raise ValueError(
            "Mobile number must be a valid Bangladeshi number (01[3-9]XXXXXXXX)."
        )
    return value


def _validate_password(value: str) -> str:
    if len(value) < 8:
        raise ValueError("Password must be at least 8 characters long.")
    if not PASSWORD_RE.match(value):
        raise ValueError(
            "Password must contain at least one uppercase letter, one lowercase letter, "
            "one digit, and one special character."
        )
    return value


# ---------------------------------------------------------------------------
# Request schemas
# ---------------------------------------------------------------------------


class RegisterRequest(BaseModel):
    full_name: str
    mobile: str = ""
    phone_number: str = ""
    email: EmailStr | None = None
    password: str

    @model_validator(mode="before")
    @classmethod
    def normalize_fields(cls, data: Any) -> Any:
        if isinstance(data, dict):
            num = data.get("mobile") or data.get("phone_number") or ""
            data["mobile"] = num
            data["phone_number"] = num
        return data

    @field_validator("full_name")
    @classmethod
    def validate_full_name(cls, v: str) -> str:
        v = v.strip()
        if len(v) < 2:
            raise ValueError("full_name must be at least 2 characters.")
        if len(v) > 100:
            raise ValueError("full_name must be at most 100 characters.")
        return v

    @field_validator("mobile")
    @classmethod
    def validate_mobile(cls, v: str) -> str:
        return _validate_bd_mobile(v.strip())

    @field_validator("password")
    @classmethod
    def validate_password(cls, v: str) -> str:
        return _validate_password(v)


class OTPVerifyRequest(BaseModel):
    mobile: str = ""
    phone_number: str = ""
    otp: str = ""
    otp_code: str = ""
    purpose: str = "registration"  # registration | login | password_reset

    @model_validator(mode="before")
    @classmethod
    def normalize_fields(cls, data: Any) -> Any:
        if isinstance(data, dict):
            num = data.get("mobile") or data.get("phone_number") or ""
            data["mobile"] = num
            data["phone_number"] = num
            code = data.get("otp") or data.get("otp_code") or ""
            data["otp"] = code
            data["otp_code"] = code
            if "purpose" not in data or not data["purpose"]:
                data["purpose"] = "registration"
        return data

    @field_validator("otp")
    @classmethod
    def validate_otp(cls, v: str) -> str:
        if not OTP_RE.match(v):
            raise ValueError("OTP must be exactly 6 digits.")
        return v


VerifyOTPRequest = OTPVerifyRequest


class LoginRequest(BaseModel):
    mobile: str = ""
    phone_number: str = ""
    password: str

    @model_validator(mode="before")
    @classmethod
    def normalize_fields(cls, data: Any) -> Any:
        if isinstance(data, dict):
            num = data.get("mobile") or data.get("phone_number") or ""
            data["mobile"] = num
            data["phone_number"] = num
        return data


class RefreshTokenRequest(BaseModel):
    refresh_token: str


class LogoutRequest(BaseModel):
    refresh_token: str


class ForgotPasswordRequest(BaseModel):
    mobile: str


class ResetPasswordRequest(BaseModel):
    mobile: str
    otp: str
    new_password: str

    @field_validator("otp")
    @classmethod
    def validate_otp(cls, v: str) -> str:
        if not OTP_RE.match(v):
            raise ValueError("OTP must be exactly 6 digits.")
        return v

    @field_validator("new_password")
    @classmethod
    def validate_new_password(cls, v: str) -> str:
        return _validate_password(v)


# ---------------------------------------------------------------------------
# Response schemas
# ---------------------------------------------------------------------------


class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    expires_in: int  # seconds


class UserResponse(BaseModel):
    id: int
    full_name: str
    mobile: str
    email: str | None
    role: str
    is_active: bool
    is_verified: bool
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
