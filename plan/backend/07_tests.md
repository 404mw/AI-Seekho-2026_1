# Phase 07 — Tests

## Goal
Create `tests/conftest.py` (DB + client fixtures) and one test file per major area. Tests use a real PostgreSQL DB (per project rules — no mocks for DB). Agent tests mock the Gemini client only.

## Prerequisites
All previous phases complete. DB must be running and `.env` configured.

---

## `backend/tests/conftest.py`

```python
from __future__ import annotations

import uuid
from typing import AsyncGenerator, Generator

import pytest
import pytest_asyncio
from fastapi.testclient import TestClient
from httpx import AsyncClient
from sqlmodel import Session, SQLModel, create_engine

from app.api.dependencies import engine as app_engine
from app.config import settings
from app.main import app

# Use a separate test database or the same DB — ensure tables exist
test_engine = create_engine(settings.database_url, echo=False)


@pytest.fixture(scope="session", autouse=True)
def create_test_tables():
    """Create all tables once per test session."""
    # Import all models to register them with SQLModel metadata
    import app.models.user  # noqa: F401
    import app.models.provider  # noqa: F401
    import app.models.service_category  # noqa: F401
    import app.models.provider_offering  # noqa: F401
    import app.models.provider_schedule  # noqa: F401
    import app.models.provider_time_off  # noqa: F401
    import app.models.service_request  # noqa: F401
    import app.models.agent_trace  # noqa: F401
    import app.models.booking  # noqa: F401
    import app.models.review  # noqa: F401
    SQLModel.metadata.create_all(test_engine)


@pytest.fixture
def db_session() -> Generator[Session, None, None]:
    """Yields a real DB session that rolls back after each test."""
    with Session(test_engine) as session:
        yield session


@pytest.fixture
def client() -> Generator[TestClient, None, None]:
    """Synchronous test client for non-async tests."""
    with TestClient(app) as c:
        yield c


@pytest_asyncio.fixture
async def async_client() -> AsyncGenerator[AsyncClient, None]:
    """Async test client for async route tests."""
    async with AsyncClient(app=app, base_url="http://test") as c:
        yield c


@pytest.fixture
def mock_jwt_payload() -> dict:
    """A valid-looking decoded JWT payload for a test user."""
    return {
        "sub": str(uuid.uuid4()),
        "email": "testuser@example.com",
        "role": "authenticated",
    }
```

---

## `backend/tests/test_api/test_users.py`

```python
from __future__ import annotations

import uuid
from unittest.mock import patch

import pytest
from fastapi.testclient import TestClient


def make_auth_header(payload: dict) -> dict:
    return {"Authorization": "Bearer fake.jwt.token"}


@pytest.fixture(autouse=True)
def mock_verify_token(mock_jwt_payload):
    with patch("app.api.dependencies.verify_supabase_token", return_value=mock_jwt_payload):
        yield


def test_sync_user_creates_record(client: TestClient, mock_jwt_payload):
    resp = client.post("/api/v1/users/me/sync", json={"full_name": "Test User"}, headers=make_auth_header(mock_jwt_payload))
    assert resp.status_code == 201
    data = resp.json()
    assert data["data"]["email"] == mock_jwt_payload["email"]


def test_sync_user_is_idempotent(client: TestClient, mock_jwt_payload):
    body = {"full_name": "Test User"}
    client.post("/api/v1/users/me/sync", json=body, headers=make_auth_header(mock_jwt_payload))
    resp = client.post("/api/v1/users/me/sync", json={"full_name": "Updated Name"}, headers=make_auth_header(mock_jwt_payload))
    assert resp.status_code == 201
    assert resp.json()["data"]["full_name"] == "Updated Name"


def test_get_me_returns_profile(client: TestClient, mock_jwt_payload):
    client.post("/api/v1/users/me/sync", json={"full_name": "Test User"}, headers=make_auth_header(mock_jwt_payload))
    resp = client.get("/api/v1/users/me", headers=make_auth_header(mock_jwt_payload))
    assert resp.status_code == 200
    assert resp.json()["data"]["full_name"] == "Test User"


def test_get_me_unauthenticated_returns_403(client: TestClient):
    # Without mocking the token dependency, missing auth should fail
    # (TestClient won't pass HTTPBearer without a header)
    resp = client.get("/api/v1/users/me")
    assert resp.status_code in (401, 403)
```

---

## `backend/tests/test_api/test_catalog.py`

```python
from __future__ import annotations

import pytest
from fastapi.testclient import TestClient
from sqlmodel import Session

from app.models.service_category import ServiceCategory


@pytest.fixture
def seed_category(db_session: Session):
    cat = ServiceCategory(name="Test Electrician", description="Test desc")
    db_session.add(cat)
    db_session.commit()
    db_session.refresh(cat)
    yield cat
    db_session.delete(cat)
    db_session.commit()


def test_list_categories_returns_200(client: TestClient, seed_category):
    resp = client.get("/api/v1/catalog/categories")
    assert resp.status_code == 200
    names = [c["name"] for c in resp.json()["data"]]
    assert "Test Electrician" in names


def test_get_category_by_id(client: TestClient, seed_category):
    resp = client.get(f"/api/v1/catalog/categories/{seed_category.id}")
    assert resp.status_code == 200
    assert resp.json()["data"]["name"] == "Test Electrician"


def test_get_nonexistent_category_returns_404(client: TestClient):
    import uuid
    resp = client.get(f"/api/v1/catalog/categories/{uuid.uuid4()}")
    assert resp.status_code == 404
```

---

## `backend/tests/test_api/test_requests.py`

```python
from __future__ import annotations

import uuid
from unittest.mock import patch

import pytest
from fastapi.testclient import TestClient


@pytest.fixture(autouse=True)
def mock_token(mock_jwt_payload):
    with patch("app.api.dependencies.verify_supabase_token", return_value=mock_jwt_payload):
        yield


@pytest.fixture(autouse=True)
def mock_pipeline():
    # Don't run the actual pipeline in route tests
    with patch("app.api.routes.requests._run_pipeline"):
        yield


def test_post_request_returns_202(client: TestClient, mock_jwt_payload):
    # User must exist in DB for user_id FK — sync them first
    with patch("app.api.dependencies.verify_supabase_token", return_value=mock_jwt_payload):
        client.post("/api/v1/users/me/sync", json={"full_name": "Req User"}, headers={"Authorization": "Bearer t"})
        resp = client.post("/api/v1/requests", json={"prompt": "Need AC tech in G-13"}, headers={"Authorization": "Bearer t"})
    assert resp.status_code == 202
    assert resp.json()["data"]["status"] == "pending"


def test_post_request_unauthenticated_returns_401(client: TestClient):
    resp = client.post("/api/v1/requests", json={"prompt": "test"})
    assert resp.status_code in (401, 403)
```

---

## `backend/tests/test_agents/test_intent.py`

```python
from __future__ import annotations

import uuid
from unittest.mock import MagicMock, patch

import pytest

from app.agents.intent import ExtractedIntent, IntentAgent, RawPromptInput


@pytest.fixture
def agent():
    with patch("app.agents.intent.genai.Client"):
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
```

---

## `backend/tests/test_services/test_matching.py`

```python
from __future__ import annotations

from app.services.matching import CandidateInput, ScoringWeights, score_candidates


def make_candidate(pid: str, dist: float, rating: float, price: float) -> CandidateInput:
    return CandidateInput(pid, f"offering_{pid}", f"Provider {pid}", dist, rating, price)


def test_score_candidates_sorts_descending():
    candidates = [
        make_candidate("a", 2.1, 4.7, 1500),
        make_candidate("b", 4.3, 4.2, 1200),
        make_candidate("c", 6.1, 3.8, 2000),
    ]
    results = score_candidates(candidates)
    assert results[0].provider_id == "a"


def test_score_candidates_empty_returns_empty():
    assert score_candidates([]) == []


def test_score_custom_weights():
    candidates = [
        make_candidate("a", 0.1, 2.0, 5000),  # very close, low rating, expensive
        make_candidate("b", 10.0, 5.0, 100),   # far, top rating, cheap
    ]
    # Weight rating and price more → b wins
    results = score_candidates(candidates, ScoringWeights(distance=0.1, rating=0.5, price=0.4))
    assert results[0].provider_id == "b"


```

---

## `backend/tests/test_services/test_maps.py`

```python
from __future__ import annotations

from app.services.maps import _haversine, _haversine_all


def test_haversine_g13_to_g11():
    dist = _haversine(33.6844, 72.9747, 33.6938, 72.9904)
    assert 1.5 < dist < 3.0  # roughly 2 km


def test_haversine_same_point_is_zero():
    assert _haversine(33.6844, 72.9747, 33.6844, 72.9747) == 0.0


def test_haversine_all_returns_all_candidates():
    result = _haversine_all(
        origin="33.6844,72.9747",
        candidate_ids=["a", "b"],
        candidate_geos={"a": "33.6938,72.9904", "b": "33.7092,73.0232"},
    )
    assert set(result.keys()) == {"a", "b"}
    assert result["a"]["distance_km"] < result["b"]["distance_km"]


def test_haversine_all_missing_geo_returns_zero():
    result = _haversine_all(
        origin="33.6844,72.9747",
        candidate_ids=["x"],
        candidate_geos={},  # no geo for x
    )
    assert result["x"]["distance_km"] == 0.0
```

---

## `backend/tests/test_api/test_providers.py`

```python
from __future__ import annotations

import uuid
from unittest.mock import patch

import pytest
from fastapi.testclient import TestClient
from sqlmodel import Session

from app.models.provider import Provider
from app.models.service_category import ServiceCategory
from app.models.provider_offering import ProviderOffering


@pytest.fixture(autouse=True)
def mock_token(mock_jwt_payload):
    with patch("app.api.dependencies.verify_supabase_token", return_value=mock_jwt_payload):
        yield


def test_sync_provider_creates_record(client: TestClient, mock_jwt_payload):
    resp = client.post(
        "/api/v1/providers/me/sync",
        json={"business_name": "Test Biz", "contact_person": "Test Person"},
        headers={"Authorization": "Bearer t"},
    )
    assert resp.status_code == 201
    assert resp.json()["data"]["business_name"] == "Test Biz"


def test_list_providers_is_public(client: TestClient):
    resp = client.get("/api/v1/providers")
    assert resp.status_code == 200


def test_get_provider_not_found_returns_404(client: TestClient):
    resp = client.get(f"/api/v1/providers/{uuid.uuid4()}")
    assert resp.status_code == 404


def test_create_offering_requires_auth(client: TestClient):
    resp = client.post("/api/v1/providers/me/offerings", json={})
    assert resp.status_code in (401, 403)


def test_upsert_schedule(client: TestClient, mock_jwt_payload):
    # Sync provider first
    client.post(
        "/api/v1/providers/me/sync",
        json={"business_name": "Sched Test"},
        headers={"Authorization": "Bearer t"},
    )
    resp = client.put(
        "/api/v1/providers/me/schedule",
        json={"schedule": [{"day_of_week": 0, "start_time": "09:00", "end_time": "17:00", "is_active": True}]},
        headers={"Authorization": "Bearer t"},
    )
    assert resp.status_code == 200
```

---

## `backend/tests/test_api/test_bookings.py`

```python
from __future__ import annotations

import uuid
from unittest.mock import patch

import pytest
from fastapi.testclient import TestClient


@pytest.fixture(autouse=True)
def mock_token(mock_jwt_payload):
    with patch("app.api.dependencies.verify_supabase_token", return_value=mock_jwt_payload):
        yield


def test_list_bookings_returns_200(client: TestClient):
    resp = client.get("/api/v1/bookings", headers={"Authorization": "Bearer t"})
    assert resp.status_code == 200
    assert isinstance(resp.json()["data"], list)


def test_get_nonexistent_booking_returns_404(client: TestClient):
    resp = client.get(f"/api/v1/bookings/{uuid.uuid4()}", headers={"Authorization": "Bearer t"})
    assert resp.status_code == 404


def test_list_bookings_unauthenticated_returns_401(client: TestClient):
    resp = client.get("/api/v1/bookings")
    assert resp.status_code in (401, 403)
```

---

## `backend/tests/test_api/test_reviews.py`

```python
from __future__ import annotations

import uuid
from unittest.mock import patch

import pytest
from fastapi.testclient import TestClient


@pytest.fixture(autouse=True)
def mock_token(mock_jwt_payload):
    with patch("app.api.dependencies.verify_supabase_token", return_value=mock_jwt_payload):
        yield


def test_list_provider_reviews_is_public(client: TestClient):
    resp = client.get(f"/api/v1/providers/{uuid.uuid4()}/reviews")
    assert resp.status_code == 200


def test_create_review_requires_auth(client: TestClient):
    resp = client.post(f"/api/v1/bookings/{uuid.uuid4()}/review", json={"rating_score": 5})
    assert resp.status_code in (401, 403)


def test_create_review_on_nonexistent_booking_returns_404(client: TestClient, mock_jwt_payload):
    resp = client.post(
        f"/api/v1/bookings/{uuid.uuid4()}/review",
        json={"rating_score": 4, "comment": "Great"},
        headers={"Authorization": "Bearer t"},
    )
    assert resp.status_code == 404
```

---

## `backend/tests/test_agents/test_discovery.py`

```python
from __future__ import annotations

import uuid
from unittest.mock import MagicMock, patch

import pytest

from app.agents.discovery import DiscoveryAgent, ProviderList, ProviderCandidate
from app.agents.intent import ExtractedIntent


@pytest.fixture
def agent():
    with patch("app.agents.discovery.genai.Client"):
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
```

---

## `backend/tests/test_agents/test_decision.py`

```python
from __future__ import annotations

import uuid
from unittest.mock import MagicMock, patch

import pytest

from app.agents.decision import DecisionAgent, RankedMatch
from app.agents.discovery import ProviderCandidate, ProviderList


@pytest.fixture
def agent():
    with patch("app.agents.decision.genai.Client"):
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
            ProviderCandidate(provider_id=str(uuid.uuid4()), business_name="Ali AC", distance_km=2.1, rating=4.7, is_available=True, offering_id=str(uuid.uuid4()), base_price=1500),
            ProviderCandidate(provider_id=str(uuid.uuid4()), business_name="Khan AC", distance_km=4.3, rating=4.2, is_available=True, offering_id=str(uuid.uuid4()), base_price=1200),
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
```

---

## `backend/tests/test_agents/test_booking.py`

```python
from __future__ import annotations

import uuid
from datetime import datetime
from unittest.mock import MagicMock, patch

import pytest

from app.agents.booking import BookingAgent, BookingConfirmation
from app.agents.decision import RankedMatch, CandidateScore
from app.agents.intent import ExtractedIntent


@pytest.fixture
def agent():
    with patch("app.agents.booking.genai.Client"):
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

    def test_run_records_trace_on_failure(self, agent, mock_session, mock_service_request, sample_ranked_match, sample_intent):
        mock_session.add.side_effect = RuntimeError("DB write failed")
        with patch("app.agents.booking.record_trace") as mock_trace:
            with patch("app.agents.booking._update_stage"):
                with pytest.raises(RuntimeError):
                    agent.run(sample_ranked_match, sample_intent, mock_service_request, mock_session)
        # record_trace must be called even on failure
        mock_trace.assert_called()
        failure_calls = [c for c in mock_trace.call_args_list if c.kwargs.get("status") == "Failed"]
        assert len(failure_calls) >= 1
```

---

## pytest.ini / pyproject.toml config

Add to `backend/pyproject.toml`:

```toml
[tool.pytest.ini_options]
asyncio_mode = "auto"
testpaths = ["tests"]
```

---

## Verification

```bash
cd backend
uv run pytest tests/test_services/ -v          # no DB needed
uv run pytest tests/test_api/test_catalog.py -v  # needs DB + seeded category
uv run pytest --tb=short                          # full suite
```

## Done When (Rule 3 — all must pass)

| Test file | Needs DB? | Needs Gemini mock? |
|---|---|---|
| `test_services/test_matching.py` | No | No |
| `test_services/test_maps.py` | No | No |
| `test_api/test_catalog.py` | Yes | No |
| `test_api/test_users.py` | Yes | No |
| `test_api/test_providers.py` | Yes | No |
| `test_api/test_bookings.py` | Yes | No |
| `test_api/test_reviews.py` | Yes | No |
| `test_api/test_requests.py` | Yes | No |
| `test_agents/test_intent.py` | No | Yes |
| `test_agents/test_discovery.py` | No | Yes |
| `test_agents/test_decision.py` | No | Yes |
| `test_agents/test_booking.py` | No | Yes |
