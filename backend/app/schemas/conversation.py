"""Pydantic schemas for conversation-related endpoints."""

from datetime import datetime
from typing import Literal

from pydantic import BaseModel, EmailStr


ConversationStatus = Literal["OPEN", "ESCALATED", "RESOLVED"]


class ConversationCreate(BaseModel):
    """Payload to create a new conversation (customer-initiated)."""

    customer_name: str
    customer_email: EmailStr
    initial_message: str


class ConversationResponse(BaseModel):
    """Serialized conversation returned by the API."""

    id: int
    customer_name: str
    customer_email: str
    status: str
    topic: str | None
    resolved_at: datetime | None
    created_at: datetime
    updated_at: datetime | None

    model_config = {"from_attributes": True}


class ConversationListResponse(BaseModel):
    """Paginated list of conversations."""

    items: list[ConversationResponse]
    total: int
    skip: int
    limit: int


class ConversationStatusUpdate(BaseModel):
    """Payload for updating conversation status (admin)."""

    status: ConversationStatus
