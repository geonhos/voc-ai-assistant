"""Tool routing: Pass 1 intent classification + tool execution.

Pass 1 calls the LLM with a compact prompt to select the correct tool and
extract parameters from the raw customer message.  Pass 2 (LLM response
generation) is handled in :mod:`app.services.ai_response`.
"""

from __future__ import annotations

import json
import logging
from datetime import date
from typing import Any, Optional

import httpx
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.tools.base import ToolRegistry, ToolResult

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Prompt template
# ---------------------------------------------------------------------------

_INTENT_CLASSIFICATION_PROMPT = """\
당신은 B2B PG(결제대행) 가맹점 지원 챗봇의 의도 분류기입니다.
사용자 메시지를 분석하여 적절한 도구(tool)를 선택하세요.

사용 가능한 도구:
{tools_description}

규칙:
1. 메시지에서 도구가 필요한 경우 JSON으로 응답: {{"tool": "tool_name", "params": {{...}}}}
2. 일반 질문이나 도구가 불필요한 경우: {{"tool": null}}
3. TID/거래번호가 언급되면 lookup_transaction 사용
4. "실패", "에러", "오류" + 날짜/기간이면 search_transactions(status="FAIL")
5. "정산"이 언급되면 lookup_settlement 사용
6. 에러코드(E001 등)가 언급되면 lookup_error_code 사용
7. "API", "로그", "지연"이 언급되면 search_api_logs 사용
8. 오늘 날짜: {today}

반드시 JSON만 출력하세요.\
"""


def _strip_markdown_code_block(text: str) -> str:
    """Remove surrounding ```json ... ``` or ``` ... ``` fences if present.

    Args:
        text: Raw LLM output that may contain Markdown code fences.

    Returns:
        Clean JSON string with fences stripped.
    """
    text = text.strip()
    if text.startswith("```"):
        lines = text.splitlines()
        # Drop the opening fence line (``` or ```json)
        start = 1
        # Drop the closing fence line if present
        end = len(lines) - 1 if lines[-1].strip() == "```" else len(lines)
        text = "\n".join(lines[start:end]).strip()
    return text


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------


async def classify_intent(message: str) -> dict[str, Any]:
    """Pass 1: send message to LLM and extract the tool + params JSON.

    Uses a low temperature setting to make tool selection deterministic.
    Falls back to ``{"tool": null}`` on any parse or HTTP error.

    Args:
        message: Raw customer message text.

    Returns:
        Dict with keys ``tool`` (str or None) and ``params`` (dict).

    Raises:
        Exception: Propagates HTTP or JSON errors so the caller can log them.
    """
    tools_desc = ToolRegistry.get_tools_description()
    system_prompt = _INTENT_CLASSIFICATION_PROMPT.format(
        tools_description=tools_desc,
        today=date.today().isoformat(),
    )

    async with httpx.AsyncClient(timeout=30.0) as client:
        response = await client.post(
            f"{settings.OLLAMA_URL}/api/chat",
            json={
                "model": settings.OLLAMA_CHAT_MODEL,
                "messages": [
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": message},
                ],
                "stream": False,
                "options": {
                    "temperature": settings.TOOL_CLASSIFICATION_TEMPERATURE,
                    "num_predict": settings.TOOL_CLASSIFICATION_MAX_TOKENS,
                },
            },
        )
        response.raise_for_status()

    raw_content: str = response.json()["message"]["content"]
    clean_content = _strip_markdown_code_block(raw_content)
    return json.loads(clean_content)


async def execute_tool(
    tool_name: str,
    db: AsyncSession,
    merchant_id: int,
    params: dict,
) -> Optional[ToolResult]:
    """Execute a registered tool by name and return its result.

    Args:
        tool_name: Registered tool name (e.g. ``"lookup_transaction"``).
        db: Active async database session.
        merchant_id: Authenticated merchant's database ID.
        params: Parameter dict extracted by the intent classifier.

    Returns:
        :class:`~app.tools.base.ToolResult` on success, or ``None`` if the
        tool is not found in the registry.
    """
    tool = ToolRegistry.get(tool_name)
    if tool is None:
        logger.warning("Tool '%s' not found in registry", tool_name)
        return None
    return await tool.execute(db, merchant_id, params)
