"""API tests for /api/v1/webhooks/whatsapp — no auth required."""
from unittest.mock import AsyncMock, MagicMock, patch

import pytest


@pytest.fixture(autouse=True)
def mock_whatsapp_service():
    """Patch WhatsAppService so no Twilio init happens during webhook tests."""
    svc = MagicMock()
    svc.handle_inbound = AsyncMock(return_value=None)
    with patch("app.api.v1.routes.whatsapp.WhatsAppService", return_value=svc):
        yield svc


class TestWhatsappWebhook:
    async def test_webhook_returns_200_with_empty_body(self, client):
        response = await client.post(
            "/api/v1/webhooks/whatsapp",
            content=b"From=whatsapp%3A%2B919876543210&Body=YES",
            headers={"Content-Type": "application/x-www-form-urlencoded"},
        )
        assert response.status_code == 200
        # Twilio expects empty XML body
        assert response.text == ""

    async def test_webhook_no_auth_required(self, anon_client):
        """WhatsApp webhook is unauthenticated — Twilio signature is trust boundary."""
        response = await anon_client.post(
            "/api/v1/webhooks/whatsapp",
            content=b"From=whatsapp%3A%2B919876543210&Body=YES",
            headers={"Content-Type": "application/x-www-form-urlencoded"},
        )
        assert response.status_code == 200

    async def test_webhook_handles_empty_body_gracefully(self, client):
        response = await client.post(
            "/api/v1/webhooks/whatsapp",
            content=b"",
            headers={"Content-Type": "application/x-www-form-urlencoded"},
        )
        assert response.status_code == 200

    async def test_webhook_handles_malformed_payload(self, client):
        """Malformed form data → 200 (Twilio suppresses retry on malformed)."""
        response = await client.post(
            "/api/v1/webhooks/whatsapp",
            content=b"%%%invalid%%%",
            headers={"Content-Type": "application/x-www-form-urlencoded"},
        )
        # Endpoint returns 200 always to prevent Twilio retry loops
        assert response.status_code == 200
