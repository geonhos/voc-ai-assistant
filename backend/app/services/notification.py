"""Notification service — Slack webhook integration."""

import logging

import httpx

from app.core.config import settings

logger = logging.getLogger(__name__)


async def send_slack_notification(
    message: str,
    channel: str | None = None,
) -> bool:
    """Send a message to a Slack channel via an incoming webhook.

    Args:
        message: The notification text to post.
        channel: Optional channel override (defaults to webhook's default channel).

    Returns:
        True if the notification was sent successfully, False otherwise.
    """
    if not settings.SLACK_WEBHOOK_URL:
        logger.warning("SLACK_WEBHOOK_URL is not configured — skipping notification.")
        return False

    payload: dict = {"text": message}
    if channel:
        payload["channel"] = channel

    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            response = await client.post(settings.SLACK_WEBHOOK_URL, json=payload)
            response.raise_for_status()
        return True
    except httpx.HTTPError as exc:
        logger.error("Failed to send Slack notification: %s", exc)
        return False


async def notify_escalation(
    conversation_id: int,
    customer_email: str,
    reason: str,
) -> None:
    """Send a Slack alert when a conversation is escalated.

    Args:
        conversation_id: ID of the escalated conversation.
        customer_email: Email of the customer whose conversation was escalated.
        reason: Reason for escalation.
    """
    message = (
        f":rotating_light: *Conversation Escalated*\n"
        f"• Conversation ID: `{conversation_id}`\n"
        f"• Customer: {customer_email}\n"
        f"• Reason: {reason}"
    )
    await send_slack_notification(message)
