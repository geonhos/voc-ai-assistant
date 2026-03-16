"""Transaction tools: lookup by TID and search with filters."""

from __future__ import annotations

import logging
from typing import Any, Optional

from sqlalchemy import text as sql_text
from sqlalchemy.ext.asyncio import AsyncSession

from app.tools.base import Tool, ToolRegistry, ToolResult

logger = logging.getLogger(__name__)


class LookupTransactionTool(Tool):
    """Look up a single transaction by its TID (거래번호)."""

    name = "lookup_transaction"
    description = "특정 거래 건을 TID(거래번호)로 조회합니다. 결제 상태, 금액, 에러 정보를 확인할 수 있습니다."
    parameters_schema = {
        "type": "object",
        "properties": {
            "tid": {
                "type": "string",
                "description": "거래번호 (예: TXN20240315001)",
            },
        },
        "required": ["tid"],
    }

    async def execute(
        self,
        db: AsyncSession,
        merchant_id: Optional[int],
        params: dict,
    ) -> ToolResult:
        """Query transactions for the given TID scoped to the authenticated merchant.

        Args:
            db: Active async database session.
            merchant_id: Authenticated merchant's database ID.
            params: Must contain ``tid`` key.

        Returns:
            :class:`ToolResult` with transaction data or error details.
        """
        tid = params.get("tid", "").strip()
        if not tid:
            return ToolResult(success=False, error="tid 파라미터가 필요합니다.")

        try:
            result = await db.execute(
                sql_text(
                    "SELECT id, tid, amount, payment_method, card_company, "
                    "card_number_masked, status, error_code, error_message, "
                    "customer_name, order_id, approved_at, cancelled_at, created_at "
                    "FROM transactions "
                    "WHERE merchant_id = :mid AND tid = :tid "
                    "LIMIT 1"
                ),
                {"mid": merchant_id, "tid": tid},
            )
            row = result.fetchone()
        except Exception as exc:
            logger.error("LookupTransactionTool DB error: %s", exc)
            return ToolResult(success=False, error=f"데이터베이스 조회 오류: {exc}")

        if row is None:
            return ToolResult(
                success=False,
                error=f"거래번호 {tid}에 해당하는 거래를 찾을 수 없습니다.",
            )

        data = dict(row._mapping)
        # Convert datetime objects to ISO strings for JSON serialisation
        for key in ("approved_at", "cancelled_at", "created_at"):
            if data.get(key) is not None:
                data[key] = data[key].isoformat()

        summary = (
            f"거래 {data['tid']}: "
            f"금액 {data['amount']:,}원, "
            f"상태 {data['status']}, "
            f"결제수단 {data['payment_method']}"
        )
        if data.get("error_code"):
            summary += f", 에러코드 {data['error_code']} ({data.get('error_message', '')})"

        return ToolResult(
            success=True,
            data=data,
            display_type="transaction_card",
            summary=summary,
        )


class SearchTransactionsTool(Tool):
    """Search a merchant's transactions with optional status/date/method filters."""

    name = "search_transactions"
    description = (
        "가맹점의 거래 내역을 조건별로 검색합니다. "
        "상태, 날짜 범위, 결제 수단 등으로 필터링할 수 있습니다."
    )
    parameters_schema = {
        "type": "object",
        "properties": {
            "status": {
                "type": "string",
                "description": "거래 상태 (SUCCESS/FAIL/CANCEL)",
            },
            "date_from": {
                "type": "string",
                "description": "시작 날짜 (YYYY-MM-DD)",
            },
            "date_to": {
                "type": "string",
                "description": "종료 날짜 (YYYY-MM-DD)",
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
        """Search transactions with dynamic filter construction.

        Args:
            db: Active async database session.
            merchant_id: Authenticated merchant's database ID.
            params: Optional keys: status, date_from, date_to, limit.

        Returns:
            :class:`ToolResult` with a list of matching transaction records.
        """
        status: Optional[str] = params.get("status")
        date_from: Optional[str] = params.get("date_from")
        date_to: Optional[str] = params.get("date_to")
        limit: int = min(int(params.get("limit", 10)), 50)

        conditions = ["merchant_id = :mid"]
        bind: dict[str, Any] = {"mid": merchant_id, "limit": limit}

        if status:
            conditions.append("status = :status")
            bind["status"] = status.upper()
        if date_from:
            conditions.append("DATE(created_at) >= :date_from")
            bind["date_from"] = date_from
        if date_to:
            conditions.append("DATE(created_at) <= :date_to")
            bind["date_to"] = date_to

        where_clause = " AND ".join(conditions)
        query = (
            f"SELECT id, tid, amount, payment_method, card_company, "
            f"card_number_masked, status, error_code, error_message, "
            f"customer_name, order_id, approved_at, cancelled_at, created_at "
            f"FROM transactions "
            f"WHERE {where_clause} "
            f"ORDER BY created_at DESC "
            f"LIMIT :limit"
        )

        try:
            result = await db.execute(sql_text(query), bind)
            rows = result.fetchall()
        except Exception as exc:
            logger.error("SearchTransactionsTool DB error: %s", exc)
            return ToolResult(success=False, error=f"데이터베이스 조회 오류: {exc}")

        records: list[dict] = []
        for row in rows:
            item = dict(row._mapping)
            for key in ("approved_at", "cancelled_at", "created_at"):
                if item.get(key) is not None:
                    item[key] = item[key].isoformat()
            records.append(item)

        count = len(records)
        if count == 0:
            summary = "조건에 맞는 거래 내역이 없습니다."
        else:
            brief = ", ".join(
                f"{r['tid']}({r['status']}, {r['amount']:,}원)" for r in records[:3]
            )
            suffix = f" 외 {count - 3}건" if count > 3 else ""
            summary = f"총 {count}건 조회됨: {brief}{suffix}"

        return ToolResult(
            success=True,
            data=records,
            display_type="transaction_card",
            summary=summary,
        )


# Register tools at module import time
ToolRegistry.register(LookupTransactionTool())
ToolRegistry.register(SearchTransactionsTool())
