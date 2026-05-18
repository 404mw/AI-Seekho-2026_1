from __future__ import annotations

import uuid
from datetime import datetime
from unittest.mock import MagicMock, patch

import pytest

from app.agents.booking import BookingAgent, BookingConfirmation
from app.agents.decision import CandidateScore, RankedMatch
from app.agents.intent import ExtractedIntent


@pytest.fixture
def agent():
    with patch("app.agents.base.genai.Client"):
        return BookingAgent()


@pytest.fixture
def mock_session():
    session = MagicMock()
    session.flush = MagicMock()
    return session


@pytest.fixture
def mock_service_request():
    req = MagicMock()
    req.id = uuid.uuid4()
    req.user_id = uuid.uuid4()
    return req


@pytest.fixture
def sample_ranked_match():
    pid, oid = str(uuid.uuid4()), str(uuid.uuid4())
    return RankedMatch(
        selected_provider_id=pid,
        selected_offering_id=oid,
        score=0.89,
        reasoning="Best match.",
        all_scores=[CandidateScore(provider_id=pid, score=0.89)],
    )


@pytest.fixture
def sample_intent():
    return ExtractedIntent(
        service_type="AC Technician",
        location_text="G-13",
        requested_time_text="tomorrow morning",
        resolved_datetime_utc=datetime.utcnow().isoformat() + "Z",
        language_detected="english",
        confidence=0.95,
    )


class TestBookingAgent:
    def test_agent_name(self, agent):
        assert agent.AGENT_NAME == "booking_agent"

    def test_run_records_trace_on_failure(
        self, agent, mock_session, mock_service_request, sample_ranked_match, sample_intent
    ):
        mock_session.add.side_effect = RuntimeError("DB write failed")
        with patch("app.agents.booking.record_trace") as mock_trace:
            with patch("app.agents.booking._update_stage"):
                with pytest.raises(RuntimeError):
                    agent.run(sample_ranked_match, sample_intent, mock_service_request, mock_session)
        mock_trace.assert_called()
        failure_calls = [c for c in mock_trace.call_args_list if c.kwargs.get("status") == "Failed"]
        assert len(failure_calls) >= 1
