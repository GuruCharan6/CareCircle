from __future__ import annotations
import asyncio
import json
from typing import Any, List, Dict, Union

from google import genai
from google.genai import types
from google.api_core import exceptions
from tenacity import retry, retry_if_exception_type, stop_after_attempt, wait_exponential

from app.config import settings
from app.core.logging import get_logger
from app.providers.llm.base import LLMProvider

logger = get_logger(__name__)

# Gemini is primary LLM for:
#   - Layer 5 reasoning (digest / chatbot plain-language output)
#   - Drug interaction checker (hardcoded system prompt → JSON)
#   - Embeddings: text-embedding-004 (768-dim, multilingual, handles Hinglish)
#
# text-embedding-004 chosen over text-embedding-3-small (OpenAI) and multilingual-e5-large:
#   - Same provider as LLM+vision — no extra API key
#   - Saravam outputs normalized Hinglish text, not raw dialect — Gemini handles it
#   - Swap to multilingual-e5-large in lib/embedding.py if retrieval quality degrades


def _build_schema(d: dict) -> types.Schema:
    """Recursively convert a JSON Schema dict to types.Schema."""
    _type_map = {
        "object": "OBJECT", "string": "STRING",
        "integer": "INTEGER", "number": "NUMBER",
        "boolean": "BOOLEAN", "array": "ARRAY",
    }
    props = {k: _build_schema(v) for k, v in d.get("properties", {}).items()}
    return types.Schema(
        type=_type_map.get(d.get("type", "object"), "OBJECT"),
        description=d.get("description") or None,
        properties=props or None,
        required=d.get("required") or None,
        enum=d.get("enum") or None,
    )


def _to_gemini_tools(tools: list[dict]) -> list[types.Tool]:
    """Convert OpenAI-style function dicts to a single Gemini Tool object."""
    func_decls = []
    for t in tools:
        params_dict = t.get("parameters", {})
        has_params = bool(params_dict.get("properties") or params_dict.get("required"))
        func_decls.append(types.FunctionDeclaration(
            name=t["name"],
            description=t.get("description", ""),
            parameters=_build_schema(params_dict) if has_params else None,
        ))
    return [types.Tool(function_declarations=func_decls)]


class GeminiProvider(LLMProvider):
    def __init__(self, model: str | None = None) -> None:
        self._client = genai.Client(api_key=settings.gemini_api_key)
        self._embed_client = genai.Client(api_key=settings.gemini_api_key)
        self._embedding_model = "text-embedding-004"
        self._model = model or settings.gemini_model

    @retry(
        retry=retry_if_exception_type(exceptions.ResourceExhausted),
        stop=stop_after_attempt(3),
        wait=wait_exponential(multiplier=1, min=4, max=60),
        reraise=True,
    )
    async def complete(
        self,
        prompt: str,
        system_prompt: str | None = None,
        history: Any = None,
        tools: Any = None,
    ) -> Any:
        gemini_tools = _to_gemini_tools(tools) if tools else None
        config = types.GenerateContentConfig(
            temperature=0.3,
            system_instruction=system_prompt,
            tools=gemini_tools,
            # Disable AFC — we handle tool dispatch manually in chatbot_service
            automatic_function_calling=types.AutomaticFunctionCallingConfig(disable=True),
            # Cap thinking budget — chatbot benefits from reasoning but not unlimited
            thinking_config=types.ThinkingConfig(thinking_budget=512),
        )

        if history:
            gemini_history: Any = []
            for h in history:
                gemini_history.append({
                    "role": "user" if h.get("role") == "user" else "model",
                    "parts": [{"text": h.get("content", "")}]
                })
            
            chat = self._client.aio.chats.create(
                model=self._model,
                history=gemini_history,
                config=config,
            )
            response = await chat.send_message(prompt)
        else:
            response = await self._client.aio.models.generate_content(
                model=self._model,
                contents=prompt,
                config=config,
            )

        # Collect ALL function calls across all parts (not just parts[0])
        candidates = getattr(response, "candidates", [])
        if candidates and len(candidates) > 0:
            candidate = candidates[0]
            parts = getattr(candidate.content, "parts", [])
            tool_calls = [
                {"name": p.function_call.name, "args": p.function_call.args}
                for p in parts
                if getattr(p, "function_call", None)
            ]
            if tool_calls:
                return tool_calls
            try:
                return getattr(response, "text", "")
            except Exception:
                return ""
        return ""

    @retry(
        retry=retry_if_exception_type(exceptions.ResourceExhausted),
        stop=stop_after_attempt(3),
        wait=wait_exponential(multiplier=1, min=4, max=60),
        reraise=True,
    )
    async def complete_json(
        self,
        prompt: str,
        system_prompt: str | None = None,
        thinking_budget: int = 0,
    ) -> dict[str, Any]:
        config = types.GenerateContentConfig(
            temperature=0.0,
            response_mime_type="application/json",
            system_instruction=system_prompt,
            thinking_config=types.ThinkingConfig(thinking_budget=thinking_budget),
        )
        response = await self._client.aio.models.generate_content(
            model=self._model,
            contents=prompt,
            config=config,
        )
        try:
            return json.loads(response.text) if response.text else {}
        except (json.JSONDecodeError, ValueError) as exc:
            logger.error("gemini.json_parse_error", raw=getattr(response, "text", "")[:300])
            raise ValueError(f"Gemini returned invalid JSON: {exc}") from exc

    async def embed(self, text: str) -> List[float]:
        try:
            result = await self._embed_client.aio.models.embed_content(
                model=self._embedding_model,
                contents=text,
                config=types.EmbedContentConfig(task_type="RETRIEVAL_DOCUMENT"),
            )
            # Defensive access to handle different SDK versions
            embeddings = getattr(result, "embeddings", None)
            if embeddings and len(embeddings) > 0:
                return embeddings[0].values
            
            embedding = getattr(result, "embedding", None)
            if embedding and hasattr(embedding, "values"):
                return embedding.values
            
            return [0.0] * 768
        except Exception as exc:
            logger.error("gemini.embedding_failed", error=str(exc))
            return [0.0] * 768

    async def embed_batch(self, texts: List[str]) -> List[List[float]]:
        if not texts:
            return []
        try:
            results = await asyncio.gather(*[self.embed(t) for t in texts])
            return list(results)
        except Exception as exc:
            logger.error("gemini.embedding_batch_failed", error=str(exc))
            return [[0.0] * 768 for _ in texts]

    async def embed_query(self, query: str) -> List[float]:
        try:
            result = await self._embed_client.aio.models.embed_content(
                model=self._embedding_model,
                contents=query,
                config=types.EmbedContentConfig(task_type="RETRIEVAL_QUERY"),
            )
            embeddings = getattr(result, "embeddings", None)
            if embeddings and len(embeddings) > 0:
                return embeddings[0].values
            
            embedding = getattr(result, "embedding", None)
            if embedding and hasattr(embedding, "values"):
                return embedding.values
            
            return [0.0] * 768
        except Exception as exc:
            logger.error("gemini.embedding_query_failed", error=str(exc))
            return [0.0] * 768
