"""Settlement tool: look up monthly settlement records for a merchant."""

from __future__ import annotations

import logging
from typing import Optional

from sqlalchemy import text as sql_text
from sqlalchemy.ext.asyncio import AsyncSession

from app.tools.base import Tool, ToolRegistry, ToolResult

logger = logging.getLogger(__name__)


class LookupSettlementTool(Tool):
    """Look up a merchant's settlement records for a given year/month."""

    name = "lookup_settlement"
    description = (
        "가맹점의 정산 내역을 조회합니다. "
        "월별 정산 금액, 수수료, 상태를 확인할 수 있습니다."
    )
    parameters_schema = {
        "type": "object",
        "properties": {
            "year": {
                "type": "integer",
                "description": "조회 연도 (예: 2024)",
            },
            "month": {
                "type": "integer",
                "description": "조회 월 (1~12)",
            },
        },
        "required": ["year", "month"],
    }

    async def execute(
        self,
        db: AsyncSession,
        merchant_id: Optional[int],
        params: dict,
    ) -> ToolResult:
        """Query settlement rows for the specified year and month.

        Args:
            db: Active async database session.
            merchant_id: Authenticated merchant's database ID.
            params: Must contain ``year`` and ``month`` keys.

        Returns:
            :class:`ToolResult` with settlement records and a text summary.
        """
        try:
            year = int(params["year"])
            month = int(params["month"])
        except (KeyError, ValueError, TypeError) as exc:
            return ToolResult(success=False, error=f"year/month 파라미터 오류: {exc}")

        try:
            result = await db.execute(
                sql_text(
                    "SELECT id, settlement_date, total_amount, fee_amount, "
                    "net_amount, transaction_count, status, completed_at, created_at "
                    "FROM settlements "
                    "WHERE merchant_id = :mid "
                    "  AND EXTRACT(YEAR  FROM settlement_date) = :year "
                    "  AND EXTRACT(MONTH FROM settlement_date) = :month "
                    "ORDER BY settlement_date ASC"
                ),
                {"mid": merchant_id, "year": year, "month": month},
            )
            rows = result.fetchall()
        except Exception as exc:
            logger.error("LookupSettlementTool DB error: %s", exc)
            return ToolResult(success=False, error=f"데이터베이스 조회 오류: {exc}")

        records: list[dict] = []
        for row in rows:
            item = dict(row._mapping)
            for key in ("settlement_date", "completed_at", "created_at"):
                if item.get(key) is not None:
                    item[key] = item[key].isoformat()
            records.append(item)

        if not records:
            summary = f"{year}년 {month}월 정산 내역이 없습니다."
        else:
            total_net = sum(r["net_amount"] for r in records)
            total_fee = sum(r["fee_amount"] for r in records)
            total_txn = sum(r["transaction_count"] for r in records)
            statuses = list({r["status"] for r in records})
            summary = (
                f"{year}년 {month}월 정산: "
                f"순정산액 {total_net:,}원, "
                f"수수료 {total_fee:,}원, "
                f"거래 {total_txn}건, "
                f"상태 {'/'.join(statuses)}"
            )

        return ToolResult(
            success=True,
            data=records,
            display_type="settlement_table",
            summary=summary,
        )


# Register tool at module import time
ToolRegistry.register(LookupSettlementTool())
