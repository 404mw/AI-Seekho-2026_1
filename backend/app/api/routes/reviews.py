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
