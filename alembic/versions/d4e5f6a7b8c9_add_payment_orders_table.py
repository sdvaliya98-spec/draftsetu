"""add_payment_orders_table

Revision ID: d4e5f6a7b8c9
Revises: 88cdfa21db79
Create Date: 2026-08-24 23:05:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'd4e5f6a7b8c9'
down_revision: Union[str, Sequence[str], None] = '88cdfa21db79'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.create_table(
        'payment_orders',
        sa.Column('id', sa.Integer(), nullable=False, primary_key=True),
        sa.Column('user_id', sa.Integer(), sa.ForeignKey('users.id'), nullable=False),
        sa.Column('order_id', sa.String(), nullable=False),
        sa.Column('payment_id', sa.String(), nullable=True),
        sa.Column('signature', sa.String(), nullable=True),
        sa.Column('plan_id', sa.String(), nullable=False),
        sa.Column('amount', sa.Integer(), nullable=False),
        sa.Column('currency', sa.String(), nullable=False, server_default='INR'),
        sa.Column('credits', sa.Integer(), nullable=False),
        sa.Column('status', sa.String(), nullable=False, server_default='CREATED'),
        sa.Column('error_code', sa.String(), nullable=True),
        sa.Column('error_description', sa.String(), nullable=True),
        sa.Column('wallet_transaction_id', sa.Integer(), sa.ForeignKey('wallet_transactions.id'), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.Column('updated_at', sa.DateTime(), nullable=True),
    )
    op.create_index('ix_payment_orders_id', 'payment_orders', ['id'])
    op.create_index('ix_payment_orders_user_id', 'payment_orders', ['user_id'])
    op.create_index('ix_payment_orders_order_id', 'payment_orders', ['order_id'], unique=True)
    op.create_index('ix_payment_orders_payment_id', 'payment_orders', ['payment_id'], unique=True)
    op.create_index('ix_payment_orders_status', 'payment_orders', ['status'])


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_index('ix_payment_orders_status', table_name='payment_orders')
    op.drop_index('ix_payment_orders_payment_id', table_name='payment_orders')
    op.drop_index('ix_payment_orders_order_id', table_name='payment_orders')
    op.drop_index('ix_payment_orders_user_id', table_name='payment_orders')
    op.drop_index('ix_payment_orders_id', table_name='payment_orders')
    op.drop_table('payment_orders')
