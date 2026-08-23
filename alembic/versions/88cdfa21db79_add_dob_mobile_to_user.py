"""add_dob_mobile_to_user

Revision ID: 88cdfa21db79
Revises: c6930930cf37
Create Date: 2026-06-11 08:26:23.053422

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '88cdfa21db79'
down_revision: Union[str, Sequence[str], None] = 'c6930930cf37'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.add_column('users', sa.Column('birth_date', sa.String(), nullable=True))
    op.add_column('users', sa.Column('mobile_number', sa.String(), nullable=True))


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_column('users', 'birth_date')
    op.drop_column('users', 'mobile_number')
