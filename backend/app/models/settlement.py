"""Settlement ORM model."""

from datetime import date, datetime
from typing import TYPE_CHECKING, Optional

from sqlalchemy import Date, DateTime, ForeignKey, Index, Integer, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import BaseModel

if TYPE_CHECKING:
    from app.models.merchant import Merchant


class Settlement(BaseModel):
    """Represents a daily settlement record for a merchant."""

    __tablename__ = "settlements"
    __table_args__ = (
        Index("ix_settlements_merchant_id_settlement_date", "merchant_id", "settlement_date"),
    )

    merchant_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("merchants.id"), index=True, nullable=False
    )
    settlement_date: Mapped[date] = mapped_column(Date, nullable=False)
    total_amount: Mapped[int] = mapped_column(Integer, nullable=False)
    fee_amount: Mapped[int] = mapped_column(Integer, nullable=False)
    net_amount: Mapped[int] = mapped_column(Integer, nullable=False)
    transaction_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    status: Mapped[str] = mapped_column(String(20), default="PENDING", nullable=False)
    completed_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True), nullable=True
    )

    merchant: Mapped["Merchant"] = relationship(
        "Merchant",
        back_populates="settlements",
    )

    def __repr__(self) -> str:
        return (
            f"<Settlement id={self.id} merchant_id={self.merchant_id} "
            f"date={self.settlement_date} net={self.net_amount} status={self.status}>"
        )
