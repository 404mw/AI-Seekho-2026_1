from __future__ import annotations

import uuid
from datetime import datetime
from typing import Optional

from sqlmodel import Field, SQLModel


class Review(SQLModel, table=True):
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    booking_id: uuid.UUID = Field(foreign_key="booking.id")
    user_id: uuid.UUID = Field(foreign_key="user.id", index=True)
    provider_id: uuid.UUID = Field(foreign_key="provider.id", index=True)
    rating_score: int  # 1–5
    comment: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)
