from __future__ import annotations

from typing import Any

from fastapi import APIRouter, Request, Response
from twilio.request_validator import RequestValidator

from app.api.deps import DBConn
from app.config import settings
from app.core.logging import get_logger
from app.services.whatsapp_service import WhatsAppService

logger = get_logger(__name__)

router = APIRouter(prefix="/webhooks/whatsapp", tags=["whatsapp"])

_WEBHOOK_PATH = "/api/v1/webhooks/whatsapp"


def _validate_twilio_signature(request: Request, payload: dict[str, Any]) -> bool:
    """Verify X-Twilio-Signature (HMAC-SHA1) to reject forged inbound webhook requests.
    Skips validation in dev when twilio_auth_token is not configured.
    """
    if not settings.twilio_auth_token:
        logger.warning("whatsapp_webhook.signature_check_skipped", reason="twilio_auth_token not set")
        return True

    signature = request.headers.get("X-Twilio-Signature", "")
    url = f"{settings.backend_base_url}{_WEBHOOK_PATH}"
    validator = RequestValidator(settings.twilio_auth_token)
    return validator.validate(url, payload, signature)


@router.post("")
async def whatsapp_webhook(
    request: Request,
    conn: DBConn,
) -> Response:
    """
    Twilio WhatsApp inbound webhook.
    Trust boundary: X-Twilio-Signature HMAC-SHA1 validation rejects forged requests.

    Caregiver message flow:
      confirmed caregiver → acknowledge + handle YES/NO
      unknown sender      → default reply
    """
    try:
        payload: dict[str, Any] = await request.form()  # type: ignore[assignment]
        payload = dict(payload)
    except Exception as exc:
        logger.warning("whatsapp_webhook.form_parse_failed", error=str(exc))
        return Response(content="", status_code=200)

    if not _validate_twilio_signature(request, payload):
        logger.warning(
            "whatsapp_webhook.invalid_signature",
            ip=request.client.host if request.client else "unknown",
        )
        return Response(content="Forbidden", status_code=403)

    svc = WhatsAppService(conn)
    await svc.handle_inbound(payload)

    return Response(content="", media_type="text/xml", status_code=200)
