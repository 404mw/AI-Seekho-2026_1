# Phase 02 — SQLModel Database Models ✅ DONE

## Status
**Implemented.** All 10 model files exist in `backend/app/models/`. All imported cleanly in `main.py` for `create_all`.

## Goal
Create all 10 SQLModel entity files under `backend/app/models/`. Each file maps 1:1 to a DB table. Source of truth: `docs/db_schema.md`.

## Prerequisite
Phase 01 complete — `backend/app/models/__init__.py` must exist.

## Rules That Apply Here
- **Rule 2**: One file per model — never merge two models into one file.
- **Rule 7**: If any field name, type, or constraint deviates from `docs/db_schema.md` during implementation (e.g., a SQLModel limitation requires a change), update `docs/db_schema.md` immediately to reflect the actual implementation.

## Table Name Convention
Use explicit `__tablename__` with underscores for all multi-word models. Single-word models use the default (SQLModel lowercases the class name).

| Class | `__tablename__` |
|---|---|
| `User` | `user` (default) |
| `Provider` | `provider` (default) |
| `ServiceCategory` | `service_category` |
| `ProviderOffering` | `provider_offering` |
| `ProviderSchedule` | `provider_schedule` |
| `ProviderTimeOff` | `provider_time_off` |
| `ServiceRequest` | `service_request` |
| `AgentTrace` | `agent_trace` |
| `Booking` | `booking` (default) |
| `Review` | `review` (default) |

---

## `backend/app/models/user.py`

```python
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
```

---

## `backend/app/models/provider.py`

```python
from __future__ import annotations

import uuid
from datetime import datetime
from typing import Optional

from sqlmodel import Field, SQLModel


class Provider(SQLModel, table=True):
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    business_name: str
    contact_person: str
    email: str = Field(unique=True, index=True)
    phone_number: Optional[str] = None
    address_line1: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    postal_code: Optional[str] = None
    geo_location: Optional[str] = None  # "lat,lng" string
    service_radius_km: float = Field(default=5.0)
    rating: float = Field(default=0.0)
    is_active: bool = Field(default=True)
    created_at: datetime = Field(default_factory=datetime.utcnow)
```

---

## `backend/app/models/service_category.py`

```python
from __future__ import annotations

import uuid
from typing import Optional

from sqlmodel import Field, SQLModel


class ServiceCategory(SQLModel, table=True):
    __tablename__ = "service_category"

    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    name: str = Field(unique=True, index=True)
    description: Optional[str] = None
```

---

## `backend/app/models/provider_offering.py`

```python
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
```

---

## `backend/app/models/provider_schedule.py`

```python
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
```

---

## `backend/app/models/provider_time_off.py`

```python
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
```

---

## `backend/app/models/service_request.py`

```python
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
```

---

## `backend/app/models/agent_trace.py`

```python
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
```

---

## `backend/app/models/booking.py`

```python
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
```

---

## `backend/app/models/review.py`

```python
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
```

---

## Verification

```bash
cd backend
uv run python -c "
from app.models.user import User
from app.models.provider import Provider
from app.models.service_category import ServiceCategory
from app.models.provider_offering import ProviderOffering
from app.models.provider_schedule import ProviderSchedule
from app.models.provider_time_off import ProviderTimeOff
from app.models.service_request import ServiceRequest
from app.models.agent_trace import AgentTrace
from app.models.booking import Booking
from app.models.review import Review
print('all models import OK')
"
```

## Done When
- All 10 model files exist and import without error
- `JSONB` column on `AgentTrace` is present (no plain `dict` field)
- Explicit `__tablename__` set for all multi-word models
