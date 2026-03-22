"""add customer_user_id to conversations

Revision ID: h0di5e6f7g8h
Revises: g9ch4d5e6f7g
Create Date: 2026-03-23 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = 'h0di5e6f7g8h'
down_revision: Union[str, Sequence[str]] = 'g9ch4d5e6f7g'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        'conversations',
        sa.Column('customer_user_id', sa.Integer(), sa.ForeignKey('users.id'), nullable=True),
    )
    op.create_index('ix_conversations_customer_user_id', 'conversations', ['customer_user_id'])


def downgrade() -> None:
    op.drop_index('ix_conversations_customer_user_id', 'conversations')
    op.drop_column('conversations', 'customer_user_id')
