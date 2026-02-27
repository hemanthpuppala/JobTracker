"""add sessions tables

Revision ID: 6d4f2a8b1e30
Revises: 5c3e8f9a1d20
Create Date: 2026-02-26
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = '6d4f2a8b1e30'
down_revision: Union[str, None] = '5c3e8f9a1d20'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        'tailor_sessions',
        sa.Column('id', sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column('job_id', sa.Integer(), sa.ForeignKey('jobs.id', ondelete='SET NULL'), nullable=True),
        sa.Column('job_description', sa.Text(), nullable=False),
        sa.Column('resume_source', sa.Text(), nullable=False, server_default='db'),
        sa.Column('status', sa.Text(), nullable=False, server_default='draft'),
        sa.Column('created_at', sa.Text(), nullable=False),
        sa.Column('updated_at', sa.Text(), nullable=False),
    )

    op.create_table(
        'session_events',
        sa.Column('id', sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column('session_id', sa.Integer(), sa.ForeignKey('tailor_sessions.id', ondelete='CASCADE'), nullable=False),
        sa.Column('event_type', sa.Text(), nullable=False),
        sa.Column('data', sa.Text(), nullable=True),
        sa.Column('created_at', sa.Text(), nullable=False),
    )

    with op.batch_alter_table('ats_scores') as batch_op:
        batch_op.add_column(sa.Column('session_id', sa.Integer(), nullable=True))


def downgrade() -> None:
    with op.batch_alter_table('ats_scores') as batch_op:
        batch_op.drop_column('session_id')
    op.drop_table('session_events')
    op.drop_table('tailor_sessions')
