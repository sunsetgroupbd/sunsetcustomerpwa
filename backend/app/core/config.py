from __future__ import annotations

from functools import lru_cache
from typing import List

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    # --------------------------------------------------------------------------
    # Application
    # --------------------------------------------------------------------------
    app_name: str = "Sunset Customer Application Platform"
    app_version: str = "1.0.0"
    debug: bool = False
    secret_key: str
    environment: str = "development"

    # --------------------------------------------------------------------------
    # Webhook / External Leads Integration
    # --------------------------------------------------------------------------
    external_lead_api_key: str = "sunset_lead_secret_key_2026"

    # --------------------------------------------------------------------------
    # Database
    # --------------------------------------------------------------------------
    database_url: str
    database_pool_size: int = 10
    database_max_overflow: int = 20

    # --------------------------------------------------------------------------
    # JWT / Authentication
    # --------------------------------------------------------------------------
    jwt_secret_key: str
    jwt_algorithm: str = "HS256"
    access_token_expire_minutes: int = 30
    refresh_token_expire_days: int = 7

    # --------------------------------------------------------------------------
    # OTP
    # --------------------------------------------------------------------------
    otp_expire_minutes: int = 10
    otp_max_attempts: int = 5
    otp_rate_limit_minutes: int = 2

    # --------------------------------------------------------------------------
    # AWS S3 / Object Storage
    # --------------------------------------------------------------------------
    s3_bucket_name: str = ""
    s3_access_key_id: str = ""
    s3_secret_access_key: str = ""
    s3_region: str = "ap-southeast-1"
    s3_endpoint_url: str = ""
    s3_signed_url_expire_seconds: int = 3600

    # --------------------------------------------------------------------------
    # File Upload
    # --------------------------------------------------------------------------
    max_file_size_mb: int = 10
    allowed_image_types: List[str] = ["image/jpeg", "image/png", "image/webp"]
    allowed_doc_types: List[str] = ["application/pdf", "image/jpeg", "image/png"]

    # --------------------------------------------------------------------------
    # CORS
    # --------------------------------------------------------------------------
    cors_origins: List[str] = [
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:3001",
        "http://127.0.0.1:3001",
    ]
    cors_allow_credentials: bool = True

    # --------------------------------------------------------------------------
    # Rate Limiting
    # --------------------------------------------------------------------------
    rate_limit_per_minute: int = 60
    auth_rate_limit_per_minute: int = 10

    # --------------------------------------------------------------------------
    # Redis
    # --------------------------------------------------------------------------
    redis_url: str = "redis://localhost:6379/0"

    # --------------------------------------------------------------------------
    # Email / SMTP
    # --------------------------------------------------------------------------
    smtp_host: str = ""
    smtp_port: int = 587
    smtp_user: str = ""
    smtp_password: str = ""
    email_from: str = "noreply@sunsetgroup.com"

    # --------------------------------------------------------------------------
    # SMS
    # --------------------------------------------------------------------------
    sms_api_key: str = ""
    sms_sender_id: str = "SUNSET"

    # --------------------------------------------------------------------------
    # Logging
    # --------------------------------------------------------------------------
    log_level: str = "INFO"

    model_config = SettingsConfigDict(
        env_file=(".env", "backend/.env", "../backend/.env"),
        case_sensitive=False,
        extra="ignore",
    )


@lru_cache
def get_settings() -> Settings:
    """Return a cached Settings instance (reads .env once)."""
    return Settings()
