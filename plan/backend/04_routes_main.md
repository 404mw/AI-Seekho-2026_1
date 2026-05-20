# Phase 04 — API Routes and main.py ✅ DONE

## Status
**Implemented.** All 6 route files and `main.py` exist. All model imports for `create_all` are in `main.py`. All routers registered under `/api/v1`.

**Pending (Rule 3):** `tests/test_api/` only has `__init__.py` — test files must be written in Phase 07.
**Pending (Rule 7):** Confirm `docs/api_endpoints.md` reflects implemented routes after Phase 07.

## Goal
Implement all 6 FastAPI route files and the `main.py` app entry point. Every endpoint listed in `docs/api_endpoints.md` must be represented — fully implemented or with a clear `TODO`.

## Rules That Apply Here
- **Rule 3**: A route file is NOT done until `tests/test_api/test_<resource>.py` exists and passes.
- **Rule 5**: Use the `/add-endpoint` skill for each route file — it scaffolds the route, wires auth, applies `APIResponse`, and auto-updates `docs/api_endpoints.md` in one step.
- **Rule 7**: After implementing any route, confirm `docs/api_endpoints.md` reflects the implementation. The `/add-endpoint` skill does this automatically — if writing manually, update the doc explicitly.

## Prerequisites
- Phase 02 (models) complete
- Phase 03 (config, schemas, dependencies) complete

---

## `backend/app/main.py`

```python
from __future__ import annotations

from fastapi import FastAPI
from sqlmodel import SQLModel

from app.api.dependencies import engine
from app.api.routes import (
    bookings,
    catalog,
    providers,
    requests,
    reviews,
    users,
)

app = FastAPI(
    title="AI-Seekho API",
    description="Agentic service marketplace powered by Google Antigravity",
    version="1.0.0",
)


@app.on_event("startup")
def create_tables() -> None:
    SQLModel.metadata.create_all(engine)


# Router registration — all under /api/v1
app.include_router(users.router, prefix="/api/v1")
app.include_router(providers.router, prefix="/api/v1")
app.include_router(requests.router, prefix="/api/v1")
app.include_router(bookings.router, prefix="/api/v1")
app.include_router(reviews.router, prefix="/api/v1")
app.include_router(catalog.router, prefix="/api/v1")


@app.get("/health")
def health() -> dict:
    return {"status": "ok"}
```

**Important:** `create_tables()` uses SQLModel's `metadata.create_all()`. All model files must be imported somewhere before `main.py` runs so SQLModel knows about all tables. Add imports at the top of `main.py` after confirming all models are in place:

```python
# Force model registration with SQLModel metadata
import app.models.user  # noqa: F401
import app.models.provider  # noqa: F401
import app.models.service_category  # noqa: F401
import app.models.provider_offering  # noqa: F401
import app.models.provider_schedule  # noqa: F401
import app.models.provider_time_off  # noqa: F401
import app.models.service_request  # noqa: F401
import app.models.agent_trace  # noqa: F401
import app.models.booking  # noqa: F401
import app.models.review  # noqa: F401
```

---

## Route File Pattern

Every route file follows this structure:

```python
from __future__ import annotations
from typing import Annotated
from fastapi import APIRouter, Depends, HTTPException, status
from sqlmodel import Session
from app.api.dependencies import get_db_session, verify_supabase_token
from app.schemas.response import APIResponse, ErrorDetail

router = APIRouter(prefix="/<resource>", tags=["<Resource>"])
SessionDep = Annotated[Session, Depends(get_db_session)]
CurrentUser = Annotated[dict, Depends(verify_supabase_token)]
```

Success return: `APIResponse(data=..., message="...")`
Not found: `raise HTTPException(status_code=404, detail="...")`
Unauthorized ownership: `raise HTTPException(status_code=403, detail="...")`
Conflict: `raise HTTPException(status_code=409, detail="...")`

---

## `backend/app/api/routes/users.py`

```python
from __future__ import annotations

import uuid
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from sqlmodel import Session, select

from app.api.dependencies import get_db_session, verify_supabase_token
from app.models.user import User
from app.schemas.request import UserSyncRequest, UserUpdateRequest
from app.schemas.response import APIResponse

router = APIRouter(prefix="/users", tags=["Users"])
SessionDep = Annotated[Session, Depends(get_db_session)]
CurrentUser = Annotated[dict, Depends(verify_supabase_token)]


@router.post("/me/sync", response_model=APIResponse, status_code=status.HTTP_201_CREATED)
def sync_user(body: UserSyncRequest, session: SessionDep, current_user: CurrentUser) -> APIResponse:
    user_id = uuid.UUID(current_user["sub"])
    existing = session.get(User, user_id)
    if existing:
        # Idempotent — update fields that were provided
        for field, value in body.model_dump(exclude_none=True).items():
            setattr(existing, field, value)
        session.add(existing)
        session.commit()
        session.refresh(existing)
        return APIResponse(data=existing.model_dump(), message="User record updated.")
    user = User(id=user_id, email=current_user.get("email", ""), **body.model_dump(exclude_none=True))
    session.add(user)
    session.commit()
    session.refresh(user)
    return APIResponse(data=user.model_dump(), message="User record created.")


@router.get("/me", response_model=APIResponse)
def get_me(session: SessionDep, current_user: CurrentUser) -> APIResponse:
    user_id = uuid.UUID(current_user["sub"])
    user = session.get(User, user_id)
    if not user or not user.is_active:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found.")
    return APIResponse(data=user.model_dump())


@router.put("/me", response_model=APIResponse)
def update_me(body: UserUpdateRequest, session: SessionDep, current_user: CurrentUser) -> APIResponse:
    user_id = uuid.UUID(current_user["sub"])
    user = session.get(User, user_id)
    if not user or not user.is_active:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found.")
    for field, value in body.model_dump(exclude_none=True).items():
        setattr(user, field, value)
    session.add(user)
    session.commit()
    session.refresh(user)
    return APIResponse(data=user.model_dump(), message="Profile updated.")


@router.delete("/me", response_model=APIResponse)
def delete_me(session: SessionDep, current_user: CurrentUser) -> APIResponse:
    user_id = uuid.UUID(current_user["sub"])
    user = session.get(User, user_id)
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found.")
    user.is_active = False
    session.add(user)
    session.commit()
    return APIResponse(message="Account deactivated.")
```

---

## `backend/app/api/routes/providers.py`

Implement all endpoints from `docs/api_endpoints.md` §2. Key points:

- `POST /providers/me/sync` — idempotent, same pattern as users sync
- `GET /providers` — supports query params `category_id`, `city`, `min_rating`, `page`, `limit`; public (no auth dep)
- `GET /providers/{id}` — public
- Offerings CRUD — all protected, ownership check: `offering.provider_id == UUID(current_user["sub"])`
- Schedule upsert — delete existing schedule rows then insert new ones
- Time-off — ownership check on delete

```python
from __future__ import annotations

import uuid
from datetime import time
from typing import Annotated, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlmodel import Session, select

from app.api.dependencies import get_db_session, verify_supabase_token
from app.models.booking import Booking
from app.models.provider import Provider
from app.models.provider_offering import ProviderOffering
from app.models.provider_schedule import ProviderSchedule
from app.models.provider_time_off import ProviderTimeOff
from app.schemas.request import (
    OfferingCreateRequest,
    OfferingUpdateRequest,
    ProviderSyncRequest,
    ProviderUpdateRequest,
    ScheduleUpdateRequest,
    TimeOffCreateRequest,
)
from app.schemas.response import APIResponse

router = APIRouter(prefix="/providers", tags=["Providers"])
SessionDep = Annotated[Session, Depends(get_db_session)]
CurrentUser = Annotated[dict, Depends(verify_supabase_token)]


@router.post("/me/sync", response_model=APIResponse, status_code=status.HTTP_201_CREATED)
def sync_provider(body: ProviderSyncRequest, session: SessionDep, current_user: CurrentUser) -> APIResponse:
    provider_id = uuid.UUID(current_user["sub"])
    existing = session.get(Provider, provider_id)
    if existing:
        for field, value in body.model_dump(exclude_none=True).items():
            setattr(existing, field, value)
        session.add(existing)
        session.commit()
        session.refresh(existing)
        return APIResponse(data=existing.model_dump(), message="Provider record updated.")
    provider = Provider(
        id=provider_id,
        email=current_user.get("email", ""),
        business_name=body.business_name or "",
        contact_person=body.contact_person or "",
        **{k: v for k, v in body.model_dump(exclude_none=True).items() if k not in ("business_name", "contact_person")},
    )
    session.add(provider)
    session.commit()
    session.refresh(provider)
    return APIResponse(data=provider.model_dump(), message="Provider record created.")


@router.get("/me", response_model=APIResponse)
def get_my_profile(session: SessionDep, current_user: CurrentUser) -> APIResponse:
    provider = session.get(Provider, uuid.UUID(current_user["sub"]))
    if not provider or not provider.is_active:
        raise HTTPException(status_code=404, detail="Provider not found.")
    return APIResponse(data=provider.model_dump())


@router.put("/me", response_model=APIResponse)
def update_my_profile(body: ProviderUpdateRequest, session: SessionDep, current_user: CurrentUser) -> APIResponse:
    provider = session.get(Provider, uuid.UUID(current_user["sub"]))
    if not provider or not provider.is_active:
        raise HTTPException(status_code=404, detail="Provider not found.")
    for field, value in body.model_dump(exclude_none=True).items():
        setattr(provider, field, value)
    session.add(provider)
    session.commit()
    session.refresh(provider)
    return APIResponse(data=provider.model_dump(), message="Profile updated.")


@router.get("", response_model=APIResponse)
def list_providers(
    session: SessionDep,
    category_id: Optional[uuid.UUID] = Query(None),
    city: Optional[str] = Query(None),
    min_rating: Optional[float] = Query(None),
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
) -> APIResponse:
    stmt = select(Provider).where(Provider.is_active == True)  # noqa: E712
    if city:
        stmt = stmt.where(Provider.city == city)
    if min_rating is not None:
        stmt = stmt.where(Provider.rating >= min_rating)
    if category_id:
        stmt = stmt.join(ProviderOffering).where(ProviderOffering.category_id == category_id)
    stmt = stmt.offset((page - 1) * limit).limit(limit)
    providers = session.exec(stmt).all()
    return APIResponse(data=[p.model_dump() for p in providers])


@router.get("/{provider_id}", response_model=APIResponse)
def get_provider(provider_id: uuid.UUID, session: SessionDep) -> APIResponse:
    provider = session.get(Provider, provider_id)
    if not provider or not provider.is_active:
        raise HTTPException(status_code=404, detail="Provider not found.")
    return APIResponse(data=provider.model_dump())


# ── Offerings ────────────────────────────────────────────────────────────────

@router.get("/me/offerings", response_model=APIResponse)
def list_my_offerings(session: SessionDep, current_user: CurrentUser) -> APIResponse:
    provider_id = uuid.UUID(current_user["sub"])
    offerings = session.exec(select(ProviderOffering).where(ProviderOffering.provider_id == provider_id)).all()
    return APIResponse(data=[o.model_dump() for o in offerings])


@router.post("/me/offerings", response_model=APIResponse, status_code=status.HTTP_201_CREATED)
def create_offering(body: OfferingCreateRequest, session: SessionDep, current_user: CurrentUser) -> APIResponse:
    offering = ProviderOffering(provider_id=uuid.UUID(current_user["sub"]), **body.model_dump())
    session.add(offering)
    session.commit()
    session.refresh(offering)
    return APIResponse(data=offering.model_dump(), message="Offering created.")


@router.put("/me/offerings/{offering_id}", response_model=APIResponse)
def update_offering(offering_id: uuid.UUID, body: OfferingUpdateRequest, session: SessionDep, current_user: CurrentUser) -> APIResponse:
    offering = session.get(ProviderOffering, offering_id)
    if not offering:
        raise HTTPException(status_code=404, detail="Offering not found.")
    if offering.provider_id != uuid.UUID(current_user["sub"]):
        raise HTTPException(status_code=403, detail="Not your offering.")
    for field, value in body.model_dump(exclude_none=True).items():
        setattr(offering, field, value)
    session.add(offering)
    session.commit()
    session.refresh(offering)
    return APIResponse(data=offering.model_dump(), message="Offering updated.")


@router.delete("/me/offerings/{offering_id}", response_model=APIResponse)
def delete_offering(offering_id: uuid.UUID, session: SessionDep, current_user: CurrentUser) -> APIResponse:
    offering = session.get(ProviderOffering, offering_id)
    if not offering:
        raise HTTPException(status_code=404, detail="Offering not found.")
    if offering.provider_id != uuid.UUID(current_user["sub"]):
        raise HTTPException(status_code=403, detail="Not your offering.")
    session.delete(offering)
    session.commit()
    return APIResponse(message="Offering deleted.")


# ── Schedule ─────────────────────────────────────────────────────────────────

@router.get("/me/schedule", response_model=APIResponse)
def get_schedule(session: SessionDep, current_user: CurrentUser) -> APIResponse:
    provider_id = uuid.UUID(current_user["sub"])
    slots = session.exec(select(ProviderSchedule).where(ProviderSchedule.provider_id == provider_id)).all()
    return APIResponse(data=[s.model_dump() for s in slots])


@router.put("/me/schedule", response_model=APIResponse)
def upsert_schedule(body: ScheduleUpdateRequest, session: SessionDep, current_user: CurrentUser) -> APIResponse:
    provider_id = uuid.UUID(current_user["sub"])
    existing = session.exec(select(ProviderSchedule).where(ProviderSchedule.provider_id == provider_id)).all()
    for slot in existing:
        session.delete(slot)
    for slot_data in body.schedule:
        start_h, start_m = map(int, slot_data.start_time.split(":"))
        end_h, end_m = map(int, slot_data.end_time.split(":"))
        new_slot = ProviderSchedule(
            provider_id=provider_id,
            day_of_week=slot_data.day_of_week,
            start_time=time(start_h, start_m),
            end_time=time(end_h, end_m),
            is_active=slot_data.is_active,
        )
        session.add(new_slot)
    session.commit()
    return APIResponse(message="Schedule updated.")


# ── Time-off ─────────────────────────────────────────────────────────────────

@router.post("/me/time-off", response_model=APIResponse, status_code=status.HTTP_201_CREATED)
def add_time_off(body: TimeOffCreateRequest, session: SessionDep, current_user: CurrentUser) -> APIResponse:
    time_off = ProviderTimeOff(provider_id=uuid.UUID(current_user["sub"]), **body.model_dump())
    session.add(time_off)
    session.commit()
    session.refresh(time_off)
    return APIResponse(data=time_off.model_dump(), message="Time-off added.")


@router.delete("/me/time-off/{time_off_id}", response_model=APIResponse)
def delete_time_off(time_off_id: uuid.UUID, session: SessionDep, current_user: CurrentUser) -> APIResponse:
    time_off = session.get(ProviderTimeOff, time_off_id)
    if not time_off:
        raise HTTPException(status_code=404, detail="Time-off not found.")
    if time_off.provider_id != uuid.UUID(current_user["sub"]):
        raise HTTPException(status_code=403, detail="Not your time-off.")
    session.delete(time_off)
    session.commit()
    return APIResponse(message="Time-off deleted.")


# ── Provider bookings ────────────────────────────────────────────────────────

@router.get("/me/bookings", response_model=APIResponse)
def list_my_bookings(
    session: SessionDep,
    current_user: CurrentUser,
    booking_status: Optional[str] = Query(None, alias="status"),
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
) -> APIResponse:
    provider_id = uuid.UUID(current_user["sub"])
    stmt = select(Booking).where(Booking.provider_id == provider_id)
    if booking_status:
        stmt = stmt.where(Booking.status == booking_status)
    stmt = stmt.offset((page - 1) * limit).limit(limit)
    bookings = session.exec(stmt).all()
    return APIResponse(data=[b.model_dump() for b in bookings])


@router.put("/me/bookings/{booking_id}/status", response_model=APIResponse)
def update_booking_status(
    booking_id: uuid.UUID,
    body: "BookingStatusUpdate",
    session: SessionDep,
    current_user: CurrentUser,
) -> APIResponse:
    from app.schemas.request import BookingStatusUpdate  # noqa: PLC0415
    booking = session.get(Booking, booking_id)
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found.")
    if booking.provider_id != uuid.UUID(current_user["sub"]):
        raise HTTPException(status_code=403, detail="Not your booking.")
    allowed = {
        "Pending": ["Confirmed"],
        "Confirmed": ["Completed"],
    }
    if body.status not in allowed.get(booking.status, []):
        raise HTTPException(status_code=400, detail=f"Invalid status transition: {booking.status} → {body.status}")
    booking.status = body.status
    session.add(booking)
    session.commit()
    session.refresh(booking)
    return APIResponse(data=booking.model_dump(), message=f"Booking {body.status}.")
```

---

## `backend/app/api/routes/requests.py`

```python
from __future__ import annotations

import uuid
from typing import Annotated, Optional

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Query, status
from sqlmodel import Session, select

from app.api.dependencies import get_db_session, verify_supabase_token
from app.models.agent_trace import AgentTrace
from app.models.service_request import ServiceRequest
from app.schemas.request import ServiceRequestCreate
from app.schemas.response import APIResponse

router = APIRouter(prefix="/requests", tags=["Requests"])
SessionDep = Annotated[Session, Depends(get_db_session)]
CurrentUser = Annotated[dict, Depends(verify_supabase_token)]


def _run_pipeline(service_request_id: uuid.UUID, database_url: str) -> None:
    """Background task: runs the full Antigravity agent pipeline."""
    # TODO: Import and invoke the Antigravity pipeline runner from app/agents/base.py
    # Pipeline: Intent → Discovery → Decision → Booking
    # Each stage updates ServiceRequest.current_agent_stage and writes to AgentTrace
    pass


@router.post("", response_model=APIResponse, status_code=status.HTTP_202_ACCEPTED)
def create_request(
    body: ServiceRequestCreate,
    background_tasks: BackgroundTasks,
    session: SessionDep,
    current_user: CurrentUser,
) -> APIResponse:
    user_id = uuid.UUID(current_user["sub"])
    service_request = ServiceRequest(
        user_id=user_id,
        raw_natural_language_prompt=body.prompt,
    )
    session.add(service_request)
    session.commit()
    session.refresh(service_request)
    from app.config import settings  # noqa: PLC0415
    background_tasks.add_task(_run_pipeline, service_request.id, settings.database_url)
    return APIResponse(
        data={"service_request_id": str(service_request.id), "status": "pending"},
        message="Pipeline enqueued.",
    )


@router.get("", response_model=APIResponse)
def list_requests(
    session: SessionDep,
    current_user: CurrentUser,
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
) -> APIResponse:
    user_id = uuid.UUID(current_user["sub"])
    stmt = select(ServiceRequest).where(ServiceRequest.user_id == user_id).offset((page - 1) * limit).limit(limit)
    requests = session.exec(stmt).all()
    return APIResponse(data=[r.model_dump() for r in requests])


@router.get("/{request_id}", response_model=APIResponse)
def get_request(request_id: uuid.UUID, session: SessionDep, current_user: CurrentUser) -> APIResponse:
    req = session.get(ServiceRequest, request_id)
    if not req:
        raise HTTPException(status_code=404, detail="ServiceRequest not found.")
    if req.user_id != uuid.UUID(current_user["sub"]):
        raise HTTPException(status_code=403, detail="Not your request.")
    return APIResponse(data=req.model_dump())


@router.get("/{request_id}/status", response_model=APIResponse)
def get_request_status(request_id: uuid.UUID, session: SessionDep, current_user: CurrentUser) -> APIResponse:
    req = session.get(ServiceRequest, request_id)
    if not req:
        raise HTTPException(status_code=404, detail="ServiceRequest not found.")
    if req.user_id != uuid.UUID(current_user["sub"]):
        raise HTTPException(status_code=403, detail="Not your request.")
    return APIResponse(data={
        "id": str(req.id),
        "current_agent_stage": req.current_agent_stage,
        "status": req.status,
    })


@router.get("/{request_id}/trace", response_model=APIResponse)
def get_request_trace(request_id: uuid.UUID, session: SessionDep, current_user: CurrentUser) -> APIResponse:
    req = session.get(ServiceRequest, request_id)
    if not req:
        raise HTTPException(status_code=404, detail="ServiceRequest not found.")
    if req.user_id != uuid.UUID(current_user["sub"]):
        raise HTTPException(status_code=403, detail="Not your request.")
    traces = session.exec(
        select(AgentTrace).where(AgentTrace.service_request_id == request_id)
    ).all()
    return APIResponse(data=[t.model_dump() for t in traces])
```

---

## `backend/app/api/routes/bookings.py`

```python
from __future__ import annotations

import uuid
from typing import Annotated, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlmodel import Session, select

from app.api.dependencies import get_db_session, verify_supabase_token
from app.models.booking import Booking
from app.schemas.response import APIResponse

router = APIRouter(prefix="/bookings", tags=["Bookings"])
SessionDep = Annotated[Session, Depends(get_db_session)]
CurrentUser = Annotated[dict, Depends(verify_supabase_token)]


@router.get("", response_model=APIResponse)
def list_my_bookings(
    session: SessionDep,
    current_user: CurrentUser,
    booking_status: Optional[str] = Query(None, alias="status"),
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
) -> APIResponse:
    user_id = uuid.UUID(current_user["sub"])
    stmt = select(Booking).where(Booking.user_id == user_id)
    if booking_status:
        stmt = stmt.where(Booking.status == booking_status)
    stmt = stmt.offset((page - 1) * limit).limit(limit)
    bookings = session.exec(stmt).all()
    return APIResponse(data=[b.model_dump() for b in bookings])


@router.get("/{booking_id}", response_model=APIResponse)
def get_booking(booking_id: uuid.UUID, session: SessionDep, current_user: CurrentUser) -> APIResponse:
    booking = session.get(Booking, booking_id)
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found.")
    if booking.user_id != uuid.UUID(current_user["sub"]):
        raise HTTPException(status_code=403, detail="Not your booking.")
    return APIResponse(data=booking.model_dump())


@router.put("/{booking_id}/cancel", response_model=APIResponse)
def cancel_booking(booking_id: uuid.UUID, session: SessionDep, current_user: CurrentUser) -> APIResponse:
    booking = session.get(Booking, booking_id)
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found.")
    if booking.user_id != uuid.UUID(current_user["sub"]):
        raise HTTPException(status_code=403, detail="Not your booking.")
    booking.status = "Cancelled"
    session.add(booking)
    session.commit()
    return APIResponse(message="Booking cancelled.")
```

---

## `backend/app/api/routes/reviews.py`

```python
from __future__ import annotations

import uuid
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlmodel import Session, select

from app.api.dependencies import get_db_session, verify_supabase_token
from app.models.booking import Booking
from app.models.review import Review
from app.schemas.request import ReviewCreate
from app.schemas.response import APIResponse

router = APIRouter(tags=["Reviews"])
SessionDep = Annotated[Session, Depends(get_db_session)]
CurrentUser = Annotated[dict, Depends(verify_supabase_token)]


@router.post("/bookings/{booking_id}/review", response_model=APIResponse, status_code=status.HTTP_201_CREATED)
def create_review(
    booking_id: uuid.UUID,
    body: ReviewCreate,
    session: SessionDep,
    current_user: CurrentUser,
) -> APIResponse:
    user_id = uuid.UUID(current_user["sub"])
    booking = session.get(Booking, booking_id)
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found.")
    if booking.user_id != user_id:
        raise HTTPException(status_code=403, detail="Not your booking.")
    if booking.status != "Completed":
        raise HTTPException(status_code=400, detail="Booking must be Completed before reviewing.")
    existing = session.exec(select(Review).where(Review.booking_id == booking_id)).first()
    if existing:
        raise HTTPException(status_code=409, detail="Review already submitted for this booking.")
    review = Review(
        booking_id=booking_id,
        user_id=user_id,
        provider_id=booking.provider_id,
        rating_score=body.rating_score,
        comment=body.comment,
    )
    session.add(review)
    session.commit()
    session.refresh(review)
    return APIResponse(data=review.model_dump(), message="Review submitted.")


@router.get("/providers/{provider_id}/reviews", response_model=APIResponse)
def list_provider_reviews(
    provider_id: uuid.UUID,
    session: SessionDep,
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
) -> APIResponse:
    stmt = (
        select(Review)
        .where(Review.provider_id == provider_id)
        .offset((page - 1) * limit)
        .limit(limit)
    )
    reviews = session.exec(stmt).all()
    return APIResponse(data=[r.model_dump() for r in reviews])
```

---

## `backend/app/api/routes/catalog.py`

```python
from __future__ import annotations

import uuid
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select

from app.api.dependencies import get_db_session
from app.models.service_category import ServiceCategory
from app.schemas.response import APIResponse

router = APIRouter(prefix="/catalog", tags=["Catalog"])
SessionDep = Annotated[Session, Depends(get_db_session)]


@router.get("/categories", response_model=APIResponse)
def list_categories(session: SessionDep) -> APIResponse:
    categories = session.exec(select(ServiceCategory)).all()
    return APIResponse(data=[c.model_dump() for c in categories])


@router.get("/categories/{category_id}", response_model=APIResponse)
def get_category(category_id: uuid.UUID, session: SessionDep) -> APIResponse:
    cat = session.get(ServiceCategory, category_id)
    if not cat:
        raise HTTPException(status_code=404, detail="Category not found.")
    return APIResponse(data=cat.model_dump())
```

---

## Verification

```bash
cd backend
uv run uvicorn app.main:app --reload
# Open http://localhost:8000/docs — all 6 route groups should appear
# Open http://localhost:8000/health — should return {"status": "ok"}
```

## Done When
- `app/main.py` starts with `uvicorn app.main:app`
- `/docs` shows all 6 route groups with correct paths
- `/health` returns 200
- All models are imported in `main.py` for table creation
- `docs/api_endpoints.md` reflects every implemented route (Rule 7)
- `tests/test_api/test_<resource>.py` exists for each route group and passes (Rule 3)
