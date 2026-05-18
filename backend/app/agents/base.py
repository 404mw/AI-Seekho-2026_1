from __future__ import annotations

import json
import uuid
from datetime import datetime
from typing import Any

from google import genai
from sqlmodel import Session

from app.config import settings
from app.models.agent_trace import AgentTrace
from app.models.service_request import ServiceRequest


def record_trace(
    *,
    session: Session,
    service_request: ServiceRequest,
    agent_name: str,
    status: str,
    structured_output: Any,
    reasoning_log: str,
    execution_time_ms: int,
) -> AgentTrace:
    """Write one AgentTrace row. Called on both success AND failure paths."""
    trace = AgentTrace(
        service_request_id=service_request.id,
        agent_name=agent_name,
        status=status,
        structured_output=(
            structured_output if isinstance(structured_output, dict)
            else json.loads(structured_output) if structured_output
            else None
        ),
        reasoning_log=reasoning_log,
        execution_time_ms=execution_time_ms,
    )
    session.add(trace)
    session.commit()
    return trace


def _update_stage(session: Session, service_request: ServiceRequest, stage: str) -> None:
    service_request.current_agent_stage = stage
    service_request.updated_at = datetime.utcnow()
    session.add(service_request)
    session.commit()


class BaseAgentRunner:
    """Base class for all Antigravity agent stages."""

    AGENT_NAME: str = "base_agent"
    TOOLS: list = []

    def __init__(self) -> None:
        self.client = genai.Client(api_key=settings.gemini_api_key)

    def run(self, *args, **kwargs):
        raise NotImplementedError


def run_pipeline(service_request_id: str, database_url: str) -> None:
    """Full Antigravity pipeline: Intent → Discovery → Decision → Booking."""
    import uuid as _uuid  # noqa: PLC0415

    from sqlmodel import Session, create_engine  # noqa: PLC0415

    from app.agents.booking import BookingAgent  # noqa: PLC0415
    from app.agents.decision import DecisionAgent  # noqa: PLC0415
    from app.agents.discovery import DiscoveryAgent  # noqa: PLC0415
    from app.agents.intent import IntentAgent, RawPromptInput  # noqa: PLC0415
    from app.models.provider import Provider  # noqa: PLC0415
    from app.models.service_request import ServiceRequest  # noqa: PLC0415
    from app.models.user import User  # noqa: PLC0415

    engine = create_engine(database_url)
    with Session(engine) as session:
        req = session.get(ServiceRequest, _uuid.UUID(service_request_id))
        if not req:
            return

        intent = IntentAgent().run(
            RawPromptInput(prompt=req.raw_natural_language_prompt, service_request_id=req.id),
            req, session,
        )

        user = session.get(User, req.user_id)
        user_geo = user.geo_location if user else None

        provider_list = DiscoveryAgent().run(intent, req, session, user_geo_location=user_geo)
        ranked = DecisionAgent().run(provider_list, req, session)

        provider = session.get(Provider, _uuid.UUID(ranked.selected_provider_id))
        BookingAgent().run(
            ranked, intent, req, session,
            provider_name=provider.business_name if provider else "Provider",
            user_id=req.user_id,
        )
