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
    BookingStatusUpdate,
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
    body: BookingStatusUpdate,
    session: SessionDep,
    current_user: CurrentUser,
) -> APIResponse:
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
