from __future__ import annotations

import uuid
from datetime import datetime
from typing import Optional

from sqlmodel import Field, SQLModel


class User(SQLModel, table=True):
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    full_name: str
    email: str = Field(unique=True, index=True)
    phone_number: Optional[str] = None
    address_line1: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    postal_code: Optional[str] = None
    geo_location: Optional[str] = None  # "lat,lng" string
    is_active: bool = Field(default=True)
    created_at: datetime = Field(default_factory=datetime.utcnow)
