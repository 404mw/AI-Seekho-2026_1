from __future__ import annotations

import uuid
from datetime import datetime

from sqlmodel import Field, SQLModel


class ServiceRequest(SQLModel, table=True):
    __tablename__ = "service_request"

    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    user_id: uuid.UUID = Field(foreign_key="user.id", index=True)
    raw_natural_language_prompt: str
    current_agent_stage: str = Field(default="pending")
    status: str = Field(default="pending")
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
