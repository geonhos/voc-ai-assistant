"""change embedding dim to 1024 for ollama bge-m3

Revision ID: b47f3c1a2e5d
Revises: a36652b4e19d
Create Date: 2026-03-15 02:30:00.000000

"""
from typing import Sequence, Union

from alembic import op


# revision identifiers, used by Alembic.
revision: str = 'b47f3c1a2e5d'
down_revision: Union[str, Sequence[str]] = 'a36652b4e19d'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Change embedding column from vector(1536) to vector(1024)."""
    # Drop existing embeddings (dimension changed, old ones are incompatible)
    op.execute("UPDATE knowledge_articles SET embedding = NULL")
    op.execute("ALTER TABLE knowledge_articles ALTER COLUMN embedding TYPE vector(1024)")


def downgrade() -> None:
    """Revert embedding column to vector(1536)."""
    op.execute("UPDATE knowledge_articles SET embedding = NULL")
    op.execute("ALTER TABLE knowledge_articles ALTER COLUMN embedding TYPE vector(1536)")
