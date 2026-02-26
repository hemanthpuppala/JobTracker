"""add ats_scores table

Revision ID: 5c3e8f9a1d20
Revises: 4b2d9e7f3c10
Create Date: 2026-02-26
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = '5c3e8f9a1d20'
down_revision: Union[str, None] = '4b2d9e7f3c10'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        'ats_scores',
        sa.Column('id', sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column('job_id', sa.Integer(), sa.ForeignKey('jobs.id', ondelete='SET NULL'), nullable=True),
        sa.Column('job_description', sa.Text(), nullable=False),
        sa.Column('resume_snapshot', sa.Text(), nullable=False),
        sa.Column('overall_score', sa.Integer(), nullable=False),
        sa.Column('category_scores', sa.Text(), nullable=False),
        sa.Column('suggestions', sa.Text(), nullable=True),
        sa.Column('created_at', sa.Text(), nullable=False),
    )


def downgrade() -> None:
    op.drop_table('ats_scores')
