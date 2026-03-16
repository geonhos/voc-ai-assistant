"""Unit tests for the Phase 2 tool-use pipeline.

Covers:
- Tool base classes and registry
- Individual tool execution (LookupTransaction, SearchTransactions,
  LookupSettlement, LookupErrorCode, SearchApiLogs)
- Tool router: intent classification JSON parsing and execute_tool dispatch
- generate_merchant_ai_response: happy paths, escalation, tool injection,
  confidence boosting, Ollama error fallback
"""

from __future__ import annotations

import json
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


def _make_mock_db() -> MagicMock:
    """Return a mock that mirrors AsyncSession behaviour."""
    mock_db = MagicMock()
    mock_db.flush = AsyncMock()
    mock_db.execute = AsyncMock()
    mock_db.get = AsyncMock()
    return mock_db


def _make_db_row(**kwargs):
    """Return a MagicMock that mimics a SQLAlchemy Row with _mapping."""
    row = MagicMock()
    row._mapping = kwargs
    return row


def _make_execute_result(rows: list) -> MagicMock:
    result = MagicMock()
    result.fetchone.return_value = rows[0] if rows else None
    result.fetchall.return_value = rows
    result.scalars.return_value.all.return_value = rows
    return result


def _make_fake_ollama_response(content: str) -> MagicMock:
    response = MagicMock()
    response.raise_for_status = MagicMock()
    response.json = MagicMock(return_value={"message": {"content": content}})
    return response


# ===========================================================================
# Tool base — ToolRegistry
# ===========================================================================


class TestToolRegistry:
    def test_register_and_get(self):
        """Registered tool is retrievable by name."""
        from app.tools.base import Tool, ToolRegistry, ToolResult

        class DummyTool(Tool):
            name = "dummy"
            description = "A dummy tool"
            parameters_schema = {"type": "object", "properties": {}}

            async def execute(self, db, merchant_id, params) -> ToolResult:
                return ToolResult(success=True, summary="ok")

        ToolRegistry.register(DummyTool())
        tool = ToolRegistry.get("dummy")
        assert tool is not None
        assert tool.name == "dummy"

    def test_get_missing_returns_none(self):
        """Getting a non-existent tool returns None."""
        from app.tools.base import ToolRegistry

        assert ToolRegistry.get("this_does_not_exist_xyz") is None

    def test_get_tools_description_includes_all_registered(self):
        """Description string contains all registered Phase 2 tools."""
        # Importing the package triggers registration
        import app.tools  # noqa: F401
        from app.tools.base import ToolRegistry

        desc = ToolRegistry.get_tools_description()
        for expected_name in [
            "lookup_transaction",
            "search_transactions",
            "lookup_settlement",
            "lookup_error_code",
            "search_api_logs",
        ]:
            assert expected_name in desc, f"'{expected_name}' missing from description"


# ===========================================================================
# LookupTransactionTool
# ===========================================================================


class TestLookupTransactionTool:
    @pytest.mark.asyncio
    async def test_returns_transaction_card_on_success(self):
        """Successful TID lookup returns display_type='transaction_card'."""
        from app.tools.transaction import LookupTransactionTool

        row = _make_db_row(
            id=1,
            tid="TXN001",
            amount=50000,
            payment_method="CARD",
            card_company="Visa",
            card_number_masked="****1234",
            status="SUCCESS",
            error_code=None,
            error_message=None,
            customer_name="홍길동",
            order_id="ORD001",
            approved_at=None,
            cancelled_at=None,
            created_at=None,
        )
        mock_db = _make_mock_db()
        mock_db.execute = AsyncMock(return_value=_make_execute_result([row]))

        tool = LookupTransactionTool()
        result = await tool.execute(mock_db, merchant_id=1, params={"tid": "TXN001"})

        assert result.success is True
        assert result.display_type == "transaction_card"
        assert "TXN001" in result.summary
        assert "50,000원" in result.summary

    @pytest.mark.asyncio
    async def test_missing_tid_returns_error(self):
        """Missing tid parameter returns failure without DB call."""
        from app.tools.transaction import LookupTransactionTool

        mock_db = _make_mock_db()
        tool = LookupTransactionTool()
        result = await tool.execute(mock_db, merchant_id=1, params={})

        assert result.success is False
        assert "tid" in result.error

    @pytest.mark.asyncio
    async def test_not_found_returns_failure(self):
        """No matching row returns a descriptive failure."""
        from app.tools.transaction import LookupTransactionTool

        mock_db = _make_mock_db()
        mock_db.execute = AsyncMock(return_value=_make_execute_result([]))

        tool = LookupTransactionTool()
        result = await tool.execute(mock_db, merchant_id=1, params={"tid": "UNKNOWN"})

        assert result.success is False
        assert "UNKNOWN" in result.error

    @pytest.mark.asyncio
    async def test_error_code_included_in_summary(self):
        """When error_code is present it appears in the summary."""
        from app.tools.transaction import LookupTransactionTool

        row = _make_db_row(
            id=2,
            tid="TXN002",
            amount=10000,
            payment_method="CARD",
            card_company=None,
            card_number_masked=None,
            status="FAIL",
            error_code="E003",
            error_message="카드 한도 초과",
            customer_name=None,
            order_id=None,
            approved_at=None,
            cancelled_at=None,
            created_at=None,
        )
        mock_db = _make_mock_db()
        mock_db.execute = AsyncMock(return_value=_make_execute_result([row]))

        tool = LookupTransactionTool()
        result = await tool.execute(mock_db, merchant_id=1, params={"tid": "TXN002"})

        assert result.success is True
        assert "E003" in result.summary


# ===========================================================================
# SearchTransactionsTool
# ===========================================================================


class TestSearchTransactionsTool:
    @pytest.mark.asyncio
    async def test_empty_result_returns_no_records_message(self):
        """No matching rows returns a success with empty-data summary."""
        from app.tools.transaction import SearchTransactionsTool

        mock_db = _make_mock_db()
        mock_db.execute = AsyncMock(return_value=_make_execute_result([]))

        tool = SearchTransactionsTool()
        result = await tool.execute(
            mock_db, merchant_id=1, params={"status": "FAIL"}
        )

        assert result.success is True
        assert "없습니다" in result.summary

    @pytest.mark.asyncio
    async def test_multiple_results_summary_shows_count(self):
        """Summary contains total count when multiple rows are returned."""
        from app.tools.transaction import SearchTransactionsTool

        rows = [
            _make_db_row(
                id=i,
                tid=f"TXN00{i}",
                amount=i * 1000,
                payment_method="CARD",
                card_company=None,
                card_number_masked=None,
                status="FAIL",
                error_code="E001",
                error_message="test",
                customer_name=None,
                order_id=None,
                approved_at=None,
                cancelled_at=None,
                created_at=None,
            )
            for i in range(1, 6)
        ]
        mock_db = _make_mock_db()
        mock_db.execute = AsyncMock(return_value=_make_execute_result(rows))

        tool = SearchTransactionsTool()
        result = await tool.execute(
            mock_db, merchant_id=1, params={"status": "FAIL", "limit": 5}
        )

        assert result.success is True
        assert "5건" in result.summary

    @pytest.mark.asyncio
    async def test_limit_is_capped_at_50(self):
        """Requested limit above 50 is silently capped."""
        from app.tools.transaction import SearchTransactionsTool

        mock_db = _make_mock_db()
        mock_db.execute = AsyncMock(return_value=_make_execute_result([]))

        tool = SearchTransactionsTool()
        # Should not raise even with an extreme limit
        result = await tool.execute(
            mock_db, merchant_id=1, params={"limit": 9999}
        )
        assert result.success is True


# ===========================================================================
# LookupSettlementTool
# ===========================================================================


class TestLookupSettlementTool:
    @pytest.mark.asyncio
    async def test_returns_settlement_table_on_success(self):
        """Successful settlement lookup returns display_type='settlement_table'."""
        from app.tools.settlement import LookupSettlementTool

        row = _make_db_row(
            id=1,
            settlement_date=None,
            total_amount=1000000,
            fee_amount=30000,
            net_amount=970000,
            transaction_count=20,
            status="COMPLETED",
            completed_at=None,
            created_at=None,
        )
        mock_db = _make_mock_db()
        mock_db.execute = AsyncMock(return_value=_make_execute_result([row]))

        tool = LookupSettlementTool()
        result = await tool.execute(
            mock_db, merchant_id=1, params={"year": 2024, "month": 3}
        )

        assert result.success is True
        assert result.display_type == "settlement_table"
        assert "970,000원" in result.summary

    @pytest.mark.asyncio
    async def test_missing_year_or_month_returns_error(self):
        """Missing required year/month parameters return failure."""
        from app.tools.settlement import LookupSettlementTool

        mock_db = _make_mock_db()
        tool = LookupSettlementTool()

        result = await tool.execute(mock_db, merchant_id=1, params={"year": 2024})
        assert result.success is False

    @pytest.mark.asyncio
    async def test_no_records_returns_informative_summary(self):
        """Empty result set returns a descriptive 'no data' message."""
        from app.tools.settlement import LookupSettlementTool

        mock_db = _make_mock_db()
        mock_db.execute = AsyncMock(return_value=_make_execute_result([]))

        tool = LookupSettlementTool()
        result = await tool.execute(
            mock_db, merchant_id=1, params={"year": 2020, "month": 1}
        )

        assert result.success is True
        assert "없습니다" in result.summary


# ===========================================================================
# LookupErrorCodeTool
# ===========================================================================


class TestLookupErrorCodeTool:
    @pytest.mark.asyncio
    async def test_returns_error_code_display_type(self):
        """Successful lookup returns display_type='error_code'."""
        from app.tools.error_code import LookupErrorCodeTool

        row = _make_db_row(
            id=1,
            code="E003",
            category="CARD",
            description="카드 한도 초과",
            solution="한도 상향 후 재시도하거나 다른 카드를 사용하세요.",
            severity="HIGH",
        )
        mock_db = _make_mock_db()
        mock_db.execute = AsyncMock(return_value=_make_execute_result([row]))

        tool = LookupErrorCodeTool()
        result = await tool.execute(mock_db, merchant_id=None, params={"code": "E003"})

        assert result.success is True
        assert result.display_type == "error_code"
        assert "E003" in result.summary
        assert "한도 상향" in result.summary

    @pytest.mark.asyncio
    async def test_code_is_uppercased(self):
        """Tool normalises code to uppercase before querying."""
        from app.tools.error_code import LookupErrorCodeTool

        mock_db = _make_mock_db()
        mock_db.execute = AsyncMock(return_value=_make_execute_result([]))

        tool = LookupErrorCodeTool()
        result = await tool.execute(mock_db, merchant_id=None, params={"code": "e003"})

        # Row not found but no crash — query was with "E003"
        assert result.success is False

    @pytest.mark.asyncio
    async def test_missing_code_returns_error(self):
        """Empty code parameter returns failure without DB call."""
        from app.tools.error_code import LookupErrorCodeTool

        mock_db = _make_mock_db()
        tool = LookupErrorCodeTool()
        result = await tool.execute(mock_db, merchant_id=None, params={})

        assert result.success is False
        assert "code" in result.error

    @pytest.mark.asyncio
    async def test_not_found_returns_descriptive_error(self):
        """Non-existent code returns a user-friendly failure message."""
        from app.tools.error_code import LookupErrorCodeTool

        mock_db = _make_mock_db()
        mock_db.execute = AsyncMock(return_value=_make_execute_result([]))

        tool = LookupErrorCodeTool()
        result = await tool.execute(
            mock_db, merchant_id=None, params={"code": "X999"}
        )

        assert result.success is False
        assert "X999" in result.error


# ===========================================================================
# SearchApiLogsTool
# ===========================================================================


class TestSearchApiLogsTool:
    @pytest.mark.asyncio
    async def test_returns_api_log_display_type(self):
        """Successful query returns display_type='api_log'."""
        from app.tools.api_log import SearchApiLogsTool

        rows = [
            _make_db_row(
                id=i,
                endpoint="/v1/payments",
                method="POST",
                status_code=200,
                error_code=None,
                error_message=None,
                latency_ms=120,
                created_at=None,
            )
            for i in range(1, 4)
        ]
        mock_db = _make_mock_db()
        mock_db.execute = AsyncMock(return_value=_make_execute_result(rows))

        tool = SearchApiLogsTool()
        result = await tool.execute(mock_db, merchant_id=1, params={})

        assert result.success is True
        assert result.display_type == "api_log"
        assert "3건" in result.summary

    @pytest.mark.asyncio
    async def test_error_only_filter(self):
        """error_only=True flag is accepted without error."""
        from app.tools.api_log import SearchApiLogsTool

        mock_db = _make_mock_db()
        mock_db.execute = AsyncMock(return_value=_make_execute_result([]))

        tool = SearchApiLogsTool()
        result = await tool.execute(
            mock_db, merchant_id=1, params={"error_only": True}
        )

        assert result.success is True

    @pytest.mark.asyncio
    async def test_limit_capped_at_100(self):
        """Limit above 100 is silently capped."""
        from app.tools.api_log import SearchApiLogsTool

        mock_db = _make_mock_db()
        mock_db.execute = AsyncMock(return_value=_make_execute_result([]))

        tool = SearchApiLogsTool()
        result = await tool.execute(
            mock_db, merchant_id=1, params={"limit": 9999}
        )
        assert result.success is True


# ===========================================================================
# Tool router — classify_intent
# ===========================================================================


class TestClassifyIntent:
    @pytest.mark.asyncio
    async def test_parses_tool_selection_from_clean_json(self):
        """LLM JSON response with tool selected is parsed correctly."""
        from app.services.tool_router import classify_intent

        fake_response = MagicMock()
        fake_response.raise_for_status = MagicMock()
        fake_response.json = MagicMock(
            return_value={
                "message": {
                    "content": json.dumps(
                        {"tool": "lookup_transaction", "params": {"tid": "TXN001"}}
                    )
                }
            }
        )

        with patch(
            "app.services.tool_router.httpx.AsyncClient"
        ) as mock_client_cls:
            mock_client = AsyncMock()
            mock_client.post = AsyncMock(return_value=fake_response)
            mock_client_cls.return_value.__aenter__ = AsyncMock(
                return_value=mock_client
            )
            mock_client_cls.return_value.__aexit__ = AsyncMock(return_value=False)

            result = await classify_intent("TXN001 거래 조회해 주세요")

        assert result["tool"] == "lookup_transaction"
        assert result["params"]["tid"] == "TXN001"

    @pytest.mark.asyncio
    async def test_strips_markdown_code_fences(self):
        """Response wrapped in ```json ... ``` is parsed correctly."""
        from app.services.tool_router import classify_intent

        content = "```json\n" + json.dumps({"tool": None}) + "\n```"
        fake_response = MagicMock()
        fake_response.raise_for_status = MagicMock()
        fake_response.json = MagicMock(
            return_value={"message": {"content": content}}
        )

        with patch(
            "app.services.tool_router.httpx.AsyncClient"
        ) as mock_client_cls:
            mock_client = AsyncMock()
            mock_client.post = AsyncMock(return_value=fake_response)
            mock_client_cls.return_value.__aenter__ = AsyncMock(
                return_value=mock_client
            )
            mock_client_cls.return_value.__aexit__ = AsyncMock(return_value=False)

            result = await classify_intent("안녕하세요")

        assert result["tool"] is None

    @pytest.mark.asyncio
    async def test_null_tool_for_general_question(self):
        """General question returns tool=null JSON."""
        from app.services.tool_router import classify_intent

        fake_response = MagicMock()
        fake_response.raise_for_status = MagicMock()
        fake_response.json = MagicMock(
            return_value={"message": {"content": '{"tool": null}'}}
        )

        with patch(
            "app.services.tool_router.httpx.AsyncClient"
        ) as mock_client_cls:
            mock_client = AsyncMock()
            mock_client.post = AsyncMock(return_value=fake_response)
            mock_client_cls.return_value.__aenter__ = AsyncMock(
                return_value=mock_client
            )
            mock_client_cls.return_value.__aexit__ = AsyncMock(return_value=False)

            result = await classify_intent("결제 API 연동 방법이 궁금합니다")

        assert result.get("tool") is None


class TestExecuteTool:
    @pytest.mark.asyncio
    async def test_returns_none_for_unknown_tool(self):
        """execute_tool returns None when tool is not in the registry."""
        import app.tools  # noqa: F401 — ensure registration
        from app.services.tool_router import execute_tool

        mock_db = _make_mock_db()
        result = await execute_tool("nonexistent_tool", mock_db, 1, {})
        assert result is None

    @pytest.mark.asyncio
    async def test_dispatches_to_registered_tool(self):
        """execute_tool routes to the correct tool and returns its result."""
        import app.tools  # noqa: F401
        from app.services.tool_router import execute_tool
        from app.tools.base import ToolResult

        mock_tool_result = ToolResult(success=True, summary="ok", display_type="text")

        with patch(
            "app.tools.base.ToolRegistry.get"
        ) as mock_get:
            mock_tool = MagicMock()
            mock_tool.execute = AsyncMock(return_value=mock_tool_result)
            mock_get.return_value = mock_tool

            mock_db = _make_mock_db()
            result = await execute_tool(
                "lookup_transaction", mock_db, 1, {"tid": "TXN001"}
            )

        assert result is mock_tool_result
        mock_tool.execute.assert_awaited_once()


# ===========================================================================
# generate_merchant_ai_response
# ===========================================================================


class TestGenerateMerchantAiResponse:
    """Integration-style tests for the 2-pass merchant pipeline."""

    def _setup_db(self, history_rows=None):
        mock_db = _make_mock_db()
        history_result = MagicMock()
        history_result.scalars.return_value.all.return_value = history_rows or []
        mock_db.execute = AsyncMock(return_value=history_result)
        return mock_db

    @pytest.mark.asyncio
    async def test_happy_path_no_tool(self):
        """General question with no tool: returns AI message dict, not escalated."""
        from app.services.ai_response import generate_merchant_ai_response

        mock_db = self._setup_db()
        fake_ollama = _make_fake_ollama_response("API 연동 방법을 안내해 드립니다. [confidence: 0.8]")

        with (
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
                mock_db, conversation_id=1, merchant_id=42, customer_text="API 연동 방법"
            )

        assert result["escalated"] is False
        assert result["message"]["sender"] == "AI"
        assert result["message"]["confidence"] == pytest.approx(0.8)
        assert result["message"]["tool_name"] is None
        assert result["message"]["tool_data"] is None

    @pytest.mark.asyncio
    async def test_tool_executed_and_data_attached(self):
        """Tool result is attached to the message when tool succeeds."""
        from app.services.ai_response import generate_merchant_ai_response
        from app.tools.base import ToolResult

        mock_db = self._setup_db()
        fake_ollama = _make_fake_ollama_response("TXN001 거래는 성공 처리되었습니다. [confidence: 0.9]")

        tool_result = ToolResult(
            success=True,
            data={"tid": "TXN001", "status": "SUCCESS", "amount": 50000},
            display_type="transaction_card",
            summary="거래 TXN001: 금액 50,000원, 상태 SUCCESS",
        )

        with (
            patch(
                "app.services.tool_router.classify_intent",
                new=AsyncMock(
                    return_value={"tool": "lookup_transaction", "params": {"tid": "TXN001"}}
                ),
            ),
            patch(
                "app.services.tool_router.execute_tool",
                new=AsyncMock(return_value=tool_result),
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

        msg = result["message"]
        assert msg["tool_name"] == "lookup_transaction"
        assert msg["tool_data"] is not None
        assert msg["tool_data"]["display_type"] == "transaction_card"
        assert msg["tool_data"]["data"]["tid"] == "TXN001"

    @pytest.mark.asyncio
    async def test_confidence_boosted_when_tool_succeeds(self):
        """Confidence is boosted by 0.15 when tool execution succeeds."""
        from app.services.ai_response import generate_merchant_ai_response
        from app.tools.base import ToolResult

        mock_db = self._setup_db()
        # LLM says 0.65; with tool boost → 0.80
        fake_ollama = _make_fake_ollama_response("결과입니다. [confidence: 0.65]")

        tool_result = ToolResult(
            success=True,
            data={},
            display_type="transaction_card",
            summary="ok",
        )

        with (
            patch(
                "app.services.tool_router.classify_intent",
                new=AsyncMock(
                    return_value={"tool": "lookup_transaction", "params": {"tid": "TXN002"}}
                ),
            ),
            patch(
                "app.services.tool_router.execute_tool",
                new=AsyncMock(return_value=tool_result),
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
                customer_text="TXN002 조회",
            )

        assert result["message"]["confidence"] == pytest.approx(0.8)

    @pytest.mark.asyncio
    async def test_escalates_on_keyword(self):
        """Messages containing escalation keywords trigger escalation."""
        from app.services.ai_response import generate_merchant_ai_response

        mock_db = self._setup_db()
        fake_ollama = _make_fake_ollama_response("처리해 드리겠습니다. [confidence: 0.8]")

        with (
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
            patch(
                "app.services.ai_response.escalate_conversation",
                new=AsyncMock(),
            ) as mock_escalate,
        ):
            result = await generate_merchant_ai_response(
                mock_db,
                conversation_id=1,
                merchant_id=42,
                customer_text="상담사 연결해 주세요",
            )

        assert result["escalated"] is True
        mock_escalate.assert_awaited_once()

    @pytest.mark.asyncio
    async def test_escalates_on_very_low_confidence(self):
        """Confidence below 0.3 triggers immediate escalation."""
        from app.services.ai_response import generate_merchant_ai_response

        mock_db = self._setup_db()
        fake_ollama = _make_fake_ollama_response("잘 모르겠습니다. [confidence: 0.1]")

        with (
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
            patch(
                "app.services.ai_response.escalate_conversation",
                new=AsyncMock(),
            ) as mock_escalate,
        ):
            result = await generate_merchant_ai_response(
                mock_db,
                conversation_id=1,
                merchant_id=42,
                customer_text="알 수 없는 질문",
            )

        assert result["escalated"] is True
        mock_escalate.assert_awaited_once()

    @pytest.mark.asyncio
    async def test_ollama_failure_returns_fallback_message(self):
        """Ollama network failure returns graceful fallback without raising."""
        from app.services.ai_response import generate_merchant_ai_response

        mock_db = self._setup_db()

        with (
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
                    post=AsyncMock(side_effect=RuntimeError("connection refused"))
                ),
            ),
            patch(
                "app.services.ai_response.escalate_conversation",
                new=AsyncMock(),
            ),
        ):
            result = await generate_merchant_ai_response(
                mock_db,
                conversation_id=1,
                merchant_id=42,
                customer_text="질문",
            )

        assert "오류" in result["message"]["text"] or "죄송" in result["message"]["text"]

    @pytest.mark.asyncio
    async def test_tool_classification_failure_does_not_crash(self):
        """If intent classification raises, the pipeline continues without a tool."""
        from app.services.ai_response import generate_merchant_ai_response

        mock_db = self._setup_db()
        fake_ollama = _make_fake_ollama_response("답변입니다. [confidence: 0.7]")

        with (
            patch(
                "app.services.tool_router.classify_intent",
                new=AsyncMock(side_effect=ValueError("JSON parse error")),
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
                customer_text="질문",
            )

        assert result["message"]["tool_name"] is None
        assert result["message"]["sender"] == "AI"

    @pytest.mark.asyncio
    async def test_no_tool_data_when_tool_fails(self):
        """Failed tool execution does not attach tool_data to the message."""
        from app.services.ai_response import generate_merchant_ai_response
        from app.tools.base import ToolResult

        mock_db = self._setup_db()
        fake_ollama = _make_fake_ollama_response("거래를 찾을 수 없습니다. [confidence: 0.6]")

        failing_result = ToolResult(
            success=False,
            error="거래번호 X999에 해당하는 거래를 찾을 수 없습니다.",
        )

        with (
            patch(
                "app.services.tool_router.classify_intent",
                new=AsyncMock(
                    return_value={"tool": "lookup_transaction", "params": {"tid": "X999"}}
                ),
            ),
            patch(
                "app.services.tool_router.execute_tool",
                new=AsyncMock(return_value=failing_result),
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
                customer_text="X999 조회",
            )

        assert result["message"]["tool_data"] is None
