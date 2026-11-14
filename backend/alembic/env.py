import os
import sys
from logging.config import fileConfig

from sqlalchemy import engine_from_config, pool

from alembic import context

# ---------------------------------------------------------------------------
# Ensure the project root (the folder that contains 'app/') is on sys.path so
# that all app imports resolve correctly when Alembic runs from the backend dir.
# ---------------------------------------------------------------------------
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

# Import the shared declarative Base (carries the MetaData with naming conventions)
from app.db.base import Base  # noqa: E402

# Import every model so Alembic's autogenerate can see them all
from app.models import *  # noqa: E402, F401, F403

# Read DATABASE_URL from app settings (loads .env automatically)
from app.core.config import get_settings  # noqa: E402

settings = get_settings()

# ---------------------------------------------------------------------------
# Alembic Config object – gives access to alembic.ini values
# ---------------------------------------------------------------------------
config = context.config

# Override the sqlalchemy.url with the value from our settings
db_url = settings.database_url
if db_url.startswith("postgresql://"):
    try:
        import psycopg2  # noqa: F401
    except ImportError:
        try:
            import psycopg  # noqa: F401
            db_url = db_url.replace("postgresql://", "postgresql+psycopg://", 1)
        except ImportError:
            pass

config.set_main_option("sqlalchemy.url", db_url)

# Interpret the config file for Python logging.
if config.config_file_name is not None:
    fileConfig(config.config_file_name)

# MetaData for 'autogenerate' support
target_metadata = Base.metadata


# ---------------------------------------------------------------------------
# Helper: exclude tables we don't manage (e.g. PostGIS spatial_ref_sys)
# ---------------------------------------------------------------------------
def include_object(object, name, type_, reflected, compare_to):  # noqa: A002
    if type_ == "table" and reflected and compare_to is None:
        return False
    return True


# ---------------------------------------------------------------------------
# Offline migrations (no DB connection required)
# ---------------------------------------------------------------------------
def run_migrations_offline() -> None:
    """Run migrations in 'offline' mode.

    This configures the context with just a URL and not an Engine.  Calls to
    context.execute() will emit the given string to the script output.
    """
    url = config.get_main_option("sqlalchemy.url")
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
        include_object=include_object,
        compare_type=True,
        compare_server_default=True,
    )

    with context.begin_transaction():
        context.run_migrations()


# ---------------------------------------------------------------------------
# Online migrations (uses a live DB connection)
# ---------------------------------------------------------------------------
def run_migrations_online() -> None:
    """Run migrations in 'online' mode.

    In this scenario we need to create an Engine and associate a connection
    with the context.
    """
    connectable = engine_from_config(
        config.get_section(config.config_ini_section, {}),
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )

    with connectable.connect() as connection:
        context.configure(
            connection=connection,
            target_metadata=target_metadata,
            include_object=include_object,
            compare_type=True,
            compare_server_default=True,
        )

        with context.begin_transaction():
            context.run_migrations()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
