from typing import Callable, List
from fastapi import Depends, HTTPException, status
from app.core.dependencies import (
    get_db,
    get_current_user,
    get_current_active_user,
    get_current_admin,
    get_current_cr_or_admin,
    RequirePermission,
    oauth2_scheme,
)
from app.core.exceptions import ForbiddenException
from app.models.user import User

def require_roles(*allowed_roles) -> Callable:
    """Dependency that checks if the current active user has one of the allowed roles."""
    roles = []
    for r in allowed_roles:
        if isinstance(r, (list, tuple, set)):
            roles.extend(r)
        else:
            roles.append(r)

    def role_checker(current_user: User = Depends(get_current_active_user)) -> User:
        if current_user.role not in roles:
            raise ForbiddenException(
                detail=f"Access denied. Requires one of roles: {', '.join(roles)}"
            )
        return current_user
    return role_checker

__all__ = [
    "get_db",
    "get_current_user",
    "get_current_active_user",
    "get_current_admin",
    "get_current_cr_or_admin",
    "RequirePermission",
    "require_roles",
    "oauth2_scheme",
]
