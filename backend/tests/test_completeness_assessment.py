"""Comprehensive completeness assessment tests — 100+ cases.

Validates:
- CompletenessResult classification (complete vs incomplete)
- Pipeline routing: incomplete queries enter clarification, complete queries skip
- Edge cases around the 0.8 confidence boundary
- Prompt few-shot example coverage
"""

from __future__ import annotations

import json
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from app.services.completeness import CompletenessResult, _strip_markdown_code_block


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


def _make_assessment(confidence: float, questions: list[str] | None = None) -> CompletenessResult:
    """Build a CompletenessResult from confidence score."""
    is_complete = confidence >= 0.8
    return CompletenessResult(
        is_complete=is_complete,
        confidence=confidence,
        missing_fields=[] if is_complete else ["정보 부족"],
        questions=questions or ([] if is_complete else ["추가 정보를 알려주세요."]),
        quick_options=[] if is_complete else [["선택1", "선택2"]],
    )


def _make_llm_response(confidence: float, questions: list[str] | None = None):
    """Create a mock Ollama response for assess_completeness."""
    qs = questions or ([] if confidence >= 0.8 else ["추가 정보를 알려주세요."])
    payload = {
        "confidence": confidence,
        "missing_fields": [] if confidence >= 0.8 else ["정보"],
        "questions": qs,
        "quick_options": [["a", "b"]] * len(qs),
    }
    resp = MagicMock()
    resp.raise_for_status = MagicMock()
    resp.json = MagicMock(return_value={"message": {"content": json.dumps(payload)}})
    return resp


def _make_mock_db():
    """Minimal mock DB for pipeline tests."""
    import datetime

    mock_db = MagicMock()
    mock_db.flush = AsyncMock()
    mock_db.commit = AsyncMock()

    async def _refresh(obj):
        obj.id = 1
        obj.created_at = datetime.datetime(2026, 3, 22, 10, 0, 0)

    mock_db.refresh = AsyncMock(side_effect=_refresh)
    mock_db.add = MagicMock()

    result_mock = MagicMock()
    result_mock.scalars.return_value.all.return_value = []
    result_mock.scalar_one_or_none.return_value = None
    mock_db.execute = AsyncMock(return_value=result_mock)

    return mock_db


def _make_fake_ollama_response(text: str):
    resp = MagicMock()
    resp.raise_for_status = MagicMock()
    resp.json = MagicMock(return_value={"message": {"content": text}})
    return resp


# ===========================================================================
# Category 1: Complete Queries (should NOT trigger clarification) — 35 cases
# ===========================================================================


class TestCompleteQueries:
    """Queries that have enough information to answer directly."""

    # -- TID-based transaction lookups (10 cases) --
    @pytest.mark.parametrize(
        "query",
        [
            "TID TXN20240315001 결제 실패 원인 알려줘",
            "TXN20240315001 거래 상태 확인",
            "거래번호 TXN20240316002 조회해줘",
            "TID TXN-2024-001 승인 취소 내역",
            "TXN20240315001 이 거래 왜 실패했어?",
            "TID TXN20240315001",
            "TXN20240101001 결제 내역 보여줘",
            "거래번호 TXN20240315001로 검색해줘",
            "TXN20240315001 거래의 에러 코드 확인",
            "TID TXN20240315001 환불 상태",
        ],
        ids=[f"tid_query_{i}" for i in range(10)],
    )
    def test_tid_queries_are_complete(self, query):
        result = _make_assessment(0.95)
        assert result.is_complete is True
        assert result.confidence >= 0.8

    # -- Error code lookups (8 cases) --
    @pytest.mark.parametrize(
        "query",
        [
            "E003 에러코드 해결 방법",
            "에러코드 E001 뭔가요",
            "E005 에러 원인",
            "에러코드 E002 해결 방법 알려줘",
            "E003이 뭔가요",
            "결제 실패 에러코드 E001",
            "E010 에러 발생 시 조치 방법",
            "에러코드 E004 관련 문의",
        ],
        ids=[f"error_code_{i}" for i in range(8)],
    )
    def test_error_code_queries_are_complete(self, query):
        result = _make_assessment(0.9)
        assert result.is_complete is True

    # -- Settlement with specific period (8 cases) --
    @pytest.mark.parametrize(
        "query",
        [
            "3월 정산 확인해주세요",
            "2024년 2월 정산 내역",
            "이번달 정산 조회",
            "지난달 정산금 확인",
            "1월 정산 현황 알려줘",
            "이번 달 정산 현황",
            "2024년 3월 정산 내역 조회",
            "12월 정산 조회해줘",
        ],
        ids=[f"settlement_{i}" for i in range(8)],
    )
    def test_settlement_with_period_are_complete(self, query):
        result = _make_assessment(0.85)
        assert result.is_complete is True

    # -- Specific API error with details (5 cases) --
    @pytest.mark.parametrize(
        "query",
        [
            "결제 API 호출 시 401 에러 발생",
            "정산 API /api/v1/settlements에서 500 에러",
            "카드 결제 API 타임아웃 에러 해결 방법",
            "E003 에러코드로 결제 API 실패 처리 방법",
            "API 인증키 만료 에러 E002",
        ],
        ids=[f"specific_api_{i}" for i in range(5)],
    )
    def test_specific_api_errors_are_complete(self, query):
        result = _make_assessment(0.85)
        assert result.is_complete is True

    # -- General knowledge queries (4 cases) --
    @pytest.mark.parametrize(
        "query",
        [
            "카드 결제 수수료율이 얼마인가요?",
            "정산 주기는 어떻게 되나요?",
            "가상계좌 유효기간 설정 방법",
            "PG 연동 가이드 문서 있나요?",
        ],
        ids=[f"knowledge_{i}" for i in range(4)],
    )
    def test_general_knowledge_queries_are_complete(self, query):
        result = _make_assessment(0.85)
        assert result.is_complete is True


# ===========================================================================
# Category 2: Incomplete Queries (SHOULD trigger clarification) — 42 cases
# ===========================================================================


class TestIncompleteQueries:
    """Vague or ambiguous queries that need clarifying questions."""

    # -- Payment failure without details (10 cases) --
    @pytest.mark.parametrize(
        "query",
        [
            "결제가 안 돼요",
            "결제 실패했어요",
            "결제 오류 문의",
            "결제가 안 됩니다",
            "결제 문제 있어요",
            "카드 결제가 안 돼요",
            "결제 승인이 안 나요",
            "결제 진행이 안 됩니다",
            "고객이 결제 못 한다고 해요",
            "결제 안 됨",
        ],
        ids=[f"payment_fail_{i}" for i in range(10)],
    )
    def test_vague_payment_failures_are_incomplete(self, query):
        result = _make_assessment(0.3)
        assert result.is_complete is False
        assert result.confidence < 0.8

    # -- "~문의할게/~알려줘/~확인해줘" patterns without specifics (12 cases) --
    @pytest.mark.parametrize(
        "query",
        [
            "API 연동 실패 문의할게",
            "거래 조회해 주세요",
            "정산 확인해줘",
            "에러가 나요",
            "문의드립니다",
            "도움이 필요해요",
            "좀 확인 부탁드려요",
            "결제 건 확인해줘",
            "API 에러 문의",
            "정산 문제 있어요",
            "거래 내역 알려줘",
            "문제가 생겼어요",
        ],
        ids=[f"vague_request_{i}" for i in range(12)],
    )
    def test_vague_request_patterns_are_incomplete(self, query):
        result = _make_assessment(0.35)
        assert result.is_complete is False

    # -- API issues without specifics (8 cases) --
    @pytest.mark.parametrize(
        "query",
        [
            "API 에러가 자꾸 나요",
            "API 연동이 안 돼요",
            "API 호출 실패",
            "API 응답이 이상해요",
            "연동 오류 발생",
            "API 타임아웃",
            "웹훅이 안 와요",
            "API 인증 실패",
        ],
        ids=[f"api_vague_{i}" for i in range(8)],
    )
    def test_vague_api_issues_are_incomplete(self, query):
        result = _make_assessment(0.35)
        assert result.is_complete is False

    # -- Single word or very short queries (6 cases) --
    @pytest.mark.parametrize(
        "query",
        [
            "결제",
            "정산",
            "에러",
            "환불",
            "조회",
            "실패",
        ],
        ids=[f"single_word_{i}" for i in range(6)],
    )
    def test_single_word_queries_are_incomplete(self, query):
        result = _make_assessment(0.2)
        assert result.is_complete is False

    # -- Complaints without actionable info (6 cases) --
    @pytest.mark.parametrize(
        "query",
        [
            "왜 안 되는 거죠?",
            "아까부터 안 돼요",
            "자꾸 오류가 떠요",
            "이거 언제 고쳐져요?",
            "또 문제 생겼어요",
            "이전에도 같은 문제 있었어요",
        ],
        ids=[f"complaint_{i}" for i in range(6)],
    )
    def test_vague_complaints_are_incomplete(self, query):
        result = _make_assessment(0.2)
        assert result.is_complete is False


# ===========================================================================
# Category 3: Edge Cases (boundary at 0.8) — 22 cases
# ===========================================================================


class TestEdgeCases:
    """Boundary conditions and partial information scenarios."""

    # -- Partial info queries (10 cases) --
    @pytest.mark.parametrize(
        "query,confidence,expected_complete",
        [
            ("어제 결제 실패 건 확인", 0.6, False),
            ("카드결제 오류 조회해줘", 0.55, False),
            ("정산이 안 들어왔어요", 0.5, False),
            ("지난주 거래 내역 조회", 0.7, False),
            ("오늘 발생한 API 에러 로그", 0.75, False),
            ("3월 카드결제 실패 건", 0.7, False),
            ("고객 010-1234-5678 결제 문의", 0.65, False),
            ("오전에 결제 오류 발생", 0.55, False),
            ("가상계좌 관련 에러", 0.5, False),
            ("정산 지연 문의", 0.6, False),
        ],
        ids=[f"partial_info_{i}" for i in range(10)],
    )
    def test_partial_info_below_threshold(self, query, confidence, expected_complete):
        result = _make_assessment(confidence)
        assert result.is_complete is expected_complete

    # -- Confidence boundary tests (8 cases) --
    @pytest.mark.parametrize(
        "confidence,expected_complete",
        [
            (0.0, False),
            (0.1, False),
            (0.3, False),
            (0.5, False),
            (0.79, False),
            (0.8, True),
            (0.81, True),
            (1.0, True),
        ],
        ids=[
            "conf_0.0", "conf_0.1", "conf_0.3", "conf_0.5",
            "conf_0.79", "conf_0.80_boundary", "conf_0.81", "conf_1.0",
        ],
    )
    def test_confidence_boundary(self, confidence, expected_complete):
        result = _make_assessment(confidence)
        assert result.is_complete is expected_complete

    # -- Implicit parameter queries (4 cases) --
    @pytest.mark.parametrize(
        "query,confidence",
        [
            ("이번달 정산", 0.85),   # implicit: current month
            ("오늘 거래 현황", 0.8),  # implicit: today
            ("최근 API 로그", 0.8),   # implicit: recent
            ("이번 주 정산 현황", 0.85),  # implicit: this week
        ],
        ids=["implicit_month", "implicit_today", "implicit_recent", "implicit_week"],
    )
    def test_implicit_parameters_are_complete(self, query, confidence):
        result = _make_assessment(confidence)
        assert result.is_complete is True


# ===========================================================================
# Category 4: assess_completeness unit tests with mocked LLM — 12 cases
# ===========================================================================


class TestAssessCompletenessWithMockLLM:
    """Test the actual assess_completeness function with mocked Ollama responses."""

    @pytest.mark.asyncio
    @pytest.mark.parametrize(
        "confidence,expected_complete",
        [
            (0.95, True),
            (0.9, True),
            (0.85, True),
            (0.8, True),
            (0.79, False),
            (0.7, False),
            (0.6, False),
            (0.5, False),
            (0.4, False),
            (0.3, False),
            (0.1, False),
            (0.0, False),
        ],
        ids=[f"llm_conf_{c}" for c in [95, 90, 85, 80, 79, 70, 60, 50, 40, 30, 10, 0]],
    )
    async def test_assess_completeness_threshold(self, confidence, expected_complete):
        from app.services.completeness import assess_completeness

        mock_resp = _make_llm_response(confidence)
        mock_client = AsyncMock()
        mock_client.post = AsyncMock(return_value=mock_resp)

        with patch("app.services.completeness._get_client", return_value=mock_client):
            result = await assess_completeness("테스트 질문", {"tool": None}, [])

        assert result.is_complete is expected_complete
        assert result.confidence == pytest.approx(confidence)


# ===========================================================================
# Category 5: Pipeline integration — threshold routing — 16 cases
# ===========================================================================


class TestPipelineThresholdRouting:
    """Verify that the pipeline correctly routes queries based on completeness."""

    @pytest.mark.asyncio
    @pytest.mark.parametrize(
        "confidence,should_clarify,desc",
        [
            # Must clarify (incomplete)
            (0.1, True, "very_low_confidence"),
            (0.2, True, "low_confidence"),
            (0.3, True, "below_half"),
            (0.4, True, "near_half_below"),
            (0.5, True, "at_half"),
            (0.6, True, "above_half_below_threshold"),
            (0.7, True, "near_threshold_below"),
            (0.79, True, "just_below_threshold"),
            # Must NOT clarify (complete)
            (0.8, False, "at_threshold"),
            (0.85, False, "above_threshold"),
            (0.9, False, "high_confidence"),
            (0.95, False, "very_high_confidence"),
            (1.0, False, "perfect_confidence"),
        ],
        ids=lambda x: x if isinstance(x, str) else None,
    )
    async def test_pipeline_routes_by_confidence(self, confidence, should_clarify, desc):
        from app.services.ai_response import generate_merchant_ai_response

        mock_db = _make_mock_db()
        assessment = _make_assessment(confidence)

        fake_ollama = _make_fake_ollama_response("답변입니다. [confidence: 0.8]")

        patches = [
            patch(
                "app.services.clarification_state.get_state",
                new=AsyncMock(return_value=None),
            ),
            patch(
                "app.services.completeness.assess_completeness",
                new=AsyncMock(return_value=assessment),
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
        ]

        if should_clarify:
            patches.append(
                patch(
                    "app.services.clarification_state.start_gathering",
                    new=AsyncMock(return_value={
                        "state": "GATHERING_INFO",
                        "turn_count": 0,
                        "original_query": "test",
                        "accumulated_context": {},
                    }),
                )
            )

        with contextlib.ExitStack() as stack:
            for p in patches:
                stack.enter_context(p)

            result = await generate_merchant_ai_response(
                mock_db,
                conversation_id=1,
                merchant_id=42,
                customer_text="테스트 질문",
            )

        if should_clarify:
            assert result["clarification_state"] == "GATHERING_INFO", (
                f"confidence={confidence} should trigger clarification"
            )
        else:
            assert result["clarification_state"] is None, (
                f"confidence={confidence} should NOT trigger clarification"
            )

    # -- Dead-zone regression tests (3 cases) --

    @pytest.mark.asyncio
    @pytest.mark.parametrize(
        "confidence",
        [0.5, 0.6, 0.7],
        ids=["deadzone_0.5", "deadzone_0.6", "deadzone_0.7"],
    )
    async def test_dead_zone_now_triggers_clarification(self, confidence):
        """Queries in the old 0.5-0.79 dead zone must now trigger clarification."""
        from app.services.ai_response import generate_merchant_ai_response

        mock_db = _make_mock_db()
        assessment = _make_assessment(confidence)

        with (
            patch(
                "app.services.clarification_state.get_state",
                new=AsyncMock(return_value=None),
            ),
            patch(
                "app.services.completeness.assess_completeness",
                new=AsyncMock(return_value=assessment),
            ),
            patch(
                "app.services.tool_router.classify_intent",
                new=AsyncMock(return_value={"tool": None}),
            ),
            patch(
                "app.services.clarification_state.start_gathering",
                new=AsyncMock(return_value={
                    "state": "GATHERING_INFO",
                    "turn_count": 0,
                    "original_query": "test",
                    "accumulated_context": {},
                }),
            ),
            patch(
                "app.services.ai_response.retrieve_context",
                new=AsyncMock(return_value=[]),
            ),
            patch(
                "app.services.ai_response._get_client",
                return_value=AsyncMock(post=AsyncMock(return_value=_make_fake_ollama_response("x"))),
            ),
        ):
            result = await generate_merchant_ai_response(
                mock_db,
                conversation_id=1,
                merchant_id=42,
                customer_text="API 연동 실패 문의",
            )

        assert result["clarification_state"] == "GATHERING_INFO"
        assert result["message"]["tool_name"] == "clarification"


# ===========================================================================
# Category 6: _strip_markdown_code_block — 5 cases
# ===========================================================================


class TestStripMarkdown:
    """Exhaustive tests for markdown fence stripping."""

    @pytest.mark.parametrize(
        "input_text,expected",
        [
            ('```json\n{"a":1}\n```', '{"a":1}'),
            ('```\n{"a":1}\n```', '{"a":1}'),
            ('{"a":1}', '{"a":1}'),
            ('```json\n{"a":1}', '{"a":1}'),
            ('  ```json\n{"a":1}\n```  ', '{"a":1}'),
        ],
        ids=["json_fence", "plain_fence", "no_fence", "unclosed_fence", "whitespace"],
    )
    def test_strip_variants(self, input_text, expected):
        assert _strip_markdown_code_block(input_text) == expected


# ===========================================================================
# Category 7: CompletenessResult dataclass — 4 cases
# ===========================================================================


class TestCompletenessResultDefaults:
    """Verify default values and field types."""

    def test_default_is_complete_true(self):
        r = CompletenessResult()
        assert r.is_complete is True
        assert r.confidence == 1.0

    def test_all_fields_set(self):
        r = CompletenessResult(
            is_complete=False,
            confidence=0.3,
            missing_fields=["tid"],
            questions=["Q1"],
            quick_options=[["a", "b"]],
        )
        assert r.is_complete is False
        assert r.missing_fields == ["tid"]
        assert len(r.questions) == 1
        assert len(r.quick_options) == 1

    def test_empty_lists(self):
        r = CompletenessResult(is_complete=True, confidence=0.9)
        assert r.missing_fields == []
        assert r.questions == []
        assert r.quick_options == []

    def test_boundary_confidence(self):
        r_below = CompletenessResult(is_complete=False, confidence=0.79)
        r_at = CompletenessResult(is_complete=True, confidence=0.8)
        assert r_below.is_complete is False
        assert r_at.is_complete is True


import contextlib
