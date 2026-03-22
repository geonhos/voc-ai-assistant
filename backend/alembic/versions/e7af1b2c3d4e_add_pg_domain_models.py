"""add PG domain models (merchants, transactions, settlements, error_codes, api_logs)

Revision ID: e7af1b2c3d4e
Revises: d69e3f4g5b7c
Create Date: 2026-03-16 18:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import JSONB


revision: str = 'e7af1b2c3d4e'
down_revision: Union[str, Sequence[str]] = 'd69e3f4g5b7c'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # merchants
    op.create_table(
        'merchants',
        sa.Column('id', sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column('mid', sa.String(50), nullable=False, unique=True, index=True),
        sa.Column('name', sa.String(200), nullable=False),
        sa.Column('business_number', sa.String(20), nullable=False),
        sa.Column('status', sa.String(20), nullable=False, server_default='ACTIVE'),
        sa.Column('settings', JSONB, nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=True),
    )

    # transactions
    op.create_table(
        'transactions',
        sa.Column('id', sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column('tid', sa.String(50), nullable=False, unique=True, index=True),
        sa.Column('merchant_id', sa.Integer(), sa.ForeignKey('merchants.id'), nullable=False, index=True),
        sa.Column('amount', sa.Integer(), nullable=False),
        sa.Column('payment_method', sa.String(30), nullable=False),
        sa.Column('card_company', sa.String(30), nullable=True),
        sa.Column('card_number_masked', sa.String(20), nullable=True),
        sa.Column('status', sa.String(20), nullable=False),
        sa.Column('error_code', sa.String(20), nullable=True),
        sa.Column('error_message', sa.String(500), nullable=True),
        sa.Column('customer_name', sa.String(100), nullable=True),
        sa.Column('order_id', sa.String(100), nullable=True),
        sa.Column('approved_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('cancelled_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=True),
    )

    # settlements
    op.create_table(
        'settlements',
        sa.Column('id', sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column('merchant_id', sa.Integer(), sa.ForeignKey('merchants.id'), nullable=False, index=True),
        sa.Column('settlement_date', sa.Date(), nullable=False),
        sa.Column('total_amount', sa.Integer(), nullable=False),
        sa.Column('fee_amount', sa.Integer(), nullable=False),
        sa.Column('net_amount', sa.Integer(), nullable=False),
        sa.Column('transaction_count', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('status', sa.String(20), nullable=False, server_default='PENDING'),
        sa.Column('completed_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=True),
    )

    # error_codes
    op.create_table(
        'error_codes',
        sa.Column('id', sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column('code', sa.String(20), nullable=False, unique=True, index=True),
        sa.Column('category', sa.String(30), nullable=False),
        sa.Column('description', sa.String(500), nullable=False),
        sa.Column('solution', sa.Text(), nullable=False),
        sa.Column('severity', sa.String(20), nullable=False, server_default='MEDIUM'),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=True),
    )

    # api_logs
    op.create_table(
        'api_logs',
        sa.Column('id', sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column('merchant_id', sa.Integer(), sa.ForeignKey('merchants.id'), nullable=False, index=True),
        sa.Column('endpoint', sa.String(200), nullable=False),
        sa.Column('method', sa.String(10), nullable=False),
        sa.Column('status_code', sa.Integer(), nullable=False),
        sa.Column('error_code', sa.String(20), nullable=True),
        sa.Column('error_message', sa.String(500), nullable=True),
        sa.Column('latency_ms', sa.Integer(), nullable=False),
        sa.Column('request_body', JSONB, nullable=True),
        sa.Column('response_body', JSONB, nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=True),
    )

    # Add merchant_id FK to users and conversations
    op.add_column('users', sa.Column('merchant_id', sa.Integer(), sa.ForeignKey('merchants.id'), nullable=True, index=True))
    op.add_column('conversations', sa.Column('merchant_id', sa.Integer(), sa.ForeignKey('merchants.id'), nullable=True, index=True))


def downgrade() -> None:
    op.drop_column('conversations', 'merchant_id')
    op.drop_column('users', 'merchant_id')
    op.drop_table('api_logs')
    op.drop_table('error_codes')
    op.drop_table('settlements')
    op.drop_table('transactions')
    op.drop_table('merchants')
