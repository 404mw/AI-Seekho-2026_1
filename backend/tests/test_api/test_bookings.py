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
