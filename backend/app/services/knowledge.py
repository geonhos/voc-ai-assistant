"""Knowledge article service."""

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.knowledge import KnowledgeArticle
from app.schemas.knowledge import KnowledgeArticleCreate, KnowledgeArticleUpdate


async def create_article(
    db: AsyncSession,
    payload: KnowledgeArticleCreate,
    created_by: int | None = None,
) -> KnowledgeArticle:
    """Create a new knowledge article.

    Args:
        db: Active async database session.
        payload: Article creation data.
        created_by: ID of the admin user creating the article.

    Returns:
        The newly created KnowledgeArticle instance.
    """
    article = KnowledgeArticle(
        title=payload.title,
        category=payload.category,
        content=payload.content,
        tags=payload.tags,
        active=True,
        created_by=created_by,
    )
    db.add(article)
    await db.flush()
    return article


async def get_article(
    db: AsyncSession,
    article_id: int,
) -> KnowledgeArticle | None:
    """Fetch a single knowledge article by ID.

    Args:
        db: Active async database session.
        article_id: Primary key of the article.

    Returns:
        KnowledgeArticle or None.
    """
    return await db.get(KnowledgeArticle, article_id)


async def list_articles(
    db: AsyncSession,
    skip: int = 0,
    limit: int = 50,
    active_only: bool = True,
) -> tuple[list[KnowledgeArticle], int]:
    """List knowledge articles with pagination.

    Args:
        db: Active async database session.
        skip: Number of records to skip.
        limit: Maximum number of records to return.
        active_only: When True, only return active articles.

    Returns:
        Tuple of (articles list, total count).
    """
    query = select(KnowledgeArticle)
    count_query = select(func.count(KnowledgeArticle.id))

    if active_only:
        query = query.where(KnowledgeArticle.active.is_(True))
        count_query = count_query.where(KnowledgeArticle.active.is_(True))

    total_result = await db.execute(count_query)
    total = total_result.scalar_one()

    result = await db.execute(
        query.order_by(KnowledgeArticle.created_at.desc()).offset(skip).limit(limit)
    )
    return list(result.scalars().all()), total


async def update_article(
    db: AsyncSession,
    article_id: int,
    payload: KnowledgeArticleUpdate,
) -> KnowledgeArticle | None:
    """Partially update a knowledge article.

    Args:
        db: Active async database session.
        article_id: Primary key of the article to update.
        payload: Fields to update (None values are skipped).

    Returns:
        Updated KnowledgeArticle or None if not found.
    """
    article = await db.get(KnowledgeArticle, article_id)
    if article is None:
        return None

    update_data = payload.model_dump(exclude_none=True)
    for field, value in update_data.items():
        setattr(article, field, value)

    await db.flush()
    return article


async def delete_article(
    db: AsyncSession,
    article_id: int,
) -> bool:
    """Soft-delete a knowledge article by setting active=False.

    Args:
        db: Active async database session.
        article_id: Primary key of the article.

    Returns:
        True if the article was found and deactivated, False otherwise.
    """
    article = await db.get(KnowledgeArticle, article_id)
    if article is None:
        return False

    article.active = False
    await db.flush()
    return True
