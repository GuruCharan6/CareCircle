from __future__ import annotations

from typing import Any
from uuid import UUID

import asyncpg

from app.cache.query_embedding_cache import get_query_embedding, set_query_embedding
from app.providers.llm.gemini import GeminiProvider
from app.repositories.document_chunk_repository import DocumentChunkRepository
from app.repositories.document_repository import DocumentRepository


class SearchResult:
    def __init__(
        self,
        *,
        entity_id: UUID,
        entity_type: str,  # 'document' | 'observation' | 'medication' | 'calendar_event'
        title: str,
        subtitle: str | None = None,
        event_date: str | None = None,
        created_at: str,
        excerpt: str | None = None,
        relevance_type: str = "sql",  # 'sql' | 'semantic'
        score: float = 0.0,
        metadata: dict[str, Any] | None = None,
    ) -> None:
        self.entity_id = entity_id
        self.entity_type = entity_type
        self.title = title
        self.subtitle = subtitle
        self.event_date = event_date
        self.created_at = created_at
        self.excerpt = excerpt
        self.relevance_type = relevance_type
        self.score = score
        self.metadata = metadata or {}


class SearchService:
    def __init__(self, conn: asyncpg.Connection) -> None:
        self._conn = conn
        self._doc_repo = DocumentRepository(conn)
        self._chunk_repo = DocumentChunkRepository(conn)
        self._llm = GeminiProvider()

    async def search(
        self,
        query: str,
        patient_id: UUID,
        filter_type: str | None = None,  # 'prescription'|'lab_report'|'observation'|etc.
        limit: int = 20,
    ) -> list[SearchResult]:
        """Global system search across documents, observations, meds, and events."""
        results: list[SearchResult] = []

        # 1. Search Documents (SQL + Semantic)
        doc_results = await self._search_documents(query, patient_id, filter_type, limit)
        results.extend(doc_results)

        # 2. Search Observations (If no filter or filter allows it)
        if not filter_type or filter_type == 'observation':
            obs_results = await self._search_observations(query, patient_id, limit)
            results.extend(obs_results)

        # 3. Search Medications
        if not filter_type or filter_type == 'medication' or filter_type == 'prescription':
            med_results = await self._search_medications(query, patient_id, limit)
            results.extend(med_results)

        # 4. Search Calendar
        if not filter_type or filter_type == 'appointment':
            cal_results = await self._search_calendar(query, patient_id, limit)
            results.extend(cal_results)

        # Sort by date (descending)
        results.sort(key=lambda x: x.event_date or x.created_at, reverse=True)

        return results[:limit]

    async def _get_query_embedding(self, query: str) -> list[float]:
        cached = await get_query_embedding(query)
        if cached is not None:
            return cached
        embedding = await self._llm.embed_query(query)
        await set_query_embedding(query, embedding)
        return embedding

    async def _search_documents(
        self, query: str, patient_id: UUID, doc_type: str | None, limit: int
    ) -> list[SearchResult]:
        sql_results = await self._sql_search_documents(query, patient_id, doc_type, limit)
        sem_results = await self._semantic_search_documents(query, patient_id, doc_type, limit)
        seen: dict[UUID, SearchResult] = {r.entity_id: r for r in sql_results}
        for r in sem_results:
            if r.entity_id not in seen:
                seen[r.entity_id] = r
        return list(seen.values())

    async def _sql_search_documents(
        self,
        query: str,
        patient_id: UUID,
        doc_type: str | None,
        limit: int,
    ) -> list[SearchResult]:
        """Full-text ILIKE search on extracted_text + document metadata."""
        like_q = f"%{query}%"
        if doc_type:
            rows = await self._conn.fetch(
                """
                SELECT id, document_type, ingestion_source, extraction_status,
                       event_date, created_at, extracted_text, extracted_data
                FROM public.source_documents
                WHERE patient_id = $1
                  AND document_type = $2
                  AND (
                    extracted_text ILIKE $3
                    OR extracted_data::text ILIKE $3
                  )
                ORDER BY created_at DESC
                LIMIT $4
                """,
                patient_id, doc_type, like_q, limit,
            )
        else:
            rows = await self._conn.fetch(
                """
                SELECT id, document_type, ingestion_source, extraction_status,
                       event_date, created_at, extracted_text, extracted_data
                FROM public.source_documents
                WHERE patient_id = $1
                  AND (
                    extracted_text ILIKE $2
                    OR extracted_data::text ILIKE $2
                  )
                ORDER BY created_at DESC
                LIMIT $3
                """,
                patient_id, like_q, limit,
            )

        results = []
        for r in rows:
            text = r["extracted_text"] or ""
            excerpt = _excerpt(text, query)

            # Build a nice title
            title = r["document_type"].replace("_", " ").capitalize()
            data = r["extracted_data"] or {}
            subtitle = None
            if r["document_type"] == "prescription":
                doc_name = data.get("prescriber_name") or data.get("doctor_name")
                if doc_name: subtitle = f"Dr. {doc_name}"
            elif r["document_type"] == "lab_report":
                subtitle = data.get("lab_name") or data.get("facility_name")

            results.append(SearchResult(
                entity_id=r["id"],
                entity_type="document",
                title=title,
                subtitle=subtitle,
                event_date=str(r["event_date"]) if r["event_date"] else None,
                created_at=str(r["created_at"]),
                excerpt=excerpt,
                metadata={
                    "document_type": r["document_type"],
                    "ingestion_source": r["ingestion_source"],
                    "extraction_status": r["extraction_status"],
                }
            ))
        return results

    async def _semantic_search_documents(
        self,
        query: str,
        patient_id: UUID,
        doc_type: str | None,
        limit: int,
    ) -> list[SearchResult]:
        """Vector similarity search on document_chunks → fetch parent source_document."""
        query_embedding = await self._get_query_embedding(query)

        # If doc_type filter, get candidate doc IDs first
        source_document_ids = None
        if doc_type:
            rows = await self._conn.fetch(
                """
                SELECT id FROM public.source_documents
                WHERE patient_id = $1 AND document_type = $2
                """,
                patient_id, doc_type,
            )
            source_document_ids = [r["id"] for r in rows]
            if not source_document_ids:
                return []

        chunks = await self._chunk_repo.similarity_search(
            patient_id=patient_id,
            query_embedding=query_embedding,
            limit=limit,
            source_document_ids=source_document_ids,
        )

        seen: dict[UUID, SearchResult] = {}
        for chunk in chunks:
            if chunk.source_document_id in seen:
                continue
            row = await self._conn.fetchrow(
                """
                SELECT id, document_type, ingestion_source, extraction_status,
                       event_date, created_at
                FROM public.source_documents WHERE id = $1
                """,
                chunk.source_document_id,
            )
            if not row:
                continue
            seen[chunk.source_document_id] = SearchResult(
                entity_id=row["id"],
                entity_type="document",
                title=row["document_type"].replace("_", " ").capitalize(),
                event_date=str(row["event_date"]) if row["event_date"] else None,
                created_at=str(row["created_at"]),
                excerpt=chunk.chunk_text[:200],
                relevance_type="semantic",
                metadata={
                    "document_type": row["document_type"],
                    "ingestion_source": row["ingestion_source"],
                    "extraction_status": row["extraction_status"],
                }
            )

        return list(seen.values())

    async def _search_observations(self, query: str, patient_id: UUID, limit: int) -> list[SearchResult]:
        like_q = f"%{query}%"
        rows = await self._conn.fetch(
            """
            SELECT id, observation_date, created_at, mood, energy_level,
                   symptoms_reported, meal_notes, mobility_notes, raw_transcript
            FROM public.observations
            WHERE patient_id = $1
              AND (
                mood ILIKE $2
                OR meal_notes ILIKE $2
                OR mobility_notes ILIKE $2
                OR raw_transcript ILIKE $2
                OR array_to_string(symptoms_reported, ', ') ILIKE $2
              )
            ORDER BY observation_date DESC
            LIMIT $3
            """,
            patient_id, like_q, limit
        )
        results = []
        for r in rows:
            text = r["raw_transcript"] or r["meal_notes"] or r["mobility_notes"] or ""
            results.append(SearchResult(
                entity_id=r["id"],
                entity_type="observation",
                title="Daily Log" if not r["mood"] else f"Mood: {r['mood']}",
                subtitle=", ".join(r["symptoms_reported"][:3]) if r["symptoms_reported"] else None,
                event_date=str(r["observation_date"]),
                created_at=str(r["created_at"]),
                excerpt=_excerpt(text, query),
            ))
        return results

    async def _search_medications(self, query: str, patient_id: UUID, limit: int) -> list[SearchResult]:
        like_q = f"%{query}%"
        rows = await self._conn.fetch(
            """
            SELECT id, generic_name, brand_name, dose, frequency, created_at
            FROM public.medications
            WHERE patient_id = $1
              AND (
                generic_name ILIKE $2
                OR brand_name ILIKE $2
                OR notes ILIKE $2
              )
            ORDER BY created_at DESC
            LIMIT $3
            """,
            patient_id, like_q, limit
        )
        results = []
        for r in rows:
            results.append(SearchResult(
                entity_id=r["id"],
                entity_type="medication",
                title=r["generic_name"],
                subtitle=r["brand_name"] if r["brand_name"] else None,
                created_at=str(r["created_at"]),
                excerpt=f"{r['dose']} · {r['frequency']}",
            ))
        return results

    async def _search_calendar(self, query: str, patient_id: UUID, limit: int) -> list[SearchResult]:
        like_q = f"%{query}%"
        rows = await self._conn.fetch(
            """
            SELECT id, title, event_type, event_date, location, notes, created_at
            FROM public.calendar_events
            WHERE patient_id = $1
              AND (
                title ILIKE $2
                OR location ILIKE $2
                OR notes ILIKE $2
                OR specialist_type ILIKE $2
              )
            ORDER BY event_date DESC
            LIMIT $3
            """,
            patient_id, like_q, limit
        )
        results = []
        for r in rows:
            results.append(SearchResult(
                entity_id=r["id"],
                entity_type="calendar_event",
                title=r["title"],
                subtitle=f"{r['event_type'].capitalize()} · {r['location']}" if r["location"] else r["event_type"].capitalize(),
                event_date=str(r["event_date"]),
                created_at=str(r["created_at"]),
                excerpt=_excerpt(r["notes"] or "", query),
            ))
        return results


def _excerpt(text: str, query: str, window: int = 150) -> str | None:
    """Return a snippet of text around the first occurrence of query."""
    if not text:
        return None
    idx = text.lower().find(query.lower())
    if idx == -1:
        return text[:window] + ("…" if len(text) > window else "")
    start = max(0, idx - 40)
    end = min(len(text), idx + window)
    return ("…" if start else "") + text[start:end] + ("…" if end < len(text) else "")
