from __future__ import annotations
from datetime import datetime
from typing import Any
from uuid import UUID

from app.models.base import ORMBase


class DocumentChunk(ORMBase):
    id: UUID
    source_document_id: UUID
    patient_id: UUID
    chunk_text: str
    chunk_index: int
    token_count: int | None = None
    # vector(1536) — returned as list[float] by pgvector asyncpg codec
    embedding: list[float]
    metadata: dict[str, Any] = {}
    created_at: datetime | None = None
