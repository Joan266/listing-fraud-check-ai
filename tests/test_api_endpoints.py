"""E2E tests for backend API endpoints."""
import uuid
from unittest.mock import patch, MagicMock, AsyncMock

import pytest

pytestmark = pytest.mark.asyncio


# ---------------------------------------------------------------------------
# POST /api/v1/extract-data
# ---------------------------------------------------------------------------

class TestExtractData:
    """Tests for the text extraction endpoint."""

    async def test_extract_data_success(self, client):
        """Valid listing content returns extracted data."""
        mock_result = {
            "address": "Calle Mayor 10, Madrid",
            "description": "Piso luminoso en el centro",
            "property_type": "apartment",
        }
        with patch(
            "app.services.extract_data_service.extract_and_format_data",
            return_value=mock_result,
        ):
            response = await client.post(
                "/api/v1/extract-data",
                json={
                    "session_id": "test-session-123",
                    "listing_content": "A" * 150,
                },
            )
        assert response.status_code == 200
        data = response.json()
        assert "extracted_data" in data
        assert data["extracted_data"]["address"] == "Calle Mayor 10, Madrid"

    async def test_extract_data_empty_content(self, client):
        """Empty listing content returns 400."""
        response = await client.post(
            "/api/v1/extract-data",
            json={"session_id": "test-session", "listing_content": ""},
        )
        assert response.status_code == 400

    async def test_extract_data_too_long(self, client):
        """Content exceeding 50k chars returns 400."""
        response = await client.post(
            "/api/v1/extract-data",
            json={
                "session_id": "test-session",
                "listing_content": "X" * 50_001,
            },
        )
        assert response.status_code == 422  # Pydantic validation

    async def test_extract_data_missing_session(self, client):
        """Missing session_id returns 422 (validation error)."""
        response = await client.post(
            "/api/v1/extract-data",
            json={"listing_content": "A" * 150},
        )
        assert response.status_code == 422


# ---------------------------------------------------------------------------
# POST /api/v1/extract-from-url
# ---------------------------------------------------------------------------

class TestExtractFromUrl:
    """Tests for the URL extraction endpoint."""

    async def test_extract_url_success(self, client):
        """Valid URL returns extracted data with scrape metadata."""
        mock_scrape = {
            "markdown": "# Nice apartment\n" * 20,
            "source": "firecrawl",
            "screenshot_url": "https://example.com/screenshot.png",
        }
        mock_extracted = {
            "address": "Calle Gran Via 25, Madrid",
            "description": "Beautiful apartment",
        }
        with patch(
            "app.services.url_scraper.scrape_url",
            return_value=mock_scrape,
        ), patch(
            "app.services.extract_data_service.extract_and_format_data",
            return_value=mock_extracted,
        ):
            response = await client.post(
                "/api/v1/extract-from-url",
                json={
                    "session_id": "test-session",
                    "listing_url": "https://www.idealista.com/listing/12345",
                },
            )
        assert response.status_code == 200
        data = response.json()
        assert data["extracted_data"]["address"] == "Calle Gran Via 25, Madrid"
        assert data["scrape_source"] == "firecrawl"

    async def test_extract_url_blocked_site(self, client):
        """When scraper returns blocked/empty content, returns 422."""
        mock_scrape = {"markdown": "", "source": "blocked"}
        with patch(
            "app.services.url_scraper.scrape_url",
            return_value=mock_scrape,
        ):
            response = await client.post(
                "/api/v1/extract-from-url",
                json={
                    "session_id": "test-session",
                    "listing_url": "https://www.airbnb.com/rooms/12345",
                },
            )
        assert response.status_code == 422

    async def test_extract_url_ssrf_blocked(self, client):
        """Localhost/private IPs are blocked (SSRF prevention)."""
        response = await client.post(
            "/api/v1/extract-from-url",
            json={
                "session_id": "test-session",
                "listing_url": "http://localhost:8080/admin",
            },
        )
        assert response.status_code == 400

    async def test_extract_url_invalid_scheme(self, client):
        """Non-HTTP schemes are blocked."""
        response = await client.post(
            "/api/v1/extract-from-url",
            json={
                "session_id": "test-session",
                "listing_url": "ftp://evil.com/payload",
            },
        )
        assert response.status_code == 400


# ---------------------------------------------------------------------------
# GET /api/v1/analysis/{check_id}
# ---------------------------------------------------------------------------

class TestGetAnalysis:
    """Tests for the analysis status endpoint."""

    async def test_get_analysis_invalid_uuid(self, client):
        """Invalid UUID format returns 400."""
        response = await client.get(
            "/api/v1/analysis/not-a-uuid",
            headers={"session-id": "test-session"},
        )
        assert response.status_code == 400

    async def test_get_analysis_not_found(self, client, mock_db):
        """Non-existent analysis returns 404."""
        mock_result = MagicMock()
        mock_result.scalar_one_or_none.return_value = None
        mock_db.execute.return_value = mock_result

        check_id = str(uuid.uuid4())
        response = await client.get(
            f"/api/v1/analysis/{check_id}",
            headers={"session-id": "test-session"},
        )
        assert response.status_code == 404

    async def test_get_analysis_wrong_session(self, client, mock_db):
        """Accessing another session's analysis returns 403."""
        mock_check = MagicMock()
        mock_check.session_id = "other-session"

        mock_result = MagicMock()
        mock_result.scalar_one_or_none.return_value = mock_check
        mock_db.execute.return_value = mock_result

        check_id = str(uuid.uuid4())
        response = await client.get(
            f"/api/v1/analysis/{check_id}",
            headers={"session-id": "my-session"},
        )
        assert response.status_code == 403


# ---------------------------------------------------------------------------
# POST /api/v1/analysis/{check_id}/feedback
# ---------------------------------------------------------------------------

class TestFeedback:
    """Tests for the feedback endpoint."""

    async def test_feedback_invalid_uuid(self, client):
        """Invalid UUID format returns 400."""
        response = await client.post(
            "/api/v1/analysis/bad-id/feedback",
            json={"was_fraud": True, "comments": "Definitely a scam"},
            headers={"session-id": "test-session"},
        )
        assert response.status_code == 400

    async def test_feedback_not_found(self, client, mock_db):
        """Feedback for non-existent analysis returns 404."""
        mock_result = MagicMock()
        mock_result.scalar_one_or_none.return_value = None
        mock_db.execute.return_value = mock_result

        check_id = str(uuid.uuid4())
        response = await client.post(
            f"/api/v1/analysis/{check_id}/feedback",
            json={"was_fraud": True},
            headers={"session-id": "test-session"},
        )
        assert response.status_code == 404

    async def test_feedback_wrong_session(self, client, mock_db):
        """Submitting feedback for another session's analysis returns 403."""
        mock_check = MagicMock()
        mock_check.session_id = "other-session"

        mock_result = MagicMock()
        mock_result.scalar_one_or_none.return_value = mock_check
        mock_db.execute.return_value = mock_result

        check_id = str(uuid.uuid4())
        response = await client.post(
            f"/api/v1/analysis/{check_id}/feedback",
            json={"was_fraud": False, "comments": "Legit listing"},
            headers={"session-id": "my-session"},
        )
        assert response.status_code == 403


# ---------------------------------------------------------------------------
# Health check
# ---------------------------------------------------------------------------

class TestHealthCheck:
    """Tests for the root health check."""

    async def test_health(self, client):
        """Root endpoint returns status running."""
        response = await client.get("/")
        assert response.status_code == 200
        assert response.json()["status"] == "running"
