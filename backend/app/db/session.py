import os
from pathlib import Path
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, Session
from typing import Generator

from app.core.config import get_settings

settings = get_settings()

db_url = settings.database_url
if db_url.startswith("sqlite"):
    # Ensure relative sqlite path resolves to the actual backend database file
    backend_dir = Path(__file__).resolve().parent.parent.parent
    if db_url.startswith("sqlite:///./"):
        rel_name = db_url[len("sqlite:///./"):]
        backend_file = backend_dir / rel_name
        if backend_file.exists():
            db_url = f"sqlite:///{backend_file.as_posix()}"
        else:
            db_url = f"sqlite:///{backend_file.as_posix()}"
    elif db_url == "sqlite:///sunset.db":
        backend_file = backend_dir / "sunset.db"
        db_url = f"sqlite:///{backend_file.as_posix()}"
elif db_url.startswith("postgresql://"):
    try:
        import psycopg2  # noqa: F401
    except ImportError:
        try:
            import psycopg  # noqa: F401
            db_url = db_url.replace("postgresql://", "postgresql+psycopg://", 1)
        except ImportError:
            pass

engine_kwargs = {"echo": settings.debug}
if db_url.startswith("sqlite"):
    engine_kwargs["connect_args"] = {"check_same_thread": False}
else:
    engine_kwargs["pool_size"] = settings.database_pool_size
    engine_kwargs["max_overflow"] = settings.database_max_overflow
    engine_kwargs["pool_pre_ping"] = True

engine = create_engine(db_url, **engine_kwargs)

SessionLocal = sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=engine,
)


def get_db() -> Generator[Session, None, None]:
    """FastAPI dependency that provides a SQLAlchemy session."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
