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
    with patch("app.api.routes.requests._run_pipeline"):
        yield


def test_post_request_returns_202(client: TestClient, mock_jwt_payload):
    with patch("app.api.dependencies.verify_supabase_token", return_value=mock_jwt_payload):
        client.post("/api/v1/users/me/sync", json={"full_name": "Req User"}, headers={"Authorization": "Bearer t"})
        resp = client.post("/api/v1/requests", json={"prompt": "Need AC tech in G-13"}, headers={"Authorization": "Bearer t"})
    assert resp.status_code == 202
    assert resp.json()["data"]["status"] == "pending"


def test_post_request_unauthenticated_returns_401(client: TestClient):
    resp = client.post("/api/v1/requests", json={"prompt": "test"})
    assert resp.status_code in (401, 403)
