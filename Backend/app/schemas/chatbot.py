from datetime import datetime
from typing import Any
from uuid import UUID

from pydantic import BaseModel


class ChatHistoryItem(BaseModel):
    role: str  # 'user'|'assistant'
    content: str


class ChatRequest(BaseModel):
    query: str
    query_type: str | None = None  # 'sql'|'semantic'|'hybrid'
    history: list[ChatHistoryItem] = []
    local_time: str | None = None  # ISO string from frontend


class ChatSource(BaseModel):
    source_type: str   # 'lab_result'|'observation'|'medication'|'calendar_event'|'document_chunk'
    source_id: UUID
    excerpt: str | None = None  # relevant snippet
    date: str | None = None


class ProposedAction(BaseModel):
    action_type: str
    description: str
    payload: dict[str, Any]


class SuggestedPrompt(BaseModel):
    """Context-aware suggested prompts shown on chatbot open."""
    text: str
    query_type: str = "hybrid"  # if tapping triggers a query directly


class ToolCall(BaseModel):
    """Native LLM tool call representation."""
    name: str
    args: dict[str, Any]


class ChatResponse(BaseModel):
    answer: str
    query_type: str   # 'sql'|'semantic'|'hybrid'|'action'
    sources: list[str] = []
    proposed_actions: list[ProposedAction] = []
    tool_calls: list[ToolCall] = []
    processing_steps: list[str] = []  # e.g. ["Fetched lab results", "Searched medical notes"]
    suggested_prompts: list[SuggestedPrompt] = []
    generated_at: datetime
    redirect_url: str | None = None  # frontend navigates here on confirm (upload_trigger, log_observation)


class ChatActionConfirm(BaseModel):
    """Confirm a pending chatbot action (add calendar event, log observation, etc.)."""
    action_type: str   # 'add_calendar_event'|'log_observation'|'upload_trigger'
    payload: dict[str, Any]
