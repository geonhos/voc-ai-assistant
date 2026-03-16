"""Message ORM model."""

from typing import TYPE_CHECKING, Optional

from sqlalchemy import Float, ForeignKey, Integer, String, Text
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import BaseModel

if TYPE_CHECKING:
    from app.models.conversation import Conversation


class Message(BaseModel):
    """A single message within a Conversation."""

    __tablename__ = "messages"

    conversation_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("conversations.id"), index=True, nullable=False
    )
    sender: Mapped[str] = mapped_column(String(20), nullable=False)
    text: Mapped[str] = mapped_column(Text, nullable=False)
    confidence: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    # Tool-use pipeline fields (Phase 2)
    tool_name: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    tool_data: Mapped[Optional[dict]] = mapped_column(JSONB, nullable=True)

    conversation: Mapped["Conversation"] = relationship(
        "Conversation",
        back_populates="messages",
    )

    def __repr__(self) -> str:
        return f"<Message id={self.id} sender={self.sender} conv={self.conversation_id}>"
