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
            start_dt = (
                datetime.fromisoformat(intent.resolved_datetime_utc.replace("Z", "+00:00"))
                if intent.resolved_datetime_utc
                else datetime.utcnow()
            )
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
            record_trace(
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
