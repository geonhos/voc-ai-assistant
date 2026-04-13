"""Conversation ORM model."""

import uuid
from datetime import datetime
from typing import TYPE_CHECKING, List, Optional

from sqlalchemy import DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import BaseModel

if TYPE_CHECKING:
    from app.models.escalation import EscalationEvent
    from app.models.message import Message


class Conversation(BaseModel):
    """Represents a support conversation thread initiated by a customer."""

    __tablename__ = "conversations"

    access_token: Mapped[str] = mapped_column(
        String(36), default=lambda: str(uuid.uuid4()), unique=True, nullable=False
    )
    customer_name: Mapped[str] = mapped_column(String(100), default="", nullable=False)
    customer_email: Mapped[str] = mapped_column(String(255), default="", nullable=False)
    customer_phone: Mapped[str] = mapped_column(String(20), default="", nullable=False)
    status: Mapped[str] = mapped_column(String(20), default="OPEN", nullable=False, index=True)
    topic: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    resolved_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    resolved_by: Mapped[Optional[int]] = mapped_column(
        Integer, ForeignKey("users.id"), nullable=True
    )
    merchant_id: Mapped[Optional[int]] = mapped_column(
        Integer, ForeignKey("merchants.id"), nullable=True, index=True
    )
    customer_user_id: Mapped[Optional[int]] = mapped_column(
        Integer, ForeignKey("users.id"), nullable=True, index=True
    )
    clarification_state: Mapped[Optional[dict]] = mapped_column(
        JSONB, nullable=True
    )

    messages: Mapped[List["Message"]] = relationship(
        "Message",
        back_populates="conversation",
        cascade="all, delete-orphan",
        lazy="select",
    )
    escalation_events: Mapped[List["EscalationEvent"]] = relationship(
        "EscalationEvent",
        back_populates="conversation",
        cascade="all, delete-orphan",
        lazy="select",
    )

    def __repr__(self) -> str:
        return (
            f"<Conversation id={self.id} customer={self.customer_email} "
            f"status={self.status}>"
        )
