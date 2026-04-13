"""Unit tests for the conversation service."""

from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from app.services.conversation import (
    create_conversation,
    get_conversation_by_token,
    update_conversation_status,
)


@pytest.mark.asyncio
async def test_create_conversation_sets_status_open():
    """New anonymous conversations should have OPEN status."""
    mock_db = MagicMock()
    mock_db.flush = AsyncMock()
    mock_db.refresh = AsyncMock()

    payload = MagicMock()
    payload.initial_message = "배송 문의입니다"

    conversation = await create_conversation(mock_db, payload)

    assert conversation.status == "OPEN"
    assert conversation.topic == "배송 문의입니다"
    assert mock_db.add.call_count == 1  # conversation only


@pytest.mark.asyncio
async def test_create_conversation_truncates_topic():
    """Topic should be truncated from initial_message to max 200 chars."""
    mock_db = MagicMock()
    mock_db.flush = AsyncMock()
    mock_db.refresh = AsyncMock()

    long_message = "A" * 500
    payload = MagicMock()
    payload.initial_message = long_message

    conversation = await create_conversation(mock_db, payload)
    assert len(conversation.topic) <= 200


@pytest.mark.asyncio
async def test_get_conversation_by_token_valid():
    """Should return conversation when token matches."""
    mock_conv = MagicMock()
    mock_result = MagicMock()
    mock_result.scalar_one_or_none.return_value = mock_conv

    mock_db = MagicMock()
    mock_db.execute = AsyncMock(return_value=mock_result)

    result = await get_conversation_by_token(mock_db, 1, "valid-token")
    assert result is mock_conv


@pytest.mark.asyncio
async def test_get_conversation_by_token_invalid():
    """Should return None when token doesn't match."""
    mock_result = MagicMock()
    mock_result.scalar_one_or_none.return_value = None

    mock_db = MagicMock()
    mock_db.execute = AsyncMock(return_value=mock_result)

    result = await get_conversation_by_token(mock_db, 1, "wrong-token")
    assert result is None


@pytest.mark.asyncio
async def test_update_conversation_status_to_resolved():
    """Updating to RESOLVED should set resolved_at."""
    mock_conv = MagicMock()
    mock_conv.status = "OPEN"
    mock_conv.resolved_at = None
    mock_conv.resolved_by = None

    mock_db = MagicMock()
    mock_db.get = AsyncMock(return_value=mock_conv)
    mock_db.flush = AsyncMock()
    mock_db.refresh = AsyncMock()

    result = await update_conversation_status(mock_db, 1, "RESOLVED", resolved_by=5)

    assert result.status == "RESOLVED"
    assert result.resolved_by == 5
    assert result.resolved_at is not None


@pytest.mark.asyncio
async def test_update_conversation_status_not_found():
    """Should return None when conversation doesn't exist."""
    mock_db = MagicMock()
    mock_db.get = AsyncMock(return_value=None)

    result = await update_conversation_status(mock_db, 999, "RESOLVED")
    assert result is None
