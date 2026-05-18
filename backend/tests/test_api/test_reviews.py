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
