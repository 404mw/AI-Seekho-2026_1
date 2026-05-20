from __future__ import annotations

import pytest
from fastapi.testclient import TestClient


def test_sync_user_creates_record(authed_client: TestClient, mock_jwt_payload):
    resp = authed_client.post(
        "/api/v1/users/me/sync",
        json={"full_name": "Test User"},
        headers={"Authorization": "Bearer t"},
    )
    assert resp.status_code == 201
    data = resp.json()
    assert data["data"]["email"] == mock_jwt_payload["email"]


def test_sync_user_is_idempotent(authed_client: TestClient):
    body = {"full_name": "Test User"}
    authed_client.post("/api/v1/users/me/sync", json=body, headers={"Authorization": "Bearer t"})
    resp = authed_client.post(
        "/api/v1/users/me/sync",
        json={"full_name": "Updated Name"},
        headers={"Authorization": "Bearer t"},
    )
    assert resp.status_code == 201
    assert resp.json()["data"]["full_name"] == "Updated Name"


def test_get_me_returns_profile(authed_client: TestClient):
    authed_client.post("/api/v1/users/me/sync", json={"full_name": "Test User"}, headers={"Authorization": "Bearer t"})
    resp = authed_client.get("/api/v1/users/me", headers={"Authorization": "Bearer t"})
    assert resp.status_code == 200
    assert resp.json()["data"]["full_name"] == "Test User"


def test_get_me_unauthenticated_returns_403(client: TestClient):
    resp = client.get("/api/v1/users/me")
    assert resp.status_code in (401, 403)
