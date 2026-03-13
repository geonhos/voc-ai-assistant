"""Admin router — conversation management and dashboard statistics."""

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.deps import require_admin
from app.models.conversation import Conversation
from app.models.knowledge import KnowledgeArticle
from app.models.user import User
from app.schemas.conversation import (
    ConversationListResponse,
    ConversationResponse,
    ConversationStatusUpdate,
)
from app.schemas.dashboard import DashboardStats
from app.services import conversation as conv_service

router = APIRouter(prefix="/admin", tags=["admin"])


@router.get(
    "/conversations",
    response_model=ConversationListResponse,
    summary="List all conversations (paginated)",
)
async def list_conversations(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    status_filter: str | None = Query(None, alias="status"),
    db: AsyncSession = Depends(get_db),
    _admin: User = Depends(require_admin),
) -> ConversationListResponse:
    """Return a paginated list of all conversations.

    Args:
        skip: Number of records to skip for pagination.
        limit: Maximum number of records to return.
        status_filter: Optional filter by conversation status.
        db: Active async database session.
        _admin: Authenticated admin user (authorization guard).

    Returns:
        Paginated ConversationListResponse.
    """
    conversations, total = await conv_service.list_conversations(
        db, skip=skip, limit=limit, status=status_filter
    )
    return ConversationListResponse(
        items=[ConversationResponse.model_validate(c) for c in conversations],
        total=total,
        skip=skip,
        limit=limit,
    )


@router.get(
    "/conversations/{conversation_id}",
    response_model=ConversationResponse,
    summary="Get a single conversation by ID",
)
async def get_conversation(
    conversation_id: int,
    db: AsyncSession = Depends(get_db),
    _admin: User = Depends(require_admin),
) -> ConversationResponse:
    """Fetch a conversation by its ID.

    Args:
        conversation_id: Primary key of the conversation.
        db: Active async database session.
        _admin: Authenticated admin user.

    Returns:
        ConversationResponse.

    Raises:
        HTTPException 404: If the conversation does not exist.
    """
    conversation = await conv_service.get_conversation(db, conversation_id)
    if conversation is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Conversation {conversation_id} not found",
        )
    return ConversationResponse.model_validate(conversation)


@router.patch(
    "/conversations/{conversation_id}/status",
    response_model=ConversationResponse,
    summary="Update conversation status",
)
async def update_conversation_status(
    conversation_id: int,
    payload: ConversationStatusUpdate,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(require_admin),
) -> ConversationResponse:
    """Change the status of a conversation.

    Args:
        conversation_id: Primary key of the conversation.
        payload: New status value.
        db: Active async database session.
        admin: Authenticated admin user (used as resolver when status=RESOLVED).

    Returns:
        Updated ConversationResponse.

    Raises:
        HTTPException 404: If the conversation does not exist.
    """
    conversation = await conv_service.update_conversation_status(
        db,
        conversation_id,
        payload.status,
        resolved_by=admin.id if payload.status == "RESOLVED" else None,
    )
    if conversation is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Conversation {conversation_id} not found",
        )
    return ConversationResponse.model_validate(conversation)


@router.get(
    "/dashboard/stats",
    response_model=DashboardStats,
    summary="Get aggregate dashboard statistics",
)
async def get_dashboard_stats(
    db: AsyncSession = Depends(get_db),
    _admin: User = Depends(require_admin),
) -> DashboardStats:
    """Return aggregate statistics for the admin dashboard.

    Args:
        db: Active async database session.
        _admin: Authenticated admin user.

    Returns:
        DashboardStats with counts and averages.
    """
    conv_counts = await db.execute(
        select(
            func.count(Conversation.id).label("total"),
            func.count(Conversation.id)
            .filter(Conversation.status == "OPEN")
            .label("open"),
            func.count(Conversation.id)
            .filter(Conversation.status == "ESCALATED")
            .label("escalated"),
            func.count(Conversation.id)
            .filter(Conversation.status == "RESOLVED")
            .label("resolved"),
        )
    )
    row = conv_counts.one()

    knowledge_counts = await db.execute(
        select(
            func.count(KnowledgeArticle.id).label("total"),
            func.count(KnowledgeArticle.id)
            .filter(KnowledgeArticle.active.is_(True))
            .label("active"),
        )
    )
    kb_row = knowledge_counts.one()

    return DashboardStats(
        total_conversations=row.total,
        open_conversations=row.open,
        escalated_conversations=row.escalated,
        resolved_conversations=row.resolved,
        avg_resolution_time_hours=None,  # Phase 2: compute from resolved_at - created_at
        total_knowledge_articles=kb_row.total,
        active_knowledge_articles=kb_row.active,
    )
