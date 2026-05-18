from __future__ import annotations

import uuid

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
    resp = client.get(f"/api/v1/catalog/categories/{uuid.uuid4()}")
    assert resp.status_code == 404
