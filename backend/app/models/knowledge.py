"""KnowledgeArticle ORM model with pgvector embedding support."""

from typing import Optional

from sqlalchemy import ARRAY, Boolean, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column

try:
    from pgvector.sqlalchemy import Vector
    _VECTOR_AVAILABLE = True
except ImportError:  # pragma: no cover
    _VECTOR_AVAILABLE = False

from app.models.base import BaseModel


class KnowledgeArticle(BaseModel):
    """A knowledge-base article that can be retrieved via vector similarity search."""

    __tablename__ = "knowledge_articles"

    title: Mapped[str] = mapped_column(String(255), nullable=False)
    category: Mapped[str] = mapped_column(String(100), nullable=False)
    content: Mapped[str] = mapped_column(Text, nullable=False)
    tags: Mapped[list[str]] = mapped_column(
        ARRAY(String), nullable=False, default=list
    )
    embedding: Mapped[object] = mapped_column(
        Vector(1024) if _VECTOR_AVAILABLE else Text,
        nullable=True,
    )
    active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    created_by: Mapped[Optional[int]] = mapped_column(
        Integer, ForeignKey("users.id"), nullable=True
    )

    def __repr__(self) -> str:
        return f"<KnowledgeArticle id={self.id} title={self.title!r}>"
