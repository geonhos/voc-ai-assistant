"""Conversation service — Phase 1 implementation placeholder."""

from __future__ import annotations

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.conversation import Conversation
from app.models.message import Message
from app.schemas.conversation import ConversationCreate


async def create_conversation(
    db: AsyncSession,
    payload: ConversationCreate,
) -> Conversation:
    """Create a new conversation with an initial customer message.

    Args:
        db: Active async database session.
        payload: Conversation creation data.

    Returns:
        The newly created Conversation instance.
    """
    conversation = Conversation(
        customer_name=payload.customer_name,
        customer_email=payload.customer_email,
        topic=payload.initial_message[:200],
        status="OPEN",
    )
    db.add(conversation)
    await db.flush()

    initial_message = Message(
        conversation_id=conversation.id,
        sender="CUSTOMER",
        text=payload.initial_message,
    )
    db.add(initial_message)
    await db.flush()

    return conversation


async def get_conversation(
    db: AsyncSession,
    conversation_id: int,
) -> Conversation | None:
    """Fetch a single conversation with its messages eagerly loaded.

    Args:
        db: Active async database session.
        conversation_id: Primary key of the conversation.

    Returns:
        The Conversation instance or None if not found.
    """
    result = await db.execute(
        select(Conversation)
        .options(selectinload(Conversation.messages))
        .where(Conversation.id == conversation_id)
    )
    return result.scalar_one_or_none()


async def list_conversations(
    db: AsyncSession,
    skip: int = 0,
    limit: int = 50,
    status: str | None = None,
) -> tuple[list[Conversation], int]:
    """List conversations with optional status filtering and pagination.

    Args:
        db: Active async database session.
        skip: Number of records to skip.
        limit: Maximum number of records to return.
        status: Optional status filter (OPEN, ESCALATED, RESOLVED).

    Returns:
        Tuple of (conversations list, total count).
    """
    query = select(Conversation)
    count_query = select(func.count(Conversation.id))

    if status:
        query = query.where(Conversation.status == status)
        count_query = count_query.where(Conversation.status == status)

    total_result = await db.execute(count_query)
    total = total_result.scalar_one()

    result = await db.execute(
        query.order_by(Conversation.created_at.desc()).offset(skip).limit(limit)
    )
    conversations = list(result.scalars().all())

    return conversations, total


async def update_conversation_status(
    db: AsyncSession,
    conversation_id: int,
    status: str,
    resolved_by: int | None = None,
) -> Conversation | None:
    """Update the status of a conversation.

    Args:
        db: Active async database session.
        conversation_id: Primary key of the conversation.
        status: New status value.
        resolved_by: User ID who resolved it (required when status=RESOLVED).

    Returns:
        Updated Conversation instance or None if not found.
    """
    from datetime import datetime, timezone

    conversation = await db.get(Conversation, conversation_id)
    if conversation is None:
        return None

    conversation.status = status
    if status == "RESOLVED":
        conversation.resolved_at = datetime.now(timezone.utc)
        conversation.resolved_by = resolved_by

    await db.flush()
    return conversation
