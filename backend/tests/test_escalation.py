"""Unit tests for the escalation service."""

from unittest.mock import AsyncMock, MagicMock

import pytest

from app.services.escalation import escalate_conversation, resolve_escalation


@pytest.mark.asyncio
async def test_escalate_conversation_creates_event():
    """escalate_conversation should create an EscalationEvent and set status."""
    mock_conversation = MagicMock()
    mock_conversation.status = "OPEN"

    mock_db = MagicMock()
    mock_db.get = AsyncMock(return_value=mock_conversation)
    mock_db.flush = AsyncMock()

    event = await escalate_conversation(mock_db, 1, "low confidence")

    assert mock_conversation.status == "ESCALATED"
    assert event.conversation_id == 1
    assert event.reason == "low confidence"
    mock_db.add.assert_called_once()
    mock_db.flush.assert_awaited_once()


@pytest.mark.asyncio
async def test_escalate_conversation_handles_missing_conversation():
    """escalate_conversation should still create event even if conversation not found."""
    mock_db = MagicMock()
    mock_db.get = AsyncMock(return_value=None)
    mock_db.flush = AsyncMock()

    event = await escalate_conversation(mock_db, 999, "test reason")

    assert event.conversation_id == 999
    mock_db.add.assert_called_once()


@pytest.mark.asyncio
async def test_resolve_escalation_marks_resolved():
    """resolve_escalation should set resolved_at and resolved_by."""
    mock_event = MagicMock()
    mock_event.resolved_at = None
    mock_event.resolved_by = None

    mock_db = MagicMock()
    mock_db.get = AsyncMock(return_value=mock_event)
    mock_db.flush = AsyncMock()

    result = await resolve_escalation(mock_db, 1, resolved_by=42)

    assert result is mock_event
    assert mock_event.resolved_by == 42
    assert mock_event.resolved_at is not None


@pytest.mark.asyncio
async def test_resolve_escalation_returns_none_when_not_found():
    """resolve_escalation should return None for missing events."""
    mock_db = MagicMock()
    mock_db.get = AsyncMock(return_value=None)

    result = await resolve_escalation(mock_db, 999, resolved_by=1)
    assert result is None
