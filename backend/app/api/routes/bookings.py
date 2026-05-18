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
