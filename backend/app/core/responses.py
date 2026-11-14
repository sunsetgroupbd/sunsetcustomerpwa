from __future__ import annotations

from math import ceil
from typing import Any, Generic, List, Optional, TypeVar

from fastapi import Query
from pydantic import BaseModel, Field

T = TypeVar("T")


# ---------------------------------------------------------------------------
# Pagination
# ---------------------------------------------------------------------------

class PaginationParams(BaseModel):
    """Common query-parameter model for paginated endpoints."""

    page: int = Field(default=1, ge=1, description="Page number (1-based)")
    page_size: int = Field(default=20, ge=1, le=100, description="Items per page")

    @property
    def offset(self) -> int:
        return (self.page - 1) * self.page_size

    @property
    def limit(self) -> int:
        return self.page_size


def get_pagination(
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
) -> PaginationParams:
    """FastAPI dependency that extracts pagination query params."""
    return PaginationParams(page=page, page_size=page_size)


# ---------------------------------------------------------------------------
# Standard envelope models
# ---------------------------------------------------------------------------

class Meta(BaseModel):
    """Metadata block attached to paginated responses."""

    total: int
    page: int
    page_size: int
    total_pages: int


class SuccessResponse(BaseModel):
    """Generic single-item success response."""

    success: bool = True
    message: str = "Operation completed successfully"
    data: Optional[Any] = None


class PaginatedResponse(BaseModel):
    """Generic paginated list response."""

    success: bool = True
    message: str = "Data retrieved successfully"
    data: List[Any] = []
    meta: Meta


class ErrorResponse(BaseModel):
    """Standard error envelope."""

    success: bool = False
    error_code: str
    message: str
    details: Optional[Any] = None


# ---------------------------------------------------------------------------
# Builder functions
# ---------------------------------------------------------------------------

def success_response(
    data: Any = None,
    message: str = "Operation completed successfully",
) -> dict:
    """Return a serialisable dict for a successful single-resource response."""
    return {
        "success": True,
        "message": message,
        "data": data,
    }


def paginated_response(
    data: Optional[List[Any]] = None,
    total: int = 0,
    pagination: Optional[PaginationParams] = None,
    items: Optional[List[Any]] = None,
    page: int = 1,
    per_page: int = 20,
    message: str = "Data retrieved successfully",
    **kwargs: Any,
) -> dict:
    """Return a serialisable dict for a paginated list response."""
    actual_data = items if items is not None else (data if data is not None else [])
    current_page = pagination.page if pagination else page
    page_size = pagination.page_size if pagination else per_page
    total_pages = ceil(total / page_size) if page_size else 1
    return {
        "success": True,
        "message": message,
        "data": actual_data,
        "meta": {
            "total": total,
            "page": current_page,
            "page_size": page_size,
            "total_pages": total_pages,
        },
    }


def error_response(
    error_code: str,
    message: str,
    details: Optional[Any] = None,
) -> dict:
    """Return a serialisable dict for an error response."""
    return {
        "success": False,
        "error_code": error_code,
        "message": message,
        "details": details,
    }


def created_response(
    data: Any = None,
    message: str = "Resource created successfully",
) -> dict:
    """Convenience wrapper for 201 Created responses."""
    return success_response(data=data, message=message)
