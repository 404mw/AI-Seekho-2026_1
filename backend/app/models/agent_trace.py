from __future__ import annotations

import uuid
from datetime import datetime
from typing import Any, Optional

from sqlalchemy import Column
from sqlalchemy.dialects.postgresql import JSONB
from sqlmodel import Field, SQLModel


class AgentTrace(SQLModel, table=True):
    __tablename__ = "agent_trace"

    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    service_request_id: uuid.UUID = Field(foreign_key="service_request.id", index=True)
    agent_name: str
    status: str
    structured_output: Optional[Any] = Field(default=None, sa_column=Column(JSONB))
    reasoning_log: Optional[str] = None
    execution_time_ms: Optional[int] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)
