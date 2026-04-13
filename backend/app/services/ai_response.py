"""AI response generation service — Ollama LLM + RAG pipeline.

Provides two public entry points:

- :func:`generate_ai_response` — original anonymous-chat pipeline (RAG only).
- :func:`generate_merchant_ai_response` — Phase 3 merchant pipeline with
  3-pass tool-use (completeness check → intent classification → tool execution
  → LLM response).

Pass 1.5 (completeness assessment) sits between the keyword escalation check
and the existing tool-execution pass.  When the user's query lacks sufficient
context the pipeline enters a GATHERING_INFO clarification loop (max 3 turns)
before falling through to the normal tool-execution path.
"""

from __future__ import annotations

import logging
import re
from typing import Any, Optional

import httpx
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.models.message import Message
from app.services.escalation import escalate_conversation
from app.services.rag import format_context, retrieve_context

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# System prompt
# ---------------------------------------------------------------------------

SYSTEM_PROMPT = """당신은 고객 지원 AI 어시스턴트입니다.

역할:
- 고객의 문의를 친절하고 정확하게 답변합니다
- Knowledge Base의 정보를 기반으로 답변합니다
- 확실하지 않은 내용은 솔직히 모른다고 합니다

참고 자료:
{context}

규칙:
- 반드시 한국어로만 답변합니다
- 간결하고 사무적인 대화체로 답변합니다 (2-4문장)
- 다음 표현은 사용 금지: "안타깝네요", "특히", "~하셨군요", "~다니"
- 고객이 제공하지 않은 정보를 추측하거나 미리 언급하지 마세요
- 정보가 부족하면 "오류 코드나 상세 내용을 알려주시면 확인해 드리겠습니다"처럼 요청하세요
- 해결이 어려우면 "전문 상담사에게 연결해 드리겠습니다"라고 안내합니다
- 답변 마지막에 [confidence: 0.0~1.0] 형태로 확신도를 표시합니다
  - 0.8~1.0: KB 문서에 정확한 답변이 있을 때
  - 0.5~0.7: 부분적으로 관련된 정보가 있을 때
  - 0.0~0.4: 관련 정보가 없거나 불확실할 때
"""

# ---------------------------------------------------------------------------
# Escalation configuration
# ---------------------------------------------------------------------------

ESCALATION_KEYWORDS: list[str] = [
    "상담사 연결",
    "사람과 통화",
    "환불",
    "클레임",
    "항의",
    "소비자보호",
    "법적",
    "책임자",
    "고소",
    "신고",
]

_client: httpx.AsyncClient | None = None


def _get_client() -> httpx.AsyncClient:
    """Return a singleton async HTTP client for Ollama."""
    global _client
    if _client is None:
        _client = httpx.AsyncClient(base_url=settings.OLLAMA_URL, timeout=120.0)
    return _client


# ---------------------------------------------------------------------------
# Private helpers
# ---------------------------------------------------------------------------


async def _get_conversation_history(
    db: AsyncSession,
    conversation_id: int,
    max_messages: int = 10,
) -> list[dict]:
    """Fetch the most recent messages for a conversation as chat dicts."""
    result = await db.execute(
        select(Message)
        .where(Message.conversation_id == conversation_id)
        .order_by(Message.created_at.desc())
        .limit(max_messages)
    )
    messages = list(reversed(result.scalars().all()))

    history: list[dict] = []
    for msg in messages:
        role = "assistant" if msg.sender == "AI" else "user"
        history.append({"role": role, "content": msg.text})
    return history


def _extract_confidence(ai_text: str) -> tuple[str, float]:
    """Extract ``[confidence: X.X]`` tag from AI response text."""
    match = re.search(r"\[confidence:\s*(-?[\d.]+)\]", ai_text)
    if match:
        confidence = min(1.0, max(0.0, float(match.group(1))))
        cleaned = re.sub(r"\s*\[confidence:\s*-?[\d.]+\]", "", ai_text).strip()
        return cleaned, confidence
    return ai_text, 0.5


def _check_escalation_keywords(text: str) -> bool:
    """Return True if the customer message contains any escalation keyword."""
    text_lower = text.lower()
    return any(kw in text_lower for kw in ESCALATION_KEYWORDS)


async def _count_low_confidence_streak(
    db: AsyncSession,
    conversation_id: int,
) -> int:
    """Count consecutive AI messages with confidence below the escalation threshold."""
    result = await db.execute(
        select(Message)
        .where(
            Message.conversation_id == conversation_id,
            Message.sender == "AI",
        )
        .order_by(Message.created_at.desc())
        .limit(settings.MAX_LOW_CONFIDENCE_STREAK)
    )
    messages = result.scalars().all()
    streak = 0
    for msg in messages:
        if msg.confidence is not None and msg.confidence < settings.CONFIDENCE_ESCALATE_THRESHOLD:
            streak += 1
        else:
            break
    return streak


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------


async def generate_ai_response(
    db: AsyncSession,
    conversation_id: int,
    customer_text: str,
) -> tuple[Message, bool]:
    """Generate an AI response using the Ollama + RAG pipeline."""
    # 1. Persist customer message
    customer_msg = Message(
        conversation_id=conversation_id,
        sender="CUSTOMER",
        text=customer_text,
    )
    db.add(customer_msg)
    await db.flush()

    # 2. Keyword-based escalation check
    keyword_escalation = _check_escalation_keywords(customer_text)

    # 3. RAG context retrieval
    #    Skip KB on the very first customer message (conversation has <=2 messages:
    #    the customer msg we just flushed + possibly one prior).  This prevents the
    #    AI from pre-emptively citing KB content before the customer provides specifics.
    history_for_count = await _get_conversation_history(db, conversation_id)
    if len(history_for_count) <= 2:
        rag_articles: list[dict] = []
        context_str = ""
    else:
        rag_articles = await retrieve_context(
            db,
            customer_text,
            top_k=settings.RAG_TOP_K,
            similarity_threshold=settings.RAG_SIMILARITY_THRESHOLD,
        )
        context_str = format_context(rag_articles)

    # 4 & 5. Build prompt messages (history already includes the just-flushed customer msg)
    system_message = SYSTEM_PROMPT.format(context=context_str)
    history = await _get_conversation_history(db, conversation_id)

    messages: list[dict] = [
        {"role": "system", "content": system_message},
        *history,
    ]

    # 6. Call Ollama
    ollama_error = False
    try:
        client = _get_client()
        response = await client.post(
            "/api/chat",
            json={
                "model": settings.OLLAMA_CHAT_MODEL,
                "messages": messages,
                "stream": False,
                "keep_alive": "10m",
                "options": {
                    "num_predict": 500,
                    "temperature": 0.7,
                },
            },
        )
        response.raise_for_status()
        data = response.json()
        raw_text: str = data["message"]["content"]
    except (httpx.HTTPError, httpx.TimeoutException) as e:
        logger.error("Ollama API error for conversation %d: %s", conversation_id, e)
        ollama_error = True
        raw_text = (
            "죄송합니다, 일시적인 오류가 발생했습니다. "
            "잠시 후 다시 시도해 주세요. [confidence: 0.5]"
        )

    # 7. Extract confidence from model output
    ai_text, confidence = _extract_confidence(raw_text)

    # 8. Boost confidence when a highly-similar KB article was retrieved
    if rag_articles and rag_articles[0].get("similarity", 0.0) > 0.7:
        confidence = min(1.0, confidence + 0.1)

    # 9. Determine escalation (skip for transient Ollama errors)
    should_escalate = False
    escalation_reason = ""

    if keyword_escalation:
        should_escalate = True
        escalation_reason = "고객이 상담사 연결을 요청했습니다"
    elif not ollama_error and confidence < settings.CONFIDENCE_ESCALATE_THRESHOLD:
        if confidence < 0.3:
            should_escalate = True
            escalation_reason = f"AI 신뢰도가 매우 낮음: {confidence:.2f}"
        else:
            streak = await _count_low_confidence_streak(db, conversation_id)
            if streak >= settings.MAX_LOW_CONFIDENCE_STREAK - 1:
                should_escalate = True
                escalation_reason = (
                    f"AI 신뢰도가 {settings.MAX_LOW_CONFIDENCE_STREAK}회 연속 낮음 "
                    f"(최근: {confidence:.2f})"
                )

    # 10. Persist AI message
    ai_message = Message(
        conversation_id=conversation_id,
        sender="AI",
        text=ai_text,
        confidence=confidence,
    )
    db.add(ai_message)
    await db.flush()

    # 11. Handle escalation
    if should_escalate:
        await escalate_conversation(db, conversation_id, escalation_reason)

        system_msg = Message(
            conversation_id=conversation_id,
            sender="SYSTEM",
            text="전문 상담사에게 연결합니다. 잠시만 기다려 주세요.",
        )
        db.add(system_msg)
        await db.flush()

    return ai_message, should_escalate


# ---------------------------------------------------------------------------
# Phase 2 — Merchant-specific 2-pass tool-use pipeline
# ---------------------------------------------------------------------------

# Merchant-specific escalation keywords (superset of the anonymous set)
_MERCHANT_ESCALATION_KEYWORDS: list[str] = [
    "상담사 연결",
    "사람과 통화",
    "환불 요청",
    "환불",
    "클레임",
    "항의",
    "카드사 추가",
    "계약 변경",
    "수수료 변경",
    "소비자보호",
    "법적",
    "책임자",
    "고소",
    "신고",
]


async def generate_merchant_ai_response(
    db: AsyncSession,
    conversation_id: int,
    merchant_id: int,
    customer_text: str,
) -> dict[str, Any]:
    """3-pass tool-use pipeline for authenticated merchant chat.

    Pass 1.5 (completeness assessment) is inserted between the keyword
    escalation check and the existing tool-execution pass.  When the user's
    query lacks sufficient context the function enters a multi-turn
    GATHERING_INFO loop (up to ``MAX_CLARIFICATION_TURNS`` rounds) and returns
    early with a clarification message.  Once the query is deemed complete (or
    the turn limit is reached) the function falls through to the existing
    tool-execution and LLM-response path unchanged.

    Pass 1: classify intent via LLM → select tool + params.
    Pass 2: execute tool (if any) + RAG retrieval → LLM final response.

    Args:
        db: Active async database session.
        conversation_id: ID of the ongoing conversation.
        merchant_id: Authenticated merchant's database ID.
        customer_text: Raw message text from the merchant user.

    Returns:
        Dict with keys:
            - ``message``: serialised AI :class:`~app.models.message.Message`
              fields including ``tool_name``, ``tool_data``, ``confidence``.
            - ``escalated``: bool indicating whether escalation was triggered.
            - ``clarification_state``: ``"GATHERING_INFO"`` while collecting
              additional context, ``None`` for normal (complete) responses.
            - ``quick_options``: Per-question fast-select option lists when in
              clarification state, otherwise ``None``.
    """
    # Lazy imports to avoid circular dependencies at module load time
    from app.services.tool_router import classify_intent, execute_tool
    from app.services.pg_system_prompt import (
        ESCALATION_KEYWORDS_SECTION,
        KB_CONTEXT_TEMPLATE,
        PG_SYSTEM_PROMPT,
        TOOL_CONTEXT_TEMPLATE,
    )
    from app.services.clarification_state import (
        get_state,
        mark_complete,
        should_force_answer,
        start_gathering,
        update_context,
        update_state_metadata,
    )
    from app.services.completeness import assess_completeness

    # Ensure all tools are registered
    import app.tools  # noqa: F401

    # ------------------------------------------------------------------
    # 1. Persist customer message
    # ------------------------------------------------------------------
    customer_msg = Message(
        conversation_id=conversation_id,
        sender="CUSTOMER",
        text=customer_text,
    )
    db.add(customer_msg)
    await db.flush()

    # ------------------------------------------------------------------
    # 2. Keyword-based escalation pre-check
    # ------------------------------------------------------------------
    keyword_escalation = any(kw in customer_text for kw in _MERCHANT_ESCALATION_KEYWORDS)

    # ------------------------------------------------------------------
    # Pass 1.5 — Multi-turn completeness check
    #
    # Two branches:
    #   A) Already in GATHERING_INFO: user is answering a clarification
    #      question.  Merge the answer into accumulated context and re-assess.
    #   B) Fresh query (no active state): assess completeness and, if below
    #      the threshold, start a clarification flow.
    # In both cases we may return early with a clarification message.
    # Otherwise we fall through to the normal tool-execution pipeline.
    # ------------------------------------------------------------------

    # Tracks whether we eventually resolve a clarification flow so that
    # T-MT-007 quality self-evaluation can run afterwards.
    was_in_clarification: bool = False
    original_query: str = customer_text
    accumulated_context: dict = {}

    current_clarification = await get_state(db, conversation_id)

    # ---- Branch A: already collecting context from previous turn ----
    if current_clarification and current_clarification.get("state") == "GATHERING_INFO":
        logger.info(
            "Conv %d is in GATHERING_INFO (turn %d/%d) — merging user answer",
            conversation_id,
            current_clarification.get("turn_count", 0),
            3,
        )

        # Merge the user's latest answer keyed by turn number
        turn = current_clarification.get("turn_count", 0)
        await update_context(db, conversation_id, {f"answer_turn_{turn}": customer_text})
        current_clarification = await get_state(db, conversation_id)

        # Carry original query and context through for downstream use
        original_query = current_clarification.get("original_query", customer_text)
        accumulated_context = current_clarification.get("accumulated_context", {})

        if should_force_answer(current_clarification):
            # Max turns reached — clear state and fall through to pipeline
            logger.info(
                "Conv %d reached max clarification turns — forcing answer",
                conversation_id,
            )
            await mark_complete(db, conversation_id)
            await db.commit()
            was_in_clarification = True
            # Fall through to tool-execution pipeline below

        else:
            # Re-assess with the enriched context
            try:
                re_intent = await classify_intent(customer_text)
            except Exception as exc:
                logger.warning(
                    "Intent classification failed during clarification re-assess for conv %d: %s",
                    conversation_id,
                    exc,
                )
                re_intent = {"tool": None}

            chat_history = await _get_conversation_history(db, conversation_id)

            assessment = await assess_completeness(
                customer_text,
                re_intent,
                chat_history,
                accumulated_context,
            )

            if not assessment.is_complete:
                # Still incomplete — update pending questions and ask again
                logger.info(
                    "Conv %d still incomplete after re-assess (score=%.2f) — asking again",
                    conversation_id,
                    assessment.confidence,
                )
                await update_state_metadata(
                    db,
                    conversation_id,
                    pending_questions=assessment.questions,
                    quick_options=assessment.quick_options,
                    completeness_score=assessment.confidence,
                )

                clarification_text = "\n".join(assessment.questions)
                ai_msg = Message(
                    conversation_id=conversation_id,
                    sender="AI",
                    text=clarification_text,
                    confidence=assessment.confidence,
                    tool_name="clarification",
                    tool_data={
                        "display_type": "clarification",
                        "data": {
                            "questions": assessment.questions,
                            "quick_options": assessment.quick_options,
                            "accumulated_context": accumulated_context,
                            "completeness_score": assessment.confidence,
                            "turn_count": current_clarification.get("turn_count", 0),
                            "max_turns": 3,
                        },
                    },
                )
                db.add(ai_msg)
                await db.commit()
                await db.refresh(ai_msg)

                logger.info(
                    "Conv %d: clarification message saved (id=%d)",
                    conversation_id,
                    ai_msg.id,
                )
                return {
                    "message": {
                        "id": ai_msg.id,
                        "conversation_id": conversation_id,
                        "sender": "AI",
                        "text": clarification_text,
                        "confidence": assessment.confidence,
                        "tool_name": "clarification",
                        "tool_data": ai_msg.tool_data,
                        "created_at": (
                            ai_msg.created_at.isoformat() if ai_msg.created_at else None
                        ),
                    },
                    "escalated": False,
                    "clarification_state": "GATHERING_INFO",
                    "quick_options": assessment.quick_options,
                }
            else:
                # Sufficient context — clear state and fall through to pipeline
                logger.info(
                    "Conv %d clarification complete (score=%.2f) — proceeding to tool execution",
                    conversation_id,
                    assessment.confidence,
                )
                await mark_complete(db, conversation_id)
                await db.commit()
                was_in_clarification = True

    # ---- Branch B: fresh query — assess completeness for the first time ----
    elif not current_clarification:
        try:
            first_intent = await classify_intent(customer_text)
        except Exception as exc:
            logger.warning(
                "Intent classification failed during initial assess for conv %d: %s",
                conversation_id,
                exc,
            )
            first_intent = {"tool": None}

        chat_history = await _get_conversation_history(db, conversation_id)

        assessment = await assess_completeness(customer_text, first_intent, chat_history)

        if not assessment.is_complete:
            logger.info(
                "Conv %d: query incomplete (score=%.2f) — starting clarification flow",
                conversation_id,
                assessment.confidence,
            )
            await start_gathering(
                db,
                conversation_id,
                customer_text,
                assessment.questions,
                assessment.quick_options,
                assessment.confidence,
            )

            clarification_text = (
                "더 정확한 답변을 위해 추가 정보가 필요합니다.\n\n"
                + "\n".join(f"• {q}" for q in assessment.questions)
            )
            ai_msg = Message(
                conversation_id=conversation_id,
                sender="AI",
                text=clarification_text,
                confidence=assessment.confidence,
                tool_name="clarification",
                tool_data={
                    "display_type": "clarification",
                    "data": {
                        "questions": assessment.questions,
                        "quick_options": assessment.quick_options,
                        "accumulated_context": {},
                        "completeness_score": assessment.confidence,
                        "turn_count": 0,
                        "max_turns": 3,
                    },
                },
            )
            db.add(ai_msg)
            await db.commit()
            await db.refresh(ai_msg)

            logger.info(
                "Conv %d: initial clarification message saved (id=%d)",
                conversation_id,
                ai_msg.id,
            )
            return {
                "message": {
                    "id": ai_msg.id,
                    "conversation_id": conversation_id,
                    "sender": "AI",
                    "text": clarification_text,
                    "confidence": assessment.confidence,
                    "tool_name": "clarification",
                    "tool_data": ai_msg.tool_data,
                    "created_at": (
                        ai_msg.created_at.isoformat() if ai_msg.created_at else None
                    ),
                },
                "escalated": False,
                "clarification_state": "GATHERING_INFO",
                "quick_options": assessment.quick_options,
            }

    # ------------------------------------------------------------------
    # 3. Pass 1 — intent classification → tool selection + params
    #    (existing logic, unchanged)
    # ------------------------------------------------------------------
    tool_result = None
    tool_name: Optional[str] = None

    # Use original_query enriched with accumulated context when resolving
    # from a clarification flow so that the intent classifier and RAG see
    # the full picture, not just the last short clarification answer.
    if was_in_clarification and accumulated_context:
        context_str = " ".join(
            str(v) for k, v in accumulated_context.items()
            if not k.startswith("answer_turn_")
        )
        # Include raw answers too
        answers_str = " ".join(
            str(v) for k, v in accumulated_context.items()
            if k.startswith("answer_turn_")
        )
        query_for_tools = f"{original_query} {answers_str} {context_str}".strip()
    elif was_in_clarification:
        query_for_tools = original_query
    else:
        query_for_tools = customer_text

    try:
        intent = await classify_intent(query_for_tools)
        if intent.get("tool"):
            tool_name = intent["tool"]
            tool_result = await execute_tool(
                tool_name, db, merchant_id, intent.get("params", {})
            )
            logger.info(
                "Tool '%s' executed for conv %d: success=%s",
                tool_name,
                conversation_id,
                tool_result.success if tool_result else False,
            )
    except Exception as exc:
        logger.warning(
            "Tool classification/execution failed for conv %d: %s",
            conversation_id,
            exc,
        )

    # ------------------------------------------------------------------
    # 4. RAG context retrieval (knowledge base)
    # ------------------------------------------------------------------
    rag_articles = await retrieve_context(
        db,
        query_for_tools,
        top_k=settings.RAG_TOP_K,
        similarity_threshold=settings.RAG_SIMILARITY_THRESHOLD,
    )
    kb_context_str = format_context(rag_articles)

    # ------------------------------------------------------------------
    # 5. Build system prompt
    # ------------------------------------------------------------------
    tool_context_section = ""
    if tool_result and tool_result.success:
        tool_context_section = TOOL_CONTEXT_TEMPLATE.format(
            tool_name=tool_name,
            tool_summary=tool_result.summary,
        )

    kb_section = (
        KB_CONTEXT_TEMPLATE.format(kb_context=kb_context_str)
        if kb_context_str
        else ""
    )

    system_prompt = PG_SYSTEM_PROMPT.format(
        tool_context=tool_context_section,
        kb_context=kb_section,
        escalation_keywords=ESCALATION_KEYWORDS_SECTION,
    )

    # ------------------------------------------------------------------
    # 6. Build conversation history for the LLM (most recent 10 turns)
    # ------------------------------------------------------------------
    history = await _get_conversation_history(db, conversation_id)
    chat_messages: list[dict] = [
        {"role": "system", "content": system_prompt},
        *history,
    ]

    # ------------------------------------------------------------------
    # 7. Pass 2 — LLM response generation
    # ------------------------------------------------------------------
    ollama_error = False
    try:
        client = _get_client()
        response = await client.post(
            "/api/chat",
            json={
                "model": settings.OLLAMA_CHAT_MODEL,
                "messages": chat_messages,
                "stream": False,
                "keep_alive": "10m",
                "options": {
                    "num_predict": 500,
                    "temperature": 0.7,
                },
            },
        )
        response.raise_for_status()
        raw_text: str = response.json()["message"]["content"]
    except (httpx.HTTPError, httpx.TimeoutException) as exc:
        logger.error(
            "Ollama API error (merchant) for conv %d: %s", conversation_id, exc
        )
        ollama_error = True
        raw_text = (
            "죄송합니다, 일시적인 오류가 발생했습니다. "
            "잠시 후 다시 시도해 주세요. [confidence: 0.5]"
        )

    # ------------------------------------------------------------------
    # 8. Extract confidence
    # ------------------------------------------------------------------
    ai_text, confidence = _extract_confidence(raw_text)

    # ------------------------------------------------------------------
    # 9. Boost confidence when tool data was successfully retrieved
    #    or when a highly-similar KB article is available
    # ------------------------------------------------------------------
    if tool_result and tool_result.success:
        confidence = min(1.0, confidence + 0.15)
    elif rag_articles and rag_articles[0].get("similarity", 0.0) > 0.7:
        confidence = min(1.0, confidence + 0.1)

    # ------------------------------------------------------------------
    # T-MT-007: Self-evaluation for multi-turn completed answers
    #
    # Only runs when we resolved a clarification flow.  Asks the LLM to
    # score how well the generated answer addresses the original query and
    # the accumulated context.  On any error (network, parse, timeout) we
    # silently skip — this is a non-critical quality signal.
    # ------------------------------------------------------------------
    if was_in_clarification and not ollama_error:
        try:
            eval_prompt = (
                f"사용자 원래 질문: '{original_query}'\n"
                f"수집된 정보: {accumulated_context}\n"
                f"생성된 답변: '{ai_text}'\n\n"
                "이 답변이 사용자의 질문을 충분히 다루고 있나요? "
                "0.0~1.0 점수만 숫자 하나로 답하세요. 다른 말은 하지 마세요."
            )
            eval_client = _get_client()
            eval_response = await eval_client.post(
                "/api/chat",
                json={
                    "model": settings.OLLAMA_CHAT_MODEL,
                    "messages": [
                        {"role": "user", "content": eval_prompt},
                    ],
                    "stream": False,
                    "options": {
                        "temperature": 0.1,
                        "num_predict": 10,
                    },
                },
            )
            eval_response.raise_for_status()
            raw_score = eval_response.json()["message"]["content"].strip()
            quality_score = max(0.0, min(1.0, float(raw_score)))
            confidence = min(1.0, confidence + quality_score * 0.1)
            logger.info(
                "Conv %d self-eval quality_score=%.2f → adjusted confidence=%.2f",
                conversation_id,
                quality_score,
                confidence,
            )
        except (httpx.HTTPError, httpx.TimeoutException) as exc:
            logger.debug(
                "Conv %d self-eval skipped: %s", conversation_id, exc
            )

    # ------------------------------------------------------------------
    # 10. Determine escalation
    # ------------------------------------------------------------------
    should_escalate = False
    escalation_reason = ""

    if keyword_escalation:
        should_escalate = True
        escalation_reason = "고객이 상담사 연결을 요청했습니다"
    elif not ollama_error and confidence < settings.CONFIDENCE_ESCALATE_THRESHOLD:
        if confidence < 0.3:
            should_escalate = True
            escalation_reason = f"AI 신뢰도가 매우 낮음: {confidence:.2f}"
        else:
            streak = await _count_low_confidence_streak(db, conversation_id)
            if streak >= settings.MAX_LOW_CONFIDENCE_STREAK - 1:
                should_escalate = True
                escalation_reason = (
                    f"AI 신뢰도가 {settings.MAX_LOW_CONFIDENCE_STREAK}회 연속 낮음 "
                    f"(최근: {confidence:.2f})"
                )

    # ------------------------------------------------------------------
    # 11. Persist AI message (with optional tool fields)
    # ------------------------------------------------------------------
    tool_data_payload: Optional[dict] = None
    if tool_result and tool_result.success:
        tool_data_payload = {
            "display_type": tool_result.display_type,
            "data": tool_result.data,
        }

    ai_message = Message(
        conversation_id=conversation_id,
        sender="AI",
        text=ai_text,
        confidence=confidence,
        tool_name=tool_name,
        tool_data=tool_data_payload,
    )
    db.add(ai_message)
    await db.flush()

    # ------------------------------------------------------------------
    # 12. Handle escalation (reuse existing logic)
    # ------------------------------------------------------------------
    if should_escalate:
        await escalate_conversation(db, conversation_id, escalation_reason)

        system_msg = Message(
            conversation_id=conversation_id,
            sender="SYSTEM",
            text="전문 상담사에게 연결합니다. 잠시만 기다려 주세요.",
        )
        db.add(system_msg)
        await db.flush()

    return {
        "message": {
            "id": ai_message.id,
            "conversation_id": conversation_id,
            "sender": "AI",
            "text": ai_text,
            "confidence": confidence,
            "tool_name": tool_name,
            "tool_data": tool_data_payload,
            "created_at": (
                ai_message.created_at.isoformat()
                if ai_message.created_at
                else None
            ),
        },
        "escalated": should_escalate,
        "clarification_state": None,
        "quick_options": None,
    }
