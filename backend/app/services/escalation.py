"""Escalation service — manages EscalationEvent records and conversation promotion."""

from __future__ import annotations

from sqlalchemy.ext.asyncio import AsyncSession

from app.models.conversation import Conversation
from app.models.escalation import EscalationEvent


async def escalate_conversation(
    db: AsyncSession,
    conversation_id: int,
    reason: str,
) -> EscalationEvent:
    """Create an EscalationEvent and promote the conversation to ESCALATED status.

    Args:
        db: Active async database session.
        conversation_id: The conversation being escalated.
        reason: Human-readable reason for escalation.

    Returns:
        The created EscalationEvent instance.
    """
    conversation = await db.get(Conversation, conversation_id)
    if conversation is not None:
        conversation.status = "ESCALATED"

    event = EscalationEvent(
        conversation_id=conversation_id,
        reason=reason,
    )
    db.add(event)
    await db.flush()
    return event


async def resolve_escalation(
    db: AsyncSession,
    escalation_id: int,
    resolved_by: int,
) -> EscalationEvent | None:
    """Mark an escalation event as resolved.

    Args:
        db: Active async database session.
        escalation_id: Primary key of the EscalationEvent.
        resolved_by: ID of the admin user resolving the escalation.

    Returns:
        Updated EscalationEvent or None if not found.
    """
    from datetime import datetime, timezone

    event = await db.get(EscalationEvent, escalation_id)
    if event is None:
        return None

    event.resolved_at = datetime.now(timezone.utc)
    event.resolved_by = resolved_by
    await db.flush()
    return event
