"""add clarification_state to conversations

Revision ID: g9ch4d5e6f7g
Revises: f8bg2c3d4e5f
Create Date: 2026-03-18 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import JSONB


revision: str = 'g9ch4d5e6f7g'
down_revision: Union[str, Sequence[str]] = 'f8bg2c3d4e5f'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        'conversations',
        sa.Column('clarification_state', JSONB, nullable=True),
    )


def downgrade() -> None:
    op.drop_column('conversations', 'clarification_state')
