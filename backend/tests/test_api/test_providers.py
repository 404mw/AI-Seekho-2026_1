from __future__ import annotations

import uuid

import pytest
from fastapi.testclient import TestClient


def test_sync_provider_creates_record(authed_client: TestClient):
    resp = authed_client.post(
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


def test_upsert_schedule(authed_client: TestClient):
    authed_client.post(
        "/api/v1/providers/me/sync",
        json={"business_name": "Sched Test"},
        headers={"Authorization": "Bearer t"},
    )
    resp = authed_client.put(
        "/api/v1/providers/me/schedule",
        json={"schedule": [{"day_of_week": 0, "start_time": "09:00", "end_time": "17:00", "is_active": True}]},
        headers={"Authorization": "Bearer t"},
    )
    assert resp.status_code == 200
