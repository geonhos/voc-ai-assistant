"""add tool_name and tool_data fields to messages table

Revision ID: f8bg2c3d4e5f
Revises: e7af1b2c3d4e
Create Date: 2026-03-16 19:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import JSONB


revision: str = 'f8bg2c3d4e5f'
down_revision: Union[str, Sequence[str]] = 'e7af1b2c3d4e'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('messages', sa.Column('tool_name', sa.String(100), nullable=True))
    op.add_column('messages', sa.Column('tool_data', JSONB, nullable=True))


def downgrade() -> None:
    op.drop_column('messages', 'tool_data')
    op.drop_column('messages', 'tool_name')
