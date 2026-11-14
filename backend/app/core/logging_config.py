from __future__ import annotations

import logging
import sys
from typing import Optional


def get_logger(name: str) -> logging.Logger:
    """
    Return a configured logger for *name*.

    The logger is set up once per process:
      - Structured format: timestamp | level | logger-name | message
      - Level read from LOG_LEVEL environment variable (defaults to INFO).
      - Outputs to stdout so container runtimes capture it cleanly.
    """
    logger = logging.getLogger(name)

    # Avoid adding duplicate handlers if already configured
    if logger.handlers:
        return logger

    # Lazy import to avoid circular dependency with config at module-load time
    try:
        from app.core.config import get_settings

        log_level_str = get_settings().log_level.upper()
    except Exception:
        log_level_str = "INFO"

    log_level = getattr(logging, log_level_str, logging.INFO)

    handler = logging.StreamHandler(sys.stdout)
    handler.setLevel(log_level)

    formatter = logging.Formatter(
        fmt="%(asctime)s | %(levelname)-8s | %(name)s | %(message)s",
        datefmt="%Y-%m-%dT%H:%M:%S",
    )
    handler.setFormatter(formatter)

    logger.addHandler(handler)
    logger.setLevel(log_level)
    # Prevent propagation to the root logger to avoid duplicate entries
    logger.propagate = False

    return logger


def configure_root_logging(log_level: Optional[str] = None) -> None:
    """
    Configure the root logger.

    Call once at application startup (from the lifespan handler) to ensure
    third-party libraries also respect the chosen log level.
    """
    if log_level is None:
        try:
            from app.core.config import get_settings

            log_level = get_settings().log_level.upper()
        except Exception:
            log_level = "INFO"

    level = getattr(logging, log_level, logging.INFO)

    logging.basicConfig(
        level=level,
        format="%(asctime)s | %(levelname)-8s | %(name)s | %(message)s",
        datefmt="%Y-%m-%dT%H:%M:%S",
        stream=sys.stdout,
        force=True,
    )

    # Quiet noisy third-party loggers
    for noisy in ("uvicorn.access", "sqlalchemy.engine"):
        logging.getLogger(noisy).setLevel(logging.WARNING)
