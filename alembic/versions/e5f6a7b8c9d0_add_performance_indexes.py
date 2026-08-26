"""add_performance_indexes

Revision ID: e5f6a7b8c9d0
Revises: d4e5f6a7b8c9
Create Date: 2026-08-26 18:50:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'e5f6a7b8c9d0'
down_revision: Union[str, Sequence[str], None] = 'd4e5f6a7b8c9'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema - Add high-value database performance indexes safely."""
    # 1. users
    op.create_index('ix_users_is_active', 'users', ['is_active'], unique=False)

    # 2. document_submissions
    op.create_index('ix_document_submissions_user_id', 'document_submissions', ['user_id'], unique=False)
    op.create_index('ix_document_submissions_template_id', 'document_submissions', ['template_id'], unique=False)
    op.create_index('ix_document_submissions_created_at', 'document_submissions', ['created_at'], unique=False)
    op.create_index('ix_document_submissions_is_locked', 'document_submissions', ['is_locked'], unique=False)

    # 3. wallet_transactions
    op.create_index('ix_wallet_transactions_user_id', 'wallet_transactions', ['user_id'], unique=False)
    op.create_index('ix_wallet_transactions_wallet_id', 'wallet_transactions', ['wallet_id'], unique=False)
    op.create_index('ix_wallet_transactions_created_at', 'wallet_transactions', ['created_at'], unique=False)

    # 4. wallets
    op.create_index('ix_wallets_user_id', 'wallets', ['user_id'], unique=True)

    # 5. db_templates
    op.create_index('ix_db_templates_is_active', 'db_templates', ['is_active'], unique=False)
    op.create_index('ix_db_templates_status', 'db_templates', ['status'], unique=False)

    # 6. static_pages
    op.create_index('ix_static_pages_is_active', 'static_pages', ['is_active'], unique=False)

    # 7. payment_orders
    op.create_index('ix_payment_orders_created_at', 'payment_orders', ['created_at'], unique=False)

    # 8. menu_items
    op.create_index('ix_menu_items_parent_id', 'menu_items', ['parent_id'], unique=False)
    op.create_index('ix_menu_items_is_active', 'menu_items', ['is_active'], unique=False)


def downgrade() -> None:
    """Downgrade schema - Remove added performance indexes."""
    # 8. menu_items
    op.drop_index('ix_menu_items_is_active', table_name='menu_items')
    op.drop_index('ix_menu_items_parent_id', table_name='menu_items')

    # 7. payment_orders
    op.drop_index('ix_payment_orders_created_at', table_name='payment_orders')

    # 6. static_pages
    op.drop_index('ix_static_pages_is_active', table_name='static_pages')

    # 5. db_templates
    op.drop_index('ix_db_templates_status', table_name='db_templates')
    op.drop_index('ix_db_templates_is_active', table_name='db_templates')

    # 4. wallets
    op.drop_index('ix_wallets_user_id', table_name='wallets')

    # 3. wallet_transactions
    op.drop_index('ix_wallet_transactions_created_at', table_name='wallet_transactions')
    op.drop_index('ix_wallet_transactions_wallet_id', table_name='wallet_transactions')
    op.drop_index('ix_wallet_transactions_user_id', table_name='wallet_transactions')

    # 2. document_submissions
    op.drop_index('ix_document_submissions_is_locked', table_name='document_submissions')
    op.drop_index('ix_document_submissions_created_at', table_name='document_submissions')
    op.drop_index('ix_document_submissions_template_id', table_name='document_submissions')
    op.drop_index('ix_document_submissions_user_id', table_name='document_submissions')

    # 1. users
    op.drop_index('ix_users_is_active', table_name='users')
