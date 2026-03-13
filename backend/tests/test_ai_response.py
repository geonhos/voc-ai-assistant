"""Unit tests for the AI response generation service."""

from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from app.services.ai_response import (
    _check_escalation_keywords,
    _extract_confidence,
    generate_ai_response,
)


def _make_mock_db() -> MagicMock:
    """Return a mock that mirrors AsyncSession: add() is sync, flush/execute are async."""
    mock_db = MagicMock()
    mock_db.flush = AsyncMock()
    mock_db.execute = AsyncMock()
    return mock_db


# ---------------------------------------------------------------------------
# _extract_confidence
# ---------------------------------------------------------------------------


def test_extract_confidence_found():
    """Extracts numeric confidence and strips the tag from text."""
    text = "여기는 답변입니다. [confidence: 0.85]"
    cleaned, confidence = _extract_confidence(text)

    assert confidence == pytest.approx(0.85)
    assert "[confidence:" not in cleaned
    assert "여기는 답변입니다." in cleaned


def test_extract_confidence_missing_returns_default():
    """When no tag is present the default confidence of 0.5 is returned."""
    text = "태그 없는 답변입니다."
    cleaned, confidence = _extract_confidence(text)

    assert cleaned == text
    assert confidence == 0.5


def test_extract_confidence_clamps_above_one():
    """Confidence values above 1.0 are clamped to 1.0."""
    _, confidence = _extract_confidence("답변 [confidence: 1.5]")
    assert confidence == 1.0


def test_extract_confidence_clamps_below_zero():
    """Negative confidence values are clamped to 0.0."""
    _, confidence = _extract_confidence("답변 [confidence: -0.2]")
    assert confidence == 0.0


# ---------------------------------------------------------------------------
# _check_escalation_keywords
# ---------------------------------------------------------------------------


@pytest.mark.parametrize(
    "text",
    [
        "상담사 연결해 주세요",
        "환불 요청합니다",
        "법적 조치를 취하겠습니다",
        "소비자보호원에 신고할게요",
        "책임자와 통화하고 싶습니다",
    ],
)
def test_check_escalation_keywords_triggers(text: str):
    """Known escalation phrases return True."""
    assert _check_escalation_keywords(text) is True


def test_check_escalation_keywords_normal_message():
    """Ordinary customer messages do not trigger escalation."""
    assert _check_escalation_keywords("배송 상태가 어떻게 되나요?") is False


# ---------------------------------------------------------------------------
# generate_ai_response — happy path
# ---------------------------------------------------------------------------


def _make_fake_completion(content: str) -> MagicMock:
    """Build a minimal fake OpenAI ChatCompletion response."""
    completion = MagicMock()
    completion.choices = [MagicMock()]
    completion.choices[0].message.content = content
    return completion


@pytest.mark.asyncio
async def test_generate_ai_response_returns_message_and_no_escalation():
    """Standard high-confidence response: message saved, escalated=False."""
    mock_db = _make_mock_db()

    # Mock history query — no previous messages
    history_result = MagicMock()
    history_result.scalars.return_value.all.return_value = []
    mock_db.execute = AsyncMock(return_value=history_result)

    fake_completion = _make_fake_completion("문제가 해결되었습니다. [confidence: 0.9]")

    with (
        patch(
            "app.services.ai_response.retrieve_context",
            new=AsyncMock(return_value=[]),
        ),
        patch(
            "app.services.ai_response._get_client",
            return_value=AsyncMock(
                chat=MagicMock(
                    completions=MagicMock(
                        create=AsyncMock(return_value=fake_completion)
                    )
                )
            ),
        ),
    ):
        ai_msg, escalated = await generate_ai_response(mock_db, 1, "주문 상태 알려주세요")

    assert escalated is False
    assert ai_msg.sender == "AI"
    assert ai_msg.confidence == pytest.approx(0.9)
    assert "[confidence:" not in ai_msg.text


@pytest.mark.asyncio
async def test_generate_ai_response_escalates_on_keyword():
    """Messages containing escalation keywords trigger escalation."""
    mock_db = _make_mock_db()

    history_result = MagicMock()
    history_result.scalars.return_value.all.return_value = []
    mock_db.execute = AsyncMock(return_value=history_result)

    fake_completion = _make_fake_completion(
        "환불 처리해 드리겠습니다. [confidence: 0.75]"
    )

    with (
        patch(
            "app.services.ai_response.retrieve_context",
            new=AsyncMock(return_value=[]),
        ),
        patch(
            "app.services.ai_response._get_client",
            return_value=AsyncMock(
                chat=MagicMock(
                    completions=MagicMock(
                        create=AsyncMock(return_value=fake_completion)
                    )
                )
            ),
        ),
        patch(
            "app.services.ai_response.escalate_conversation",
            new=AsyncMock(),
        ) as mock_escalate,
    ):
        _, escalated = await generate_ai_response(
            mock_db, 1, "환불 요청합니다"  # contains keyword
        )

    assert escalated is True
    mock_escalate.assert_awaited_once()


@pytest.mark.asyncio
async def test_generate_ai_response_escalates_on_very_low_confidence():
    """Confidence < 0.3 triggers immediate escalation regardless of history."""
    mock_db = _make_mock_db()

    history_result = MagicMock()
    history_result.scalars.return_value.all.return_value = []
    mock_db.execute = AsyncMock(return_value=history_result)

    fake_completion = _make_fake_completion("잘 모르겠습니다. [confidence: 0.1]")

    with (
        patch(
            "app.services.ai_response.retrieve_context",
            new=AsyncMock(return_value=[]),
        ),
        patch(
            "app.services.ai_response._get_client",
            return_value=AsyncMock(
                chat=MagicMock(
                    completions=MagicMock(
                        create=AsyncMock(return_value=fake_completion)
                    )
                )
            ),
        ),
        patch(
            "app.services.ai_response.escalate_conversation",
            new=AsyncMock(),
        ) as mock_escalate,
    ):
        _, escalated = await generate_ai_response(
            mock_db, 1, "알 수 없는 질문"
        )

    assert escalated is True
    mock_escalate.assert_awaited_once()


@pytest.mark.asyncio
async def test_generate_ai_response_handles_openai_error_gracefully():
    """OpenAI failure returns a fallback message without raising."""
    mock_db = _make_mock_db()

    history_result = MagicMock()
    history_result.scalars.return_value.all.return_value = []
    mock_db.execute = AsyncMock(return_value=history_result)

    with (
        patch(
            "app.services.ai_response.retrieve_context",
            new=AsyncMock(return_value=[]),
        ),
        patch(
            "app.services.ai_response._get_client",
            return_value=AsyncMock(
                chat=MagicMock(
                    completions=MagicMock(
                        create=AsyncMock(side_effect=RuntimeError("network error"))
                    )
                )
            ),
        ),
        patch(
            "app.services.ai_response.escalate_conversation",
            new=AsyncMock(),
        ),
    ):
        ai_msg, _ = await generate_ai_response(mock_db, 1, "질문")

    # Fallback text should mention the error and escalation kicks in (confidence=0.0)
    assert "오류" in ai_msg.text or "죄송" in ai_msg.text


@pytest.mark.asyncio
async def test_generate_ai_response_boosts_confidence_on_high_similarity():
    """Confidence is boosted by 0.1 when the top RAG result has similarity > 0.7."""
    mock_db = _make_mock_db()

    history_result = MagicMock()
    history_result.scalars.return_value.all.return_value = []
    mock_db.execute = AsyncMock(return_value=history_result)

    # Model says 0.7 confidence, but similarity is 0.8 → should be boosted to 0.8
    fake_completion = _make_fake_completion("답변입니다. [confidence: 0.7]")
    high_similarity_articles = [{"similarity": 0.8, "title": "t", "content": "c", "category": "x", "id": 1}]

    with (
        patch(
            "app.services.ai_response.retrieve_context",
            new=AsyncMock(return_value=high_similarity_articles),
        ),
        patch(
            "app.services.ai_response._get_client",
            return_value=AsyncMock(
                chat=MagicMock(
                    completions=MagicMock(
                        create=AsyncMock(return_value=fake_completion)
                    )
                )
            ),
        ),
    ):
        ai_msg, escalated = await generate_ai_response(mock_db, 1, "질문")

    assert ai_msg.confidence == pytest.approx(0.8)
    assert escalated is False
