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
    """Create a new anonymous conversation.

    Only creates the conversation record. The first customer message
    is sent via the /messages endpoint to trigger AI response.
    """
    conversation = Conversation(
        topic=payload.initial_message[:200],
        status="OPEN",
    )
    db.add(conversation)
    await db.flush()
    await db.refresh(conversation)

    return conversation


async def update_contact_info(
    db: AsyncSession,
    conversation_id: int,
    access_token: str,
    customer_name: str,
    customer_email: str,
    customer_phone: str = "",
) -> Conversation | None:
    """Update customer contact info for a conversation (on escalation).

    Returns None if conversation not found or token mismatch.
    """
    result = await db.execute(
        select(Conversation).where(
            Conversation.id == conversation_id,
            Conversation.access_token == access_token,
        )
    )
    conversation = result.scalar_one_or_none()
    if conversation is None:
        return None

    conversation.customer_name = customer_name
    conversation.customer_email = customer_email
    conversation.customer_phone = customer_phone
    await db.flush()
    await db.refresh(conversation)
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


async def get_conversation_by_token(
    db: AsyncSession,
    conversation_id: int,
    access_token: str,
) -> Conversation | None:
    """Fetch a conversation only if the access_token matches (customer auth).

    Args:
        db: Active async database session.
        conversation_id: Primary key of the conversation.
        access_token: UUID token issued at conversation creation.

    Returns:
        The Conversation instance or None if not found / token mismatch.
    """
    result = await db.execute(
        select(Conversation)
        .options(selectinload(Conversation.messages))
        .where(
            Conversation.id == conversation_id,
            Conversation.access_token == access_token,
        )
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


async def create_customer_conversation(
    db: AsyncSession,
    customer_user_id: int,
    customer_email: str,
) -> Conversation:
    """Create a new conversation linked to an authenticated customer user.

    Args:
        db: Active async database session.
        customer_user_id: The customer user's database ID.
        customer_email: Email of the authenticated customer user.

    Returns:
        The newly created Conversation instance.
    """
    conversation = Conversation(
        customer_name=customer_email.split("@")[0],
        customer_email=customer_email,
        customer_user_id=customer_user_id,
        status="OPEN",
    )
    db.add(conversation)
    await db.flush()
    await db.refresh(conversation)
    return conversation


async def create_merchant_conversation(
    db: AsyncSession,
    merchant_id: int | None,
    customer_email: str,
) -> Conversation:
    """Create a new conversation scoped to a specific merchant.

    The ``customer_name`` and ``customer_email`` fields are populated from the
    authenticated merchant user so the record is immediately identifiable.

    Args:
        db: Active async database session.
        merchant_id: The merchant's database ID (from the JWT principal).
        customer_email: Email of the authenticated merchant user.

    Returns:
        The newly created Conversation instance.
    """
    conversation = Conversation(
        merchant_id=merchant_id,
        customer_name=customer_email,
        customer_email=customer_email,
        status="OPEN",
    )
    db.add(conversation)
    await db.flush()
    await db.refresh(conversation)
    return conversation


async def get_merchant_conversation(
    db: AsyncSession,
    conversation_id: int,
    merchant_id: int | None,
) -> Conversation | None:
    """Fetch a merchant-scoped conversation with its messages eagerly loaded.

    Verifies that the conversation belongs to ``merchant_id`` — returns None
    when the conversation is not found or the ownership check fails.

    Args:
        db: Active async database session.
        conversation_id: Primary key of the conversation.
        merchant_id: The merchant's database ID (from the JWT principal).

    Returns:
        The Conversation instance or None if not found / ownership mismatch.
    """
    result = await db.execute(
        select(Conversation)
        .options(selectinload(Conversation.messages))
        .where(
            Conversation.id == conversation_id,
            Conversation.merchant_id == merchant_id,
        )
    )
    return result.scalar_one_or_none()


async def list_merchant_conversations(
    db: AsyncSession,
    merchant_id: int | None,
    skip: int = 0,
    limit: int = 20,
    status: str | None = None,
) -> list[Conversation]:
    """List conversations owned by a merchant with optional status filtering.

    Args:
        db: Active async database session.
        merchant_id: The merchant's database ID (from the JWT principal).
        skip: Number of records to skip (pagination offset).
        limit: Maximum number of records to return.
        status: Optional status filter — OPEN | ESCALATED | RESOLVED.

    Returns:
        List of Conversation instances ordered by creation time (newest first).
    """
    query = (
        select(Conversation)
        .where(Conversation.merchant_id == merchant_id)
    )

    if status:
        query = query.where(Conversation.status == status)

    query = query.order_by(Conversation.created_at.desc()).offset(skip).limit(limit)

    result = await db.execute(query)
    return list(result.scalars().all())


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
    await db.refresh(conversation)
    return conversation
