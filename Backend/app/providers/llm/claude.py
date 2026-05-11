from __future__ import annotations
import json
from typing import Any, List, Dict, Union

import anthropic

from app.config import settings
from app.core.logging import get_logger
from app.providers.llm.base import LLMProvider

logger = get_logger(__name__)

# Claude — alternative LLM for Layer 5 reasoning.
# Same LLMProvider interface as Gemini — fully swappable.
# embed() + embed_batch() delegate to Gemini: Anthropic has no embedding model.
# To use Claude: set LLM_PROVIDER=claude in env. Factory (below) handles selection.

_MODEL = "claude-sonnet-4-6"


class ClaudeProvider(LLMProvider):
    def __init__(self) -> None:
        self._client = anthropic.AsyncAnthropic(api_key=settings.anthropic_api_key)
        # Embedding falls back to Gemini — import lazily to avoid circular dependency
        self._embed_provider: LLMProvider | None = None

    def _get_embed_provider(self) -> LLMProvider:
        if self._embed_provider is None:
            from app.providers.llm.gemini import GeminiProvider
            self._embed_provider = GeminiProvider()
        return self._embed_provider

    async def complete(
        self,
        prompt: str,
        system_prompt: str | None = None,
        history: Any = None,
        tools: Any = None,
    ) -> Any:
        kwargs: dict[str, Any] = {
            "model": _MODEL,
            "max_tokens": 2048,
            "messages": [{"role": "user", "content": prompt}],
        }
        if system_prompt:
            kwargs["system"] = system_prompt

        response = await self._client.messages.create(stream=False, **kwargs)
        
        # If for some reason it's still a stream, we can't easily get the content without iterating.
        # But explicitly setting stream=False should return a Message object.
        if hasattr(response, "content"):
            return getattr(response.content[0], "text", "")
        
        # Fallback for unexpected types
        return str(response)

    async def complete_json(
        self,
        prompt: str,
        system_prompt: str | None = None,
    ) -> dict[str, Any]:
        json_system = (system_prompt or "") + "\n\nReturn ONLY valid JSON. No prose."
        text = await self.complete(prompt, system_prompt=json_system.strip())
        # Strip markdown code fences if present
        text = text.strip()
        if text.startswith("```"):
            text = text.split("```")[1]
            if text.startswith("json"):
                text = text[4:]
        try:
            return json.loads(text)
        except json.JSONDecodeError as exc:
            logger.error("claude.json_parse_error", raw=text[:300])
            raise ValueError(f"Claude returned invalid JSON: {exc}") from exc

    async def embed(self, text: str) -> list[float]:
        return await self._get_embed_provider().embed(text)

    async def embed_batch(self, texts: list[str]) -> list[list[float]]:
        return await self._get_embed_provider().embed_batch(texts)

    async def embed_query(self, query: str) -> list[float]:
        return await self._get_embed_provider().embed_query(query)
