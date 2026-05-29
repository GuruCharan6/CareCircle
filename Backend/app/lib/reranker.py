from __future__ import annotations

from app.models.document_chunk import DocumentChunk
from app.providers.llm.base import LLMProvider


async def rerank_chunks(
    query: str,
    chunks: list[DocumentChunk],
    llm: LLMProvider,
) -> list[DocumentChunk]:
    """Return top chunks from hybrid_search result. No LLM call — hybrid_search already ranks by score."""
    return chunks[:4]
