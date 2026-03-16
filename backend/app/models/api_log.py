"""ApiLog ORM model."""

from typing import TYPE_CHECKING, Optional

from sqlalchemy import ForeignKey, Integer, String
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import BaseModel

if TYPE_CHECKING:
    from app.models.merchant import Merchant


class ApiLog(BaseModel):
    """Records each API request made by or on behalf of a merchant."""

    __tablename__ = "api_logs"

    merchant_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("merchants.id"), index=True, nullable=False
    )
    endpoint: Mapped[str] = mapped_column(String(200), nullable=False)
    method: Mapped[str] = mapped_column(String(10), nullable=False)
    status_code: Mapped[int] = mapped_column(Integer, nullable=False)
    error_code: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)
    error_message: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    latency_ms: Mapped[int] = mapped_column(Integer, nullable=False)
    request_body: Mapped[Optional[dict]] = mapped_column(JSONB, nullable=True)
    response_body: Mapped[Optional[dict]] = mapped_column(JSONB, nullable=True)

    merchant: Mapped["Merchant"] = relationship(
        "Merchant",
        back_populates="api_logs",
    )

    def __repr__(self) -> str:
        return (
            f"<ApiLog id={self.id} merchant_id={self.merchant_id} "
            f"endpoint={self.endpoint} status_code={self.status_code}>"
        )
