from __future__ import annotations

import uuid
from unittest.mock import MagicMock, patch

import pytest

from app.agents.discovery import DiscoveryAgent, ProviderCandidate, ProviderList
from app.agents.intent import ExtractedIntent


@pytest.fixture
def agent():
    with patch("app.agents.base.genai.Client"):
        return DiscoveryAgent()


@pytest.fixture
def mock_session():
    return MagicMock()


@pytest.fixture
def mock_service_request():
    req = MagicMock()
    req.id = uuid.uuid4()
    return req


@pytest.fixture
def sample_intent():
    return ExtractedIntent(
        service_type="AC Technician",
        location_text="G-13",
        requested_time_text="tomorrow morning",
        language_detected="english",
        confidence=0.95,
    )


class TestDiscoveryAgent:
    def test_agent_name(self, agent):
        assert agent.AGENT_NAME == "discovery_agent"

    def test_run_records_trace_on_failure(self, agent, mock_session, mock_service_request, sample_intent):
        mock_session.exec.side_effect = RuntimeError("DB down")
        with patch("app.agents.discovery.record_trace") as mock_trace:
            with patch("app.agents.discovery._update_stage"):
                with pytest.raises(RuntimeError):
                    agent.run(sample_intent, mock_service_request, mock_session)
        mock_trace.assert_called_once()
        assert mock_trace.call_args.kwargs["status"] == "Failed"
        assert mock_trace.call_args.kwargs["agent_name"] == "discovery_agent"
