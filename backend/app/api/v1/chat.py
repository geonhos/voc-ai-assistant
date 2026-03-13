"""Customer chat router — public-facing chat endpoints."""

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.schemas.conversation import ConversationCreate, ConversationResponse
from app.schemas.message import ChatRequest, ChatResponse, MessageResponse
from app.services import ai_response as ai_service
from app.services import conversation as conv_service
from app.services.notification import notify_escalation

router = APIRouter(prefix="/chat", tags=["chat"])


@router.post(
    "/conversations",
    response_model=ConversationResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Start a new support conversation",
)
async def start_conversation(
    payload: ConversationCreate,
    db: AsyncSession = Depends(get_db),
) -> ConversationResponse:
    """Create a new conversation with an initial customer message.

    Args:
        payload: Customer details and the first message.
        db: Active async database session.

    Returns:
        The newly created Conversation.
    """
    conversation = await conv_service.create_conversation(db, payload)
    return ConversationResponse.model_validate(conversation)


@router.post(
    "/conversations/{conversation_id}/messages",
    response_model=ChatResponse,
    summary="Send a message and receive an AI response",
)
async def send_message(
    conversation_id: int,
    payload: ChatRequest,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db),
) -> ChatResponse:
    """Submit a customer message and receive an AI-generated reply.

    Args:
        conversation_id: ID of the active conversation.
        payload: Contains the customer's message text.
        background_tasks: FastAPI background task runner.
        db: Active async database session.

    Returns:
        ChatResponse with the AI message and an escalation flag.

    Raises:
        HTTPException 404: If the conversation does not exist.
    """
    conversation = await conv_service.get_conversation(db, conversation_id)
    if conversation is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Conversation {conversation_id} not found",
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
) -> list[MessageResponse]:
    """Fetch all messages in a conversation.

    Args:
        conversation_id: ID of the conversation.
        db: Active async database session.

    Returns:
        Ordered list of messages.

    Raises:
        HTTPException 404: If the conversation does not exist.
    """
    conversation = await conv_service.get_conversation(db, conversation_id)
    if conversation is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Conversation {conversation_id} not found",
        )

    return [MessageResponse.model_validate(m) for m in conversation.messages]
