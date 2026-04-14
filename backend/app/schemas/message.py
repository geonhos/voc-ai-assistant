"""Pydantic schemas for message-related endpoints."""

from __future__ import annotations

from datetime import datetime
from typing import Literal, Optional

from pydantic import BaseModel, Field


MessageSender = Literal["AI", "CUSTOMER", "ADMIN", "SYSTEM"]


class MessageCreate(BaseModel):
    """Payload to send a message within an existing conversation."""

    text: str = Field(..., max_length=2000)


class MessageResponse(BaseModel):
    """Serialized message returned by the API."""

    id: int
    conversation_id: int
    sender: str
    text: str
    confidence: float | None
    tool_name: Optional[str] = None
    tool_data: Optional[dict] = None
    created_at: datetime

    model_config = {"from_attributes": True}


class ChatRequest(BaseModel):
    """Customer chat request for the public chat endpoint."""

    text: str = Field(..., max_length=2000)


class ChatResponse(BaseModel):
    """AI or system response to a customer message."""

    message: MessageResponse
    escalated: bool = False
    clarification_state: Optional[str] = None  # IDLE, GATHERING_INFO, ANALYZING, ANSWERING
    quick_options: Optional[list[list[str]]] = None  # Quick-select buttons
