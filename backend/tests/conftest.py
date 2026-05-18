from __future__ import annotations

import uuid
from typing import AsyncGenerator, Generator

import pytest
import pytest_asyncio
from fastapi.testclient import TestClient
from httpx import AsyncClient
from sqlmodel import Session, SQLModel, create_engine

from app.config import settings
from app.main import app

test_engine = create_engine(settings.database_url, echo=False)


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
