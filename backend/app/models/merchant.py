"""Merchant ORM model."""

from typing import TYPE_CHECKING, List, Optional

from sqlalchemy import String
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import BaseModel

if TYPE_CHECKING:
    from app.models.api_log import ApiLog
    from app.models.settlement import Settlement
    from app.models.transaction import Transaction


class Merchant(BaseModel):
    """Represents a PG payment merchant (가맹점)."""

    __tablename__ = "merchants"

    mid: Mapped[str] = mapped_column(
        String(50), unique=True, index=True, nullable=False
    )
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    business_number: Mapped[str] = mapped_column(String(20), nullable=False)
    status: Mapped[str] = mapped_column(String(20), default="ACTIVE", nullable=False)
    settings: Mapped[Optional[dict]] = mapped_column(JSONB, nullable=True)

    transactions: Mapped[List["Transaction"]] = relationship(
        "Transaction",
        back_populates="merchant",
        cascade="all, delete-orphan",
        lazy="select",
    )
    settlements: Mapped[List["Settlement"]] = relationship(
        "Settlement",
        back_populates="merchant",
        cascade="all, delete-orphan",
        lazy="select",
    )
    api_logs: Mapped[List["ApiLog"]] = relationship(
        "ApiLog",
        back_populates="merchant",
        cascade="all, delete-orphan",
        lazy="select",
    )

    def __repr__(self) -> str:
        return f"<Merchant id={self.id} mid={self.mid} name={self.name} status={self.status}>"
