from __future__ import annotations

import app.models.agent_trace  # noqa: F401
import app.models.booking  # noqa: F401
import app.models.provider  # noqa: F401
import app.models.provider_offering  # noqa: F401
import app.models.provider_schedule  # noqa: F401
import app.models.provider_time_off  # noqa: F401
import app.models.review  # noqa: F401
import app.models.service_category  # noqa: F401
import app.models.service_request  # noqa: F401
import app.models.user  # noqa: F401
from fastapi import FastAPI
from sqlmodel import SQLModel, Session, select

from app.api.dependencies import engine
from app.api.routes import bookings, catalog, providers, requests, reviews, users
from app.models.service_category import ServiceCategory

app = FastAPI(
    title="AI-Seekho API",
    description="Agentic service marketplace powered by Google Antigravity",
    version="1.0.0",
)

_SEED_CATEGORIES = [
    ("Plumbing", "Pipes, fixtures, and water systems"),
    ("Electrical", "Wiring, installations, and repairs"),
    ("Cleaning", "Home and office cleaning services"),
    ("Carpentry", "Furniture, cabinets, and woodwork"),
    ("Painting", "Interior and exterior painting"),
    ("AC Repair & Service", "Cooling and HVAC systems"),
    ("Pest Control", "Insects, rodents, and fumigation"),
    ("Appliance Repair", "Washing machines, fridges, and more"),
    ("Gardening", "Lawn care, plants, and landscaping"),
    ("Security Systems", "CCTV, alarms, and locks"),
]


def _seed_categories(session: Session) -> None:
    if session.exec(select(ServiceCategory)).first():
        return
    for name, description in _SEED_CATEGORIES:
        session.add(ServiceCategory(name=name, description=description))
    session.commit()


@app.on_event("startup")
def on_startup() -> None:
    SQLModel.metadata.create_all(engine)
    with Session(engine) as session:
        _seed_categories(session)


app.include_router(users.router, prefix="/api/v1")
app.include_router(providers.router, prefix="/api/v1")
app.include_router(requests.router, prefix="/api/v1")
app.include_router(bookings.router, prefix="/api/v1")
app.include_router(reviews.router, prefix="/api/v1")
app.include_router(catalog.router, prefix="/api/v1")


@app.get("/health")
def health() -> dict:
    return {"status": "ok"}
