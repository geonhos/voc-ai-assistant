"""add conversation access_token for customer auth

Revision ID: c58d2e3f4a6b
Revises: b47f3c1a2e5d
Create Date: 2026-03-16 01:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'c58d2e3f4a6b'
down_revision: Union[str, Sequence[str]] = 'b47f3c1a2e5d'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Add access_token column to conversations table."""
    op.add_column(
        'conversations',
        sa.Column('access_token', sa.String(36), nullable=True),
    )
    # Backfill existing rows with generated UUIDs
    op.execute("UPDATE conversations SET access_token = gen_random_uuid()::text WHERE access_token IS NULL")
    op.alter_column('conversations', 'access_token', nullable=False)
    op.create_unique_constraint('uq_conversations_access_token', 'conversations', ['access_token'])


def downgrade() -> None:
    """Remove access_token column from conversations table."""
    op.drop_constraint('uq_conversations_access_token', 'conversations', type_='unique')
    op.drop_column('conversations', 'access_token')
