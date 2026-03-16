"""API log tool: search a merchant's API call history with optional filters."""

from __future__ import annotations

import logging
from typing import Any, Optional

from sqlalchemy import text as sql_text
from sqlalchemy.ext.asyncio import AsyncSession

from app.tools.base import Tool, ToolRegistry, ToolResult

logger = logging.getLogger(__name__)


class SearchApiLogsTool(Tool):
    """Search recent API call logs for a merchant, with error/endpoint filters."""

    name = "search_api_logs"
    description = (
        "가맹점의 API 호출 로그를 조회합니다. "
        "에러 로그, 지연 시간 등을 확인할 수 있습니다."
    )
    parameters_schema = {
        "type": "object",
        "properties": {
            "error_only": {
                "type": "boolean",
                "description": "에러만 조회",
            },
            "endpoint": {
                "type": "string",
                "description": "엔드포인트 경로 필터 (예: /v1/payments)",
            },
            "limit": {
                "type": "integer",
                "description": "최대 조회 건수",
            },
        },
        "required": [],
    }

    async def execute(
        self,
        db: AsyncSession,
        merchant_id: Optional[int],
        params: dict,
    ) -> ToolResult:
        """Query api_logs with dynamic filter construction.

        Args:
            db: Active async database session.
            merchant_id: Authenticated merchant's database ID.
            params: Optional keys: error_only (bool), endpoint (str), limit (int).

        Returns:
            :class:`ToolResult` with a list of matching API log records.
        """
        error_only: bool = bool(params.get("error_only", False))
        endpoint: Optional[str] = params.get("endpoint")
        limit: int = min(int(params.get("limit", 20)), 100)

        conditions = ["merchant_id = :mid"]
        bind: dict[str, Any] = {"mid": merchant_id, "limit": limit}

        if error_only:
            conditions.append("error_code IS NOT NULL")
        if endpoint:
            conditions.append("endpoint ILIKE :endpoint")
            bind["endpoint"] = f"%{endpoint}%"

        where_clause = " AND ".join(conditions)
        query = (
            f"SELECT id, endpoint, method, status_code, error_code, "
            f"error_message, latency_ms, created_at "
            f"FROM api_logs "
            f"WHERE {where_clause} "
            f"ORDER BY created_at DESC "
            f"LIMIT :limit"
        )

        try:
            result = await db.execute(sql_text(query), bind)
            rows = result.fetchall()
        except Exception as exc:
            logger.error("SearchApiLogsTool DB error: %s", exc)
            return ToolResult(success=False, error=f"데이터베이스 조회 오류: {exc}")

        records: list[dict] = []
        for row in rows:
            item = dict(row._mapping)
            if item.get("created_at") is not None:
                item["created_at"] = item["created_at"].isoformat()
            records.append(item)

        count = len(records)
        if count == 0:
            summary = "조건에 맞는 API 로그가 없습니다."
        else:
            error_count = sum(1 for r in records if r.get("error_code"))
            avg_latency = sum(r["latency_ms"] for r in records) // count
            summary = (
                f"최근 {count}건 API 로그: "
                f"에러 {error_count}건, "
                f"평균 응답시간 {avg_latency}ms"
            )

        return ToolResult(
            success=True,
            data=records,
            display_type="api_log",
            summary=summary,
        )


# Register tool at module import time
ToolRegistry.register(SearchApiLogsTool())
