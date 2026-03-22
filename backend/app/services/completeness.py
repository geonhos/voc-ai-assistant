"""Completeness assessment for multi-turn clarification.

Pass 1.5 in the merchant pipeline: evaluates whether the user's query contains
sufficient information to execute a tool and return a data-backed answer.
"""

from __future__ import annotations

import json
import logging
from dataclasses import dataclass, field

from app.core.config import settings
from app.services.completeness_prompt import COMPLETENESS_ASSESSMENT_PROMPT
from app.tools.base import ToolRegistry

logger = logging.getLogger(__name__)


@dataclass
class CompletenessResult:
    """Result of a completeness assessment for a user query.

    Attributes:
        is_complete: Whether the query has sufficient information for a
            data-backed answer (True when confidence >= 0.8).
        confidence: Score in [0.0, 1.0] from the LLM assessor.
        missing_fields: Human-readable list of information that would improve
            answer quality (e.g. ``["거래번호", "결제수단"]``).
        questions: Clarifying questions to present to the user (max 3).
        quick_options: Per-question fast-select options aligned by index with
            ``questions`` (e.g. ``[["오늘", "어제"], ["카드", "계좌이체"]]``).
    """

    is_complete: bool = True
    confidence: float = 1.0
    missing_fields: list[str] = field(default_factory=list)
    questions: list[str] = field(default_factory=list)
    quick_options: list[list[str]] = field(default_factory=list)


def _strip_markdown_code_block(text: str) -> str:
    """Remove surrounding ```json ... ``` or ``` ... ``` fences if present.

    Replicates the same stripping logic used in :mod:`app.services.tool_router`
    so that both services handle LLM output consistently.

    Args:
        text: Raw LLM output that may contain Markdown code fences.

    Returns:
        Clean JSON string with fences stripped.
    """
    text = text.strip()
    if text.startswith("```"):
        lines = text.splitlines()
        start = 1
        end = len(lines) - 1 if lines[-1].strip() == "```" else len(lines)
        text = "\n".join(lines[start:end]).strip()
    return text


async def assess_completeness(
    message: str,
    intent: dict,
    conversation_history: list[dict],
    accumulated_context: dict | None = None,
) -> CompletenessResult:
    """Pass 1.5: assess whether the user's query has enough information to give
    a data-backed answer.

    The assessor calls the LLM with a low temperature (0.2) to produce a
    deterministic JSON object that contains a confidence score, a list of
    missing fields, clarifying questions, and per-question quick-select options.

    On any failure (network error, JSON parse error, etc.) the function
    defaults to ``is_complete=True`` so that the existing tool-use pipeline
    handles the message without interruption.

    Args:
        message: Raw customer message text.
        intent: Intent dict produced by Pass 1 (``{"tool": ..., "params": ...}``).
            Currently reserved for future use in prompt construction.
        conversation_history: Recent chat messages as ``[{"role": ..., "content": ...}]``
            dicts.  Only the last 6 messages are included in the prompt.
        accumulated_context: Key-value pairs of information already collected
            during previous clarification turns for this conversation.

    Returns:
        :class:`CompletenessResult` indicating whether the query is ready for
        tool execution and, if not, which clarifying questions to surface.
    """
    tools_desc = ToolRegistry.get_tools_description()

    # Build context string from accumulated info
    context_str = ""
    if accumulated_context:
        context_str = "이미 수집된 정보:\n" + "\n".join(
            f"- {k}: {v}" for k, v in accumulated_context.items()
        )

    # Build conversation history string (last 6 messages)
    history_str = ""
    if conversation_history:
        recent = conversation_history[-6:]
        history_str = "\n".join(
            f"{'사용자' if m.get('role') == 'user' else 'AI'}: {m.get('content', '')}"
            for m in recent
        )

    import datetime  # noqa: PLC0415 — intentional local import for testability

    system_prompt = COMPLETENESS_ASSESSMENT_PROMPT.format(
        tools_description=tools_desc,
        accumulated_context=context_str,
        conversation_history=history_str,
        today=datetime.date.today().isoformat(),
    )

    try:
        from app.services.ai_response import _get_client

        client = _get_client()
        response = await client.post(
            "/api/chat",
            json={
                "model": settings.OLLAMA_CHAT_MODEL,
                "messages": [
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": message},
                ],
                "stream": False,
                "options": {
                    "temperature": 0.2,
                    "num_predict": 200,
                },
            },
        )
        response.raise_for_status()
        raw_content: str = response.json()["message"]["content"]
        clean_content = _strip_markdown_code_block(raw_content)

        data = json.loads(clean_content)

        confidence = float(data.get("confidence", 1.0))
        is_complete = confidence >= 0.8

        return CompletenessResult(
            is_complete=is_complete,
            confidence=confidence,
            missing_fields=data.get("missing_fields", []),
            questions=data.get("questions", []),
            quick_options=data.get("quick_options", []),
        )
    except Exception as exc:
        logger.warning(
            "Completeness assessment failed: %s — defaulting to complete", exc
        )
        return CompletenessResult(is_complete=True, confidence=1.0)
