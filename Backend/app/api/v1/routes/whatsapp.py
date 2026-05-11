from __future__ import annotations

from typing import Any

from fastapi import APIRouter, Request, Response

from app.api.deps import DBConn
from app.core.logging import get_logger
from app.services.whatsapp_service import WhatsAppService

logger = get_logger(__name__)

router = APIRouter(prefix="/webhooks/whatsapp", tags=["whatsapp"])


@router.post("")
async def whatsapp_webhook(
    request: Request,
    conn: DBConn,
) -> Response:
    """
    Twilio WhatsApp inbound webhook — no auth required (Twilio signature verification
    is the trust boundary; add X-Twilio-Signature validation in production).

    Caregiver message flow:
      confirmed caregiver → acknowledge + handle YES/NO
      unknown sender      → default reply
    """
    try:
        payload: dict[str, Any] = await request.form()  # type: ignore[assignment]
        payload = dict(payload)
    except Exception as exc:
        logger.warning("whatsapp_webhook.form_parse_failed", error=str(exc))
        # Return 200 so Twilio doesn't retry a malformed request
        return Response(content="", status_code=200)

    svc = WhatsAppService(conn)
    await svc.handle_inbound(payload)

    # Twilio expects 200 with empty body (or TwiML) to suppress default reply
    return Response(content="", media_type="text/xml", status_code=200)
