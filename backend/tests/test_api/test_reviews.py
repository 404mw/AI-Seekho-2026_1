from __future__ import annotations

import uuid

import pytest
from fastapi.testclient import TestClient


def test_list_provider_reviews_is_public(client: TestClient):
    resp = client.get(f"/api/v1/providers/{uuid.uuid4()}/reviews")
    assert resp.status_code == 200


def test_create_review_requires_auth(client: TestClient):
    resp = client.post(f"/api/v1/bookings/{uuid.uuid4()}/review", json={"rating_score": 5})
    assert resp.status_code in (401, 403)


def test_create_review_on_nonexistent_booking_returns_404(authed_client: TestClient):
    resp = authed_client.post(
        f"/api/v1/bookings/{uuid.uuid4()}/review",
        json={"rating_score": 4, "comment": "Great"},
        headers={"Authorization": "Bearer t"},
    )
    assert resp.status_code == 404
