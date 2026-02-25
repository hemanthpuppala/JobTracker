"""initial_schema

Revision ID: 005b77e96f01
Revises:
Create Date: 2026-02-24 20:38:36.111430

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = '005b77e96f01'
down_revision: Union[str, Sequence[str], None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Drop legacy JSON-blob columns from experiences, projects, skills."""
    # SQLite batch mode recreates the table without the dropped column
    with op.batch_alter_table('experiences', schema=None) as batch_op:
        batch_op.drop_column('bullets')

    with op.batch_alter_table('projects', schema=None) as batch_op:
        batch_op.drop_column('bullets')

    with op.batch_alter_table('skills', schema=None) as batch_op:
        batch_op.drop_column('items')


def downgrade() -> None:
    """Re-add legacy columns."""
    with op.batch_alter_table('experiences', schema=None) as batch_op:
        batch_op.add_column(sa.Column('bullets', sa.TEXT(), nullable=True))

    with op.batch_alter_table('projects', schema=None) as batch_op:
        batch_op.add_column(sa.Column('bullets', sa.TEXT(), nullable=True))

    with op.batch_alter_table('skills', schema=None) as batch_op:
        batch_op.add_column(sa.Column('items', sa.TEXT(), nullable=True))
