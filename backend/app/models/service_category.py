from __future__ import annotations

import uuid
from typing import Optional

from sqlmodel import Field, SQLModel


class ServiceCategory(SQLModel, table=True):
    __tablename__ = "service_category"

    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    name: str = Field(unique=True, index=True)
    description: Optional[str] = None
