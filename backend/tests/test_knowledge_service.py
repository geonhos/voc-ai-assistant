"""Unit tests for the knowledge article service — embedding integration."""

from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from app.schemas.knowledge import KnowledgeArticleCreate, KnowledgeArticleUpdate
from app.services.knowledge import create_article, update_article


def _make_mock_db() -> MagicMock:
    """Return a synchronous MagicMock that mimics AsyncSession.

    db.add() is a regular synchronous method; only db.flush() and db.get()
    are async.  Using a plain MagicMock avoids the 'coroutine never awaited'
    warning that appears when AsyncMock wraps sync methods.
    """
    mock_db = MagicMock()
    mock_db.flush = AsyncMock()
    mock_db.get = AsyncMock()
    return mock_db


# ---------------------------------------------------------------------------
# create_article
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_create_article_generates_embedding():
    """create_article calls generate_embedding and stores the vector on the article."""
    mock_db = _make_mock_db()
    fake_vector = [0.1] * 1536
    payload = KnowledgeArticleCreate(
        title="배송 정책",
        category="배송",
        content="영업일 기준 3일 내 배송됩니다.",
        tags=["배송", "정책"],
    )

    # Patch at the source module because knowledge.py does a local import.
    with patch(
        "app.services.embedding.generate_embedding",
        new=AsyncMock(return_value=fake_vector),
    ) as mock_embed:
        article = await create_article(mock_db, payload, created_by=1)

    mock_embed.assert_awaited_once()
    call_text = mock_embed.call_args[0][0]
    assert "배송 정책" in call_text
    assert "배송" in call_text
    assert "영업일 기준 3일 내 배송됩니다." in call_text
    assert article.embedding == fake_vector


@pytest.mark.asyncio
async def test_create_article_continues_on_embedding_failure():
    """Embedding failure is swallowed — the article is still returned."""
    mock_db = _make_mock_db()
    payload = KnowledgeArticleCreate(
        title="테스트",
        category="일반",
        content="내용",
        tags=[],
    )

    with patch(
        "app.services.embedding.generate_embedding",
        new=AsyncMock(side_effect=RuntimeError("API timeout")),
    ):
        article = await create_article(mock_db, payload)

    # Article should still be returned without raising
    assert article is not None
    assert article.title == "테스트"


# ---------------------------------------------------------------------------
# update_article
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_update_article_regenerates_embedding_on_content_change():
    """Embedding is regenerated when title, category, or content is updated."""
    from app.models.knowledge import KnowledgeArticle

    existing = KnowledgeArticle(
        id=5,
        title="이전 제목",
        category="기존",
        content="기존 내용",
        tags=[],
        active=True,
    )

    mock_db = _make_mock_db()
    mock_db.get = AsyncMock(return_value=existing)

    fake_vector = [0.9] * 1536
    payload = KnowledgeArticleUpdate(title="새 제목")

    with patch(
        "app.services.embedding.generate_embedding",
        new=AsyncMock(return_value=fake_vector),
    ) as mock_embed:
        article = await update_article(mock_db, 5, payload)

    mock_embed.assert_awaited_once()
    assert article.embedding == fake_vector


@pytest.mark.asyncio
async def test_update_article_skips_embedding_when_only_active_changed():
    """Embedding is NOT regenerated when only non-content fields (e.g. active) change."""
    from app.models.knowledge import KnowledgeArticle

    existing = KnowledgeArticle(
        id=6,
        title="제목",
        category="카테고리",
        content="내용",
        tags=[],
        active=True,
    )

    mock_db = _make_mock_db()
    mock_db.get = AsyncMock(return_value=existing)

    payload = KnowledgeArticleUpdate(active=False)

    with patch(
        "app.services.embedding.generate_embedding",
        new=AsyncMock(),
    ) as mock_embed:
        await update_article(mock_db, 6, payload)

    mock_embed.assert_not_awaited()


@pytest.mark.asyncio
async def test_update_article_returns_none_when_not_found():
    """Returns None when the article does not exist."""
    mock_db = _make_mock_db()
    mock_db.get = AsyncMock(return_value=None)

    result = await update_article(mock_db, 999, KnowledgeArticleUpdate(title="x"))
    assert result is None
