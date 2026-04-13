"""Customer-authenticated chat endpoints.

All endpoints require a valid Bearer JWT token issued to a user with
the CUSTOMER role.
"""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Request, status
from slowapi import Limiter
from slowapi.util import get_remote_address
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.database import get_db
from app.core.deps import get_current_customer_user
from app.models.conversation import Conversation
from app.models.message import Message
from app.models.user import User
from app.schemas.conversation import ConversationResponse
from app.schemas.message import ChatRequest, ChatResponse, MessageResponse
from app.services import ai_response as ai_service
from app.services import conversation as conv_service

limiter = Limiter(key_func=get_remote_address)
router = APIRouter(prefix="/customer", tags=["customer-chat"])


@router.get(
    "/conversations",
    response_model=list[ConversationResponse],
    summary="List my conversations",
)
async def list_my_conversations(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_customer_user),
) -> list[ConversationResponse]:
    """Return all conversations owned by the current customer."""
    result = await db.execute(
        select(Conversation)
        .where(Conversation.customer_user_id == current_user.id)
        .order_by(Conversation.created_at.desc())
    )
    conversations = result.scalars().all()
    return [ConversationResponse.model_validate(c) for c in conversations]


@router.post(
    "/conversations",
    response_model=ConversationResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create a new customer conversation",
)
@limiter.limit("20/minute")
async def create_customer_conversation(
    request: Request,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_customer_user),
) -> ConversationResponse:
    """Create a new conversation linked to the authenticated customer."""
    conversation = await conv_service.create_customer_conversation(
        db,
        customer_user_id=current_user.id,
        customer_email=current_user.email,
    )
    await db.commit()
    await db.refresh(conversation)
    return ConversationResponse.model_validate(conversation)


@router.get(
    "/conversations/{conversation_id}/messages",
    response_model=list[MessageResponse],
    summary="Get messages for a conversation",
)
async def get_customer_messages(
    conversation_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_customer_user),
) -> list[MessageResponse]:
    """Fetch all messages in a customer's conversation."""
    conversation = await _get_owned_conversation(db, conversation_id, current_user.id)
    return [MessageResponse.model_validate(m) for m in conversation.messages]


@router.post(
    "/conversations/{conversation_id}/messages",
    response_model=ChatResponse,
    summary="Send a message and receive AI response",
)
@limiter.limit("30/minute")
async def send_customer_message(
    request: Request,
    conversation_id: int,
    payload: ChatRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_customer_user),
) -> ChatResponse:
    """Send a customer message and receive an AI response."""
    conversation = await _get_owned_conversation(db, conversation_id, current_user.id)

    if conversation.status != "OPEN":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Conversation is {conversation.status}. Cannot send new messages.",
        )

    result = await ai_service.generate_ai_response(
        db=db,
        conversation_id=conversation_id,
        customer_text=payload.text,
    )

    ai_message, escalated = result

    return ChatResponse(
        message=MessageResponse.model_validate(ai_message),
        escalated=escalated,
    )


async def _get_owned_conversation(
    db: AsyncSession, conversation_id: int, user_id: int
) -> Conversation:
    """Fetch a conversation and verify ownership."""
    result = await db.execute(
        select(Conversation)
        .options(selectinload(Conversation.messages))
        .where(
            Conversation.id == conversation_id,
            Conversation.customer_user_id == user_id,
        )
    )
    conversation = result.scalar_one_or_none()
    if conversation is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Conversation {conversation_id} not found",
        )
    return conversation
