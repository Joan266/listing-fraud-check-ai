"""Unit tests for risk scoring logic."""
import pytest

# Set env vars before app imports
import os
os.environ.setdefault("DATABASE_URL", "sqlite:///test.db")
os.environ.setdefault("GOOGLE_API_KEY", "test-key")
os.environ.setdefault("GOOGLE_GEMINI_API_KEY", "test-key")
os.environ.setdefault("GOOGLE_SEARCH_ENGINE_ID", "test-id")
os.environ.setdefault("ENVIRONMENT", "production")

from app.utils.validators import validate_external_url, sanitize_user_text


class TestUrlValidator:
    """Tests for SSRF-prevention URL validator."""

    def test_valid_https_url(self):
        url = "https://www.idealista.com/listing/12345"
        assert validate_external_url(url) == url

    def test_valid_http_url(self):
        url = "http://example.com/listing"
        assert validate_external_url(url) == url

    def test_blocks_localhost(self):
        with pytest.raises(ValueError, match="Blocked host"):
            validate_external_url("http://localhost:8080/admin")

    def test_blocks_127_0_0_1(self):
        with pytest.raises(ValueError, match="Blocked host"):
            validate_external_url("http://127.0.0.1/secret")

    def test_blocks_metadata_endpoint(self):
        with pytest.raises(ValueError, match="Blocked host"):
            validate_external_url("http://169.254.169.254/latest/meta-data/")

    def test_blocks_ftp_scheme(self):
        with pytest.raises(ValueError, match="not allowed"):
            validate_external_url("ftp://evil.com/payload")

    def test_blocks_javascript_scheme(self):
        with pytest.raises(ValueError, match="not allowed"):
            validate_external_url("javascript:alert(1)")

    def test_blocks_empty_string(self):
        with pytest.raises(ValueError):
            validate_external_url("")

    def test_blocks_private_ip(self):
        with pytest.raises(ValueError, match="Private"):
            validate_external_url("http://10.0.0.1/internal")

    def test_blocks_no_hostname(self):
        with pytest.raises(ValueError):
            validate_external_url("http:///path")


class TestSanitizeUserText:
    """Tests for user text sanitization."""

    def test_preserves_normal_text(self):
        text = "Nice apartment in Madrid"
        assert sanitize_user_text(text) == text

    def test_removes_null_bytes(self):
        assert sanitize_user_text("hello\x00world") == "helloworld"

    def test_removes_control_chars(self):
        assert sanitize_user_text("hello\x01\x02world") == "helloworld"

    def test_preserves_newlines_and_tabs(self):
        text = "line1\nline2\ttab"
        assert sanitize_user_text(text) == text

    def test_empty_string(self):
        assert sanitize_user_text("") == ""
