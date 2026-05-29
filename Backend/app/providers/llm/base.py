from __future__ import annotations

from abc import ABC, abstractmethod
from typing import Any


class LLMProvider(ABC):
    """ABC for all LLM providers. Layer 5 reasoning + drug interaction checker use this.
    LLM is communication layer only — never generates clinical logic, never resolves conflicts.
    """

    @abstractmethod
    async def complete(
        self,
        prompt: str,
        system_prompt: str | None = None,
        history: Any = None,
        tools: Any = None,
    ) -> Any:
        """Generate plain-text completion or tool calls."""

    @abstractmethod
    async def complete_json(
        self,
        prompt: str,
        system_prompt: str | None = None,
        thinking_budget: int = 0,
    ) -> dict[str, Any]:
        """Generate JSON-structured completion. Used for drug interaction checker.
        Must return valid parsed dict — never raw string.
        Raises ValueError if model returns non-JSON or JSON fails schema."""

    @abstractmethod
    async def embed(self, text: str) -> list[float]:
        """Embed text to vector. Used by lib/embedding.py for document chunks.
        Returns 1536-dim vector for text-embedding-3-small,
        768-dim for Gemini text-embedding-004."""

    @abstractmethod
    async def embed_batch(self, texts: list[str]) -> list[list[float]]:
        """Batch embed for chunker efficiency."""

    @abstractmethod
    async def embed_query(self, query: str) -> list[float]:
        """Embed a search query. Uses RETRIEVAL_QUERY task type for better search accuracy.
        Different task type from embed() which uses RETRIEVAL_DOCUMENT."""
