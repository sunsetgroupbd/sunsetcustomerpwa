"""
Authentication routes for the Sunset Group Customer Application Platform.
Handles registration, OTP verification, login, token refresh, logout,
forgot password, and reset password flows.
"""

import logging
from datetime import datetime, timedelta, timezone
from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.orm import Session
from slowapi import Limiter
from slowapi.util import get_remote_address

from app.core.config import get_settings
from app.core.database import get_db
from app.core.deps import get_current_active_user
from app.core.responses import success_response
from app.core.security import create_access_token, create_refresh_token, hash_token
from app.models.user import User, RefreshToken
from app.schemas.auth import (
    RegisterRequest,
    VerifyOTPRequest,
    LoginRequest,
    RefreshTokenRequest,
    LogoutRequest,
    ForgotPasswordRequest,
    ResetPasswordRequest,
    UserResponse,
)
from app.services.auth_service import AuthService

logger = logging.getLogger(__name__)

limiter = Limiter(key_func=get_remote_address)
router = APIRouter()


@router.post(
    "/register",
    status_code=status.HTTP_201_CREATED,
    summary="Register a new customer account",
)
async def register(
    payload: RegisterRequest,
    db: Session = Depends(get_db),
):
    """
    Register a new customer. Sends an OTP to the provided mobile number
    for verification. Returns the created user and authentication tokens.
    """
    try:
        service = AuthService(db)
        result = await service.register(payload)
        user_data = UserResponse.model_validate(result).model_dump(mode="json")
        user_data["phone_number"] = user_data.get("mobile", "")

        # Issue initial access and refresh tokens
        settings = get_settings()
        role_str = str(result.role.value if hasattr(result.role, "value") else result.role)
        access_token = create_access_token(
            data={"sub": str(result.id), "role": role_str},
            expires_delta=timedelta(minutes=settings.access_token_expire_minutes),
        )
        refresh_token_plain = create_refresh_token(
            data={"sub": str(result.id), "role": role_str}
        )
        rt = RefreshToken(
            user_id=result.id,
            token_hash=hash_token(refresh_token_plain),
            expires_at=datetime.now(timezone.utc) + timedelta(days=settings.refresh_token_expire_days),
            is_revoked=False,
        )
        db.add(rt)
        db.commit()

        tokens = {
            "access_token": access_token,
            "refresh_token": refresh_token_plain,
            "token_type": "bearer",
            "expires_in": settings.access_token_expire_minutes * 60,
        }

        return success_response(
            data={
                **user_data,
                "access_token": access_token,
                "refresh_token": refresh_token_plain,
                "tokens": tokens,
                "user": user_data,
            },
            message="Registration successful. Welcome to Sunset Group!",
        )
    except Exception as exc:
        logger.error("Registration failed: %s", exc, exc_info=True)
        raise


@router.post(
    "/verify-otp",
    status_code=status.HTTP_200_OK,
    summary="Verify OTP for account activation",
)
@limiter.limit("10/minute")
async def verify_otp(
    request: Request,
    payload: VerifyOTPRequest,
    db: Session = Depends(get_db),
):
    """
    Verify the OTP sent to the customer's mobile number during registration
    or other OTP-gated flows. Marks the account as verified on success.
    """
    try:
        service = AuthService(db)
        result = await service.verify_otp(payload)
        return success_response(data=result, message="OTP verified successfully.")
    except Exception as exc:
        logger.error("OTP verification failed: %s", exc, exc_info=True)
        raise


@router.post(
    "/login",
    status_code=status.HTTP_200_OK,
    summary="Authenticate and obtain tokens",
)
@limiter.limit("10/minute")
async def login(
    request: Request,
    payload: LoginRequest,
    db: Session = Depends(get_db),
):
    """
    Authenticate a user with mobile number and password.
    Returns access and refresh tokens on success.
    Rate-limited to 10 requests per minute per IP.
    """
    try:
        service = AuthService(db)
        result = await service.login(payload)
        return success_response(data=result, message="Login successful.")
    except Exception as exc:
        logger.error("Login failed for mobile ending ...%s: %s", payload.mobile[-4:] if payload.mobile else "?", exc, exc_info=True)
        raise


@router.post(
    "/refresh",
    status_code=status.HTTP_200_OK,
    summary="Refresh access token using refresh token",
)
async def refresh_tokens(
    payload: RefreshTokenRequest,
    db: Session = Depends(get_db),
):
    """
    Exchange a valid refresh token for a new access token (and optionally
    a new refresh token). The old refresh token is invalidated.
    """
    try:
        service = AuthService(db)
        result = await service.refresh_tokens(payload)
        return success_response(data=result, message="Tokens refreshed successfully.")
    except Exception as exc:
        logger.error("Token refresh failed: %s", exc, exc_info=True)
        raise


@router.post(
    "/logout",
    status_code=status.HTTP_200_OK,
    summary="Logout and invalidate refresh token",
)
async def logout(
    payload: LogoutRequest,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_active_user),
):
    """
    Invalidate the user's refresh token, effectively logging them out.
    Requires a valid access token.
    """
    try:
        service = AuthService(db)
        await service.logout(payload, current_user)
        return success_response(data=None, message="Logged out successfully.")
    except Exception as exc:
        logger.error("Logout failed for user %s: %s", getattr(current_user, "id", "?"), exc, exc_info=True)
        raise


@router.post(
    "/forgot-password",
    status_code=status.HTTP_200_OK,
    summary="Initiate forgot-password OTP flow",
)
@limiter.limit("5/minute")
async def forgot_password(
    request: Request,
    payload: ForgotPasswordRequest,
    db: Session = Depends(get_db),
):
    """
    Send a password reset OTP to the given mobile number.
    Always returns the same response regardless of whether the mobile is
    registered, to prevent user-enumeration attacks.
    """
    try:
        service = AuthService(db)
        await service.forgot_password(payload)
    except Exception as exc:
        # Silently swallow service errors – log internally only.
        logger.warning("Forgot-password request error (not exposed to client): %s", exc)
    # Always return a generic success to avoid user enumeration.
    return success_response(
        data=None,
        message="If that mobile number is registered, an OTP has been sent.",
    )


@router.post(
    "/reset-password",
    status_code=status.HTTP_200_OK,
    summary="Reset password using OTP",
)
async def reset_password(
    payload: ResetPasswordRequest,
    db: Session = Depends(get_db),
):
    """
    Reset the user's password by supplying the OTP received via SMS and the
    new password. The OTP must be valid and not expired.
    """
    try:
        service = AuthService(db)
        await service.reset_password(payload)
        return success_response(data=None, message="Password reset successfully.")
    except Exception as exc:
        logger.error("Password reset failed: %s", exc, exc_info=True)
        raise


@router.get(
    "/me",
    status_code=status.HTTP_200_OK,
    summary="Get current authenticated user profile",
)
async def get_me(
    current_user: User = Depends(get_current_active_user),
):
    """Return the profile of the currently logged in user."""
    return success_response(
        data={
            "id": str(current_user.id),
            "mobile": current_user.mobile,
            "phone_number": current_user.mobile,
            "full_name": current_user.full_name,
            "email": current_user.email,
            "role": str(current_user.role.value if hasattr(current_user.role, "value") else current_user.role),
            "is_active": current_user.is_active,
            "is_verified": current_user.is_verified,
            "created_at": current_user.created_at.isoformat() if current_user.created_at else None,
        },
        message="User profile retrieved.",
    )
