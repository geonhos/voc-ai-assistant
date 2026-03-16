"""ErrorCode ORM model."""

from sqlalchemy import String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import BaseModel


class ErrorCode(BaseModel):
    """Lookup table of PG payment error codes with resolution guidance."""

    __tablename__ = "error_codes"

    code: Mapped[str] = mapped_column(
        String(20), unique=True, index=True, nullable=False
    )
    category: Mapped[str] = mapped_column(String(30), nullable=False)
    description: Mapped[str] = mapped_column(String(500), nullable=False)
    solution: Mapped[str] = mapped_column(Text, nullable=False)
    severity: Mapped[str] = mapped_column(String(20), default="MEDIUM", nullable=False)

    def __repr__(self) -> str:
        return (
            f"<ErrorCode id={self.id} code={self.code} "
            f"category={self.category} severity={self.severity}>"
        )
