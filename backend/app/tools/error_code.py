"""Error code tool: look up PG error code details and resolution guidance."""

from __future__ import annotations

import logging
from typing import Optional

from sqlalchemy import text as sql_text
from sqlalchemy.ext.asyncio import AsyncSession

from app.tools.base import Tool, ToolRegistry, ToolResult

logger = logging.getLogger(__name__)


class LookupErrorCodeTool(Tool):
    """Look up the description and resolution steps for a PG error code.

    This tool does NOT scope by merchant_id because error codes are
    platform-wide reference data, not per-merchant records.
    """

    name = "lookup_error_code"
    description = "결제 에러 코드의 상세 정보와 해결 방법을 조회합니다."
    parameters_schema = {
        "type": "object",
        "properties": {
            "code": {
                "type": "string",
                "description": "에러 코드 (예: E003)",
            },
        },
        "required": ["code"],
    }

    async def execute(
        self,
        db: AsyncSession,
        merchant_id: Optional[int],  # Not used — public reference data
        params: dict,
    ) -> ToolResult:
        """Query the error_codes table for the given code.

        Args:
            db: Active async database session.
            merchant_id: Ignored; error codes are not merchant-scoped.
            params: Must contain ``code`` key.

        Returns:
            :class:`ToolResult` with error code details and solution text.
        """
        code = params.get("code", "").strip().upper()
        if not code:
            return ToolResult(success=False, error="code 파라미터가 필요합니다.")

        try:
            result = await db.execute(
                sql_text(
                    "SELECT id, code, category, description, solution, severity "
                    "FROM error_codes "
                    "WHERE code = :code "
                    "LIMIT 1"
                ),
                {"code": code},
            )
            row = result.fetchone()
        except Exception as exc:
            logger.error("LookupErrorCodeTool DB error: %s", exc)
            return ToolResult(success=False, error=f"데이터베이스 조회 오류: {exc}")

        if row is None:
            return ToolResult(
                success=False,
                error=f"에러 코드 {code}에 대한 정보를 찾을 수 없습니다.",
            )

        data = dict(row._mapping)
        summary = (
            f"에러 코드 {data['code']} [{data['category']}] "
            f"심각도: {data['severity']}\n"
            f"설명: {data['description']}\n"
            f"해결 방법: {data['solution']}"
        )

        return ToolResult(
            success=True,
            data=data,
            display_type="error_code",
            summary=summary,
        )


# Register tool at module import time
ToolRegistry.register(LookupErrorCodeTool())
