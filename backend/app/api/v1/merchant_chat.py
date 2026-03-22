"""Merchant-authenticated chat endpoints.

All endpoints require a valid Bearer JWT token issued to a user with the
MERCHANT or ADMIN role (enforced by ``get_current_merchant_user``).
"""

from __future__ import annotations

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Request, status
from slowapi import Limiter
from slowapi.util import get_remote_address
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.deps import get_current_merchant_user
from app.models.user import User
from app.schemas.conversation import ConversationResponse
from app.schemas.message import ChatRequest, ChatResponse, MessageResponse
from app.services import ai_response as ai_service
from app.services import conversation as conv_service
from app.services.notification import notify_escalation

limiter = Limiter(key_func=get_remote_address)
router = APIRouter(prefix="/merchant", tags=["merchant-chat"])


# ---------------------------------------------------------------------------
# POST /merchant/conversations — create a new merchant conversation
# ---------------------------------------------------------------------------


@router.post(
    "/conversations",
    response_model=ConversationResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create a new merchant conversation",
)
@limiter.limit("20/minute")
async def create_merchant_conversation(
    request: Request,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_merchant_user),
) -> ConversationResponse:
    """Create a new conversation scoped to the authenticated merchant.

    The merchant_id is derived automatically from the JWT token — no body
    parameter is required.

    Args:
        request: FastAPI request (required by slowapi rate-limiter).
        db: Active async database session.
        current_user: Authenticated merchant/admin user from JWT.

    Returns:
        The newly created ConversationResponse.

    Raises:
        HTTPException 403: If the user is not MERCHANT or ADMIN.
    """
    conversation = await conv_service.create_merchant_conversation(
        db, merchant_id=current_user.merchant_id, customer_email=current_user.email
    )
    return ConversationResponse.model_validate(conversation)


# ---------------------------------------------------------------------------
# GET /merchant/conversations — list conversations for the merchant
# ---------------------------------------------------------------------------


@router.get(
    "/conversations",
    response_model=list[ConversationResponse],
    summary="List conversations for the authenticated merchant",
)
async def list_merchant_conversations(
    skip: int = 0,
    limit: int = 20,
    status: str | None = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_merchant_user),
) -> list[ConversationResponse]:
    """Return paginated conversations owned by the current merchant.

    Args:
        skip: Number of records to skip (pagination offset).
        limit: Maximum number of records to return (max 100).
        status: Optional status filter — OPEN | ESCALATED | RESOLVED.
        db: Active async database session.
        current_user: Authenticated merchant/admin user from JWT.

    Returns:
        List of ConversationResponse objects ordered by creation time (newest first).
    """
    conversations = await conv_service.list_merchant_conversations(
        db,
        merchant_id=current_user.merchant_id,
        skip=skip,
        limit=min(limit, 100),
        status=status,
    )
    return [ConversationResponse.model_validate(c) for c in conversations]


# ---------------------------------------------------------------------------
# POST /merchant/conversations/{id}/messages — send message, get AI reply
# ---------------------------------------------------------------------------


@router.post(
    "/conversations/{conversation_id}/messages",
    response_model=ChatResponse,
    summary="Send a merchant message and receive an AI response",
)
@limiter.limit("30/minute")
async def send_merchant_message(
    request: Request,
    conversation_id: int,
    payload: ChatRequest,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_merchant_user),
) -> ChatResponse:
    """Submit a merchant message and receive a 2-pass tool-use AI reply.

    The pipeline runs intent classification (Pass 1) followed by LLM response
    generation with RAG + optional tool data injection (Pass 2).

    Args:
        request: FastAPI request (required by slowapi rate-limiter).
        conversation_id: ID of the target conversation.
        payload: Chat request body containing ``text``.
        background_tasks: FastAPI background task runner.
        db: Active async database session.
        current_user: Authenticated merchant/admin user from JWT.

    Returns:
        ChatResponse with the AI message and escalation flag.

    Raises:
        HTTPException 404: If the conversation does not exist or does not
            belong to the merchant.
        HTTPException 400: If the conversation status is not OPEN.
    """
    conversation = await conv_service.get_merchant_conversation(
        db, conversation_id=conversation_id, merchant_id=current_user.merchant_id
    )
    if conversation is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Conversation {conversation_id} not found",
        )

    if conversation.status != "OPEN":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Conversation is {conversation.status}. Cannot send new messages.",
        )

    result = await ai_service.generate_merchant_ai_response(
        db=db,
        conversation_id=conversation_id,
        merchant_id=current_user.merchant_id,
        customer_text=payload.text,
    )

    ai_message_data: dict = result["message"]
    escalated: bool = result.get("escalated", False)
    clarification_state: str | None = result.get("clarification_state")
    quick_options: list[list[str]] | None = result.get("quick_options")

    if escalated:
        background_tasks.add_task(
            notify_escalation,
            conversation_id,
            current_user.email,
            "Merchant chat: AI confidence below threshold or escalation keyword detected",
        )

    message_response = MessageResponse(
        id=ai_message_data["id"],
        conversation_id=ai_message_data.get("conversation_id", conversation_id),
        sender=ai_message_data["sender"],
        text=ai_message_data["text"],
        confidence=ai_message_data.get("confidence"),
        tool_name=ai_message_data.get("tool_name"),
        tool_data=ai_message_data.get("tool_data"),
        created_at=ai_message_data["created_at"],
    )

    return ChatResponse(
        message=message_response,
        escalated=escalated,
        clarification_state=clarification_state,
        quick_options=quick_options,
    )


# ---------------------------------------------------------------------------
# GET /merchant/conversations/{id}/messages — retrieve message history
# ---------------------------------------------------------------------------


@router.get(
    "/conversations/{conversation_id}/messages",
    response_model=list[MessageResponse],
    summary="Retrieve message history for a merchant conversation",
)
async def get_merchant_messages(
    conversation_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_merchant_user),
) -> list[MessageResponse]:
    """Fetch all messages in a merchant conversation in chronological order.

    Args:
        conversation_id: ID of the target conversation.
        db: Active async database session.
        current_user: Authenticated merchant/admin user from JWT.

    Returns:
        List of MessageResponse objects ordered oldest-first.

    Raises:
        HTTPException 404: If the conversation does not exist or does not
            belong to the merchant.
    """
    conversation = await conv_service.get_merchant_conversation(
        db, conversation_id=conversation_id, merchant_id=current_user.merchant_id
    )
    if conversation is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Conversation {conversation_id} not found",
        )

    return [MessageResponse.model_validate(m) for m in conversation.messages]
