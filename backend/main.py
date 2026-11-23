from __future__ import annotations

from contextlib import asynccontextmanager
from typing import AsyncGenerator

from fastapi import FastAPI, Request, status
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, RedirectResponse
from pydantic import ValidationError
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from slowapi.util import get_remote_address

from app.core.config import get_settings
from app.core.exceptions import AppException
from app.core.logging_config import configure_root_logging, get_logger
from app.core.middleware import RequestIDMiddleware, SecurityHeadersMiddleware
from app.core.responses import error_response

settings = get_settings()
logger = get_logger(__name__)

# ---------------------------------------------------------------------------
# SlowAPI rate limiter
# ---------------------------------------------------------------------------
limiter = Limiter(key_func=get_remote_address, default_limits=[f"{settings.rate_limit_per_minute}/minute"])


# ---------------------------------------------------------------------------
# Lifespan
# ---------------------------------------------------------------------------

@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    # --- Startup ---
    configure_root_logging(settings.log_level)
    logger.info(
        "Starting %s v%s [%s]",
        settings.app_name,
        settings.app_version,
        settings.environment,
    )
    yield
    # --- Shutdown ---
    logger.info("Shutting down %s", settings.app_name)


# ---------------------------------------------------------------------------
# Application factory
# ---------------------------------------------------------------------------

def create_app() -> FastAPI:
    app = FastAPI(
        title=settings.app_name,
        version=settings.app_version,
        description=(
            "Backend API for the Sunset Group Customer Application Platform. "
            "Manages customer onboarding, application processing, document "
            "verification, and reporting for all Sunset Group businesses."
        ),
        openapi_url="/api/v1/openapi.json",
        docs_url="/api/v1/docs",
        redoc_url="/api/v1/redoc",
        lifespan=lifespan,
        debug=settings.debug,
        contact={
            "name": "Sunset Group IT",
            "email": "it@sunsetgroup.com",
        },
        license_info={
            "name": "Proprietary",
        },
    )

    # -----------------------------------------------------------------------
    # Rate limiter state
    # -----------------------------------------------------------------------
    app.state.limiter = limiter

    # -----------------------------------------------------------------------
    # Middleware  (applied in reverse order — last added = outermost)
    # -----------------------------------------------------------------------
    app.add_middleware(RequestIDMiddleware)
    app.add_middleware(SecurityHeadersMiddleware, debug=settings.debug)
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins,
        allow_credentials=settings.cors_allow_credentials,
        allow_methods=["*"],
        allow_headers=["*"],
        expose_headers=["X-Request-ID"],
    )

    # -----------------------------------------------------------------------
    # Exception handlers
    # -----------------------------------------------------------------------
    app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

    @app.exception_handler(AppException)
    async def app_exception_handler(request: Request, exc: AppException):
        return JSONResponse(
            status_code=exc.status_code,
            content=error_response(
                error_code=exc.error_code,
                message=exc.detail,
            ),
        )

    @app.exception_handler(RequestValidationError)
    async def request_validation_handler(request: Request, exc: RequestValidationError):
        return JSONResponse(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            content=error_response(
                error_code="VALIDATION_ERROR",
                message="Request validation failed",
                details=exc.errors(),
            ),
        )

    @app.exception_handler(ValidationError)
    async def pydantic_validation_handler(request: Request, exc: ValidationError):
        return JSONResponse(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            content=error_response(
                error_code="VALIDATION_ERROR",
                message="Data validation error",
                details=exc.errors(),
            ),
        )

    @app.exception_handler(Exception)
    async def generic_exception_handler(request: Request, exc: Exception):
        logger.exception("Unhandled exception on %s %s", request.method, request.url.path)
        return JSONResponse(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            content=error_response(
                error_code="INTERNAL_ERROR",
                message="An unexpected error occurred",
            ),
        )

    # -----------------------------------------------------------------------
    # Root redirects
    # -----------------------------------------------------------------------
    @app.get("/", include_in_schema=False)
    async def root_redirect():
        return RedirectResponse(url="/api/v1/docs")

    @app.get("/docs", include_in_schema=False)
    async def docs_redirect():
        return RedirectResponse(url="/api/v1/docs")

    # -----------------------------------------------------------------------
    # Health check
    # -----------------------------------------------------------------------
    @app.get(
        "/health",
        tags=["Health"],
        summary="Health check",
        response_description="Service liveness indicator",
    )
    async def health_check():
        return {
            "status": "healthy",
            "app": settings.app_name,
            "version": settings.app_version,
            "environment": settings.environment,
        }

    # -----------------------------------------------------------------------
    # API routers & Static Uploads
    # -----------------------------------------------------------------------
    _register_routers(app)

    from pathlib import Path
    from fastapi.staticfiles import StaticFiles

    uploads_dir = Path("uploads")
    uploads_dir.mkdir(parents=True, exist_ok=True)
    app.mount("/api/v1/uploads", StaticFiles(directory=str(uploads_dir)), name="uploads")

    return app


def _register_routers(app: FastAPI) -> None:
    """Import and include the root v1 API router."""
    from app.api.v1.router import api_router

    app.include_router(api_router, prefix="/api/v1")


# ---------------------------------------------------------------------------
# ASGI entry-point
# ---------------------------------------------------------------------------
app = create_app()
