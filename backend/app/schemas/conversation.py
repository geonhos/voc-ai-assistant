"""Pydantic schemas for conversation-related endpoints."""

from __future__ import annotations

from datetime import datetime
from typing import Literal, Optional

from pydantic import BaseModel, EmailStr, Field


ConversationStatus = Literal["OPEN", "ESCALATED", "RESOLVED"]


class ConversationCreate(BaseModel):
    """Payload to create a new conversation — only initial message required."""

    initial_message: str = Field(..., max_length=2000)


class ContactInfoUpdate(BaseModel):
    """Payload to update customer contact info (on escalation)."""

    customer_name: str
    customer_email: EmailStr
    customer_phone: str = ""


class ConversationResponse(BaseModel):
    """Serialized conversation returned by the API."""

    id: int
    access_token: str
    merchant_id: Optional[int] = None
    customer_name: str
    customer_email: str
    customer_phone: str
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
