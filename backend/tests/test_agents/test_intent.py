from __future__ import annotations

import uuid
from unittest.mock import MagicMock, patch

import pytest

from app.agents.intent import ExtractedIntent, IntentAgent, RawPromptInput


@pytest.fixture
def agent():
    with patch("app.agents.base.genai.Client"):
        return IntentAgent()


@pytest.fixture
def mock_session():
    return MagicMock()


@pytest.fixture
def mock_service_request():
    req = MagicMock()
    req.id = uuid.uuid4()
    req.user_id = uuid.uuid4()
    return req


class TestExtractedIntent:
    def test_valid_schema(self):
        intent = ExtractedIntent(
            service_type="AC Technician",
            location_text="G-13",
            requested_time_text="kal subah",
            language_detected="roman_urdu",
            confidence=0.96,
        )
        assert intent.service_type == "AC Technician"

    def test_missing_required_field_raises(self):
        with pytest.raises(Exception):
            ExtractedIntent()


class TestIntentAgent:
    def test_agent_name(self, agent):
        assert agent.AGENT_NAME == "intent_agent"

    def test_run_records_trace_on_failure(self, agent, mock_session, mock_service_request):
        agent.client.models.generate_content.side_effect = RuntimeError("API down")
        with patch("app.agents.intent.record_trace") as mock_trace:
            with patch("app.agents.intent._update_stage"):
                with pytest.raises(RuntimeError):
                    agent.run(
                        RawPromptInput(prompt="test", service_request_id=mock_service_request.id),
                        mock_service_request,
                        mock_session,
                    )
        mock_trace.assert_called_once()
        assert mock_trace.call_args.kwargs["status"] == "Failed"
        assert mock_trace.call_args.kwargs["agent_name"] == "intent_agent"
