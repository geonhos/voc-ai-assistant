"""add index on conversations.status

Revision ID: i1ej6f7g8h9i
Revises: h0di5e6f7g8h
Create Date: 2026-04-06 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op


revision: str = 'i1ej6f7g8h9i'
down_revision: Union[str, Sequence[str]] = 'h0di5e6f7g8h'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_index('ix_conversations_status', 'conversations', ['status'])


def downgrade() -> None:
    op.drop_index('ix_conversations_status', 'conversations')
