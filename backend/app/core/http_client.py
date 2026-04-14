"""Shared singleton HTTP client for Ollama API calls.

All services that communicate with the Ollama backend should use
:func:`get_client` instead of creating their own :class:`httpx.AsyncClient`
instances.  The singleton is initialised lazily on first use and cleaned up
during the application lifespan shutdown hook in :mod:`app.main`.
"""

from __future__ import annotations

import httpx

from app.core.config import settings

_client: httpx.AsyncClient | None = None


def get_client() -> httpx.AsyncClient:
    """Return the singleton async HTTP client configured for Ollama.

    The client is created on first call and reused for the lifetime of the
    process.  :func:`close_client` must be called during application shutdown
    to release the underlying connection pool.

    Returns:
        A configured :class:`httpx.AsyncClient` with ``base_url`` pointing at
        the Ollama server and the timeout set from settings.
    """
    global _client
    if _client is None or _client.is_closed:
        _client = httpx.AsyncClient(
            base_url=settings.OLLAMA_URL,
            timeout=settings.OLLAMA_TIMEOUT,
        )
    return _client


async def close_client() -> None:
    """Close the singleton HTTP client and release its connection pool.

    Safe to call even if the client has never been created or is already closed.
    """
    global _client
    if _client is not None:
        await _client.aclose()
        _client = None
