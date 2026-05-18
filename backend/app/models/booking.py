from __future__ import annotations

import uuid
from datetime import datetime
from typing import Optional

from sqlmodel import Field, SQLModel


class Booking(SQLModel, table=True):
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    user_id: uuid.UUID = Field(foreign_key="user.id", index=True)
    provider_id: uuid.UUID = Field(foreign_key="provider.id", index=True)
    service_request_id: uuid.UUID = Field(foreign_key="service_request.id")
    provider_offering_id: uuid.UUID = Field(foreign_key="provider_offering.id")
    scheduled_start_time: datetime
    scheduled_end_time: datetime
    estimated_cost: float
    final_cost: Optional[float] = None
    payment_status: str = Field(default="Pending")
    payment_intent_id: Optional[str] = None
    status: str = Field(default="Pending")
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
