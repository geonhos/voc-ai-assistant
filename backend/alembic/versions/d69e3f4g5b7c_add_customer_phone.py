"""add customer_phone + make name/email nullable defaults

Revision ID: d69e3f4g5b7c
Revises: c58d2e3f4a6b
Create Date: 2026-03-16 14:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = 'd69e3f4g5b7c'
down_revision: Union[str, Sequence[str]] = 'c58d2e3f4a6b'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('conversations', sa.Column('customer_phone', sa.String(20), server_default='', nullable=False))
    op.alter_column('conversations', 'customer_name', server_default='')
    op.alter_column('conversations', 'customer_email', server_default='')


def downgrade() -> None:
    op.drop_column('conversations', 'customer_phone')
    op.alter_column('conversations', 'customer_name', server_default=None)
    op.alter_column('conversations', 'customer_email', server_default=None)
