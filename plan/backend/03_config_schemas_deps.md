# Phase 03 — Config, Schemas, and API Dependencies ✅ DONE

## Status
**Implemented.** `config.py` uses the correct `SettingsConfigDict` pattern. `schemas/request.py`, `schemas/response.py`, and `api/dependencies.py` all exist.

## Goal
Create the three foundational modules that everything else imports: `config.py` (settings), `schemas/` (request/response types), and `api/dependencies.py` (auth + DB injection).

## Prerequisite
Phase 01 complete.

---

## `backend/app/config.py`

Loads all secrets from `.env` via `pydantic-settings`. Also reads `config.json` for non-secret runtime config.

```python
from __future__ import annotations

import json
from pathlib import Path
from typing import Any

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8")

    database_url: str
    supabase_url: str
    supabase_jwt_secret: str
    gemini_api_key: str
    google_maps_api_key: str


settings = Settings()

# Non-secret runtime config from config.json
_config_path = Path(__file__).parent.parent / "config.json"
runtime_config: dict[str, Any] = json.loads(_config_path.read_text()) if _config_path.exists() else {}
```

**Usage elsewhere:**
```python
from app.config import settings, runtime_config

db_url = settings.database_url
weights = runtime_config.get("scoring_weights", {})
```

---

## `backend/app/schemas/response.py`

Standard response envelope returned by every endpoint.

```python
from __future__ import annotations

from typing import Any, Optional

from pydantic import BaseModel


class ErrorDetail(BaseModel):
    code: str
    detail: str


class APIResponse(BaseModel):
    data: Any = None
    message: str = "Success"
    error: Optional[ErrorDetail] = None
```

---

## `backend/app/schemas/request.py`

Pydantic request body schemas for all endpoints. Grouped by resource.

```python
from __future__ import annotations

import uuid
from datetime import datetime
from typing import Optional

from pydantic import BaseModel


# ── Users ───────────────────────────────────────────────────────────────────

class UserSyncRequest(BaseModel):
    full_name: Optional[str] = None
    phone_number: Optional[str] = None
    address_line1: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    postal_code: Optional[str] = None
    geo_location: Optional[str] = None  # "lat,lng"


class UserUpdateRequest(BaseModel):
    full_name: Optional[str] = None
    phone_number: Optional[str] = None
    address_line1: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    postal_code: Optional[str] = None
    geo_location: Optional[str] = None


# ── Providers ────────────────────────────────────────────────────────────────

class ProviderSyncRequest(BaseModel):
    business_name: Optional[str] = None
    contact_person: Optional[str] = None
    phone_number: Optional[str] = None
    address_line1: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    postal_code: Optional[str] = None
    geo_location: Optional[str] = None
    service_radius_km: Optional[float] = None


class ProviderUpdateRequest(ProviderSyncRequest):
    pass


class OfferingCreateRequest(BaseModel):
    category_id: uuid.UUID
    variant_name: str
    base_price: float
    hourly_rate: float


class OfferingUpdateRequest(BaseModel):
    variant_name: Optional[str] = None
    base_price: Optional[float] = None
    hourly_rate: Optional[float] = None


class ScheduleSlot(BaseModel):
    day_of_week: int  # 0–6
    start_time: str   # "HH:MM"
    end_time: str     # "HH:MM"
    is_active: bool


class ScheduleUpdateRequest(BaseModel):
    schedule: list[ScheduleSlot]


class TimeOffCreateRequest(BaseModel):
    start_datetime: datetime
    end_datetime: datetime
    reason: Optional[str] = None


# ── Service Requests ─────────────────────────────────────────────────────────

class ServiceRequestCreate(BaseModel):
    prompt: str


# ── Bookings ─────────────────────────────────────────────────────────────────

class BookingStatusUpdate(BaseModel):
    status: str  # "Confirmed" | "Completed"


# ── Reviews ──────────────────────────────────────────────────────────────────

class ReviewCreate(BaseModel):
    rating_score: int   # 1–5
    comment: Optional[str] = None
```

---

## `backend/app/api/dependencies.py`

Two FastAPI dependencies used by every protected route.

```python
from __future__ import annotations

from typing import Generator

import jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlmodel import Session, create_engine

from app.config import settings

engine = create_engine(settings.database_url, echo=False)

_bearer = HTTPBearer()


def get_db_session() -> Generator[Session, None, None]:
    """Yields a SQLModel session. Use as a FastAPI dependency."""
    with Session(engine) as session:
        yield session


def verify_supabase_token(
    credentials: HTTPAuthorizationCredentials = Depends(_bearer),
) -> dict:
    """
    Validates the Supabase JWT and returns the decoded payload.
    The 'sub' field is the Supabase auth.users.id (the user/provider UUID).
    """
    try:
        payload = jwt.decode(
            credentials.credentials,
            settings.supabase_jwt_secret,
            algorithms=["HS256"],
            options={"verify_aud": False},
        )
        return payload
    except jwt.ExpiredSignatureError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token has expired.",
        )
    except jwt.InvalidTokenError as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Invalid token: {exc}",
        )
```

**Note:** `PyJWT` must be added to `pyproject.toml` if not already present:
```bash
cd backend && uv add PyJWT
```

---

## Verification

```bash
cd backend

# Config loads
uv run python -c "from app.config import settings, runtime_config; print(settings.database_url); print(runtime_config)"

# Schemas import
uv run python -c "from app.schemas.response import APIResponse; from app.schemas.request import ServiceRequestCreate; print('ok')"

# Dependencies import (will fail if DB is not up, but import should succeed)
uv run python -c "from app.api.dependencies import get_db_session, verify_supabase_token; print('ok')"
```

## Done When
- `app/config.py` loads `Settings` from `.env` and `runtime_config` from `config.json`
- `app/schemas/response.py` exports `APIResponse` and `ErrorDetail`
- `app/schemas/request.py` exports all request body classes
- `app/api/dependencies.py` exports `get_db_session` and `verify_supabase_token`
- `PyJWT` is in `pyproject.toml` (added via `uv add PyJWT`)
