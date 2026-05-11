from typing import Any
from uuid import UUID

import asyncpg

from app.core.logging import get_logger
from app.lib.chunker import chunk_text, estimate_tokens
from app.providers.llm.base import LLMProvider
from app.repositories.document_chunk_repository import DocumentChunkRepository

logger = get_logger(__name__)


async def embed_and_store_document(
    *,
    source_document_id: UUID,
    patient_id: UUID,
    text: str,
    metadata: dict[str, Any],
    conn: asyncpg.Connection,
    llm: LLMProvider,
) -> int:
    """
    Chunk text, embed each chunk via LLM provider, store in document_chunks.

    Returns number of chunks stored.
    Called after document approval — never on user-facing request path.
    """
    chunks = chunk_text(text)
    if not chunks:
        logger.warning(
            "embedding.empty_text",
            source_document_id=str(source_document_id),
        )
        return 0

    embeddings = await llm.embed_batch(chunks)

    repo = DocumentChunkRepository(conn)
    records = [
        {
            "source_document_id": source_document_id,
            "patient_id": patient_id,
            "chunk_text": chunk,
            "chunk_index": idx,
            "embedding": emb,
            "token_count": estimate_tokens(chunk),
            "metadata": metadata,
        }
        for idx, (chunk, emb) in enumerate(zip(chunks, embeddings))
    ]

    count = await repo.bulk_create(records)
    logger.info(
        "embedding.stored",
        source_document_id=str(source_document_id),
        chunk_count=count,
    )
    return count
