"""
S3-compatible file storage service with local filesystem fallback.

Wraps boto3 so the rest of the codebase never touches S3 directly.
"""
from __future__ import annotations

import logging
import os
from io import BytesIO
from pathlib import Path

from fastapi import UploadFile

from app.core.config import get_settings

logger = logging.getLogger(__name__)

LOCAL_UPLOADS_DIR = Path(__file__).resolve().parent.parent.parent / "uploads"


class FileStorageService:
    """Upload, sign, and delete objects in an S3-compatible bucket with local fallback."""

    def __init__(self):
        settings = get_settings()
        self.bucket = settings.s3_bucket_name
        self.expire_seconds = settings.s3_signed_url_expire_seconds
        self.is_dummy_s3 = (
            not settings.s3_access_key_id
            or "your_aws" in settings.s3_access_key_id.lower()
            or settings.s3_access_key_id == "changeme"
        )

        self.client = None
        if not self.is_dummy_s3:
            try:
                kwargs: dict = {
                    "aws_access_key_id": settings.s3_access_key_id,
                    "aws_secret_access_key": settings.s3_secret_access_key,
                    "region_name": settings.s3_region,
                }
                if settings.s3_endpoint_url:
                    kwargs["endpoint_url"] = settings.s3_endpoint_url

                import boto3 as _boto3
                self.client = _boto3.client("s3", **kwargs)
            except Exception as e:
                logger.warning("Could not initialize S3 client: %s; using local storage fallback", e)
                self.is_dummy_s3 = True

    # ----------------------------------------------------------------- upload --

    async def upload_file(self, file_key: str, file_data: bytes, mime_type: str) -> str:
        """
        Upload file_data to S3 or local filesystem under file_key.
        """
        if not self.is_dummy_s3 and self.client:
            try:
                self.client.put_object(
                    Bucket=self.bucket,
                    Key=file_key,
                    Body=file_data,
                    ContentType=mime_type,
                )
                logger.info("Uploaded %s to S3 bucket %s", file_key, self.bucket)
                return file_key
            except Exception as exc:
                logger.warning("S3 upload failed for key %s: %s; storing locally instead", file_key, exc)

        # Local storage fallback
        target = LOCAL_UPLOADS_DIR / file_key
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_bytes(file_data)
        logger.info("Saved %s to local storage: %s", file_key, target)
        return file_key

    # ------------------------------------------------------------ signed URL --

    async def generate_signed_url(self, file_key: str) -> str:
        """
        Generate a presigned GET URL that expires after expire_seconds, or local download URL.
        """
        target = LOCAL_UPLOADS_DIR / file_key
        if target.exists() or self.is_dummy_s3 or not self.client:
            return f"/api/v1/uploads/{file_key}"

        try:
            url = self.client.generate_presigned_url(
                "get_object",
                Params={"Bucket": self.bucket, "Key": file_key},
                ExpiresIn=self.expire_seconds,
            )
            return url
        except Exception:
            return f"/api/v1/uploads/{file_key}"

    # ----------------------------------------------------------------- delete --

    async def delete_file(self, file_key: str) -> None:
        """Delete an object from S3 or local filesystem."""
        target = LOCAL_UPLOADS_DIR / file_key
        if target.exists():
            try:
                target.unlink(missing_ok=True)
                logger.info("Deleted local file %s", target)
            except Exception as exc:
                logger.warning("Failed to delete local file %s: %s", target, exc)

        if not self.is_dummy_s3 and self.client:
            try:
                self.client.delete_object(Bucket=self.bucket, Key=file_key)
                logger.info("Deleted %s from S3 bucket %s", file_key, self.bucket)
            except Exception as exc:
                logger.warning("S3 delete failed for key %s: %s", file_key, exc)

    # --------------------------------------------------------------- helpers --

    @staticmethod
    async def get_file_size(file: UploadFile) -> int:
        """
        Return the size of an UploadFile in bytes without consuming the stream.
        """
        await file.seek(0, 2)          # seek to end
        size = file.tell() if hasattr(file.file, "tell") else 0  # type: ignore[attr-defined]
        await file.seek(0)             # rewind for the actual read
        if size:
            return size
        # Fallback: read entire content to measure
        data = await file.read()
        await file.seek(0)
        return len(data)
