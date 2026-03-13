"""Unit tests for the admin message service."""

from unittest.mock import AsyncMock, MagicMock

import pytest

from app.services.admin_message import send_admin_message


def _make_mock_db() -> MagicMock:
    """Return a mock that mimics AsyncSession: add() is sync, flush() is async."""
    mock_db = MagicMock()
    mock_db.flush = AsyncMock()
    return mock_db


@pytest.mark.asyncio
async def test_send_admin_message_sets_sender_to_admin():
    """Persisted message should have sender='ADMIN'."""
    mock_db = _make_mock_db()

    message = await send_admin_message(mock_db, conversation_id=3, admin_id=7, text="확인 중입니다.")

    assert message.sender == "ADMIN"
    assert message.text == "확인 중입니다."
    assert message.conversation_id == 3


@pytest.mark.asyncio
async def test_send_admin_message_calls_flush():
    """send_admin_message must flush so the caller can see the generated id."""
    mock_db = _make_mock_db()

    await send_admin_message(mock_db, conversation_id=1, admin_id=2, text="테스트")

    mock_db.flush.assert_awaited_once()


@pytest.mark.asyncio
async def test_send_admin_message_adds_to_session():
    """The message object must be passed to db.add before flushing."""
    mock_db = _make_mock_db()

    added_objects: list = []
    mock_db.add.side_effect = lambda obj: added_objects.append(obj)

    await send_admin_message(mock_db, conversation_id=5, admin_id=1, text="안녕하세요")

    assert len(added_objects) == 1
    assert added_objects[0].sender == "ADMIN"
