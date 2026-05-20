from __future__ import annotations

import uuid
from typing import AsyncGenerator, Generator

import pytest
import pytest_asyncio
from fastapi.testclient import TestClient
from httpx import AsyncClient
from sqlmodel import Session, SQLModel, create_engine

from app.api.dependencies import verify_supabase_token
from app.config import settings
from app.main import app

test_engine = create_engine(settings.database_url, echo=False)


_TEST_EMAIL = "testuser@example.com"


@pytest.fixture(scope="session", autouse=True)
def cleanup_test_data():
    """Delete stale test rows in FK-safe order before the suite runs."""
    from sqlalchemy import text

    SQLModel.metadata.create_all(test_engine)
    with test_engine.connect() as conn:
        conn.execute(text("""
            DELETE FROM agent_trace
            WHERE service_request_id IN (
                SELECT sr.id FROM service_request sr
                JOIN "user" u ON sr.user_id = u.id
                WHERE u.email = :email
            )
        """), {"email": _TEST_EMAIL})
        conn.execute(text("""
            DELETE FROM booking
            WHERE service_request_id IN (
                SELECT sr.id FROM service_request sr
                JOIN "user" u ON sr.user_id = u.id
                WHERE u.email = :email
            )
        """), {"email": _TEST_EMAIL})
        conn.execute(text("""
            DELETE FROM service_request
            WHERE user_id IN (SELECT id FROM "user" WHERE email = :email)
        """), {"email": _TEST_EMAIL})
        conn.execute(text("""
            DELETE FROM review
            WHERE provider_id IN (SELECT id FROM provider WHERE email = :email)
        """), {"email": _TEST_EMAIL})
        conn.execute(text("""
            DELETE FROM booking
            WHERE provider_id IN (SELECT id FROM provider WHERE email = :email)
        """), {"email": _TEST_EMAIL})
        conn.execute(text("""
            DELETE FROM provider_schedule
            WHERE provider_id IN (SELECT id FROM provider WHERE email = :email)
        """), {"email": _TEST_EMAIL})
        conn.execute(text("""
            DELETE FROM provider_time_off
            WHERE provider_id IN (SELECT id FROM provider WHERE email = :email)
        """), {"email": _TEST_EMAIL})
        conn.execute(text("""
            DELETE FROM provider_offering
            WHERE provider_id IN (SELECT id FROM provider WHERE email = :email)
        """), {"email": _TEST_EMAIL})
        conn.execute(text("DELETE FROM provider WHERE email = :email"), {"email": _TEST_EMAIL})
        conn.execute(text('DELETE FROM "user" WHERE email = :email'), {"email": _TEST_EMAIL})
        conn.commit()


@pytest.fixture(scope="session")
def create_test_tables():
    """Create all tables once per test session. Only used by DB-dependent tests."""
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
def db_session(create_test_tables) -> Generator[Session, None, None]:
    """Yields a real DB session. Depends on create_test_tables."""
    with Session(test_engine) as session:
        yield session


@pytest.fixture
def client() -> Generator[TestClient, None, None]:
    """Synchronous test client for non-async tests."""
    with TestClient(app) as c:
        yield c


@pytest.fixture
def authed_client(mock_jwt_payload) -> Generator[TestClient, None, None]:
    """Test client with verify_supabase_token overridden via dependency_overrides."""
    app.dependency_overrides[verify_supabase_token] = lambda: mock_jwt_payload
    with TestClient(app) as c:
        yield c
    app.dependency_overrides.pop(verify_supabase_token, None)


@pytest_asyncio.fixture
async def async_client() -> AsyncGenerator[AsyncClient, None]:
    """Async test client for async route tests."""
    async with AsyncClient(app=app, base_url="http://test") as c:
        yield c


_TEST_USER_ID = uuid.UUID("00000000-0000-4000-8000-000000000001")


@pytest.fixture
def mock_jwt_payload() -> dict:
    """A stable JWT payload — fixed UUID so upsert logic handles repeated runs cleanly."""
    return {
        "sub": str(_TEST_USER_ID),
        "email": "testuser@example.com",
        "role": "authenticated",
    }
