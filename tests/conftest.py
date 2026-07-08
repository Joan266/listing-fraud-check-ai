"""Test configuration — sets env vars before any app imports."""
import os

os.environ.setdefault("DATABASE_URL", "sqlite:///test.db")
os.environ.setdefault("GOOGLE_API_KEY", "test-google-key")
os.environ.setdefault("GOOGLE_GEMINI_API_KEY", "test-gemini-key")
os.environ.setdefault("GOOGLE_SEARCH_ENGINE_ID", "test-search-id")
os.environ.setdefault("ENVIRONMENT", "production")  # skip dev table creation

import pytest
from unittest.mock import AsyncMock, MagicMock
from httpx import AsyncClient, ASGITransport

from app.main import app
from app.db.session import async_get_db
from app.core.limiter import limiter as rate_limiter


@pytest.fixture
def mock_db():
    """Mock async DB session."""
    session = AsyncMock()
    session.execute = AsyncMock()
    session.commit = AsyncMock()
    session.refresh = AsyncMock()
    session.add = MagicMock()
    return session


@pytest.fixture
async def client(mock_db: AsyncMock):
    """Async HTTP test client with mocked DB and rate limiting disabled."""

    async def _override_db():
        yield mock_db

    app.dependency_overrides[async_get_db] = _override_db

    # Disable rate limiter for tests
    rate_limiter.enabled = False

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac

    rate_limiter.enabled = True
    app.dependency_overrides.clear()
