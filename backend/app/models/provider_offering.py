from __future__ import annotations

import uuid

from sqlmodel import Field, SQLModel


class ProviderOffering(SQLModel, table=True):
    __tablename__ = "provider_offering"

    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    provider_id: uuid.UUID = Field(foreign_key="provider.id", index=True)
    category_id: uuid.UUID = Field(foreign_key="service_category.id")
    variant_name: str
    base_price: float
    hourly_rate: float
