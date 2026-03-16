"""Alembic environment configuration for async SQLAlchemy migrations."""

import asyncio
import os
from logging.config import fileConfig

from sqlalchemy import pool
from sqlalchemy.engine import Connection
from sqlalchemy.ext.asyncio import async_engine_from_config

from alembic import context
import pgvector.sqlalchemy  # noqa: F401 — ensure pgvector types are registered for autogenerate

# Alembic Config object — provides access to values in alembic.ini.
config = context.config

# Set up logging from alembic.ini.
if config.config_file_name is not None:
    fileConfig(config.config_file_name)

# ---------------------------------------------------------------------------
# Import all models so that autogenerate can detect schema changes.
# ---------------------------------------------------------------------------
from app.models.base import Base  # noqa: E402
from app.models.user import User  # noqa: E402, F401
from app.models.conversation import Conversation  # noqa: E402, F401
from app.models.message import Message  # noqa: E402, F401
from app.models.escalation import EscalationEvent  # noqa: E402, F401
from app.models.knowledge import KnowledgeArticle  # noqa: E402, F401

target_metadata = Base.metadata

# ---------------------------------------------------------------------------
# Override sqlalchemy.url from the DATABASE_URL environment variable when set.
# This allows the same alembic.ini to work across environments.
# ---------------------------------------------------------------------------
db_url = os.getenv("DATABASE_URL")
if db_url:
    config.set_main_option("sqlalchemy.url", db_url)


def run_migrations_offline() -> None:
    """Run migrations in 'offline' mode (generate SQL scripts without a live DB).

    Useful for generating migration SQL to review or apply manually.
    """
    url = config.get_main_option("sqlalchemy.url")
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
    )

    with context.begin_transaction():
        context.run_migrations()


def do_run_migrations(connection: Connection) -> None:
    """Execute migrations against an active connection.

    Args:
        connection: Active synchronous database connection.
    """
    context.configure(connection=connection, target_metadata=target_metadata)
    with context.begin_transaction():
        context.run_migrations()


async def run_async_migrations() -> None:
    """Create an async engine and run migrations through a sync connection bridge."""
    connectable = async_engine_from_config(
        config.get_section(config.config_ini_section, {}),
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )

    async with connectable.connect() as connection:
        await connection.run_sync(do_run_migrations)

    await connectable.dispose()


def run_migrations_online() -> None:
    """Run migrations in 'online' mode using an async engine."""
    asyncio.run(run_async_migrations())


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
