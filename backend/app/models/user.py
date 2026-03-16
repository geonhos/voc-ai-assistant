"""User ORM model."""

from typing import Optional

from sqlalchemy import ForeignKey, String
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import BaseModel


class User(BaseModel):
    """Represents an authenticated user (admin or merchant account).

    Roles:
        ADMIN    — full platform access.
        MERCHANT — scoped to a single merchant via merchant_id.
    """

    __tablename__ = "users"

    email: Mapped[str] = mapped_column(
        String(255), unique=True, index=True, nullable=False
    )
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    role: Mapped[str] = mapped_column(String(20), default="ADMIN", nullable=False)
    merchant_id: Mapped[Optional[int]] = mapped_column(
        ForeignKey("merchants.id"), nullable=True, index=True
    )

    def __repr__(self) -> str:
        return (
            f"<User id={self.id} email={self.email} role={self.role} "
            f"merchant_id={self.merchant_id}>"
        )
