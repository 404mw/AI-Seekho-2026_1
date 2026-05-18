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
