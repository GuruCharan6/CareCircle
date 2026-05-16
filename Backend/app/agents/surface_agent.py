from uuid import UUID

import asyncpg

from app.core.logging import get_logger
from app.pipeline.layer5_reason.types import ThreePartOutput
from app.providers.push.fcm import FCMClient, FCMError, PushNotification
from app.repositories.notification_repository import NotificationRepository
from app.repositories.patient_repository import PatientRepository
from app.repositories.user_repository import UserRepository

logger = get_logger(__name__)


class SurfaceAgent:
    """
    Routes pipeline ThreePartOutput to the correct notification channel.

    Routing table (from SystemDesign):
      alert  → FCM push (immediate) + notifications row (channel='push')
      watch  → notifications row (channel='in_app', type='watch_event_card')
      inform → no notification; pipeline hypotheses already written to DB

    Alert is reserved for rare, action-required findings.
    Every alert includes: "Flagged by AI — confirm with prescribing doctor."

    Never fires push for watch/inform — alert fatigue = channel permanently lost.
    """

    def __init__(self, conn: asyncpg.Connection) -> None:
        self._conn = conn
        self._patient_repo = PatientRepository(conn)
        self._user_repo = UserRepository(conn)
        self._notification_repo = NotificationRepository(conn)
        self._fcm = FCMClient()

    async def route(self, output: ThreePartOutput) -> None:
        """
        Route pipeline output to appropriate channel based on max_urgency.
        Silently exits for 'inform' urgency — no notification warranted.
        """
        if output.max_urgency == "inform":
            logger.info(
                "surface_agent.inform",
                patient_id=str(output.patient_id),
                reason="inform urgency — no notification",
            )
            return

        patient = await self._patient_repo.get_by_id(output.patient_id)
        if patient is None:
            logger.error("surface_agent.patient_not_found", patient_id=str(output.patient_id))
            return

        user = await self._user_repo.get_by_id(patient.user_id)
        if user is None:
            logger.error("surface_agent.user_not_found", user_id=str(patient.user_id))
            return

        if output.max_urgency == "alert":
            await self._handle_alert(output, patient.user_id, user)
        elif output.max_urgency == "watch":
            await self._handle_watch(output, patient.user_id)

    async def _handle_alert(self, output: ThreePartOutput, user_id: UUID, user) -> None:
        """
        Alert: create notification row + fire FCM push.
        Title is direct and action-oriented. No context, no preamble.
        """
        title = "Health alert — action needed"
        body = self._build_alert_body(output)

        notification = await self._notification_repo.create(
            patient_id=output.patient_id,
            recipient_user_id=user_id,
            type="alert",
            channel="push",
            title=title,
            body=body,
            action_deep_link=f"/patient/{output.patient_id}/alerts",
        )

        # FCM push — only for alerts
        fcm_token = (user.preferences or {}).get("fcm_token") if user.preferences else None
        if fcm_token:
            try:
                await self._fcm.send(
                    fcm_token=fcm_token,
                    notification=PushNotification(
                        title=title,
                        body=body,
                        data={
                            "notification_id": str(notification.id),
                            "patient_id": str(output.patient_id),
                            "deep_link": f"/patient/{output.patient_id}/alerts",
                        },
                    ),
                )
                await self._notification_repo.mark_sent(notification.id)
                logger.info(
                    "surface_agent.alert_pushed",
                    patient_id=str(output.patient_id),
                    notification_id=str(notification.id),
                )
            except FCMError as exc:
                logger.error(
                    "surface_agent.fcm_error",
                    patient_id=str(output.patient_id),
                    error=str(exc),
                )
                await self._notification_repo.mark_failed(notification.id, str(exc))
        else:
            logger.info(
                "surface_agent.no_fcm_token",
                user_id=str(user_id),
                reason="notification stored as in_app fallback",
            )
            # No FCM token — notification sits in DB for in-app pickup

    async def _handle_watch(self, output: ThreePartOutput, user_id: UUID) -> None:
        """
        Watch: create in-app event card. No push notification.
        Surfaces in next digest and notification history.
        """
        # Derive a specific title from the first hypothesis if available
        if output.hypotheses_text:
            first_line = output.hypotheses_text.strip().splitlines()[0]
            title = first_line[:80] if len(first_line) > 80 else first_line
        else:
            title = "Health observation"
        body = output.plain_summary[:300] if output.plain_summary else "Review your health update."

        await self._notification_repo.create(
            patient_id=output.patient_id,
            recipient_user_id=user_id,
            type="watch_event_card",
            channel="in_app",
            title=title,
            body=body,
            action_deep_link=f"/patient/{output.patient_id}/events",
        )
        logger.info(
            "surface_agent.watch_card_created",
            patient_id=str(output.patient_id),
        )

    @staticmethod
    def _build_alert_body(output: ThreePartOutput) -> str:
        """
        Build alert body. Direct, action-oriented. No context preamble.
        Takes first hypothesis if available, else plain_summary.
        Appends AI disclaimer per SystemDesign.
        """
        if output.hypotheses_text:
            core = output.hypotheses_text[0]
        elif output.plain_summary:
            core = output.plain_summary[:200]
        else:
            core = "Urgent finding detected."

        return f"{core} Flagged by AI — confirm with prescribing doctor."
