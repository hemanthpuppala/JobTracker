"""add_section_order_and_custom_sections

Revision ID: 4b2d9e7f3c10
Revises: 3a1c8f5d2b90
Create Date: 2026-02-25 12:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy import inspect


# revision identifiers, used by Alembic.
revision: str = '4b2d9e7f3c10'
down_revision: Union[str, None] = '3a1c8f5d2b90'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    conn = op.get_bind()
    inspector = inspect(conn)

    # Add section_order to profile if not exists
    profile_cols = [c['name'] for c in inspector.get_columns('profile')]
    if 'section_order' not in profile_cols:
        op.add_column('profile', sa.Column('section_order', sa.Text(), nullable=True))

    existing_tables = inspector.get_table_names()

    # Create custom_sections table if not exists
    if 'custom_sections' not in existing_tables:
        op.create_table(
            'custom_sections',
            sa.Column('id', sa.Integer(), primary_key=True, autoincrement=True),
            sa.Column('section_id', sa.Text(), nullable=False, unique=True),
            sa.Column('header', sa.Text(), nullable=False),
            sa.Column('layout', sa.Text(), nullable=False, server_default='bullets'),
            sa.Column('sort_order', sa.Integer(), nullable=False, server_default='0'),
        )

    # Create custom_section_items table if not exists
    if 'custom_section_items' not in existing_tables:
        op.create_table(
            'custom_section_items',
            sa.Column('id', sa.Integer(), primary_key=True, autoincrement=True),
            sa.Column('section_id', sa.Integer(), sa.ForeignKey('custom_sections.id', ondelete='CASCADE'), nullable=False),
            sa.Column('text', sa.Text(), nullable=False),
            sa.Column('label', sa.Text(), nullable=True),
            sa.Column('sort_order', sa.Integer(), nullable=False, server_default='0'),
        )


def downgrade() -> None:
    conn = op.get_bind()
    inspector = inspect(conn)
    existing_tables = inspector.get_table_names()

    if 'custom_section_items' in existing_tables:
        op.drop_table('custom_section_items')
    if 'custom_sections' in existing_tables:
        op.drop_table('custom_sections')

    profile_cols = [c['name'] for c in inspector.get_columns('profile')]
    if 'section_order' in profile_cols:
        op.drop_column('profile', 'section_order')
