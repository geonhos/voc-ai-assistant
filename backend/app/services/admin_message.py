"""Admin message service — allows admins to post messages into a conversation."""

import logging

from sqlalchemy.ext.asyncio import AsyncSession

from app.models.message import Message

logger = logging.getLogger(__name__)


async def send_admin_message(
    db: AsyncSession,
    conversation_id: int,
    admin_id: int,
    text: str,
) -> Message:
    """Persist a message sent by an admin into an existing conversation.

    Args:
        db: Active async database session.  The caller is responsible for
            committing or rolling back the surrounding transaction.
        conversation_id: Primary key of the target conversation.
        admin_id: Primary key of the admin user sending the message.
            Stored for audit purposes; not exposed on the Message model
            directly — the ``sender`` field is set to ``"ADMIN"`` instead.
        text: Message body supplied by the admin.

    Returns:
        The newly created and flushed :class:`~app.models.message.Message`
        instance.
    """
    message = Message(
        conversation_id=conversation_id,
        sender="ADMIN",
        text=text,
    )
    db.add(message)
    await db.flush()
    logger.info(
        "Admin %d sent message to conversation %d (message_id=%s)",
        admin_id,
        conversation_id,
        message.id,
    )
    return message
