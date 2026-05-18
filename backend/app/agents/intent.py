from __future__ import annotations

import time
import uuid
from typing import Optional

from google.genai import types as genai_types
from pydantic import BaseModel
from sqlmodel import Session

from app.agents.base import BaseAgentRunner, _update_stage, record_trace
from app.models.service_request import ServiceRequest


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
