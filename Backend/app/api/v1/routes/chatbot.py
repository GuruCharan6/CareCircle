from __future__ import annotations

from uuid import UUID

from fastapi import APIRouter

from app.api.deps import CurrentPatient, CurrentUser, DBConn
from app.schemas.chatbot import (
    ChatActionConfirm,
    ChatRequest,
    ChatResponse,
    SuggestedPrompt,
)
from app.services.chatbot_service import ChatbotService

router = APIRouter(prefix="/patients/{patient_id}/chatbot", tags=["chatbot"])


@router.post("/query", response_model=ChatResponse)
async def chatbot_query(
    patient_id: UUID,
    body: ChatRequest,
    current_user: CurrentUser,
    current_patient: CurrentPatient,
    conn: DBConn,
) -> ChatResponse:
    """Route query through SQL / semantic / hybrid based on intent classification."""
    svc = ChatbotService(conn)
    return await svc.query(body.query, patient_id, body.query_type, body.history, body.local_time)


@router.post("/action/confirm", response_model=ChatResponse)
async def chatbot_action_confirm(
    patient_id: UUID,
    body: ChatActionConfirm,
    current_user: CurrentUser,
    current_patient: CurrentPatient,
    conn: DBConn,
) -> ChatResponse:
    """Execute a chatbot-proposed action after Meera confirms."""
    svc = ChatbotService(conn)
    return await svc.confirm_action(body, patient_id, current_user.id)


@router.get("/suggested-prompts", response_model=list[SuggestedPrompt])
async def get_suggested_prompts(
    patient_id: UUID,
    current_user: CurrentUser,
    current_patient: CurrentPatient,
    conn: DBConn,
) -> list[SuggestedPrompt]:
    """Context-aware suggested prompts shown on chatbot open."""
    svc = ChatbotService(conn)
    return await svc.suggested_prompts(patient_id)
