from dataclasses import dataclass
from typing import Any

from app.config import settings
from app.core.logging import get_logger

logger = get_logger(__name__)

# FCM — Firebase Cloud Messaging.
# Sends push notifications to Flutter app (iOS + Android) + Next.js web push.
# ONLY fires for 'alert' urgency. 'watch' and 'inform' go via digest, not push.
# Alert target: one per month. One per week = noise = channel permanently lost.


@dataclass
class PushNotification:
    title: str
    body: str
    data: dict[str, Any] | None = None   # deep link + entity IDs for app routing
    image_url: str | None = None


class FCMError(Exception):
    pass


class FCMClient:
    def __init__(self) -> None:
        self._app = None

    def _get_app(self) -> Any:
        if self._app is None:
            import json

            import firebase_admin
            from firebase_admin import credentials
            if not firebase_admin._apps:
                if settings.firebase_credentials_json:
                    cred = credentials.Certificate(json.loads(settings.firebase_credentials_json))
                elif settings.firebase_credentials_path:
                    cred = credentials.Certificate(settings.firebase_credentials_path)
                else:
                    raise FCMError("Firebase not configured: set FIREBASE_CREDENTIALS_JSON or FIREBASE_CREDENTIALS_PATH")
                self._app = firebase_admin.initialize_app(cred)
            else:
                self._app = firebase_admin.get_app()
        return self._app

    async def send(self, fcm_token: str, notification: PushNotification) -> str:
        """Send push notification to single device token.
        Returns FCM message ID.
        Raises FCMError on failure.
        """
        from firebase_admin import messaging
        self._get_app()

        msg = messaging.Message(
            notification=messaging.Notification(
                title=notification.title,
                body=notification.body,
                image=notification.image_url,
            ),
            data={k: str(v) for k, v in (notification.data or {}).items()},
            token=fcm_token,
            android=messaging.AndroidConfig(
                priority="high",
                notification=messaging.AndroidNotification(
                    sound="default",
                    click_action="FLUTTER_NOTIFICATION_CLICK",
                ),
            ),
            apns=messaging.APNSConfig(
                payload=messaging.APNSPayload(
                    aps=messaging.Aps(sound="default"),
                ),
            ),
        )

        try:
            message_id = messaging.send(msg)
            logger.info("fcm.sent", message_id=message_id, token=fcm_token[:10] + "...")
            return message_id
        except Exception as exc:
            logger.error("fcm.send_error", error=str(exc), token=fcm_token[:10] + "...")
            raise FCMError(f"FCM send failed: {exc}") from exc

    async def send_multicast(
        self,
        fcm_tokens: list[str],
        notification: PushNotification,
    ) -> dict[str, int]:
        """Send to multiple tokens. Returns {success: N, failure: N}."""
        from firebase_admin import messaging
        self._get_app()

        msg = messaging.MulticastMessage(
            notification=messaging.Notification(
                title=notification.title,
                body=notification.body,
            ),
            data={k: str(v) for k, v in (notification.data or {}).items()},
            tokens=fcm_tokens,
        )

        try:
            response = messaging.send_each_for_multicast(msg)
            logger.info(
                "fcm.multicast_sent",
                success=response.success_count,
                failure=response.failure_count,
            )
            return {
                "success": response.success_count,
                "failure": response.failure_count,
            }
        except Exception as exc:
            logger.error("fcm.multicast_error", error=str(exc))
            raise FCMError(f"FCM multicast failed: {exc}") from exc
