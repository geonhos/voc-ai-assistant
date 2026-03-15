"""Embedding service — generates vector embeddings via local Ollama."""

from __future__ import annotations

import logging

import httpx

from app.core.config import settings

logger = logging.getLogger(__name__)

_client: httpx.AsyncClient | None = None


def _get_client() -> httpx.AsyncClient:
    """Return a singleton async HTTP client for Ollama."""
    global _client
    if _client is None:
        _client = httpx.AsyncClient(base_url=settings.OLLAMA_URL, timeout=60.0)
    return _client


async def generate_embedding(text: str) -> list[float]:
    """Generate embedding vector for text using Ollama bge-m3 (1024 dims).

    Args:
        text: Input text to embed.

    Returns:
        List of float values representing the embedding vector.
    """
    client = _get_client()
    response = await client.post(
        "/api/embed",
        json={
            "model": settings.OLLAMA_EMBED_MODEL,
            "input": text,
            "keep_alive": "10m",
        },
    )
    response.raise_for_status()
    data = response.json()
    return data["embeddings"][0]


async def generate_embeddings_batch(texts: list[str]) -> list[list[float]]:
    """Generate embeddings for multiple texts.

    Args:
        texts: List of input strings to embed.

    Returns:
        List of embedding vectors, one per input text.
    """
    if not texts:
        return []
    client = _get_client()
    response = await client.post(
        "/api/embed",
        json={
            "model": settings.OLLAMA_EMBED_MODEL,
            "input": texts,
            "keep_alive": "10m",
        },
    )
    response.raise_for_status()
    data = response.json()
    return data["embeddings"]
