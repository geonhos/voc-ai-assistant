"""Embedding service — generates vector embeddings via OpenAI."""

from __future__ import annotations

import logging

from openai import AsyncOpenAI

from app.core.config import settings

logger = logging.getLogger(__name__)

_client: AsyncOpenAI | None = None


def _get_client() -> AsyncOpenAI:
    """Return a singleton AsyncOpenAI client.

    Returns:
        Configured AsyncOpenAI instance.
    """
    global _client
    if _client is None:
        _client = AsyncOpenAI(api_key=settings.OPENAI_API_KEY)
    return _client


async def generate_embedding(text: str) -> list[float]:
    """Generate embedding vector for text using text-embedding-3-small (1536 dims).

    Args:
        text: Input text to embed.

    Returns:
        List of 1536 float values representing the embedding vector.

    Raises:
        openai.APIError: If the OpenAI API call fails.
    """
    client = _get_client()
    response = await client.embeddings.create(
        model=settings.EMBEDDING_MODEL,
        input=text,
    )
    return response.data[0].embedding


async def generate_embeddings_batch(texts: list[str]) -> list[list[float]]:
    """Generate embeddings for multiple texts in one API call.

    Ordering of returned embeddings matches the input order, regardless of
    the order OpenAI returns them.

    Args:
        texts: List of input strings to embed.

    Returns:
        List of embedding vectors, one per input text.
    """
    if not texts:
        return []
    client = _get_client()
    response = await client.embeddings.create(
        model=settings.EMBEDDING_MODEL,
        input=texts,
    )
    return [item.embedding for item in sorted(response.data, key=lambda x: x.index)]
