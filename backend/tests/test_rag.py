"""Unit tests for the RAG service."""

from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from app.services.rag import format_context, retrieve_context


# ---------------------------------------------------------------------------
# format_context
# ---------------------------------------------------------------------------


def test_format_context_empty_list():
    """Returns Korean fallback message when no articles provided."""
    result = format_context([])
    assert "찾지 못했습니다" in result


def test_format_context_single_article():
    """Single article is formatted with document number, title, category, similarity."""
    articles = [
        {
            "id": 1,
            "title": "환불 정책",
            "content": "30일 이내 환불 가능합니다.",
            "category": "정책",
            "similarity": 0.85,
        }
    ]
    result = format_context(articles)

    assert "[문서 1]" in result
    assert "환불 정책" in result
    assert "정책" in result
    assert "0.85" in result
    assert "30일 이내 환불 가능합니다." in result


def test_format_context_multiple_articles_separated_by_divider():
    """Multiple articles are separated by the --- divider."""
    articles = [
        {
            "id": 1,
            "title": "A",
            "content": "content A",
            "category": "cat",
            "similarity": 0.9,
        },
        {
            "id": 2,
            "title": "B",
            "content": "content B",
            "category": "cat",
            "similarity": 0.7,
        },
    ]
    result = format_context(articles)

    assert "[문서 1]" in result
    assert "[문서 2]" in result
    assert "---" in result


# ---------------------------------------------------------------------------
# retrieve_context
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_retrieve_context_returns_empty_on_embedding_failure():
    """When embedding generation raises, returns empty list without propagating."""
    mock_db = AsyncMock()

    with patch(
        "app.services.rag.generate_embedding",
        side_effect=RuntimeError("API down"),
    ):
        result = await retrieve_context(mock_db, "test query")

    assert result == []
    mock_db.execute.assert_not_called()


@pytest.mark.asyncio
async def test_retrieve_context_returns_formatted_rows():
    """retrieve_context maps DB rows to the expected dict structure."""
    fake_vector = [0.1] * 1536
    fake_rows = [
        MagicMock(
            id=10,
            title="운송 정책",
            content="빠른 배송을 제공합니다.",
            category="배송",
            similarity=0.88,
        )
    ]

    mock_result = MagicMock()
    mock_result.fetchall.return_value = fake_rows

    mock_db = AsyncMock()
    mock_db.execute = AsyncMock(return_value=mock_result)

    with patch(
        "app.services.rag.generate_embedding",
        new=AsyncMock(return_value=fake_vector),
    ):
        result = await retrieve_context(mock_db, "배송은 얼마나 걸리나요?")

    assert len(result) == 1
    assert result[0]["id"] == 10
    assert result[0]["title"] == "운송 정책"
    assert result[0]["similarity"] == 0.88
    assert result[0]["category"] == "배송"


@pytest.mark.asyncio
async def test_retrieve_context_passes_threshold_to_query():
    """Custom threshold and top_k are forwarded to the SQL parameters."""
    fake_vector = [0.0] * 1536
    mock_result = MagicMock()
    mock_result.fetchall.return_value = []

    mock_db = AsyncMock()
    mock_db.execute = AsyncMock(return_value=mock_result)

    with patch(
        "app.services.rag.generate_embedding",
        new=AsyncMock(return_value=fake_vector),
    ):
        await retrieve_context(mock_db, "query", top_k=5, similarity_threshold=0.6)

    # Inspect the parameters dict passed to db.execute
    call_args = mock_db.execute.call_args
    params = call_args[0][1]  # second positional arg is the params dict
    assert params["threshold"] == 0.6
    assert params["top_k"] == 5
