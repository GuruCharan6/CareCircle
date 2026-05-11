from __future__ import annotations
from typing import Any
from uuid import UUID

from app.models.document_chunk import DocumentChunk
from app.repositories.base import BaseRepository


class DocumentChunkRepository(BaseRepository):
    async def get_by_source_document(self, source_document_id: UUID) -> list[DocumentChunk]:
        rows = await self.conn.fetch(
            """
            SELECT * FROM public.document_chunks
            WHERE source_document_id = $1
            ORDER BY chunk_index ASC
            """,
            source_document_id,
        )
        return [DocumentChunk.from_record(r) for r in rows]

    async def create(
        self,
        *,
        source_document_id: UUID,
        patient_id: UUID,
        chunk_text: str,
        chunk_index: int,
        embedding: list[float],
        token_count: int | None = None,
        metadata: dict[str, Any] | None = None,
    ) -> DocumentChunk:
        row = await self.conn.fetchrow(
            """
            INSERT INTO public.document_chunks
              (source_document_id, patient_id, chunk_text, chunk_index,
               embedding, token_count, metadata)
            VALUES ($1,$2,$3,$4,$5::vector,$6,$7)
            RETURNING *
            """,
            source_document_id, patient_id, chunk_text, chunk_index,
            str(embedding), token_count, metadata or {},
        )
        return DocumentChunk.from_record(row)

    async def bulk_create(self, chunks: list[dict[str, Any]]) -> int:
        """Insert multiple chunks at once. Returns count inserted."""
        records = [
            (
                c["source_document_id"], c["patient_id"], c["chunk_text"],
                c["chunk_index"], str(c["embedding"]), c.get("token_count"),
                c.get("metadata", {}),
            )
            for c in chunks
        ]
        result = await self.conn.executemany(
            """
            INSERT INTO public.document_chunks
              (source_document_id, patient_id, chunk_text, chunk_index,
               embedding, token_count, metadata)
            VALUES ($1,$2,$3,$4,$5::vector,$6,$7)
            """,
            records,
        )
        return len(records)

    async def similarity_search(
        self,
        patient_id: UUID,
        query_embedding: list[float],
        limit: int = 10,
        source_document_ids: list[UUID] | None = None,
    ) -> list[DocumentChunk]:
        """
        Vector cosine similarity search — always filtered by patient_id.
        """
        if source_document_ids:
            rows = await self.conn.fetch(
                """
                SELECT * FROM public.document_chunks
                WHERE patient_id = $1
                  AND source_document_id = ANY($3::uuid[])
                ORDER BY embedding <=> $2::vector
                LIMIT $4
                """,
                patient_id, str(query_embedding), source_document_ids, limit,
            )
        else:
            rows = await self.conn.fetch(
                """
                SELECT * FROM public.document_chunks
                WHERE patient_id = $1
                ORDER BY embedding <=> $2::vector
                LIMIT $3
                """,
                patient_id, str(query_embedding), limit,
            )
        return [DocumentChunk.from_record(r) for r in rows]

    async def hybrid_search(
        self,
        patient_id: UUID,
        query_text: str,
        query_embedding: list[float],
        limit: int = 10,
    ) -> list[DocumentChunk]:
        """
        Combines Vector Search and Full-Text Search with RRF.
        Falls back to vector-only if fts_tokens column not yet migrated.
        """
        try:
            rows = await self.conn.fetch(
                """
                WITH vector_search AS (
                  SELECT id, row_number() OVER (ORDER BY embedding <=> $2::vector) as rank
                  FROM public.document_chunks
                  WHERE patient_id = $1
                  LIMIT 20
                ),
                fts_search AS (
                  SELECT id, row_number() OVER (ORDER BY ts_rank_cd(fts_tokens, plainto_tsquery('english', $3)) DESC) as rank
                  FROM public.document_chunks
                  WHERE patient_id = $1 AND fts_tokens @@ plainto_tsquery('english', $3)
                  LIMIT 20
                )
                SELECT dc.*
                FROM public.document_chunks dc
                JOIN (
                  SELECT
                    COALESCE(v.id, f.id) as id,
                    (COALESCE(1.0 / (60 + v.rank), 0.0) + COALESCE(1.0 / (60 + f.rank), 0.0)) as score
                  FROM vector_search v
                  FULL OUTER JOIN fts_search f ON v.id = f.id
                  ORDER BY score DESC
                  LIMIT $4
                ) combined ON dc.id = combined.id
                ORDER BY combined.score DESC;
                """,
                patient_id, str(query_embedding), query_text, limit
            )
        except Exception:
            # fts_tokens column not yet migrated — fall back to vector-only search
            rows = await self.conn.fetch(
                """
                SELECT * FROM public.document_chunks
                WHERE patient_id = $1
                ORDER BY embedding <=> $2::vector
                LIMIT $3
                """,
                patient_id, str(query_embedding), limit,
            )
        return [DocumentChunk.from_record(r) for r in rows]

    async def delete_by_source_document(self, source_document_id: UUID) -> int:
        result = await self.conn.execute(
            "DELETE FROM public.document_chunks WHERE source_document_id = $1",
            source_document_id,
        )
        return int(result.split()[-1])
