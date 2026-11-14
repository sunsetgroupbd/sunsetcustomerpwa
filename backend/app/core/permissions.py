from __future__ import annotations

from enum import Enum
from typing import Set

from fastapi import Depends

from app.core.exceptions import ForbiddenException, InsufficientPermissionsException


# ---------------------------------------------------------------------------
# Permission atoms
# ---------------------------------------------------------------------------

class Permission(str, Enum):
    # Customer management
    CUSTOMER_CREATE = "customer:create"
    CUSTOMER_READ = "customer:read"
    CUSTOMER_UPDATE = "customer:update"
    CUSTOMER_DELETE = "customer:delete"

    # Application management
    APPLICATION_CREATE = "application:create"
    APPLICATION_READ = "application:read"
    APPLICATION_UPDATE = "application:update"
    APPLICATION_DELETE = "application:delete"
    APPLICATION_SUBMIT = "application:submit"
    APPLICATION_APPROVE = "application:approve"
    APPLICATION_REJECT = "application:reject"
    APPLICATION_ASSIGN = "application:assign"

    # Document management
    DOCUMENT_UPLOAD = "document:upload"
    DOCUMENT_READ = "document:read"
    DOCUMENT_VERIFY = "document:verify"
    DOCUMENT_DELETE = "document:delete"

    # Business management
    BUSINESS_READ = "business:read"
    BUSINESS_CREATE = "business:create"
    BUSINESS_UPDATE = "business:update"
    BUSINESS_DELETE = "business:delete"

    # User / staff management
    USER_CREATE = "user:create"
    USER_READ = "user:read"
    USER_UPDATE = "user:update"
    USER_DELETE = "user:delete"

    # Remarks
    REMARK_CREATE = "remark:create"
    REMARK_READ = "remark:read"

    # Exports
    EXPORT_DATA = "export:data"

    # Admin-only
    ADMIN_DASHBOARD = "admin:dashboard"
    AUDIT_LOG_READ = "audit:read"
    PRICING_MANAGE = "pricing:manage"
    TERMS_MANAGE = "terms:manage"


# ---------------------------------------------------------------------------
# Role → Permission mapping
# ---------------------------------------------------------------------------

ROLE_PERMISSIONS: dict[str, Set[Permission]] = {
    "admin": set(Permission),  # admins have every permission

    "cr": {
        # Customer relations officers can create/read/update customers & applications
        Permission.CUSTOMER_CREATE,
        Permission.CUSTOMER_READ,
        Permission.CUSTOMER_UPDATE,
        Permission.APPLICATION_CREATE,
        Permission.APPLICATION_READ,
        Permission.APPLICATION_UPDATE,
        Permission.APPLICATION_SUBMIT,
        Permission.DOCUMENT_UPLOAD,
        Permission.DOCUMENT_READ,
        Permission.REMARK_CREATE,
        Permission.REMARK_READ,
        Permission.BUSINESS_READ,
    },

    "customer": {
        Permission.CUSTOMER_READ,
        Permission.APPLICATION_CREATE,
        Permission.APPLICATION_READ,
        Permission.APPLICATION_SUBMIT,
        Permission.DOCUMENT_UPLOAD,
        Permission.DOCUMENT_READ,
        Permission.REMARK_READ,
        Permission.BUSINESS_READ,
    },

    "viewer": {
        Permission.CUSTOMER_READ,
        Permission.APPLICATION_READ,
        Permission.DOCUMENT_READ,
        Permission.BUSINESS_READ,
        Permission.REMARK_READ,
    },
}


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def has_permission(role: str, permission: Permission) -> bool:
    """Return True if *role* includes *permission*."""
    allowed = ROLE_PERMISSIONS.get(role, set())
    return permission in allowed


def require_permission(permission: Permission):
    """
    FastAPI dependency factory.

    Usage::

        @router.get("/resource", dependencies=[Depends(require_permission(Permission.RESOURCE_READ))])
        def get_resource(): ...
    """

    def dependency(current_user=Depends(_get_current_user_placeholder)):
        if not has_permission(current_user.role, permission):
            raise InsufficientPermissionsException(
                detail=f"Your role does not grant '{permission.value}'"
            )
        return current_user

    return dependency


# ---------------------------------------------------------------------------
# Callable dependency class
# ---------------------------------------------------------------------------

class RequirePermission:
    """
    Callable dependency class — equivalent to the ``require_permission`` factory
    but usable as a class-based dependency for cleaner typing::

        @router.get("/resource")
        def get_resource(user=Depends(RequirePermission(Permission.RESOURCE_READ))): ...
    """

    def __init__(self, permission: Permission) -> None:
        self.permission = permission

    def __call__(self, current_user=Depends(_get_current_user_placeholder)):
        if not has_permission(current_user.role, self.permission):
            raise InsufficientPermissionsException(
                detail=f"Your role does not grant '{self.permission.value}'"
            )
        return current_user


# ---------------------------------------------------------------------------
# Placeholder — resolved at runtime via dependencies.py to avoid circular import
# ---------------------------------------------------------------------------

def _get_current_user_placeholder():  # pragma: no cover
    """
    Placeholder used in this module to avoid circular imports.
    ``require_permission`` and ``RequirePermission`` are normally used inside
    router endpoints where ``get_current_active_user`` from
    ``app.core.dependencies`` is already in scope; replace this placeholder by
    importing from there when composing your endpoint dependencies.
    """
    raise NotImplementedError(
        "Replace _get_current_user_placeholder with get_current_active_user "
        "from app.core.dependencies in your router dependencies."
    )
