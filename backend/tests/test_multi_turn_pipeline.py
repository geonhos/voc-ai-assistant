"""Unit tests for Phase 3 — Multi-Turn Perfect Answer pipeline.

Covers:
- T-MT-006: Pass 1.5 completeness check integration in generate_merchant_ai_response
  - Branch B (fresh query): incomplete query triggers clarification flow
  - Branch B (fresh query): complete query falls through to tool execution
  - Branch A (GATHERING_INFO): second answer still incomplete → ask again
  - Branch A (GATHERING_INFO): second answer now complete → proceed to answer
  - Branch A (GATHERING_INFO): max turns reached → force answer
- T-MT-007: Self-evaluation runs only for multi-turn completed answers
- T-MT-009: merchant_chat endpoint propagates clarification_state and quick_options
- clarification_state module: get_state, start_gathering, update_context, mark_complete,
  should_force_answer
- completeness module: CompletenessResult, _strip_markdown_code_block, assess_completeness
"""

from __future__ import annotations

import json
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

# ---------------------------------------------------------------------------
# Shared helpers
# ---------------------------------------------------------------------------


def _make_mock_db(scalars_return=None) -> MagicMock:
    """Return a mock AsyncSession.

    ``scalars_return`` sets the value returned by
    ``result.scalars().all()`` for ``db.execute()`` calls.  Defaults to an
    empty list (no conversation history, no Conversation row).

    ``db.refresh(obj)`` is implemented to set ``obj.id = 1`` and
    ``obj.created_at`` to a fixed datetime so that logging and isoformat()
    calls after refresh work without raising.
    """
    import datetime

    if scalars_return is None:
        scalars_return = []
    mock_db = MagicMock()
    mock_db.flush = AsyncMock()
    mock_db.commit = AsyncMock()

    async def _refresh(obj):
        obj.id = 1
        obj.created_at = datetime.datetime(2026, 3, 18, 10, 0, 0)

    mock_db.refresh = _refresh
    execute_result = MagicMock()
    execute_result.scalars.return_value.all.return_value = scalars_return
    execute_result.scalar_one_or_none.return_value = None  # no clarification state
    mock_db.execute = AsyncMock(return_value=execute_result)
    return mock_db


def _make_fake_ollama_response(content: str) -> MagicMock:
    response = MagicMock()
    response.raise_for_status = MagicMock()
    response.json = MagicMock(return_value={"message": {"content": content}})
    return response


# ===========================================================================
# clarification_state module
# ===========================================================================


class TestClarificationStateHelpers:
    def test_should_force_answer_false_when_no_state(self):
        from app.services.clarification_state import should_force_answer

        assert should_force_answer(None) is False

    def test_should_force_answer_false_below_limit(self):
        from app.services.clarification_state import should_force_answer

        state = {"state": "GATHERING_INFO", "turn_count": 2}
        assert should_force_answer(state) is False

    def test_should_force_answer_true_at_limit(self):
        from app.services.clarification_state import (
            MAX_CLARIFICATION_TURNS,
            should_force_answer,
        )

        state = {"state": "GATHERING_INFO", "turn_count": MAX_CLARIFICATION_TURNS + 1}
        assert should_force_answer(state) is True

    def test_should_force_answer_true_above_limit(self):
        from app.services.clarification_state import should_force_answer

        state = {"state": "GATHERING_INFO", "turn_count": 99}
        assert should_force_answer(state) is True

    @pytest.mark.asyncio
    async def test_get_state_returns_none_when_no_row(self):
        from app.services.clarification_state import get_state

        mock_db = _make_mock_db()
        result = await get_state(mock_db, conversation_id=1)
        assert result is None

    @pytest.mark.asyncio
    async def test_get_state_returns_stored_state(self):
        from app.services.clarification_state import get_state

        stored = {"state": "GATHERING_INFO", "turn_count": 1, "original_query": "q"}
        execute_result = MagicMock()
        execute_result.scalar_one_or_none.return_value = stored
        mock_db = MagicMock()
        mock_db.execute = AsyncMock(return_value=execute_result)

        result = await get_state(mock_db, conversation_id=5)
        assert result == stored

    @pytest.mark.asyncio
    async def test_start_gathering_returns_state_with_turn_count_0(self):
        from app.services.clarification_state import start_gathering

        mock_db = _make_mock_db()
        state = await start_gathering(
            mock_db,
            conversation_id=1,
            original_query="거래 조회",
            questions=["거래번호가 무엇인가요?"],
            quick_options=[["TXN001", "TXN002"]],
            completeness_score=0.3,
        )

        assert state["state"] == "GATHERING_INFO"
        assert state["turn_count"] == 0
        assert state["original_query"] == "거래 조회"
        assert state["completeness_score"] == pytest.approx(0.3)

    @pytest.mark.asyncio
    async def test_update_context_merges_info_and_increments_turn(self):
        from app.services.clarification_state import update_context

        current = {
            "state": "GATHERING_INFO",
            "accumulated_context": {"거래번호": "TXN001"},
            "turn_count": 1,
            "original_query": "조회",
        }
        execute_result = MagicMock()
        execute_result.scalar_one_or_none.return_value = current
        mock_db = MagicMock()
        mock_db.execute = AsyncMock(return_value=execute_result)
        mock_db.flush = AsyncMock()

        updated = await update_context(mock_db, conversation_id=1, new_info={"결제수단": "카드"})

        assert updated["accumulated_context"]["거래번호"] == "TXN001"
        assert updated["accumulated_context"]["결제수단"] == "카드"
        assert updated["turn_count"] == 2

    @pytest.mark.asyncio
    async def test_update_context_returns_idle_when_no_state(self):
        from app.services.clarification_state import update_context

        mock_db = _make_mock_db()  # scalar_one_or_none returns None
        result = await update_context(mock_db, conversation_id=99, new_info={"x": "y"})
        assert result["state"] == "IDLE"

    @pytest.mark.asyncio
    async def test_mark_complete_clears_state(self):
        from app.services.clarification_state import mark_complete

        mock_db = _make_mock_db()
        # Should not raise
        await mark_complete(mock_db, conversation_id=1)
        mock_db.execute.assert_awaited()


# ===========================================================================
# completeness module
# ===========================================================================


class TestCompletenessStripMarkdown:
    def test_strips_json_fence(self):
        from app.services.completeness import _strip_markdown_code_block

        fenced = '```json\n{"confidence": 0.9}\n```'
        assert _strip_markdown_code_block(fenced) == '{"confidence": 0.9}'

    def test_strips_plain_fence(self):
        from app.services.completeness import _strip_markdown_code_block

        fenced = '```\n{"confidence": 0.5}\n```'
        assert _strip_markdown_code_block(fenced) == '{"confidence": 0.5}'

    def test_no_fence_unchanged(self):
        from app.services.completeness import _strip_markdown_code_block

        raw = '{"confidence": 0.7}'
        assert _strip_markdown_code_block(raw) == raw


class TestAssessCompleteness:
    @pytest.mark.asyncio
    async def test_returns_complete_when_confidence_high(self):
        from app.services.completeness import assess_completeness

        fake_response = MagicMock()
        fake_response.raise_for_status = MagicMock()
        fake_response.json = MagicMock(
            return_value={
                "message": {
                    "content": json.dumps({
                        "confidence": 0.9,
                        "missing_fields": [],
                        "questions": [],
                        "quick_options": [],
                    })
                }
            }
        )

        mock_client = AsyncMock()
        mock_client.post = AsyncMock(return_value=fake_response)

        with patch("app.services.ai_response._get_client", return_value=mock_client):
            result = await assess_completeness(
                "TXN001 거래 조회해 주세요",
                {"tool": "lookup_transaction"},
                [],
            )

        assert result.is_complete is True
        assert result.confidence == pytest.approx(0.9)

    @pytest.mark.asyncio
    async def test_returns_incomplete_with_questions_when_confidence_low(self):
        from app.services.completeness import assess_completeness

        payload = {
            "confidence": 0.3,
            "missing_fields": ["거래번호"],
            "questions": ["거래번호가 무엇인가요?"],
            "quick_options": [["TXN001", "TXN002", "직접입력"]],
        }
        fake_response = MagicMock()
        fake_response.raise_for_status = MagicMock()
        fake_response.json = MagicMock(
            return_value={"message": {"content": json.dumps(payload)}}
        )

        mock_client = AsyncMock()
        mock_client.post = AsyncMock(return_value=fake_response)

        with patch("app.services.ai_response._get_client", return_value=mock_client):
            result = await assess_completeness(
                "거래 조회해 주세요",
                {"tool": None},
                [],
            )

        assert result.is_complete is False
        assert result.confidence == pytest.approx(0.3)
        assert "거래번호가 무엇인가요?" in result.questions
        assert result.quick_options[0] == ["TXN001", "TXN002", "직접입력"]

    @pytest.mark.asyncio
    async def test_defaults_to_complete_on_llm_failure(self):
        """On any HTTP/parse error, assess_completeness defaults to is_complete=True."""
        from app.services.completeness import assess_completeness

        mock_client = AsyncMock()
        mock_client.post = AsyncMock(side_effect=RuntimeError("network error"))

        with patch("app.services.ai_response._get_client", return_value=mock_client):
            result = await assess_completeness("질문", {}, [])

        assert result.is_complete is True
        assert result.confidence == pytest.approx(1.0)


# ===========================================================================
# generate_merchant_ai_response — Phase 3 Pass 1.5 flows
# ===========================================================================


class TestGenerateMerchantAiResponsePhase3:
    """Tests for Pass 1.5 completeness check integrated into the merchant pipeline."""

    def _setup_db_no_state(self):
        """DB mock with no active clarification state and no chat history."""
        mock_db = _make_mock_db()
        return mock_db

    # ------------------------------------------------------------------
    # Branch B: fresh query — incomplete → start clarification
    # ------------------------------------------------------------------

    @pytest.mark.asyncio
    async def test_incomplete_fresh_query_returns_clarification_state(self):
        """A fresh ambiguous query triggers GATHERING_INFO and returns early."""
        from app.services.ai_response import generate_merchant_ai_response
        from app.services.completeness import CompletenessResult

        mock_db = self._setup_db_no_state()

        incomplete_assessment = CompletenessResult(
            is_complete=False,
            confidence=0.3,
            missing_fields=["거래번호"],
            questions=["거래번호를 알려주세요."],
            quick_options=[["TXN001", "TXN002"]],
        )

        with (
            patch(
                "app.services.clarification_state.get_state",
                new=AsyncMock(return_value=None),
            ),
            patch(
                "app.services.clarification_state.start_gathering",
                new=AsyncMock(return_value={
                    "state": "GATHERING_INFO",
                    "turn_count": 0,
                    "original_query": "거래 조회",
                    "accumulated_context": {},
                }),
            ),
            patch(
                "app.services.completeness.assess_completeness",
                new=AsyncMock(return_value=incomplete_assessment),
            ),
            patch(
                "app.services.tool_router.classify_intent",
                new=AsyncMock(return_value={"tool": None}),
            ),
        ):
            result = await generate_merchant_ai_response(
                mock_db,
                conversation_id=1,
                merchant_id=42,
                customer_text="거래 조회해 주세요",
            )

        assert result["clarification_state"] == "GATHERING_INFO"
        assert result["escalated"] is False
        assert result["quick_options"] == [["TXN001", "TXN002"]]
        assert "거래번호를 알려주세요." in result["message"]["text"]
        assert result["message"]["tool_name"] == "clarification"

    @pytest.mark.asyncio
    async def test_complete_fresh_query_proceeds_to_tool_execution(self):
        """A fresh complete query bypasses clarification and reaches tool execution."""
        from app.services.ai_response import generate_merchant_ai_response
        from app.services.completeness import CompletenessResult

        mock_db = self._setup_db_no_state()
        fake_ollama = _make_fake_ollama_response("거래 TXN001 조회 결과입니다. [confidence: 0.85]")

        complete_assessment = CompletenessResult(
            is_complete=True,
            confidence=0.9,
        )

        with (
            patch(
                "app.services.clarification_state.get_state",
                new=AsyncMock(return_value=None),
            ),
            patch(
                "app.services.completeness.assess_completeness",
                new=AsyncMock(return_value=complete_assessment),
            ),
            patch(
                "app.services.tool_router.classify_intent",
                new=AsyncMock(return_value={"tool": None}),
            ),
            patch(
                "app.services.ai_response.retrieve_context",
                new=AsyncMock(return_value=[]),
            ),
            patch(
                "app.services.ai_response._get_client",
                return_value=AsyncMock(post=AsyncMock(return_value=fake_ollama)),
            ),
        ):
            result = await generate_merchant_ai_response(
                mock_db,
                conversation_id=1,
                merchant_id=42,
                customer_text="TXN001 거래 조회해 주세요",
            )

        # Should fall through to normal pipeline: no clarification state
        assert result["clarification_state"] is None
        assert result["quick_options"] is None
        assert result["message"]["sender"] == "AI"
        assert result["message"]["confidence"] == pytest.approx(0.85)

    # ------------------------------------------------------------------
    # Branch A: GATHERING_INFO — second answer still incomplete
    # ------------------------------------------------------------------

    @pytest.mark.asyncio
    async def test_gathering_info_second_answer_still_incomplete_asks_again(self):
        """While in GATHERING_INFO, if re-assessment still fails, we ask another question."""
        from app.services.ai_response import generate_merchant_ai_response
        from app.services.completeness import CompletenessResult

        mock_db = self._setup_db_no_state()

        active_state = {
            "state": "GATHERING_INFO",
            "turn_count": 1,
            "original_query": "거래 조회",
            "accumulated_context": {},
            "pending_questions": ["거래번호를 알려주세요."],
            "quick_options": [["TXN001", "TXN002"]],
        }
        updated_state = dict(active_state, turn_count=2, accumulated_context={"answer_turn_1": "모르겠어요"})

        still_incomplete = CompletenessResult(
            is_complete=False,
            confidence=0.35,
            missing_fields=["거래번호"],
            questions=["정확한 거래번호를 숫자로 입력해 주세요."],
            quick_options=[[]],
        )

        with (
            patch(
                "app.services.clarification_state.get_state",
                new=AsyncMock(side_effect=[active_state, updated_state]),
            ),
            patch(
                "app.services.clarification_state.update_context",
                new=AsyncMock(return_value=updated_state),
            ),
            patch(
                "app.services.clarification_state.mark_complete",
                new=AsyncMock(),
            ),
            patch(
                "app.services.clarification_state.update_state_metadata",
                new=AsyncMock(),
            ),
            patch(
                "app.services.completeness.assess_completeness",
                new=AsyncMock(return_value=still_incomplete),
            ),
            patch(
                "app.services.tool_router.classify_intent",
                new=AsyncMock(return_value={"tool": None}),
            ),
        ):
            result = await generate_merchant_ai_response(
                mock_db,
                conversation_id=1,
                merchant_id=42,
                customer_text="모르겠어요",
            )

        assert result["clarification_state"] == "GATHERING_INFO"
        assert result["escalated"] is False
        assert "정확한 거래번호를" in result["message"]["text"]

    # ------------------------------------------------------------------
    # Branch A: GATHERING_INFO — second answer now complete → proceed
    # ------------------------------------------------------------------

    @pytest.mark.asyncio
    async def test_gathering_info_second_answer_complete_proceeds_to_pipeline(self):
        """When re-assessment passes, state is cleared and pipeline runs."""
        from app.services.ai_response import generate_merchant_ai_response
        from app.services.completeness import CompletenessResult

        mock_db = self._setup_db_no_state()
        fake_ollama = _make_fake_ollama_response("TXN001 거래 성공 처리되었습니다. [confidence: 0.88]")

        active_state = {
            "state": "GATHERING_INFO",
            "turn_count": 1,
            "original_query": "거래 조회",
            "accumulated_context": {},
        }
        updated_state = dict(active_state, turn_count=2, accumulated_context={"answer_turn_1": "TXN001"})

        now_complete = CompletenessResult(is_complete=True, confidence=0.9)

        mock_mark_complete = AsyncMock()

        with (
            patch(
                "app.services.clarification_state.get_state",
                new=AsyncMock(side_effect=[active_state, updated_state]),
            ),
            patch(
                "app.services.clarification_state.update_context",
                new=AsyncMock(return_value=updated_state),
            ),
            patch(
                "app.services.clarification_state.mark_complete",
                new=mock_mark_complete,
            ),
            patch(
                "app.services.completeness.assess_completeness",
                new=AsyncMock(return_value=now_complete),
            ),
            patch(
                "app.services.tool_router.classify_intent",
                new=AsyncMock(return_value={"tool": None}),
            ),
            patch(
                "app.services.ai_response.retrieve_context",
                new=AsyncMock(return_value=[]),
            ),
            patch(
                "app.services.ai_response._get_client",
                return_value=AsyncMock(post=AsyncMock(return_value=fake_ollama)),
            ),
        ):
            result = await generate_merchant_ai_response(
                mock_db,
                conversation_id=1,
                merchant_id=42,
                customer_text="TXN001",
            )

        # State must be cleared
        mock_mark_complete.assert_awaited_once()
        # Normal pipeline response — no clarification_state
        assert result["clarification_state"] is None
        assert result["message"]["sender"] == "AI"

    # ------------------------------------------------------------------
    # Branch A: max turns reached → force answer
    # ------------------------------------------------------------------

    @pytest.mark.asyncio
    async def test_max_turns_forces_answer_and_clears_state(self):
        """When turn_count >= MAX_CLARIFICATION_TURNS the pipeline is forced."""
        from app.services.ai_response import generate_merchant_ai_response
        from app.services.clarification_state import MAX_CLARIFICATION_TURNS

        mock_db = self._setup_db_no_state()
        fake_ollama = _make_fake_ollama_response("최선을 다해 답변 드립니다. [confidence: 0.7]")

        at_limit_state = {
            "state": "GATHERING_INFO",
            "turn_count": MAX_CLARIFICATION_TURNS,
            "original_query": "거래 조회",
            "accumulated_context": {"answer_turn_2": "모르겠어요"},
        }
        after_update_state = dict(at_limit_state, turn_count=MAX_CLARIFICATION_TURNS + 1)

        mock_mark_complete = AsyncMock()

        with (
            patch(
                "app.services.clarification_state.get_state",
                new=AsyncMock(side_effect=[at_limit_state, after_update_state]),
            ),
            patch(
                "app.services.clarification_state.update_context",
                new=AsyncMock(return_value=after_update_state),
            ),
            patch(
                "app.services.clarification_state.mark_complete",
                new=mock_mark_complete,
            ),
            patch(
                "app.services.tool_router.classify_intent",
                new=AsyncMock(return_value={"tool": None}),
            ),
            patch(
                "app.services.ai_response.retrieve_context",
                new=AsyncMock(return_value=[]),
            ),
            patch(
                "app.services.ai_response._get_client",
                return_value=AsyncMock(post=AsyncMock(return_value=fake_ollama)),
            ),
        ):
            result = await generate_merchant_ai_response(
                mock_db,
                conversation_id=1,
                merchant_id=42,
                customer_text="모르겠어요",
            )

        mock_mark_complete.assert_awaited_once()
        # Normal pipeline response
        assert result["clarification_state"] is None
        assert result["message"]["sender"] == "AI"
        assert "최선을 다해" in result["message"]["text"]

    # ------------------------------------------------------------------
    # T-MT-007: Self-evaluation
    # ------------------------------------------------------------------

    @pytest.mark.asyncio
    async def test_self_eval_boosts_confidence_after_multi_turn(self):
        """Quality self-eval runs and nudges confidence up for resolved clarification flow."""
        from app.services.ai_response import generate_merchant_ai_response
        from app.services.completeness import CompletenessResult

        mock_db = self._setup_db_no_state()
        # Pass 2 LLM response
        fake_ollama = _make_fake_ollama_response("답변입니다. [confidence: 0.7]")
        # Self-eval LLM response returns 0.8 quality → +0.08 → final = 0.78
        fake_eval = _make_fake_ollama_response("0.8")

        active_state = {
            "state": "GATHERING_INFO",
            "turn_count": 1,
            "original_query": "거래 조회",
            "accumulated_context": {},
        }
        updated_state = dict(active_state, turn_count=2, accumulated_context={"answer_turn_1": "TXN001"})
        now_complete = CompletenessResult(is_complete=True, confidence=0.9)

        with (
            patch(
                "app.services.clarification_state.get_state",
                new=AsyncMock(side_effect=[active_state, updated_state]),
            ),
            patch(
                "app.services.clarification_state.update_context",
                new=AsyncMock(return_value=updated_state),
            ),
            patch(
                "app.services.clarification_state.mark_complete",
                new=AsyncMock(),
            ),
            patch(
                "app.services.completeness.assess_completeness",
                new=AsyncMock(return_value=now_complete),
            ),
            patch(
                "app.services.tool_router.classify_intent",
                new=AsyncMock(return_value={"tool": None}),
            ),
            patch(
                "app.services.ai_response.retrieve_context",
                new=AsyncMock(return_value=[]),
            ),
            patch(
                "app.services.ai_response._get_client",
                return_value=AsyncMock(
                    post=AsyncMock(side_effect=[fake_ollama, fake_eval]),
                ),
            ),
        ):
            result = await generate_merchant_ai_response(
                mock_db,
                conversation_id=1,
                merchant_id=42,
                customer_text="TXN001",
            )

        # 0.7 base + 0.8 * 0.1 = 0.78
        assert result["message"]["confidence"] == pytest.approx(0.78)

    @pytest.mark.asyncio
    async def test_self_eval_skipped_on_non_multi_turn_path(self):
        """Self-eval does NOT run for fresh queries that were already complete."""
        from app.services.ai_response import generate_merchant_ai_response
        from app.services.completeness import CompletenessResult

        mock_db = self._setup_db_no_state()
        fake_ollama = _make_fake_ollama_response("답변입니다. [confidence: 0.75]")

        complete_assessment = CompletenessResult(is_complete=True, confidence=0.9)

        eval_called = []

        async def fake_eval_client_post(*args, **kwargs):
            eval_called.append(True)
            return _make_fake_ollama_response("0.9")

        with (
            patch(
                "app.services.clarification_state.get_state",
                new=AsyncMock(return_value=None),
            ),
            patch(
                "app.services.completeness.assess_completeness",
                new=AsyncMock(return_value=complete_assessment),
            ),
            patch(
                "app.services.tool_router.classify_intent",
                new=AsyncMock(return_value={"tool": None}),
            ),
            patch(
                "app.services.ai_response.retrieve_context",
                new=AsyncMock(return_value=[]),
            ),
            patch(
                "app.services.ai_response._get_client",
                return_value=AsyncMock(post=AsyncMock(return_value=fake_ollama)),
            ),
        ):
            result = await generate_merchant_ai_response(
                mock_db,
                conversation_id=1,
                merchant_id=42,
                customer_text="TXN001 거래 조회해 주세요",
            )

        # Self-eval must NOT have been called (was_in_clarification is False)
        assert len(eval_called) == 0
        assert result["message"]["confidence"] == pytest.approx(0.75)

    # ------------------------------------------------------------------
    # Return shape: clarification_state and quick_options always present
    # ------------------------------------------------------------------

    @pytest.mark.asyncio
    async def test_normal_response_has_null_clarification_state(self):
        """Normal (non-clarification) response always includes clarification_state=None."""
        from app.services.ai_response import generate_merchant_ai_response
        from app.services.completeness import CompletenessResult

        mock_db = self._setup_db_no_state()
        fake_ollama = _make_fake_ollama_response("답변입니다. [confidence: 0.8]")

        with (
            patch(
                "app.services.clarification_state.get_state",
                new=AsyncMock(return_value=None),
            ),
            patch(
                "app.services.completeness.assess_completeness",
                new=AsyncMock(return_value=CompletenessResult(is_complete=True, confidence=0.9)),
            ),
            patch(
                "app.services.tool_router.classify_intent",
                new=AsyncMock(return_value={"tool": None}),
            ),
            patch(
                "app.services.ai_response.retrieve_context",
                new=AsyncMock(return_value=[]),
            ),
            patch(
                "app.services.ai_response._get_client",
                return_value=AsyncMock(post=AsyncMock(return_value=fake_ollama)),
            ),
        ):
            result = await generate_merchant_ai_response(
                mock_db,
                conversation_id=7,
                merchant_id=42,
                customer_text="API 연동 문의",
            )

        assert "clarification_state" in result
        assert result["clarification_state"] is None
        assert "quick_options" in result
        assert result["quick_options"] is None

    @pytest.mark.asyncio
    async def test_clarification_response_message_has_conversation_id(self):
        """Clarification early-return message dict must include conversation_id."""
        from app.services.ai_response import generate_merchant_ai_response
        from app.services.completeness import CompletenessResult

        mock_db = self._setup_db_no_state()

        incomplete = CompletenessResult(
            is_complete=False,
            confidence=0.2,
            questions=["언제 결제하셨나요?"],
            quick_options=[["오늘", "어제"]],
        )

        with (
            patch(
                "app.services.clarification_state.get_state",
                new=AsyncMock(return_value=None),
            ),
            patch(
                "app.services.clarification_state.start_gathering",
                new=AsyncMock(),
            ),
            patch(
                "app.services.completeness.assess_completeness",
                new=AsyncMock(return_value=incomplete),
            ),
            patch(
                "app.services.tool_router.classify_intent",
                new=AsyncMock(return_value={"tool": None}),
            ),
        ):
            result = await generate_merchant_ai_response(
                mock_db,
                conversation_id=55,
                merchant_id=42,
                customer_text="결제 확인해 주세요",
            )

        assert result["message"]["conversation_id"] == 55

    # ------------------------------------------------------------------
    # T-MT-007: Self-eval failure is silent
    # ------------------------------------------------------------------

    @pytest.mark.asyncio
    async def test_self_eval_failure_is_non_fatal(self):
        """If self-eval raises, confidence is unchanged and no exception propagates."""
        from app.services.ai_response import generate_merchant_ai_response
        from app.services.completeness import CompletenessResult

        mock_db = self._setup_db_no_state()
        fake_ollama = _make_fake_ollama_response("답변입니다. [confidence: 0.72]")

        active_state = {
            "state": "GATHERING_INFO",
            "turn_count": 1,
            "original_query": "정산 조회",
            "accumulated_context": {},
        }
        updated_state = dict(active_state, turn_count=2, accumulated_context={"answer_turn_1": "3월"})
        now_complete = CompletenessResult(is_complete=True, confidence=0.85)

        with (
            patch(
                "app.services.clarification_state.get_state",
                new=AsyncMock(side_effect=[active_state, updated_state]),
            ),
            patch(
                "app.services.clarification_state.update_context",
                new=AsyncMock(return_value=updated_state),
            ),
            patch(
                "app.services.clarification_state.mark_complete",
                new=AsyncMock(),
            ),
            patch(
                "app.services.completeness.assess_completeness",
                new=AsyncMock(return_value=now_complete),
            ),
            patch(
                "app.services.tool_router.classify_intent",
                new=AsyncMock(return_value={"tool": None}),
            ),
            patch(
                "app.services.ai_response.retrieve_context",
                new=AsyncMock(return_value=[]),
            ),
            patch(
                "app.services.ai_response._get_client",
                return_value=AsyncMock(
                    post=AsyncMock(side_effect=[
                        fake_ollama,  # Pass 2 LLM
                        RuntimeError("timeout"),  # Self-eval fails
                    ]),
                ),
            ),
        ):
            result = await generate_merchant_ai_response(
                mock_db,
                conversation_id=1,
                merchant_id=42,
                customer_text="3월",
            )

        # Confidence unchanged from LLM output (self-eval silently skipped)
        assert result["message"]["confidence"] == pytest.approx(0.72)
        assert result["clarification_state"] is None


# ===========================================================================
# T-MT-009: merchant_chat endpoint propagation
# ===========================================================================


class TestMerchantChatEndpointClarificationPropagation:
    """Verify that send_merchant_message correctly passes through
    clarification_state and quick_options from the service layer."""

    @pytest.mark.asyncio
    async def test_endpoint_propagates_clarification_state(self):
        """ChatResponse carries clarification_state=GATHERING_INFO and quick_options."""
        from fastapi.testclient import TestClient

        from app.api.v1.merchant_chat import router
        from app.core.deps import get_current_merchant_user
        from app.core.database import get_db
        from app.services import conversation as conv_service
        from fastapi import FastAPI

        app = FastAPI()
        app.include_router(router)

        fake_user = MagicMock()
        fake_user.merchant_id = 1
        fake_user.email = "test@example.com"

        fake_conv = MagicMock()
        fake_conv.status = "OPEN"

        fake_ai_result = {
            "message": {
                "id": 99,
                "conversation_id": 5,
                "sender": "AI",
                "text": "거래번호를 알려주세요.",
                "confidence": 0.3,
                "tool_name": "clarification",
                "tool_data": None,
                "created_at": "2026-03-18T10:00:00",
            },
            "escalated": False,
            "clarification_state": "GATHERING_INFO",
            "quick_options": [["TXN001", "TXN002"]],
        }

        async def fake_db():
            yield MagicMock()

        app.dependency_overrides[get_db] = fake_db
        app.dependency_overrides[get_current_merchant_user] = lambda: fake_user

        with (
            patch.object(conv_service, "get_merchant_conversation", new=AsyncMock(return_value=fake_conv)),
            patch(
                "app.services.ai_response.generate_merchant_ai_response",
                new=AsyncMock(return_value=fake_ai_result),
            ),
        ):
            client = TestClient(app)
            response = client.post(
                "/merchant/conversations/5/messages",
                json={"text": "거래 조회해 주세요"},
            )

        assert response.status_code == 200
        body = response.json()
        assert body["clarification_state"] == "GATHERING_INFO"
        assert body["quick_options"] == [["TXN001", "TXN002"]]
        assert body["escalated"] is False

    @pytest.mark.asyncio
    async def test_endpoint_propagates_null_clarification_state(self):
        """Normal (non-clarification) response has clarification_state=null."""
        from fastapi.testclient import TestClient

        from app.api.v1.merchant_chat import router
        from app.core.deps import get_current_merchant_user
        from app.core.database import get_db
        from app.services import conversation as conv_service
        from fastapi import FastAPI

        app = FastAPI()
        app.include_router(router)

        fake_user = MagicMock()
        fake_user.merchant_id = 1
        fake_user.email = "test@example.com"

        fake_conv = MagicMock()
        fake_conv.status = "OPEN"

        normal_result = {
            "message": {
                "id": 100,
                "conversation_id": 5,
                "sender": "AI",
                "text": "API 연동 방법을 안내해 드립니다.",
                "confidence": 0.85,
                "tool_name": None,
                "tool_data": None,
                "created_at": "2026-03-18T10:00:00",
            },
            "escalated": False,
            "clarification_state": None,
            "quick_options": None,
        }

        async def fake_db():
            yield MagicMock()

        app.dependency_overrides[get_db] = fake_db
        app.dependency_overrides[get_current_merchant_user] = lambda: fake_user

        with (
            patch.object(conv_service, "get_merchant_conversation", new=AsyncMock(return_value=fake_conv)),
            patch(
                "app.services.ai_response.generate_merchant_ai_response",
                new=AsyncMock(return_value=normal_result),
            ),
        ):
            client = TestClient(app)
            response = client.post(
                "/merchant/conversations/5/messages",
                json={"text": "API 연동 방법"},
            )

        assert response.status_code == 200
        body = response.json()
        assert body["clarification_state"] is None
        assert body["quick_options"] is None
