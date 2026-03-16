"""Customer chat router — public-facing chat endpoints."""

from fastapi import APIRouter, BackgroundTasks, Depends, Header, HTTPException, Request, status
from slowapi import Limiter
from slowapi.util import get_remote_address
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.schemas.conversation import ConversationCreate, ConversationResponse
from app.schemas.message import ChatRequest, ChatResponse, MessageResponse
from app.services import ai_response as ai_service
from app.services import conversation as conv_service
from app.services.notification import notify_escalation

limiter = Limiter(key_func=get_remote_address)
router = APIRouter(prefix="/chat", tags=["chat"])


@router.post(
    "/conversations",
    response_model=ConversationResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Start a new support conversation",
)
@limiter.limit("10/minute")
async def start_conversation(
    request: Request,
    payload: ConversationCreate,
    db: AsyncSession = Depends(get_db),
) -> ConversationResponse:
    """Create a new conversation with an initial customer message.

    Returns ConversationResponse including access_token for subsequent requests.
    """
    conversation = await conv_service.create_conversation(db, payload)
    return ConversationResponse.model_validate(conversation)


@router.post(
    "/conversations/{conversation_id}/messages",
    response_model=ChatResponse,
    summary="Send a message and receive an AI response",
)
@limiter.limit("20/minute")
async def send_message(
    request: Request,
    conversation_id: int,
    payload: ChatRequest,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db),
    x_conversation_token: str = Header(..., description="Conversation access token"),
) -> ChatResponse:
    """Submit a customer message and receive an AI-generated reply.

    Requires X-Conversation-Token header for customer authentication.
    """
    conversation = await conv_service.get_conversation_by_token(
        db, conversation_id, x_conversation_token
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

    ai_message, escalated = await ai_service.generate_ai_response(
        db, conversation_id, payload.text
    )

    if escalated:
        background_tasks.add_task(
            notify_escalation,
            conversation_id,
            conversation.customer_email,
            "AI confidence below threshold",
        )

    return ChatResponse(
        message=MessageResponse.model_validate(ai_message),
        escalated=escalated,
    )


@router.get(
    "/conversations/{conversation_id}/messages",
    response_model=list[MessageResponse],
    summary="Retrieve message history for a conversation",
)
async def get_messages(
    conversation_id: int,
    db: AsyncSession = Depends(get_db),
    x_conversation_token: str = Header(..., description="Conversation access token"),
) -> list[MessageResponse]:
    """Fetch all messages in a conversation.

    Requires X-Conversation-Token header for customer authentication.
    """
    conversation = await conv_service.get_conversation_by_token(
        db, conversation_id, x_conversation_token
    )
    if conversation is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Conversation {conversation_id} not found",
        )

    return [MessageResponse.model_validate(m) for m in conversation.messages]
