from __future__ import annotations

from datetime import datetime, timezone
from typing import Any
from uuid import UUID

import asyncpg

from app.core.logging import get_logger
from app.providers.llm.gemini import GeminiProvider
from app.repositories.calendar_event_repository import CalendarEventRepository
from app.repositories.clinical_hypothesis_repository import ClinicalHypothesisRepository
from app.repositories.document_chunk_repository import DocumentChunkRepository
from app.repositories.lab_result_repository import LabResultRepository
from app.repositories.medication_refill_repository import MedicationRefillRepository
from app.repositories.medication_repository import MedicationRepository
from app.repositories.observation_repository import ObservationRepository
from app.repositories.patient_repository import PatientRepository
from app.repositories.patient_state_repository import PatientStateRepository
from app.lib.reranker import rerank_chunks
from app.schemas.chatbot import (
    ChatActionConfirm,
    ChatHistoryItem,
    ChatResponse,
    ProposedAction,
    SuggestedPrompt,
)

logger = get_logger(__name__)

_AGENT_SYSTEM_PROMPT = """
You are CareCircle's health assistant. Your goal is to help Meera (the caregiver) manage her patient's health.
Today's date is: {today}.

You have access to TOOLS to fetch medical data or take actions.
STRICT GUIDELINES:
1. ALWAYS use the `search_notes` tool if the user asks about medical history, medications, labs, or doctor notes.
2. If the user wants to schedule something (e.g., "schedule a visit", "book an appointment"):
   - If they haven't given a date, ask for it.
   - If they HAVE given a date, use the `propose_action` tool with `add_calendar_event` or `schedule_caregiver_visit`.
3. Be concise and empathetic.
"""


_TOOL_STEP_LABELS: dict[str, str] = {
    "get_medications": "Fetched active medications",
    "get_lab_results": "Fetched lab results",
    "get_appointments": "Fetched upcoming appointments",
    "search_notes": "Searched medical records",
}

_TOOLS = [
    {
        "name": "get_medications",
        "description": "Fetch the list of currently active medications for the patient.",
        "parameters": {"type": "object", "properties": {}}
    },
    {
        "name": "get_lab_results",
        "description": "Fetch the latest lab test results (HbA1c, blood pressure, etc.).",
        "parameters": {"type": "object", "properties": {}}
    },
    {
        "name": "get_appointments",
        "description": "Fetch upcoming calendar events and appointments.",
        "parameters": {"type": "object", "properties": {}}
    },
    {
        "name": "search_notes",
        "description": "Search through caregiver notes, call logs, and medical documents using natural language.",
        "parameters": {
            "type": "object",
            "properties": {
                "query": {"type": "string", "description": "The search query."}
            },
            "required": ["query"]
        }
    },
    {
        "name": "propose_action",
        "description": (
            "Propose an action to the user. "
            "For 'add_calendar_event' or 'schedule_caregiver_visit': payload MUST include "
            "event_date (YYYY-MM-DD format), title (string), and optionally event_time (HH:MM). "
            "For 'upload_trigger' or 'log_observation': payload can be empty {}. "
            "Always put the date in payload.event_date, NOT only in the description."
        ),
        "parameters": {
            "type": "object",
            "properties": {
                "action_type": {"type": "string", "enum": ["add_calendar_event", "schedule_caregiver_visit", "upload_trigger", "log_observation"]},
                "description": {"type": "string"},
                "payload": {
                    "type": "object",
                    "properties": {
                        "event_date": {"type": "string", "description": "Date in YYYY-MM-DD format. Required for calendar/visit actions."},
                        "title": {"type": "string", "description": "Event title."}
                    }
                }
            },
            "required": ["action_type", "description", "payload"]
        }
    }
]


class ChatbotService:
    def __init__(self, conn: asyncpg.Connection) -> None:
        self._conn = conn
        self._patient_repo = PatientRepository(conn)
        self._med_repo = MedicationRepository(conn)
        self._lab_repo = LabResultRepository(conn)
        self._cal_repo = CalendarEventRepository(conn)
        self._refill_repo = MedicationRefillRepository(conn)
        self._obs_repo = ObservationRepository(conn)
        self._chunk_repo = DocumentChunkRepository(conn)
        self._hyp_repo = ClinicalHypothesisRepository(conn)
        self._state_repo = PatientStateRepository(conn)
        self._llm = GeminiProvider()

    # ── No-LLM action keywords ─────────────────────────────────────────────────

    _UPLOAD_TRIGGERS = (
        "upload prescription", "add prescription", "upload document",
        "add document", "upload file", "new prescription", "new document",
    )
    _LOG_TRIGGERS = (
        "log update", "log dad", "log observation", "voice note",
        "call update", "log today", "record update", "log call",
    )

    async def _no_llm_action_route(
        self, query: str, patient_id: UUID, local_time: str | None
    ) -> ChatResponse | None:
        """Detect clear action intents and return ProposedAction without any LLM call."""
        q = query.lower().strip()
        prompts = await self.suggested_prompts(patient_id)

        if any(kw in q for kw in self._UPLOAD_TRIGGERS):
            return ChatResponse(
                answer="I'll open the upload flow. Tap Confirm to proceed.",
                query_type="action",
                proposed_actions=[ProposedAction(
                    action_type="upload_trigger",
                    description="Open upload flow to add a prescription or document",
                    payload={},
                )],
                suggested_prompts=prompts,
                generated_at=datetime.now(timezone.utc),
            )

        if any(kw in q for kw in self._LOG_TRIGGERS):
            return ChatResponse(
                answer="I'll open the voice recorder. Tap Confirm to start recording.",
                query_type="action",
                proposed_actions=[ProposedAction(
                    action_type="log_observation",
                    description="Open voice recorder to log today's update",
                    payload={"notes": query},
                )],
                suggested_prompts=prompts,
                generated_at=datetime.now(timezone.utc),
            )

        return None

    _MAX_AGENT_ITERATIONS = 3

    async def query(
        self,
        query: str,
        patient_id: UUID,
        query_type: str | None = None,
        history: list[ChatHistoryItem] | None = None,
        local_time: str | None = None,
    ) -> ChatResponse:
        """Entry point for agentic chatbot queries."""
        history = history or []
        today = self._get_today(local_time)
        prompts = await self.suggested_prompts(patient_id)

        # 1. Detect simple intents (Upload/Log)
        no_llm = await self._no_llm_action_route(query, patient_id, local_time)
        if no_llm:
            return no_llm

        # 2. Multi-turn Agentic Loop
        # Tool results accumulate as context; LLM sees them each iteration.
        # This avoids Gemini function_response history format complexity
        # while giving LLM full awareness of prior tool results.
        history_msgs = [{"role": h.role, "content": h.content} for h in history[-6:]]
        collected_contexts: list[str] = []
        all_sources: list[str] = []
        processing_steps: list[str] = []

        try:
            for iteration in range(self._MAX_AGENT_ITERATIONS):
                augmented_prompt = query
                if collected_contexts:
                    augmented_prompt = (
                        f"{query}\n\nDATA RETRIEVED SO FAR:\n"
                        + "\n\n".join(collected_contexts)
                    )

                llm_response = await self._llm.complete(
                    prompt=augmented_prompt,
                    system_prompt=_AGENT_SYSTEM_PROMPT.format(today=today),
                    history=history_msgs,
                    tools=_TOOLS,
                )

                # Plain text = LLM is done
                if not isinstance(llm_response, list):
                    return ChatResponse(
                        answer=str(llm_response),
                        query_type="hybrid" if collected_contexts else "chat",
                        sources=list(set(all_sources)),
                        processing_steps=processing_steps,
                        suggested_prompts=prompts,
                        generated_at=datetime.now(timezone.utc),
                    )

                # Process ALL tool calls returned in this iteration
                for tool_call in llm_response:
                    name = tool_call.get("name", "")
                    args = tool_call.get("args", {})

                    if name == "propose_action":
                        # Synthesize prior tool results into answer text if any exist
                        if collected_contexts:
                            synthesis = await self._llm.complete(
                                prompt=(
                                    f"Answer this part of the user's question using the data below, in 1-2 sentences:\n"
                                    f"Question: {query}\n\n"
                                    f"DATA:\n" + "\n\n".join(collected_contexts)
                                ),
                                system_prompt=f"You are a helpful health assistant. Today is {today}. Be concise.",
                            )
                            answer_text = f"{synthesis}\n\n{args.get('description', '')}. Tap Confirm to proceed."
                        else:
                            answer_text = f"I've prepared that for you. {args.get('description', '')}. Tap Confirm to proceed."
                        return ChatResponse(
                            answer=answer_text,
                            query_type="action",
                            sources=list(set(all_sources)),
                            processing_steps=processing_steps,
                            proposed_actions=[ProposedAction(**args)],
                            suggested_prompts=prompts,
                            generated_at=datetime.now(timezone.utc),
                        )

                    context, sources = await self._execute_tool(name, args, patient_id, history, local_time)
                    if context:
                        collected_contexts.append(context)
                    if sources:
                        all_sources.extend(sources)
                    processing_steps.append(_TOOL_STEP_LABELS.get(name, name))

            # Max iterations reached — synthesize with accumulated data
            if collected_contexts:
                final_answer = await self._llm.complete(
                    prompt=(
                        f"Answer the user's question based on the data below.\n\n"
                        f"Question: {query}\n\n"
                        f"DATA:\n" + "\n\n".join(collected_contexts)
                    ),
                    system_prompt=f"You are a helpful health assistant. Today is {today}. Be concise.",
                )
                return ChatResponse(
                    answer=str(final_answer),
                    query_type="hybrid",
                    sources=list(set(all_sources)),
                    processing_steps=processing_steps,
                    suggested_prompts=prompts,
                    generated_at=datetime.now(timezone.utc),
                )

            return ChatResponse(
                answer="I looked but couldn't find relevant information. Please try rephrasing.",
                query_type="error",
                suggested_prompts=prompts,
                generated_at=datetime.now(timezone.utc),
            )

        except Exception as exc:
            logger.error("chatbot.agent_failed", error=str(exc))
            return ChatResponse(
                answer="I'm having a bit of trouble accessing the records right now. Please try again in a moment.",
                query_type="error",
                suggested_prompts=prompts,
                generated_at=datetime.now(timezone.utc),
            )

    async def _execute_tool(
        self,
        name: str,
        args: dict[str, Any],
        patient_id: UUID,
        history: list[ChatHistoryItem],
        local_time: str | None,
    ) -> tuple[str, list[str]]:
        """Execute a single tool call. Returns (context_str, sources)."""
        if name == "get_medications":
            meds = await self._med_repo.get_active_by_patient(patient_id)
            context = "MEDICATIONS:\n" + "\n".join(
                [f"- {m.generic_name} {m.dose} ({m.frequency})" for m in meds]
            )
            sources = [f"Medication: {m.generic_name}" for m in meds]
            return context, sources

        if name == "get_lab_results":
            labs = await self._lab_repo.get_by_patient_id(patient_id, limit=5)
            context = "LAB RESULTS:\n" + "\n".join(
                [f"- {l.test_name_display}: {l.value} {l.unit}" for l in labs]
            )
            sources = [f"Lab: {l.test_name_display}" for l in labs]
            return context, sources

        if name == "get_appointments":
            events = await self._cal_repo.get_upcoming(patient_id, within_days=30)
            context = "UPCOMING APPOINTMENTS:\n" + "\n".join(
                [f"- {e.event_date}: {e.title}" for e in events]
            )
            sources = [f"Event: {e.title}" for e in events]
            return context, sources

        if name == "search_notes":
            search_query = args.get("query", "")
            query_embedding = await self._llm.embed_query(search_query)
            raw_chunks = await self._chunk_repo.hybrid_search(
                patient_id=patient_id,
                query_text=search_query,
                query_embedding=query_embedding,
                limit=10,
            )
            best_chunks = await rerank_chunks(search_query, raw_chunks, self._llm)
            parts = []
            sources = []
            for c in best_chunks:
                meta = c.metadata or {}
                date_str = c.created_at.strftime("%Y-%m-%d") if c.created_at else "Unknown Date"
                src_type = meta.get("source_type", "record")
                parts.append(f"[{src_type} | {date_str}] {c.chunk_text}")
                sources.append(f"{src_type} ({date_str})")
            context = "MEDICAL NOTES:\n" + "\n\n".join(parts)
            return context, list(set(sources))

        logger.warning("chatbot.unknown_tool", name=name)
        return "", []

    async def confirm_action(
        self, action: ChatActionConfirm, patient_id: UUID, user_id: UUID
    ) -> ChatResponse:
        """Execute a previously proposed chatbot action after Meera confirms."""
        action_type = action.action_type
        payload = action.payload
        result_text = ""

        redirect_url: str | None = None

        if action_type == "add_calendar_event":
            if "event_date" not in payload:
                prompts = await self.suggested_prompts(patient_id)
                return ChatResponse(
                    answer="I need a specific date to add this to the calendar. Could you provide the date (e.g. 'May 15' or '2026-05-15')?",
                    query_type="chat",
                    suggested_prompts=prompts,
                    generated_at=datetime.now(timezone.utc),
                )
            event_date = datetime.strptime(payload["event_date"], "%Y-%m-%d").date()
            await self._cal_repo.create(
                patient_id=patient_id,
                event_type=payload.get("event_type", "appointment"),
                title=payload.get("title", "Appointment"),
                event_date=event_date,
                source="chatbot",
                specialist_type=payload.get("specialist_type"),
                event_time=payload.get("event_time"),
                location=payload.get("location"),
                notes=payload.get("notes"),
            )
            result_text = f"Added to calendar: {payload.get('title', 'Appointment')}."

        elif action_type == "schedule_caregiver_visit":
            if "event_date" not in payload:
                prompts = await self.suggested_prompts(patient_id)
                return ChatResponse(
                    answer="I need a specific date to schedule the visit. Could you provide the date (e.g. 'May 15' or '2026-05-15')?",
                    query_type="chat",
                    suggested_prompts=prompts,
                    generated_at=datetime.now(timezone.utc),
                )
            event_date = datetime.strptime(payload["event_date"], "%Y-%m-%d").date()
            await self._cal_repo.create(
                patient_id=patient_id,
                event_type="caregiver_visit",
                title=payload.get("title", "Caregiver Visit"),
                event_date=event_date,
                source="chatbot",
                status="confirmed",
                notes=payload.get("notes"),
            )
            result_text = f"Caregiver visit scheduled for {payload['event_date']}."

        elif action_type == "confirm_calendar_event":
            event_id_str = payload.get("event_id")
            if event_id_str:
                from uuid import UUID as _UUID
                await self._cal_repo.update_status(_UUID(str(event_id_str)), "confirmed", user_id)
                result_text = f"Confirmed: {payload.get('title', 'event')}."
            else:
                result_text = "Could not confirm — no event ID in payload."

        elif action_type == "log_observation":
            result_text = "Opening voice recorder. Record your update there."
            redirect_url = "/upload"

        elif action_type == "upload_trigger":
            result_text = "Opening upload flow for you."
            redirect_url = "/upload"

        else:
            result_text = f"Action '{action_type}' not yet implemented."

        prompts = await self.suggested_prompts(patient_id)
        return ChatResponse(
            answer=result_text,
            query_type="action",
            suggested_prompts=prompts,
            redirect_url=redirect_url,
            generated_at=datetime.now(timezone.utc),
        )

    def _get_today(self, local_time: str | None) -> str:
        """Get 'today' based on user local time."""
        if local_time:
            try:
                return datetime.fromisoformat(local_time.replace("Z", "+00:00")).date().isoformat()
            except Exception:
                pass
        return datetime.now(timezone.utc).date().isoformat()

    async def suggested_prompts(self, patient_id: UUID) -> list[SuggestedPrompt]:
        """Context-aware suggested prompts on chatbot open."""
        prompts: list[SuggestedPrompt] = []

        upcoming = await self._cal_repo.get_upcoming(patient_id, within_days=10, status="confirmed")
        if upcoming:
            evt = upcoming[0]
            prompts.append(SuggestedPrompt(
                text=f"Tests needed before {evt.title}?",
                query_type="hybrid",
            ))

        state = await self._state_repo.get_by_patient_id(patient_id)
        if state and state.last_caregiver_note_date:
            days_silent = (datetime.now(timezone.utc).date() - state.last_caregiver_note_date).days
            if days_silent >= 3:
                prompts.append(SuggestedPrompt(
                    text="Log caregiver update",
                    query_type="hybrid",
                ))

        defaults = [
            SuggestedPrompt(text="What medications is Dad on?", query_type="sql"),
            SuggestedPrompt(text="Schedule caregiver visits", query_type="hybrid"),
            SuggestedPrompt(text="Log Dad's update", query_type="hybrid"),
            SuggestedPrompt(text="Upload prescription", query_type="hybrid"),
        ]
        for d in defaults:
            if len(prompts) >= 4:
                break
            if not any(p.text == d.text for p in prompts):
                prompts.append(d)

        return prompts[:4]

