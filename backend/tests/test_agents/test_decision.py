from __future__ import annotations

import uuid
from unittest.mock import MagicMock, patch

import pytest

from app.agents.decision import CandidateScore, DecisionAgent, RankedMatch
from app.agents.discovery import ProviderCandidate, ProviderList


@pytest.fixture
def agent():
    with patch("app.agents.base.genai.Client"):
        return DecisionAgent()


@pytest.fixture
def mock_session():
    return MagicMock()


@pytest.fixture
def mock_service_request():
    req = MagicMock()
    req.id = uuid.uuid4()
    return req


@pytest.fixture
def sample_provider_list():
    return ProviderList(
        candidates=[
            ProviderCandidate(
                provider_id=str(uuid.uuid4()),
                business_name="Ali AC",
                distance_km=2.1,
                rating=4.7,
                is_available=True,
                offering_id=str(uuid.uuid4()),
                base_price=1500,
            ),
            ProviderCandidate(
                provider_id=str(uuid.uuid4()),
                business_name="Khan AC",
                distance_km=4.3,
                rating=4.2,
                is_available=True,
                offering_id=str(uuid.uuid4()),
                base_price=1200,
            ),
        ],
        total_found=2,
    )


class TestDecisionAgent:
    def test_agent_name(self, agent):
        assert agent.AGENT_NAME == "decision_agent"

    def test_run_records_trace_on_failure(self, agent, mock_session, mock_service_request, sample_provider_list):
        agent.client.models.generate_content.side_effect = RuntimeError("API error")
        with patch("app.agents.decision.record_trace") as mock_trace:
            with patch("app.agents.decision._update_stage"):
                with pytest.raises(RuntimeError):
                    agent.run(sample_provider_list, mock_service_request, mock_session)
        mock_trace.assert_called_once()
        assert mock_trace.call_args.kwargs["status"] == "Failed"


class TestScoringLogic:
    def test_closest_highest_rated_wins(self, agent, mock_session, mock_service_request, sample_provider_list):
        agent.client.models.generate_content.return_value = MagicMock(text="Ali AC selected.")
        with patch("app.agents.decision.record_trace"):
            with patch("app.agents.decision._update_stage"):
                result = agent.run(sample_provider_list, mock_service_request, mock_session)
        assert result.all_scores[0].score > result.all_scores[1].score
