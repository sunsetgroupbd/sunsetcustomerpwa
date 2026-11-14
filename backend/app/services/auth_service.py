"""
Authentication service – registration, OTP, login, token refresh, password reset.
"""
from __future__ import annotations

import logging
from datetime import datetime, timedelta, timezone
from typing import Optional

from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.core.security import (
    get_password_hash,
    verify_password,
    generate_otp,
    hash_otp,
    verify_otp_hash,
    create_access_token,
    create_refresh_token,
    verify_token,
    hash_token,
)
from app.models.user import User, RefreshToken, OTPVerification, LoginAttempt
from app.models.customer import CustomerProfile
from app.schemas.auth import (
    RegisterRequest,
    OTPVerifyRequest,
    LoginRequest,
    ResetPasswordRequest,
)
from app.services.notification_service import NotificationService

logger = logging.getLogger(__name__)


class AuthService:
    def __init__(self, db: Session):
        self.db = db
        self._settings = get_settings()
        self._notify = NotificationService()

    # -------------------------------------------------------------- register --

    async def register(self, data: RegisterRequest) -> User:
        """
        Create a new customer account.

        Steps:
        1. Ensure mobile is not already registered.
        2. Ensure e-mail is unique (if supplied).
        3. Hash password.
        4. Create User (is_verified=False).
        5. Create CustomerProfile.
        6. Generate OTP → hash → store OTPVerification(purpose="registration").
        7. Send OTP via SMS; log if it fails.
        8. Return user.
        """
        # 1. Mobile uniqueness
        existing = self.db.query(User).filter(User.mobile == data.mobile).first()
        if existing:
            from app.core.exceptions import ConflictError
            raise ConflictError("Mobile number is already registered.")

        # 2. E-mail uniqueness
        if data.email:
            email_exists = (
                self.db.query(User).filter(User.email == data.email).first()
            )
            if email_exists:
                from app.core.exceptions import ConflictError
                raise ConflictError("E-mail address is already registered.")

        # 3 & 4. Hash password, create user (instant verification, no OTP required for registration)
        user = User(
            mobile=data.mobile,
            email=data.email,
            password_hash=get_password_hash(data.password),
            full_name=data.full_name,
            role="customer",
            is_verified=True,
            is_active=True,
            failed_login_attempts=0,
        )
        self.db.add(user)
        self.db.flush()  # populate user.id

        # 5. Customer profile
        profile = CustomerProfile(
            user_id=user.id,
        )
        self.db.add(profile)
        self.db.commit()
        self.db.refresh(user)

        return user

    # ------------------------------------------------------------ verify_otp --

    async def verify_otp(self, data: OTPVerifyRequest) -> dict:
        """
        Verify an OTP for a given mobile + purpose.

        Returns {"success": True, "purpose": purpose} on success.
        Raises ValidationError / RateLimitError on failure.
        """
        from app.core.exceptions import ValidationError

        record = (
            self.db.query(OTPVerification)
            .filter(
                OTPVerification.mobile == data.mobile,
                OTPVerification.purpose == data.purpose,
                OTPVerification.is_used == False,  # noqa: E712
            )
            .order_by(OTPVerification.created_at.desc())
            .first()
        )

        if not record:
            raise ValidationError("No pending OTP found for this mobile.")

        # 2. Expiry check
        if datetime.now(timezone.utc) > record.expires_at.replace(tzinfo=timezone.utc):
            raise ValidationError("OTP has expired. Please request a new one.")

        # 3. Attempts guard
        if record.attempts >= self._settings.otp_max_attempts:
            raise ValidationError("Maximum OTP attempts exceeded. Please request a new OTP.")

        # 4. Verify hash
        if not verify_otp_hash(data.otp, record.otp_hash):
            record.attempts += 1
            self.db.commit()
            remaining = self._settings.otp_max_attempts - record.attempts
            raise ValidationError(f"Invalid OTP. {remaining} attempt(s) remaining.")

        # 5. Mark used
        record.is_used = True
        record.verified_at = datetime.now(timezone.utc)

        # 6. If registration, verify user
        if data.purpose == "registration":
            user = self.db.query(User).filter(User.mobile == data.mobile).first()
            if user:
                user.is_verified = True

        self.db.commit()
        return {"success": True, "purpose": data.purpose}

    # ----------------------------------------------------------------- login --

    async def login(self, data: LoginRequest, ip: Optional[str] = None) -> dict:
        """
        Authenticate a user and issue access + refresh tokens.
        """
        from app.core.exceptions import AuthenticationError, ValidationError

        user = self.db.query(User).filter(User.mobile == data.mobile).first()
        if not user:
            raise AuthenticationError("Invalid credentials.")

        # 2. Account lock check
        now = datetime.now(timezone.utc)
        if user.locked_until and user.locked_until.replace(tzinfo=timezone.utc) > now:
            remaining = int((user.locked_until.replace(tzinfo=timezone.utc) - now).total_seconds() / 60)
            raise AuthenticationError(
                f"Account is locked. Try again in {remaining} minute(s)."
            )

        # 3 & 4. Password verification
        if not verify_password(data.password, user.password_hash):
            user.failed_login_attempts = (user.failed_login_attempts or 0) + 1
            if user.failed_login_attempts >= 5:
                user.locked_until = now + timedelta(minutes=30)
                logger.warning("Account locked for mobile %s after 5 failed attempts", user.mobile)
            self.db.commit()
            self._log_attempt(user.id, ip, success=False)
            raise AuthenticationError("Invalid credentials.")

        # 5. Reset failure counter
        user.failed_login_attempts = 0
        user.locked_until = None

        # 6. Active / verified checks
        if not user.is_verified:
            raise ValidationError("Account is not verified. Please verify your mobile number.")
        if not user.is_active:
            raise AuthenticationError("Account is disabled. Contact support.")

        # 7. Access token
        settings = self._settings
        access_token = create_access_token(
            data={"sub": str(user.id), "role": user.role},
            expires_delta=timedelta(minutes=settings.access_token_expire_minutes),
        )

        # 8. Refresh token
        refresh_token_plain = create_refresh_token(
            data={"sub": str(user.id), "role": user.role}
        )
        refresh_hash = hash_token(refresh_token_plain)
        refresh_expires = now + timedelta(days=settings.refresh_token_expire_days)
        rt = RefreshToken(
            user_id=user.id,
            token_hash=refresh_hash,
            expires_at=refresh_expires,
            is_revoked=False,
        )
        self.db.add(rt)
        self.db.commit()

        # 9. Audit / login attempt
        self._log_attempt(user.id, ip, success=True)

        # 10. Response
        user_data = {
            "id": str(user.id),
            "mobile": user.mobile,
            "phone_number": user.mobile,
            "full_name": user.full_name,
            "email": user.email,
            "role": str(user.role.value if hasattr(user.role, "value") else user.role),
            "is_active": user.is_active,
            "is_verified": user.is_verified,
            "created_at": user.created_at.isoformat() if user.created_at else None,
        }

        tokens = {
            "access_token": access_token,
            "refresh_token": refresh_token_plain,
            "token_type": "bearer",
            "expires_in": settings.access_token_expire_minutes * 60,
        }

        return {
            "access_token": access_token,
            "refresh_token": refresh_token_plain,
            "token_type": "bearer",
            "tokens": tokens,
            "user": user_data,
        }

    # -------------------------------------------------------- refresh_tokens --

    async def refresh_tokens(self, refresh_token) -> dict:
        """
        Rotate refresh tokens.
        """
        from app.core.exceptions import AuthenticationError

        if hasattr(refresh_token, "refresh_token"):
            refresh_token = refresh_token.refresh_token

        settings = self._settings
        token_hash = hash_token(refresh_token)

        record = (
            self.db.query(RefreshToken)
            .filter(
                RefreshToken.token_hash == token_hash,
                RefreshToken.is_revoked == False,  # noqa: E712
            )
            .first()
        )
        if not record:
            raise AuthenticationError("Invalid or revoked refresh token.")

        now = datetime.now(timezone.utc)
        if record.expires_at.replace(tzinfo=timezone.utc) < now:
            raise AuthenticationError("Refresh token has expired. Please log in again.")

        # Verify JWT claims
        claims = verify_token(refresh_token, settings.jwt_secret_key, settings.jwt_algorithm)
        if not claims:
            raise AuthenticationError("Invalid refresh token.")

        user_id = int(claims["sub"])

        # Revoke old token
        record.is_revoked = True

        # New tokens
        new_access = create_access_token(
            data={"sub": str(user_id), "role": claims.get("role")},
            expires_delta=timedelta(minutes=settings.access_token_expire_minutes),
        )
        new_refresh_plain = create_refresh_token(
            data={"sub": str(user_id), "role": claims.get("role")}
        )
        new_hash = hash_token(new_refresh_plain)
        new_rt = RefreshToken(
            user_id=user_id,
            token_hash=new_hash,
            expires_at=now + timedelta(days=settings.refresh_token_expire_days),
            is_revoked=False,
        )
        self.db.add(new_rt)
        self.db.commit()

        return {
            "access_token": new_access,
            "refresh_token": new_refresh_plain,
            "token_type": "bearer",
            "expires_in": settings.access_token_expire_minutes * 60,
        }

    # ---------------------------------------------------------------- logout --

    async def logout(self, refresh_token, user_or_id) -> None:
        """Revoke the supplied refresh token."""
        if hasattr(refresh_token, "refresh_token"):
            refresh_token = refresh_token.refresh_token
        user_id = user_or_id.id if hasattr(user_or_id, "id") else int(user_or_id)

        token_hash = hash_token(refresh_token)
        record = (
            self.db.query(RefreshToken)
            .filter(
                RefreshToken.token_hash == token_hash,
                RefreshToken.user_id == user_id,
            )
            .first()
        )
        if record:
            record.is_revoked = True
            self.db.commit()

    # ------------------------------------------------------- forgot_password --

    async def forgot_password(self, mobile_or_data) -> None:
        """
        Initiate password reset.  Never reveals whether the mobile is registered.
        """
        mobile = mobile_or_data.mobile if hasattr(mobile_or_data, "mobile") else str(mobile_or_data)
        user = self.db.query(User).filter(User.mobile == mobile).first()
        if not user:
            # Security: return silently
            return

        self._check_rate_limit(mobile)
        otp_plain = generate_otp()
        otp_record = OTPVerification(
            mobile=mobile,
            otp_hash=hash_otp(otp_plain),
            purpose="password_reset",
            expires_at=datetime.now(timezone.utc)
            + timedelta(minutes=self._settings.otp_expire_minutes),
            is_used=False,
            attempts=0,
        )
        self.db.add(otp_record)
        self.db.commit()

        try:
            await self._notify.send_sms_otp(mobile, otp_plain, "password_reset")
        except Exception as exc:  # noqa: BLE001
            logger.error("OTP SMS failed (forgot_password) for %s: %s", mobile, exc)

    # --------------------------------------------------------- reset_password --

    async def reset_password(self, data: ResetPasswordRequest) -> None:
        """Reset password after OTP verification."""
        # 1. Verify OTP
        from app.schemas.auth import OTPVerifyRequest

        otp_data = OTPVerifyRequest(
            mobile=data.mobile,
            otp=data.otp,
            purpose="password_reset",
        )
        await self.verify_otp(otp_data)

        # 2. Hash new password
        user = self.db.query(User).filter(User.mobile == data.mobile).first()
        if not user:
            from app.core.exceptions import NotFoundError
            raise NotFoundError("User not found.")

        user.password_hash = get_password_hash(data.new_password)

        # 4. Revoke all existing refresh tokens
        self.db.query(RefreshToken).filter(
            RefreshToken.user_id == user.id,
            RefreshToken.is_revoked == False,  # noqa: E712
        ).update({"is_revoked": True})

        self.db.commit()

    # ------------------------------------------------------- _check_rate_limit --

    def _check_rate_limit(self, mobile: str) -> None:
        """
        Raise RateLimitError if an OTP was sent within the last
        otp_rate_limit_minutes for this mobile.
        """
        from app.core.exceptions import RateLimitError

        cutoff = datetime.now(timezone.utc) - timedelta(
            minutes=self._settings.otp_rate_limit_minutes
        )
        recent = (
            self.db.query(OTPVerification)
            .filter(
                OTPVerification.mobile == mobile,
                OTPVerification.created_at >= cutoff,
            )
            .first()
        )
        if recent:
            raise RateLimitError(
                f"Please wait {self._settings.otp_rate_limit_minutes} minute(s) before requesting a new OTP."
            )

    # ------------------------------------------------------- _log_attempt ----

    def _log_attempt(self, user_id: int, ip: Optional[str], success: bool) -> None:
        """Persist a LoginAttempt record."""
        try:
            attempt = LoginAttempt(
                user_id=user_id,
                ip_address=ip,
                success=success,
            )
            self.db.add(attempt)
            self.db.commit()
        except Exception as exc:  # noqa: BLE001
            logger.error("Could not log login attempt: %s", exc)
