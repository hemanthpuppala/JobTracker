"""add_section_headers_to_profile

Revision ID: 3a1c8f5d2b90
Revises: 27e0dcf65a80
Create Date: 2026-02-24 22:45:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '3a1c8f5d2b90'
down_revision: Union[str, None] = '27e0dcf65a80'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('profile', sa.Column('section_headers', sa.Text(), nullable=True))


def downgrade() -> None:
    op.drop_column('profile', 'section_headers')
