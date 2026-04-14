"""State manager for multi-turn clarification conversations.

Persists clarification state in the ``conversations.clarification_state``
JSONB column so that context survives across request boundaries without
requiring an in-process session store.
"""

from __future__ import annotations

import logging
from typing import Optional, TypedDict

from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.conversation import Conversation

logger = logging.getLogger(__name__)

# Maximum number of clarification turns before the pipeline is forced to
# attempt an answer with whatever context has been gathered.
MAX_CLARIFICATION_TURNS = 3


class ClarificationState(TypedDict, total=False):
    """Shape of the JSON object stored in ``conversations.clarification_state``.

    Attributes:
        state: Workflow state machine value.
            One of ``IDLE``, ``GATHERING_INFO``, ``ANALYZING``, ``ANSWERING``.
        accumulated_context: Key-value pairs of information collected across
            clarification turns (e.g. ``{"거래번호": "TXN001", "결제수단": "카드"}``)
        pending_questions: Clarifying questions that have been sent to the user
            but not yet answered.
        quick_options: Per-question fast-select options aligned by index with
            ``pending_questions``.
        turn_count: Number of clarification turns consumed so far.
        original_query: The user's first message that triggered clarification.
        completeness_score: Confidence score from the assessor at the time
            clarification was initiated.
    """

    state: str
    accumulated_context: dict
    pending_questions: list[str]
    quick_options: list[list[str]]
    turn_count: int
    original_query: str
    completeness_score: float


async def get_state(
    db: AsyncSession, conversation_id: int
) -> Optional[ClarificationState]:
    """Fetch the current clarification state for a conversation.

    Args:
        db: Active async database session.
        conversation_id: ID of the conversation to query.

    Returns:
        The stored :class:`ClarificationState` dict, or ``None`` when no
        active clarification session exists.
    """
    result = await db.execute(
        select(Conversation.clarification_state).where(
            Conversation.id == conversation_id
        )
    )
    return result.scalar_one_or_none()


async def start_gathering(
    db: AsyncSession,
    conversation_id: int,
    original_query: str,
    questions: list[str],
    quick_options: list[list[str]],
    completeness_score: float,
) -> ClarificationState:
    """Initialise a GATHERING_INFO clarification session.

    Persists the initial state to the database and returns it.

    Args:
        db: Active async database session.
        conversation_id: ID of the conversation to update.
        original_query: The user's first message that triggered clarification.
        questions: Clarifying questions to present to the user.
        quick_options: Per-question fast-select options (aligned by index with
            ``questions``).
        completeness_score: Confidence score from the completeness assessor.

    Returns:
        The newly created :class:`ClarificationState`.
    """
    state: ClarificationState = {
        "state": "GATHERING_INFO",
        "accumulated_context": {},
        "pending_questions": questions,
        "quick_options": quick_options,
        "turn_count": 0,
        "original_query": original_query,
        "completeness_score": completeness_score,
    }
    await db.execute(
        update(Conversation)
        .where(Conversation.id == conversation_id)
        .values(clarification_state=state)
    )
    await db.flush()
    return state


async def update_context(
    db: AsyncSession,
    conversation_id: int,
    new_info: dict,
) -> ClarificationState:
    """Merge new information into the accumulated context and increment turn count.

    If no existing state is found (e.g. the row was deleted between requests),
    a safe default idle state is returned without touching the database.

    Args:
        db: Active async database session.
        conversation_id: ID of the conversation to update.
        new_info: Key-value pairs extracted from the user's latest reply.

    Returns:
        The updated :class:`ClarificationState`.
    """
    current = await get_state(db, conversation_id)
    if not current:
        logger.warning(
            "update_context called for conv %d with no active state — returning idle",
            conversation_id,
        )
        return {"state": "IDLE", "accumulated_context": {}, "turn_count": 0}

    accumulated = current.get("accumulated_context", {})
    accumulated.update(new_info)
    current["accumulated_context"] = accumulated
    current["turn_count"] = current.get("turn_count", 0) + 1

    await db.execute(
        update(Conversation)
        .where(Conversation.id == conversation_id)
        .values(clarification_state=current)
    )
    await db.flush()
    return current


async def mark_complete(db: AsyncSession, conversation_id: int) -> None:
    """Clear the clarification state, returning the conversation to idle.

    Called after the pipeline has collected enough information and produced
    a final answer.

    Args:
        db: Active async database session.
        conversation_id: ID of the conversation to clear.
    """
    await db.execute(
        update(Conversation)
        .where(Conversation.id == conversation_id)
        .values(clarification_state=None)
    )
    await db.flush()


async def update_state_metadata(
    db: AsyncSession,
    conversation_id: int,
    *,
    pending_questions: list[str] | None = None,
    quick_options: list[list[str]] | None = None,
    completeness_score: float | None = None,
) -> None:
    """Update top-level metadata fields on the clarification state.

    Unlike :func:`update_context`, this does NOT merge into
    ``accumulated_context`` — it patches top-level fields like
    ``pending_questions`` and ``quick_options`` directly.

    Args:
        db: Active async database session.
        conversation_id: ID of the conversation to update.
        pending_questions: New pending questions (replaces existing).
        quick_options: New quick-select options (replaces existing).
        completeness_score: Updated confidence score.
    """
    current = await get_state(db, conversation_id)
    if not current:
        return

    if pending_questions is not None:
        current["pending_questions"] = pending_questions
    if quick_options is not None:
        current["quick_options"] = quick_options
    if completeness_score is not None:
        current["completeness_score"] = completeness_score

    await db.execute(
        update(Conversation)
        .where(Conversation.id == conversation_id)
        .values(clarification_state=current)
    )
    await db.flush()


def should_force_answer(state: Optional[ClarificationState]) -> bool:
    """Return True when the clarification turn limit has been reached.

    When the limit is reached the pipeline must attempt an answer using
    whatever context has been accumulated, rather than asking another question.

    Args:
        state: Current clarification state, or ``None`` for idle conversations.

    Returns:
        ``True`` if ``turn_count >= MAX_CLARIFICATION_TURNS``.
    """
    if not state:
        return False
    return state.get("turn_count", 0) >= MAX_CLARIFICATION_TURNS
