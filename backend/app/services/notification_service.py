"""
Notification service – SMS and e-mail OTP delivery.

Both methods silently absorb errors (log but do not raise) so that a
transient provider outage never crashes the auth flow.
"""
from __future__ import annotations

import logging
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart

import httpx

from app.core.config import get_settings

logger = logging.getLogger(__name__)


class NotificationService:
    """Thin wrapper around external SMS / SMTP providers."""

    # ------------------------------------------------------------------ SMS --

    async def send_sms_otp(self, mobile: str, otp: str, purpose: str) -> bool:
        """
        Send a one-time password via SMS.

        Returns True on success, False on any failure (never raises).
        """
        settings = get_settings()
        if not settings.sms_api_key or settings.sms_api_key in ("your_sms_api_key", "changeme", "placeholder"):
            logger.info("[DEV MODE] OTP SMS for %s (%s): %s", mobile, purpose, otp)
            return True

        purpose_label = self._purpose_label(purpose)
        message = f"Your {purpose_label} OTP is {otp}. Valid for {settings.otp_expire_minutes} minutes. Do not share."

        try:
            # Generic HTTP-based SMS gateway call.
            # Adjust the URL / payload to match the actual provider.
            async with httpx.AsyncClient(timeout=10) as client:
                response = await client.post(
                    "https://api.smsprovider.example.com/send",  # override via settings if needed
                    json={
                        "api_key": settings.sms_api_key,
                        "sender_id": settings.sms_sender_id,
                        "to": mobile,
                        "message": message,
                    },
                )
                if response.status_code == 200:
                    logger.info("OTP SMS sent to %s for purpose=%s", mobile, purpose)
                    return True
                else:
                    logger.error(
                        "SMS provider returned %s for %s: %s",
                        response.status_code,
                        mobile,
                        response.text,
                    )
                    return False
        except Exception as exc:  # noqa: BLE001
            logger.error("Failed to send OTP SMS to %s: %s", mobile, exc)
            return False

    # ---------------------------------------------------------------- E-mail --

    async def send_email_otp(self, email: str, otp: str, purpose: str) -> bool:
        """
        Send a one-time password via SMTP.

        Returns True on success, False on any failure (never raises).
        """
        settings = get_settings()
        if not settings.smtp_host:
            logger.warning("SMTP not configured – skipping e-mail OTP to %s", email)
            return False

        purpose_label = self._purpose_label(purpose)
        subject = f"Your {purpose_label} OTP – Sunset Group"
        body = (
            f"Hello,\n\n"
            f"Your {purpose_label} OTP is: {otp}\n\n"
            f"This code is valid for {settings.otp_expire_minutes} minutes.\n"
            f"Do not share it with anyone.\n\n"
            f"Regards,\nSunset Group"
        )

        msg = MIMEMultipart("alternative")
        msg["Subject"] = subject
        msg["From"] = settings.email_from
        msg["To"] = email
        msg.attach(MIMEText(body, "plain"))

        try:
            with smtplib.SMTP(settings.smtp_host, settings.smtp_port, timeout=10) as server:
                server.ehlo()
                server.starttls()
                if settings.smtp_user and settings.smtp_password:
                    server.login(settings.smtp_user, settings.smtp_password)
                server.sendmail(settings.email_from, [email], msg.as_string())
            logger.info("OTP e-mail sent to %s for purpose=%s", email, purpose)
            return True
        except Exception as exc:  # noqa: BLE001
            logger.error("Failed to send OTP e-mail to %s: %s", email, exc)
            return False

    # ---------------------------------------------------------------- helpers --

    @staticmethod
    def _purpose_label(purpose: str) -> str:
        labels = {
            "registration": "Registration",
            "password_reset": "Password Reset",
            "login": "Login Verification",
        }
        return labels.get(purpose, purpose.replace("_", " ").title())
