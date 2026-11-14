from __future__ import annotations

from typing import Any, Optional

from fastapi import HTTPException, status


class AppException(HTTPException):
    """Base application exception — carries a machine-readable *error_code*."""

    def __init__(
        self,
        status_code: int,
        error_code: str,
        detail: str,
        headers: Optional[dict] = None,
    ) -> None:
        super().__init__(status_code=status_code, detail=detail, headers=headers)
        self.error_code = error_code


# ---------------------------------------------------------------------------
# 400 Bad Request
# ---------------------------------------------------------------------------

class BadRequestException(AppException):
    def __init__(self, detail: str = "Bad request") -> None:
        super().__init__(
            status_code=status.HTTP_400_BAD_REQUEST,
            error_code="BAD_REQUEST",
            detail=detail,
        )


class InvalidInputException(AppException):
    def __init__(self, detail: str = "Invalid input provided") -> None:
        super().__init__(
            status_code=status.HTTP_400_BAD_REQUEST,
            error_code="INVALID_INPUT",
            detail=detail,
        )


# ---------------------------------------------------------------------------
# 401 Unauthorized
# ---------------------------------------------------------------------------

class UnauthorizedException(AppException):
    def __init__(self, detail: str = "Authentication required") -> None:
        super().__init__(
            status_code=status.HTTP_401_UNAUTHORIZED,
            error_code="UNAUTHORIZED",
            detail=detail,
            headers={"WWW-Authenticate": "Bearer"},
        )


class InvalidCredentialsException(AppException):
    def __init__(self, detail: str = "Invalid credentials") -> None:
        super().__init__(
            status_code=status.HTTP_401_UNAUTHORIZED,
            error_code="INVALID_CREDENTIALS",
            detail=detail,
            headers={"WWW-Authenticate": "Bearer"},
        )


class TokenExpiredException(AppException):
    def __init__(self, detail: str = "Token has expired") -> None:
        super().__init__(
            status_code=status.HTTP_401_UNAUTHORIZED,
            error_code="TOKEN_EXPIRED",
            detail=detail,
            headers={"WWW-Authenticate": "Bearer"},
        )


class InvalidTokenException(AppException):
    def __init__(self, detail: str = "Invalid token") -> None:
        super().__init__(
            status_code=status.HTTP_401_UNAUTHORIZED,
            error_code="INVALID_TOKEN",
            detail=detail,
            headers={"WWW-Authenticate": "Bearer"},
        )


# ---------------------------------------------------------------------------
# 403 Forbidden
# ---------------------------------------------------------------------------

class ForbiddenException(AppException):
    def __init__(self, detail: str = "You do not have permission to perform this action") -> None:
        super().__init__(
            status_code=status.HTTP_403_FORBIDDEN,
            error_code="FORBIDDEN",
            detail=detail,
        )


class InsufficientPermissionsException(AppException):
    def __init__(self, detail: str = "Insufficient permissions") -> None:
        super().__init__(
            status_code=status.HTTP_403_FORBIDDEN,
            error_code="INSUFFICIENT_PERMISSIONS",
            detail=detail,
        )


class AccountInactiveException(AppException):
    def __init__(self, detail: str = "Account is inactive") -> None:
        super().__init__(
            status_code=status.HTTP_403_FORBIDDEN,
            error_code="ACCOUNT_INACTIVE",
            detail=detail,
        )


class AccountNotVerifiedException(AppException):
    def __init__(self, detail: str = "Account is not verified") -> None:
        super().__init__(
            status_code=status.HTTP_403_FORBIDDEN,
            error_code="ACCOUNT_NOT_VERIFIED",
            detail=detail,
        )


# ---------------------------------------------------------------------------
# 404 Not Found
# ---------------------------------------------------------------------------

class NotFoundException(AppException):
    def __init__(self, resource: str = "Resource", detail: Optional[str] = None) -> None:
        super().__init__(
            status_code=status.HTTP_404_NOT_FOUND,
            error_code="NOT_FOUND",
            detail=detail or f"{resource} not found",
        )


# ---------------------------------------------------------------------------
# 409 Conflict
# ---------------------------------------------------------------------------

class ConflictException(AppException):
    def __init__(self, detail: str = "Resource already exists") -> None:
        super().__init__(
            status_code=status.HTTP_409_CONFLICT,
            error_code="CONFLICT",
            detail=detail,
        )


class DuplicateEntryException(AppException):
    def __init__(self, field: str = "field", detail: Optional[str] = None) -> None:
        super().__init__(
            status_code=status.HTTP_409_CONFLICT,
            error_code="DUPLICATE_ENTRY",
            detail=detail or f"A record with this {field} already exists",
        )


# ---------------------------------------------------------------------------
# 422 Unprocessable Entity
# ---------------------------------------------------------------------------

class ValidationException(AppException):
    def __init__(self, detail: str = "Validation error") -> None:
        super().__init__(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            error_code="VALIDATION_ERROR",
            detail=detail,
        )


# ---------------------------------------------------------------------------
# 429 Too Many Requests
# ---------------------------------------------------------------------------

class RateLimitException(AppException):
    def __init__(self, detail: str = "Too many requests. Please try again later.") -> None:
        super().__init__(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            error_code="RATE_LIMIT_EXCEEDED",
            detail=detail,
        )


class OTPRateLimitException(AppException):
    def __init__(self, detail: str = "OTP request limit exceeded. Please wait before requesting again.") -> None:
        super().__init__(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            error_code="OTP_RATE_LIMIT",
            detail=detail,
        )


class OTPMaxAttemptsException(AppException):
    def __init__(self, detail: str = "Maximum OTP verification attempts exceeded") -> None:
        super().__init__(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            error_code="OTP_MAX_ATTEMPTS",
            detail=detail,
        )


# ---------------------------------------------------------------------------
# 500 Internal Server Error
# ---------------------------------------------------------------------------

class InternalServerException(AppException):
    def __init__(self, detail: str = "An internal server error occurred") -> None:
        super().__init__(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            error_code="INTERNAL_ERROR",
            detail=detail,
        )


class StorageException(AppException):
    def __init__(self, detail: str = "File storage operation failed") -> None:
        super().__init__(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            error_code="STORAGE_ERROR",
            detail=detail,
        )


# ---------------------------------------------------------------------------
# Domain-specific exceptions
# ---------------------------------------------------------------------------

class InvalidFileTypeException(AppException):
    def __init__(self, detail: str = "File type not allowed") -> None:
        super().__init__(
            status_code=status.HTTP_400_BAD_REQUEST,
            error_code="INVALID_FILE_TYPE",
            detail=detail,
        )


class FileTooLargeException(AppException):
    def __init__(self, max_mb: int = 10) -> None:
        super().__init__(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            error_code="FILE_TOO_LARGE",
            detail=f"File exceeds the maximum allowed size of {max_mb} MB",
        )


class ApplicationStatusException(AppException):
    def __init__(self, detail: str = "Invalid application status transition") -> None:
        super().__init__(
            status_code=status.HTTP_400_BAD_REQUEST,
            error_code="INVALID_STATUS_TRANSITION",
            detail=detail,
        )


# Aliases for backward/service-layer compatibility
AuthenticationError = UnauthorizedException
AuthorizationError = ForbiddenException
ForbiddenError = ForbiddenException
NotFoundError = NotFoundException
ConflictError = ConflictException
ValidationError = InvalidInputException
BadRequestError = BadRequestException
RateLimitError = RateLimitException
InvalidStatusTransitionError = ApplicationStatusException
FileUploadError = InvalidFileTypeException
InternalError = InternalServerException

