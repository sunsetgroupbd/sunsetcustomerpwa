from __future__ import annotations

import hashlib
import secrets
from datetime import datetime, timedelta, timezone
from typing import Optional

import bcrypt
from jose import JWTError, jwt

from app.core.config import get_settings


# ---------------------------------------------------------------------------
# Password helpers (direct bcrypt to avoid passlib >72 char bug)
# ---------------------------------------------------------------------------

def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Return True if *plain_password* matches *hashed_password*."""
    if not plain_password or not hashed_password:
        return False
    try:
        pw_bytes = plain_password.encode("utf-8")[:72]
        hash_bytes = hashed_password.encode("utf-8")
        return bcrypt.checkpw(pw_bytes, hash_bytes)
    except Exception:
        return False


def get_password_hash(password: str) -> str:
    """Return bcrypt hash of *password*."""
    pw_bytes = password.encode("utf-8")[:72]
    salt = bcrypt.gensalt()
    return bcrypt.hashpw(pw_bytes, salt).decode("utf-8")


# ---------------------------------------------------------------------------
# JWT helpers
# ---------------------------------------------------------------------------

def create_access_token(
    data: dict,
    expires_delta: Optional[timedelta] = None,
) -> str:
    """Create a signed JWT access token."""
    settings = get_settings()
    payload = data.copy()
    expire = datetime.now(timezone.utc) + (
        expires_delta
        if expires_delta is not None
        else timedelta(minutes=settings.access_token_expire_minutes)
    )
    payload.update({"exp": expire, "type": "access"})
    return jwt.encode(
        payload,
        settings.jwt_secret_key,
        algorithm=settings.jwt_algorithm,
    )


def create_refresh_token(data: dict) -> str:
    """Create a signed JWT refresh token with a longer lifetime."""
    settings = get_settings()
    payload = data.copy()
    expire = datetime.now(timezone.utc) + timedelta(
        days=settings.refresh_token_expire_days
    )
    payload.update({"exp": expire, "type": "refresh"})
    return jwt.encode(
        payload,
        settings.jwt_secret_key,
        algorithm=settings.jwt_algorithm,
    )


def verify_token(token: str, secret_key: str, algorithm: str) -> Optional[dict]:
    """Decode and verify *token*. Returns the payload dict or None on failure."""
    try:
        payload = jwt.decode(token, secret_key, algorithms=[algorithm])
        return payload
    except JWTError:
        return None


# ---------------------------------------------------------------------------
# OTP helpers
# ---------------------------------------------------------------------------

def generate_otp() -> str:
    """Return a cryptographically random 6-digit OTP string."""
    return str(secrets.randbelow(900000) + 100000)


def hash_otp(otp: str) -> str:
    """Return a bcrypt hash of *otp* for safe storage."""
    return get_password_hash(otp)


def verify_otp(plain_otp: str, hashed_otp: str) -> bool:
    """Return True if *plain_otp* matches *hashed_otp*."""
    return verify_password(plain_otp, hashed_otp)


verify_otp_hash = verify_otp


# ---------------------------------------------------------------------------
# Application number generator
# ---------------------------------------------------------------------------

def generate_application_number(
    business_code: str, year: int, sequence: int
) -> str:
    """Return a formatted application number, e.g. ``SKH-2024-00001``."""
    return f"{business_code}-{year}-{sequence:05d}"


# ---------------------------------------------------------------------------
# Refresh-token storage helper
# ---------------------------------------------------------------------------

def hash_token(token: str) -> str:
    """Return SHA-256 hex digest of *token* for opaque refresh-token storage."""
    return hashlib.sha256(token.encode()).hexdigest()
