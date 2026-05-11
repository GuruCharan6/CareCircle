from __future__ import annotations

from app.core.logging import get_logger
from app.providers.llm.gemini import GeminiProvider

logger = get_logger(__name__)

_ROUTER_SYSTEM_PROMPT = """
You are an expert router for a medical assistant app. Classify the user's query into one of these categories:
- "action": The user wants to TAKE AN ACTION (e.g., schedule an appointment, upload a document, log a voice note).
- "knowledge": The user wants to KNOW SOMETHING (e.g., medical history, medications, lab results, summary of notes).
- "chat": General greeting or conversation.

EXAMPLES:
User: "What was Dad's last HbA1c?"
Response: {"route": "knowledge", "intent": "fetch lab results"}

User: "Schedule a doctor visit for tomorrow"
Response: {"route": "action", "intent": "schedule appointment"}

User: "Hi there!"
Response: {"route": "chat", "intent": "greeting"}

User: {query}
Response: (Return ONLY JSON)
"""


async def classify_query(query: str) -> dict[str, str]:
    """Fast LLM call to classify query route.
    Returns {"route": "sql"|"semantic"|"hybrid", "intent": str}.
    Falls back to "hybrid" on LLM error.
    """
    try:
        llm = GeminiProvider()
        result = await llm.complete_json(query, system_prompt=_ROUTER_SYSTEM_PROMPT)
        route = result.get("route", "hybrid")
        if route not in ("sql", "semantic", "hybrid"):
            route = "hybrid"
        return {"route": route, "intent": result.get("intent", "")}
    except Exception as exc:
        logger.warning("query_router.classify_failed", error=str(exc), query=query[:80])
        return {"route": "hybrid", "intent": ""}
