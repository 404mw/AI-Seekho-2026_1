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
    resp = client.post(
        "/api/v1/users/me/sync",
        json={"full_name": "Test User"},
        headers=make_auth_header(mock_jwt_payload),
    )
    assert resp.status_code == 201
    data = resp.json()
    assert data["data"]["email"] == mock_jwt_payload["email"]


def test_sync_user_is_idempotent(client: TestClient, mock_jwt_payload):
    body = {"full_name": "Test User"}
    client.post("/api/v1/users/me/sync", json=body, headers=make_auth_header(mock_jwt_payload))
    resp = client.post(
        "/api/v1/users/me/sync",
        json={"full_name": "Updated Name"},
        headers=make_auth_header(mock_jwt_payload),
    )
    assert resp.status_code == 201
    assert resp.json()["data"]["full_name"] == "Updated Name"


def test_get_me_returns_profile(client: TestClient, mock_jwt_payload):
    client.post("/api/v1/users/me/sync", json={"full_name": "Test User"}, headers=make_auth_header(mock_jwt_payload))
    resp = client.get("/api/v1/users/me", headers=make_auth_header(mock_jwt_payload))
    assert resp.status_code == 200
    assert resp.json()["data"]["full_name"] == "Test User"


def test_get_me_unauthenticated_returns_403(client: TestClient):
    resp = client.get("/api/v1/users/me")
    assert resp.status_code in (401, 403)
