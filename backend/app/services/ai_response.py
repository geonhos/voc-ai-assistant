"""AI response generation service — Phase 2 implementation placeholder."""

from sqlalchemy.ext.asyncio import AsyncSession

from app.models.message import Message


async def generate_ai_response(
    db: AsyncSession,
    conversation_id: int,
    customer_text: str,
) -> tuple[Message, bool]:
    """Generate an AI response to a customer message.

    This is a Phase 2 stub. Currently returns a static acknowledgment.
    Phase 2 will integrate LangChain + RAG pipeline.

    Args:
        db: Active async database session.
        conversation_id: The conversation this message belongs to.
        customer_text: The customer's message text.

    Returns:
        Tuple of (AI Message instance, escalated flag).
    """
    # Phase 2: Replace with LangChain RAG pipeline
    ai_text = (
        "Thank you for reaching out. Our team is reviewing your request. "
        "A detailed AI-powered response will be available in Phase 2."
    )
    message = Message(
        conversation_id=conversation_id,
        sender="AI",
        text=ai_text,
        confidence=None,
    )
    db.add(message)
    await db.flush()

    return message, False
