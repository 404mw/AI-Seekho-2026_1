from __future__ import annotations

import uuid
from datetime import datetime
from typing import Optional

from sqlmodel import Field, SQLModel


class ProviderTimeOff(SQLModel, table=True):
    __tablename__ = "provider_time_off"

    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    provider_id: uuid.UUID = Field(foreign_key="provider.id", index=True)
    start_datetime: datetime
    end_datetime: datetime
    reason: Optional[str] = None
