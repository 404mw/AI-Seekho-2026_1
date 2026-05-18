from __future__ import annotations

import uuid
from datetime import time

from sqlmodel import Field, SQLModel


class ProviderSchedule(SQLModel, table=True):
    __tablename__ = "provider_schedule"

    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    provider_id: uuid.UUID = Field(foreign_key="provider.id", index=True)
    day_of_week: int  # 0 = Monday … 6 = Sunday
    start_time: time
    end_time: time
    is_active: bool = Field(default=True)
