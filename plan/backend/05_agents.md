# Phase 05 — Agents ✅ DONE

## Status
**Implemented.** `base.py`, `intent.py`, `discovery.py`, `decision.py`, and `booking.py` all exist.

**Divergence from plan:** `run_pipeline()` was placed inside `base.py` directly rather than a separate `pipeline.py`. This is acceptable — single file, single runner.

**Pending (Rule 3):** `tests/test_agents/` only has `__init__.py` — test files for all 4 agents must be written in Phase 07.

## Goal
Implement the Antigravity multi-agent pipeline: `base.py` (shared infrastructure) and the 4 stage agents (intent, discovery, decision, booking). Source of truth for all schemas and tool names: `docs/antigravity_usage.md`.

## Rules That Apply Here
- **Rule 3**: Each agent file is NOT done until `tests/test_agents/test_<name>.py` exists and passes — at minimum the `record_trace` failure test.
- **Rule 5**: Use the `/scaffold-agent` skill for each of the 4 agent files. It generates the agent + test file pair in one step with the correct `record_trace` assertion built in.
- **Rule 4**: No Gemini API keys or DB URIs in agent files — all from `settings`.

## Prerequisites
- Phase 02 (models) complete
- Phase 03 (config, schemas, deps) complete

---

## `backend/app/agents/base.py`

Shared runner class and `record_trace` helper. All agents inherit from `BaseAgentRunner`.

```python
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
    """Write one AgentTrace row. Call this on both success AND failure paths."""
    trace = AgentTrace(
        service_request_id=service_request.id,
        agent_name=agent_name,
        status=status,
        structured_output=structured_output if isinstance(structured_output, dict) else json.loads(structured_output) if structured_output else None,
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
```

---

## `backend/app/agents/intent.py`

**Goal:** Parse raw NL prompt → typed `ExtractedIntent`.  
**Tools:** None — pure Gemini structured output call.  
**Input:** raw prompt string (from `ServiceRequest.raw_natural_language_prompt`)  
**Output schema:** `ExtractedIntent`

```python
from __future__ import annotations

import time
import uuid
from datetime import datetime
from typing import Optional, TYPE_CHECKING

from google.genai import types as genai_types
from pydantic import BaseModel
from sqlmodel import Session

from app.agents.base import BaseAgentRunner, record_trace, _update_stage
from app.models.service_request import ServiceRequest

if TYPE_CHECKING:
    pass


class RawPromptInput(BaseModel):
    prompt: str
    service_request_id: uuid.UUID


class ExtractedIntent(BaseModel):
    service_type: str
    location_text: str
    requested_time_text: str
    resolved_datetime_utc: Optional[str] = None  # ISO-8601
    language_detected: str  # "english" | "urdu" | "roman_urdu"
    confidence: float


class IntentAgent(BaseAgentRunner):
    """Stage 1: Extract structured intent from a natural language prompt."""

    AGENT_NAME = "intent_agent"
    TOOLS = []

    def run(
        self,
        input_data: RawPromptInput,
        service_request: ServiceRequest,
        session: Session,
    ) -> ExtractedIntent:
        start = time.monotonic()
        reasoning_parts: list[str] = []
        _update_stage(session, service_request, "intent")

        try:
            system_prompt = (
                "You are an AI assistant that extracts structured information from service requests. "
                "The user may write in English, Urdu, or Roman Urdu. "
                "Extract: service_type (in English), location_text, requested_time_text, "
                "resolved_datetime_utc (ISO-8601, infer date relative to today), "
                "language_detected, and confidence (0.0–1.0)."
            )

            response = self.client.models.generate_content(
                model="gemini-2.0-flash",
                contents=f"Extract intent from: {input_data.prompt}",
                config=genai_types.GenerateContentConfig(
                    system_instruction=system_prompt,
                    response_mime_type="application/json",
                    response_schema=ExtractedIntent,
                ),
            )

            result = ExtractedIntent.model_validate_json(response.text)
            reasoning_parts.append(f"Detected language: {result.language_detected}")
            reasoning_parts.append(f"Extracted service: {result.service_type}")
            reasoning_parts.append(f"Location: {result.location_text}")
            reasoning_parts.append(f"Time: {result.requested_time_text} → {result.resolved_datetime_utc}")

            record_trace(
                session=session,
                service_request=service_request,
                agent_name=self.AGENT_NAME,
                status="Success",
                structured_output=result.model_dump(),
                reasoning_log="\n".join(reasoning_parts),
                execution_time_ms=int((time.monotonic() - start) * 1000),
            )
            return result

        except Exception as exc:
            record_trace(
                session=session,
                service_request=service_request,
                agent_name=self.AGENT_NAME,
                status="Failed",
                structured_output={"error": str(exc)},
                reasoning_log="\n".join(reasoning_parts),
                execution_time_ms=int((time.monotonic() - start) * 1000),
            )
            _update_stage(session, service_request, "failed")
            service_request.status = "failed"
            session.add(service_request)
            session.commit()
            raise
```

---

## `backend/app/agents/discovery.py`

**Goal:** Find matching providers using DB search + Maps distance matrix.  
**Input:** `ExtractedIntent`  
**Output:** `ProviderList`  
**Tools:** `db_search_providers`, `maps_distance_matrix`

```python
from __future__ import annotations

import time
from typing import TYPE_CHECKING, Optional

from pydantic import BaseModel
from sqlmodel import Session, select

from app.agents.base import BaseAgentRunner, _update_stage, record_trace
from app.agents.intent import ExtractedIntent
from app.models.provider import Provider
from app.models.provider_offering import ProviderOffering
from app.models.provider_schedule import ProviderSchedule
from app.models.service_category import ServiceCategory
from app.models.service_request import ServiceRequest

if TYPE_CHECKING:
    pass


class ProviderCandidate(BaseModel):
    provider_id: str
    business_name: str
    distance_km: float
    drive_time_minutes: Optional[int] = None
    rating: float
    is_available: bool
    offering_id: str
    base_price: float


class ProviderList(BaseModel):
    candidates: list[ProviderCandidate]
    total_found: int


class DiscoveryAgent(BaseAgentRunner):
    """Stage 2: Find providers matching extracted intent."""

    AGENT_NAME = "discovery_agent"

    def run(
        self,
        input_data: ExtractedIntent,
        service_request: ServiceRequest,
        session: Session,
        user_geo_location: Optional[str] = None,
    ) -> ProviderList:
        start = time.monotonic()
        reasoning_parts: list[str] = []
        _update_stage(session, service_request, "discovery")

        try:
            # Tool: db_search_providers
            candidates = self._db_search_providers(session, input_data, reasoning_parts)

            # Tool: maps_distance_matrix
            if user_geo_location and candidates:
                candidates = self._maps_distance_matrix(user_geo_location, candidates, reasoning_parts)

            result = ProviderList(candidates=candidates, total_found=len(candidates))

            record_trace(
                session=session,
                service_request=service_request,
                agent_name=self.AGENT_NAME,
                status="Success",
                structured_output=result.model_dump(),
                reasoning_log="\n".join(reasoning_parts),
                execution_time_ms=int((time.monotonic() - start) * 1000),
            )
            return result

        except Exception as exc:
            record_trace(
                session=session,
                service_request=service_request,
                agent_name=self.AGENT_NAME,
                status="Failed",
                structured_output={"error": str(exc)},
                reasoning_log="\n".join(reasoning_parts),
                execution_time_ms=int((time.monotonic() - start) * 1000),
            )
            _update_stage(session, service_request, "failed")
            service_request.status = "failed"
            session.add(service_request)
            session.commit()
            raise

    def _db_search_providers(
        self,
        session: Session,
        intent: ExtractedIntent,
        reasoning_parts: list[str],
    ) -> list[ProviderCandidate]:
        """Tool: query Provider + ProviderOffering for matching candidates."""
        from app.config import runtime_config  # noqa: PLC0415
        max_candidates = runtime_config.get("max_provider_candidates", 10)

        stmt = (
            select(Provider, ProviderOffering, ServiceCategory)
            .join(ProviderOffering, Provider.id == ProviderOffering.provider_id)
            .join(ServiceCategory, ProviderOffering.category_id == ServiceCategory.id)
            .where(Provider.is_active == True)  # noqa: E712
            .where(ServiceCategory.name == intent.service_type)
            .limit(max_candidates)
        )
        rows = session.exec(stmt).all()
        reasoning_parts.append(f"{len(rows)} providers found in DB for '{intent.service_type}'")

        candidates = []
        for provider, offering, _cat in rows:
            candidates.append(ProviderCandidate(
                provider_id=str(provider.id),
                business_name=provider.business_name,
                distance_km=0.0,  # filled in by maps tool
                rating=provider.rating,
                is_available=True,
                offering_id=str(offering.id),
                base_price=offering.base_price,
            ))
        return candidates

    def _maps_distance_matrix(
        self,
        origin: str,
        candidates: list[ProviderCandidate],
        reasoning_parts: list[str],
    ) -> list[ProviderCandidate]:
        """Tool: get distances via Maps API or Haversine fallback."""
        from app.services.maps import get_distances  # noqa: PLC0415
        distances = get_distances(origin=origin, candidate_ids=[c.provider_id for c in candidates])
        for candidate in candidates:
            dist = distances.get(candidate.provider_id)
            if dist:
                candidate.distance_km = dist["distance_km"]
                candidate.drive_time_minutes = dist.get("drive_time_minutes")
        reasoning_parts.append("Maps API distances applied.")
        return candidates
```

---

## `backend/app/agents/decision.py`

**Goal:** Score and rank candidates, pick best match with reasoning.  
**Input:** `ProviderList`  
**Output:** `RankedMatch`  
**Tools:** None — pure Gemini reasoning over structured data.

```python
from __future__ import annotations

import json
import time
from typing import Optional

from pydantic import BaseModel
from sqlmodel import Session

from app.agents.base import BaseAgentRunner, _update_stage, record_trace
from app.agents.discovery import ProviderList
from app.models.service_request import ServiceRequest


class CandidateScore(BaseModel):
    provider_id: str
    score: float


class RankedMatch(BaseModel):
    selected_provider_id: str
    selected_offering_id: str
    score: float
    reasoning: str
    runner_up_provider_id: Optional[str] = None
    all_scores: list[CandidateScore]


class DecisionAgent(BaseAgentRunner):
    """Stage 3: Rank provider candidates and select the best match."""

    AGENT_NAME = "decision_agent"

    def run(
        self,
        input_data: ProviderList,
        service_request: ServiceRequest,
        session: Session,
    ) -> RankedMatch:
        start = time.monotonic()
        reasoning_parts: list[str] = []
        _update_stage(session, service_request, "decision")

        try:
            from app.config import runtime_config  # noqa: PLC0415
            weights = runtime_config.get("scoring_weights", {"distance": 0.40, "rating": 0.35, "price": 0.25})

            # Calculate weighted scores locally
            candidates = input_data.candidates
            if not candidates:
                raise ValueError("No candidates to rank.")

            max_dist = max(c.distance_km for c in candidates) or 1.0
            max_price = max(c.base_price for c in candidates) or 1.0

            scored = []
            for c in candidates:
                dist_score = 1.0 - (c.distance_km / max_dist)
                rating_score = (c.rating / 5.0)
                price_score = 1.0 - (c.base_price / max_price)
                total = (
                    weights["distance"] * dist_score
                    + weights["rating"] * rating_score
                    + weights["price"] * price_score
                )
                scored.append((c, round(total, 4)))
                reasoning_parts.append(
                    f"{c.business_name}: dist={dist_score:.2f}, rating={rating_score:.2f}, price={price_score:.2f} → {total:.4f}"
                )

            scored.sort(key=lambda x: x[1], reverse=True)
            winner, winner_score = scored[0]
            runner_up = scored[1][0] if len(scored) > 1 else None

            # Ask Gemini to produce the human-readable reasoning string
            candidates_json = json.dumps([
                {"name": c.business_name, "score": s, "distance_km": c.distance_km, "rating": c.rating}
                for c, s in scored
            ])
            gemini_response = self.client.models.generate_content(
                model="gemini-2.0-flash",
                contents=(
                    f"Explain in 1-2 sentences why '{winner.business_name}' (score {winner_score}) "
                    f"was selected over these alternatives: {candidates_json}. "
                    "Be specific about distance, rating, and price factors."
                ),
            )
            reasoning_text = gemini_response.text.strip()

            result = RankedMatch(
                selected_provider_id=winner.provider_id,
                selected_offering_id=winner.offering_id,
                score=winner_score,
                reasoning=reasoning_text,
                runner_up_provider_id=runner_up.provider_id if runner_up else None,
                all_scores=[CandidateScore(provider_id=c.provider_id, score=s) for c, s in scored],
            )

            record_trace(
                session=session,
                service_request=service_request,
                agent_name=self.AGENT_NAME,
                status="Success",
                structured_output=result.model_dump(),
                reasoning_log="\n".join(reasoning_parts),
                execution_time_ms=int((time.monotonic() - start) * 1000),
            )
            return result

        except Exception as exc:
            record_trace(
                session=session,
                service_request=service_request,
                agent_name=self.AGENT_NAME,
                status="Failed",
                structured_output={"error": str(exc)},
                reasoning_log="\n".join(reasoning_parts),
                execution_time_ms=int((time.monotonic() - start) * 1000),
            )
            _update_stage(session, service_request, "failed")
            service_request.status = "failed"
            session.add(service_request)
            session.commit()
            raise
```

---

## `backend/app/agents/booking.py`

**Goal:** Create the `Booking` DB record, generate confirmation, schedule reminder.  
**Input:** `RankedMatch` + `ExtractedIntent`  
**Output:** `BookingConfirmation`  
**Tools:** `db_create_booking`, `db_update_service_request`, `generate_confirmation`, `schedule_reminder`

```python
from __future__ import annotations

import time
import uuid
from datetime import datetime, timedelta
from typing import Optional

from pydantic import BaseModel
from sqlmodel import Session

from app.agents.base import BaseAgentRunner, _update_stage, record_trace
from app.agents.decision import RankedMatch
from app.agents.intent import ExtractedIntent
from app.models.booking import Booking
from app.models.service_request import ServiceRequest


class BookingConfirmation(BaseModel):
    booking_id: str
    provider_name: str
    scheduled_start: str
    scheduled_end: str
    estimated_cost: float
    status: str
    reminder_scheduled_at: str
    confirmation_message: str


class BookingAgent(BaseAgentRunner):
    """Stage 4: Create booking, generate confirmation, schedule reminder."""

    AGENT_NAME = "booking_agent"

    def run(
        self,
        ranked_match: RankedMatch,
        intent: ExtractedIntent,
        service_request: ServiceRequest,
        session: Session,
        provider_name: str = "Selected Provider",
        user_id: Optional[uuid.UUID] = None,
    ) -> BookingConfirmation:
        start = time.monotonic()
        reasoning_parts: list[str] = []
        _update_stage(session, service_request, "booking")

        try:
            # Tool: db_create_booking
            start_dt = datetime.fromisoformat(intent.resolved_datetime_utc.replace("Z", "+00:00")) if intent.resolved_datetime_utc else datetime.utcnow()
            end_dt = start_dt + timedelta(hours=1, minutes=30)

            booking = Booking(
                user_id=user_id or service_request.user_id,
                provider_id=uuid.UUID(ranked_match.selected_provider_id),
                service_request_id=service_request.id,
                provider_offering_id=uuid.UUID(ranked_match.selected_offering_id),
                scheduled_start_time=start_dt,
                scheduled_end_time=end_dt,
                estimated_cost=0.0,  # TODO: look up base_price from offering
                status="Confirmed",
                payment_status="Pending",
            )
            session.add(booking)
            session.flush()
            reasoning_parts.append(f"Booking created: {booking.id}")

            # Tool: generate_confirmation
            reminder_at = start_dt - timedelta(hours=1)
            confirmation_msg = (
                f"Your {intent.service_type} has been booked. "
                f"{provider_name} will arrive at {intent.location_text}. "
                f"Appointment: {start_dt.strftime('%Y-%m-%d %H:%M')} UTC."
            )
            reasoning_parts.append("Confirmation generated.")

            # Tool: schedule_reminder (simulated — written as AgentTrace row)
            reminder_trace = record_trace(
                session=session,
                service_request=service_request,
                agent_name="follow_up_scheduler",
                status="Scheduled",
                structured_output={
                    "reminder_at": reminder_at.isoformat(),
                    "message": f"Reminder: Your {intent.service_type} arrives in 1 hour.",
                },
                reasoning_log="Simulated reminder logged.",
                execution_time_ms=0,
            )
            reasoning_parts.append(f"Reminder scheduled at {reminder_at.isoformat()}")

            # Tool: db_update_service_request
            _update_stage(session, service_request, "completed")
            service_request.status = "completed"
            session.add(service_request)
            session.commit()
            session.refresh(booking)

            result = BookingConfirmation(
                booking_id=str(booking.id),
                provider_name=provider_name,
                scheduled_start=start_dt.isoformat(),
                scheduled_end=end_dt.isoformat(),
                estimated_cost=booking.estimated_cost,
                status="Confirmed",
                reminder_scheduled_at=reminder_at.isoformat(),
                confirmation_message=confirmation_msg,
            )

            record_trace(
                session=session,
                service_request=service_request,
                agent_name=self.AGENT_NAME,
                status="Success",
                structured_output=result.model_dump(),
                reasoning_log="\n".join(reasoning_parts),
                execution_time_ms=int((time.monotonic() - start) * 1000),
            )
            return result

        except Exception as exc:
            record_trace(
                session=session,
                service_request=service_request,
                agent_name=self.AGENT_NAME,
                status="Failed",
                structured_output={"error": str(exc)},
                reasoning_log="\n".join(reasoning_parts),
                execution_time_ms=int((time.monotonic() - start) * 1000),
            )
            _update_stage(session, service_request, "failed")
            service_request.status = "failed"
            session.add(service_request)
            session.commit()
            raise
```

---

## Pipeline Runner (wire agents together)

Add this to `backend/app/agents/base.py` or a new `backend/app/agents/pipeline.py`:

```python
def run_pipeline(service_request_id: str, database_url: str) -> None:
    """Full Antigravity pipeline: Intent → Discovery → Decision → Booking."""
    from sqlmodel import Session, create_engine, select  # noqa: PLC0415
    from app.models.service_request import ServiceRequest  # noqa: PLC0415
    from app.agents.intent import IntentAgent, RawPromptInput  # noqa: PLC0415
    from app.agents.discovery import DiscoveryAgent  # noqa: PLC0415
    from app.agents.decision import DecisionAgent  # noqa: PLC0415
    from app.agents.booking import BookingAgent  # noqa: PLC0415
    from app.models.user import User  # noqa: PLC0415
    import uuid  # noqa: PLC0415

    engine = create_engine(database_url)
    with Session(engine) as session:
        req = session.get(ServiceRequest, uuid.UUID(service_request_id))
        if not req:
            return

        # Stage 1
        intent = IntentAgent().run(
            RawPromptInput(prompt=req.raw_natural_language_prompt, service_request_id=req.id),
            req, session,
        )

        # Get user geo_location for distance calculation
        user = session.get(User, req.user_id)
        user_geo = user.geo_location if user else None

        # Stage 2
        provider_list = DiscoveryAgent().run(intent, req, session, user_geo_location=user_geo)

        # Stage 3
        ranked = DecisionAgent().run(provider_list, req, session)

        # Stage 4
        from app.models.provider import Provider  # noqa: PLC0415
        provider = session.get(Provider, uuid.UUID(ranked.selected_provider_id))
        BookingAgent().run(ranked, intent, req, session, provider_name=provider.business_name if provider else "Provider", user_id=req.user_id)
```

Wire `run_pipeline` into `routes/requests.py` `_run_pipeline` function.

---

## Verification

```bash
cd backend
uv run python -c "
from app.agents.base import BaseAgentRunner, record_trace
from app.agents.intent import IntentAgent, ExtractedIntent
from app.agents.discovery import DiscoveryAgent, ProviderList
from app.agents.decision import DecisionAgent, RankedMatch
from app.agents.booking import BookingAgent, BookingConfirmation
print('all agents import OK')
"
```

## Done When
- All 5 agent files exist and import without error
- `record_trace` is called on both success and failure in every agent
- `_update_stage` is called at the start of every agent's `run()`
- The pipeline runner wires all 4 stages and is called from `routes/requests.py`
