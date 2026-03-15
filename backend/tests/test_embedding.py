"""Unit tests for the embedding service."""

from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from app.services.embedding import generate_embedding, generate_embeddings_batch


@pytest.fixture(autouse=True)
def reset_client():
    """Reset the module-level singleton between tests."""
    import app.services.embedding as emb_mod

    emb_mod._client = None
    yield
    emb_mod._client = None


# ---------------------------------------------------------------------------
# generate_embedding
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_generate_embedding_returns_vector():
    """generate_embedding should return a list of floats from the API response."""
    fake_vector = [0.1] * 1024

    mock_response = MagicMock()
    mock_response.raise_for_status = MagicMock()
    mock_response.json = MagicMock(return_value={"embeddings": [fake_vector]})

    mock_client = AsyncMock()
    mock_client.post = AsyncMock(return_value=mock_response)

    with patch("app.services.embedding._get_client", return_value=mock_client):
        result = await generate_embedding("test text")

    assert result == fake_vector
    mock_client.post.assert_awaited_once()
    call_args = mock_client.post.call_args
    assert call_args[0][0] == "/api/embed"
    assert call_args[1]["json"]["input"] == "test text"


@pytest.mark.asyncio
async def test_generate_embedding_uses_correct_model():
    """generate_embedding should call the model from settings."""
    fake_vector = [0.0] * 1024
    mock_response = MagicMock()
    mock_response.raise_for_status = MagicMock()
    mock_response.json = MagicMock(return_value={"embeddings": [fake_vector]})

    mock_client = AsyncMock()
    mock_client.post = AsyncMock(return_value=mock_response)

    with patch("app.services.embedding._get_client", return_value=mock_client):
        await generate_embedding("hello")

    call_args = mock_client.post.call_args
    assert call_args[1]["json"]["model"] == "bge-m3"


# ---------------------------------------------------------------------------
# generate_embeddings_batch
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_generate_embeddings_batch_empty_input():
    """generate_embeddings_batch should return [] without calling the API."""
    with patch("app.services.embedding._get_client") as mock_get:
        result = await generate_embeddings_batch([])

    assert result == []
    mock_get.assert_not_called()


@pytest.mark.asyncio
async def test_generate_embeddings_batch_preserves_order():
    """Embeddings must be returned in input order."""
    vec_a = [1.0] * 1024
    vec_b = [2.0] * 1024

    mock_response = MagicMock()
    mock_response.raise_for_status = MagicMock()
    mock_response.json = MagicMock(return_value={"embeddings": [vec_a, vec_b]})

    mock_client = AsyncMock()
    mock_client.post = AsyncMock(return_value=mock_response)

    with patch("app.services.embedding._get_client", return_value=mock_client):
        result = await generate_embeddings_batch(["first", "second"])

    assert result[0] == vec_a
    assert result[1] == vec_b
