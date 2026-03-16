"""Transaction ORM model."""

from datetime import datetime
from typing import TYPE_CHECKING, Optional

from sqlalchemy import DateTime, ForeignKey, Integer, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import BaseModel

if TYPE_CHECKING:
    from app.models.merchant import Merchant


class Transaction(BaseModel):
    """Represents a single payment transaction processed by a merchant."""

    __tablename__ = "transactions"

    tid: Mapped[str] = mapped_column(
        String(50), unique=True, index=True, nullable=False
    )
    merchant_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("merchants.id"), index=True, nullable=False
    )
    amount: Mapped[int] = mapped_column(Integer, nullable=False)
    payment_method: Mapped[str] = mapped_column(String(30), nullable=False)
    card_company: Mapped[Optional[str]] = mapped_column(String(30), nullable=True)
    card_number_masked: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)
    status: Mapped[str] = mapped_column(String(20), nullable=False)
    error_code: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)
    error_message: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    customer_name: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    order_id: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    approved_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    cancelled_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True), nullable=True
    )

    merchant: Mapped["Merchant"] = relationship(
        "Merchant",
        back_populates="transactions",
    )

    def __repr__(self) -> str:
        return (
            f"<Transaction id={self.id} tid={self.tid} "
            f"amount={self.amount} status={self.status}>"
        )
