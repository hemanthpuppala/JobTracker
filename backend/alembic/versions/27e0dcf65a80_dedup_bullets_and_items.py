"""dedup_bullets_and_items

Revision ID: 27e0dcf65a80
Revises: 005b77e96f01
Create Date: 2026-02-24 20:38:40.759561

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '27e0dcf65a80'
down_revision: Union[str, Sequence[str], None] = '005b77e96f01'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Remove duplicate rows from experience_bullets, project_bullets, and skill_items."""
    conn = op.get_bind()

    # Dedup experience_bullets: keep the row with the lowest id for each (experience_id, text) pair
    conn.execute(sa.text("""
        DELETE FROM experience_bullets
        WHERE id NOT IN (
            SELECT MIN(id) FROM experience_bullets
            GROUP BY experience_id, text
        )
    """))

    # Dedup project_bullets
    conn.execute(sa.text("""
        DELETE FROM project_bullets
        WHERE id NOT IN (
            SELECT MIN(id) FROM project_bullets
            GROUP BY project_id, text
        )
    """))

    # Dedup skill_items
    conn.execute(sa.text("""
        DELETE FROM skill_items
        WHERE id NOT IN (
            SELECT MIN(id) FROM skill_items
            GROUP BY skill_id, item
        )
    """))


def downgrade() -> None:
    """Cannot un-dedup."""
    pass
