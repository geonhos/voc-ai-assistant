"""Pydantic schemas for admin dashboard statistics."""

from pydantic import BaseModel


class DashboardStats(BaseModel):
    """Aggregate statistics displayed on the admin dashboard."""

    total_conversations: int
    open_conversations: int
    escalated_conversations: int
    resolved_conversations: int
    avg_resolution_time_hours: float | None
    total_knowledge_articles: int
    active_knowledge_articles: int
