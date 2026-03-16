"""Knowledge Base router — CRUD operations for knowledge articles."""

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.deps import require_admin
from app.models.user import User
from app.schemas.knowledge import (
    KnowledgeArticleCreate,
    KnowledgeArticleListResponse,
    KnowledgeArticleResponse,
    KnowledgeArticleUpdate,
)
from app.services import knowledge as kb_service

router = APIRouter(prefix="/knowledge", tags=["knowledge"])


@router.post(
    "/",
    response_model=KnowledgeArticleResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create a new knowledge article",
)
async def create_article(
    payload: KnowledgeArticleCreate,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(require_admin),
) -> KnowledgeArticleResponse:
    """Create a new knowledge base article.

    Args:
        payload: Article content and metadata.
        db: Active async database session.
        admin: Authenticated admin user who is creating the article.

    Returns:
        The newly created KnowledgeArticleResponse.
    """
    article = await kb_service.create_article(db, payload, created_by=admin.id)
    return KnowledgeArticleResponse.model_validate(article)


@router.get(
    "/",
    response_model=KnowledgeArticleListResponse,
    summary="List knowledge articles (paginated)",
)
async def list_articles(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    active_only: bool = Query(True),
    db: AsyncSession = Depends(get_db),
) -> KnowledgeArticleListResponse:
    """Return a paginated list of knowledge articles.

    This endpoint is public — no authentication required.

    Args:
        skip: Number of records to skip.
        limit: Maximum number of records to return.
        active_only: When True, only active articles are returned.
        db: Active async database session.

    Returns:
        Paginated KnowledgeArticleListResponse.
    """
    articles, total = await kb_service.list_articles(
        db, skip=skip, limit=limit, active_only=active_only
    )
    return KnowledgeArticleListResponse(
        items=[KnowledgeArticleResponse.model_validate(a) for a in articles],
        total=total,
        skip=skip,
        limit=limit,
    )


@router.get(
    "/{article_id}",
    response_model=KnowledgeArticleResponse,
    summary="Get a single knowledge article",
)
async def get_article(
    article_id: int,
    db: AsyncSession = Depends(get_db),
) -> KnowledgeArticleResponse:
    """Fetch a knowledge article by ID.

    Args:
        article_id: Primary key of the article.
        db: Active async database session.

    Returns:
        KnowledgeArticleResponse.

    Raises:
        HTTPException 404: If the article does not exist.
    """
    article = await kb_service.get_article(db, article_id)
    if article is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Knowledge article {article_id} not found",
        )
    return KnowledgeArticleResponse.model_validate(article)


@router.patch(
    "/{article_id}",
    response_model=KnowledgeArticleResponse,
    summary="Partially update a knowledge article",
)
async def update_article(
    article_id: int,
    payload: KnowledgeArticleUpdate,
    db: AsyncSession = Depends(get_db),
    _admin: User = Depends(require_admin),
) -> KnowledgeArticleResponse:
    """Partially update a knowledge article.

    Args:
        article_id: Primary key of the article to update.
        payload: Fields to update (all optional).
        db: Active async database session.
        _admin: Authenticated admin user.

    Returns:
        Updated KnowledgeArticleResponse.

    Raises:
        HTTPException 404: If the article does not exist.
    """
    article = await kb_service.update_article(db, article_id, payload)
    if article is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Knowledge article {article_id} not found",
        )
    return KnowledgeArticleResponse.model_validate(article)


@router.delete(
    "/{article_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Soft-delete a knowledge article",
)
async def delete_article(
    article_id: int,
    db: AsyncSession = Depends(get_db),
    _admin: User = Depends(require_admin),
) -> None:
    """Soft-delete a knowledge article (sets active=False).

    Args:
        article_id: Primary key of the article.
        db: Active async database session.
        _admin: Authenticated admin user.

    Raises:
        HTTPException 404: If the article does not exist.
    """
    deleted = await kb_service.delete_article(db, article_id)
    if not deleted:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Knowledge article {article_id} not found",
        )
