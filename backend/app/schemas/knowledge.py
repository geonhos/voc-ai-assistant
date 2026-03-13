"""Pydantic schemas for knowledge-base endpoints."""

from datetime import datetime

from pydantic import BaseModel


class KnowledgeArticleCreate(BaseModel):
    """Payload to create a new knowledge article."""

    title: str
    category: str
    content: str
    tags: list[str] = []


class KnowledgeArticleUpdate(BaseModel):
    """Payload to partially update an existing knowledge article."""

    title: str | None = None
    category: str | None = None
    content: str | None = None
    tags: list[str] | None = None
    active: bool | None = None


class KnowledgeArticleResponse(BaseModel):
    """Serialized knowledge article returned by the API."""

    id: int
    title: str
    category: str
    content: str
    tags: list[str]
    active: bool
    created_by: int | None
    created_at: datetime
    updated_at: datetime | None

    model_config = {"from_attributes": True}


class KnowledgeArticleListResponse(BaseModel):
    """Paginated list of knowledge articles."""

    items: list[KnowledgeArticleResponse]
    total: int
    skip: int
    limit: int
