"""
S3-compatible file storage service.

Wraps boto3 so the rest of the codebase never touches S3 directly.
"""
from __future__ import annotations

import logging
from io import BytesIO

import boto3
from botocore.exceptions import BotoCoreError, ClientError
from fastapi import UploadFile

from app.core.config import get_settings

logger = logging.getLogger(__name__)


class FileStorageService:
    """Upload, sign, and delete objects in an S3-compatible bucket."""

    def __init__(self):
        settings = get_settings()
        self.bucket = settings.s3_bucket_name
        self.expire_seconds = settings.s3_signed_url_expire_seconds

        kwargs: dict = {
            "aws_access_key_id": settings.s3_access_key_id,
            "aws_secret_access_key": settings.s3_secret_access_key,
            "region_name": settings.s3_region,
        }
        if settings.s3_endpoint_url:
            kwargs["endpoint_url"] = settings.s3_endpoint_url

        import boto3 as _boto3  # local import keeps module loading fast when S3 is unused
        self.client = _boto3.client("s3", **kwargs)

    # ----------------------------------------------------------------- upload --

    async def upload_file(self, file_key: str, file_data: bytes, mime_type: str) -> str:
        """
        Upload *file_data* to S3 under *file_key* with private ACL.

        Returns the file_key on success, raises StorageError on failure.
        """
        try:
            self.client.put_object(
                Bucket=self.bucket,
                Key=file_key,
                Body=file_data,
                ContentType=mime_type,
                # ACL="private",  # uncomment if bucket policy requires explicit ACL
            )
            logger.info("Uploaded %s to bucket %s", file_key, self.bucket)
            return file_key
        except (BotoCoreError, ClientError) as exc:
            logger.error("S3 upload failed for key %s: %s", file_key, exc)
            raise RuntimeError(f"File upload failed: {exc}") from exc

    # ------------------------------------------------------------ signed URL --

    async def generate_signed_url(self, file_key: str) -> str:
        """
        Generate a presigned GET URL that expires after *expire_seconds*.
        """
        try:
            url = self.client.generate_presigned_url(
                "get_object",
                Params={"Bucket": self.bucket, "Key": file_key},
                ExpiresIn=self.expire_seconds,
            )
            return url
        except (BotoCoreError, ClientError) as exc:
            logger.error("Failed to generate signed URL for %s: %s", file_key, exc)
            raise RuntimeError(f"Could not generate file URL: {exc}") from exc

    # ----------------------------------------------------------------- delete --

    async def delete_file(self, file_key: str) -> None:
        """Delete an object from S3."""
        try:
            self.client.delete_object(Bucket=self.bucket, Key=file_key)
            logger.info("Deleted %s from bucket %s", file_key, self.bucket)
        except (BotoCoreError, ClientError) as exc:
            logger.error("S3 delete failed for key %s: %s", file_key, exc)
            raise RuntimeError(f"File deletion failed: {exc}") from exc

    # --------------------------------------------------------------- helpers --

    @staticmethod
    async def get_file_size(file: UploadFile) -> int:
        """
        Return the size of an UploadFile in bytes without consuming the stream.

        Seeks to the end, reads position, then rewinds.
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
