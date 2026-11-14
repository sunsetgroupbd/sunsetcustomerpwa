from __future__ import annotations

from typing import Generator

from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer

from app.core.config import get_settings
from app.core.exceptions import (
    AccountInactiveException,
    ForbiddenException,
    InvalidTokenException,
    UnauthorizedException,
)
from app.core.security import verify_token

# ---------------------------------------------------------------------------
# OAuth2 scheme — token is extracted from the Authorization: Bearer header
# ---------------------------------------------------------------------------
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/v1/auth/login")


# ---------------------------------------------------------------------------
# Database session dependency
# ---------------------------------------------------------------------------

def get_db() -> Generator:
    """
    Yield a SQLAlchemy Session and guarantee it is closed afterwards.

    The actual SessionLocal is imported here (lazy) to avoid a circular
    dependency chain at module load time (db → models → dependencies → db).
    """
    from app.db.session import SessionLocal  # local import avoids circular refs

    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


# ---------------------------------------------------------------------------
# Current-user resolution
# ---------------------------------------------------------------------------

def get_current_user(
    token: str = Depends(oauth2_scheme),
    db=Depends(get_db),
):
    """
    Decode the JWT, look up the user in the database, and return the ORM object.

    Raises ``UnauthorizedException`` / ``InvalidTokenException`` on failure.
    """
    from app.models.user import User  # local import — models loaded after DB init

    settings = get_settings()
    payload = verify_token(token, settings.jwt_secret_key, settings.jwt_algorithm)

    if payload is None:
        raise InvalidTokenException()

    token_type = payload.get("type")
    if token_type != "access":
        raise InvalidTokenException(detail="Provided token is not an access token")

    user_id: str | None = payload.get("sub")
    if user_id is None:
        raise InvalidTokenException(detail="Token payload missing subject claim")

    user = db.query(User).filter(User.id == user_id).first()
    if user is None:
        raise UnauthorizedException(detail="User not found")

    return user


def get_current_active_user(current_user=Depends(get_current_user)):
    """Extend ``get_current_user`` by asserting the account is active."""
    if not current_user.is_active:
        raise AccountInactiveException()
    return current_user


def get_current_admin(current_user=Depends(get_current_active_user)):
    """Assert the authenticated user has the *admin* role."""
    if current_user.role != "admin":
        raise ForbiddenException(detail="Administrator access required")
    return current_user


def get_current_cr_or_admin(current_user=Depends(get_current_active_user)):
    """Assert the authenticated user is a CR officer or an admin."""
    if current_user.role not in ("admin", "cr"):
        raise ForbiddenException(
            detail="Customer Relations Officer or Administrator access required"
        )
    return current_user


# ---------------------------------------------------------------------------
# Callable permission dependency
# ---------------------------------------------------------------------------

class RequirePermission:
    """
    Callable FastAPI dependency that checks a specific permission.

    Usage::

        @router.get("/resource")
        def endpoint(user=Depends(RequirePermission(Permission.RESOURCE_READ))):
            ...
    """

    def __init__(self, permission) -> None:
        self.permission = permission

    def __call__(self, current_user=Depends(get_current_active_user)):
        from app.core.permissions import has_permission  # avoid circular at module load

        if not has_permission(current_user.role, self.permission):
            raise ForbiddenException(
                detail=f"Your role does not grant '{self.permission.value}'"
            )
        return current_user
