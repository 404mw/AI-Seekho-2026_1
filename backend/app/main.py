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
from sqlmodel import SQLModel

from app.api.dependencies import engine
from app.api.routes import bookings, catalog, providers, requests, reviews, users

app = FastAPI(
    title="AI-Seekho API",
    description="Agentic service marketplace powered by Google Antigravity",
    version="1.0.0",
)


@app.on_event("startup")
def create_tables() -> None:
    SQLModel.metadata.create_all(engine)


app.include_router(users.router, prefix="/api/v1")
app.include_router(providers.router, prefix="/api/v1")
app.include_router(requests.router, prefix="/api/v1")
app.include_router(bookings.router, prefix="/api/v1")
app.include_router(reviews.router, prefix="/api/v1")
app.include_router(catalog.router, prefix="/api/v1")


@app.get("/health")
def health() -> dict:
    return {"status": "ok"}
