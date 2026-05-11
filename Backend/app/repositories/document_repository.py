from datetime import date
from typing import Any
from uuid import UUID

from app.models.source_document import SourceDocument
from app.repositories.base import BaseRepository


class DocumentRepository(BaseRepository):
    async def get_by_id(self, doc_id: UUID) -> SourceDocument | None:
        row = await self.conn.fetchrow(
            "SELECT * FROM public.source_documents WHERE id = $1", doc_id
        )
        return SourceDocument.from_record(row) if row else None

    async def get_by_hash(self, patient_id: UUID, content_hash: str) -> SourceDocument | None:
        row = await self.conn.fetchrow(
            "SELECT * FROM public.source_documents WHERE patient_id = $1 AND content_hash = $2",
            patient_id, content_hash
        )
        return SourceDocument.from_record(row) if row else None

    async def get_by_patient_id(
        self,
        patient_id: UUID,
        document_type: str | None = None,
        status: str | None = None,
        limit: int = 50,
        offset: int = 0,
    ) -> list[SourceDocument]:
        conditions = ["patient_id = $1"]
        params: list[Any] = [patient_id]
        idx = 2
        if document_type:
            conditions.append(f"document_type = ${idx}")
            params.append(document_type)
            idx += 1
        if status:
            conditions.append(f"extraction_status = ${idx}")
            params.append(status)
            idx += 1
        params.extend([limit, offset])
        where = " AND ".join(conditions)
        rows = await self.conn.fetch(
            f"""
            SELECT * FROM public.source_documents
            WHERE {where}
            ORDER BY created_at DESC
            LIMIT ${idx} OFFSET ${idx + 1}
            """,
            *params,
        )
        return [SourceDocument.from_record(r) for r in rows]

    async def create(
        self,
        *,
        id: UUID | None = None,
        patient_id: UUID,
        document_type: str,
        ingestion_source: str,
        file_url: str,
        file_mime_type: str,
        uploaded_by: UUID | None = None,
        caregiver_id: UUID | None = None,
        file_size_bytes: int | None = None,
        event_date: date | None = None,
        content_hash: str | None = None,
    ) -> SourceDocument:
        row = await self.conn.fetchrow(
            """
            INSERT INTO public.source_documents
              (id, patient_id, uploaded_by, caregiver_id, document_type,
               ingestion_source, file_url, file_mime_type, file_size_bytes, event_date, content_hash)
            VALUES (COALESCE($1, gen_random_uuid()), $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
            RETURNING *
            """,
            id, patient_id, uploaded_by, caregiver_id, document_type,
            ingestion_source, file_url, file_mime_type, file_size_bytes, event_date, content_hash,
        )
        return SourceDocument.from_record(row)

    async def update_extraction(
        self,
        doc_id: UUID,
        *,
        extraction_status: str,
        extracted_text: str | None = None,
        extracted_data: dict[str, Any] | None = None,
        field_confidence: dict[str, Any] | None = None,
        document_type: str | None = None,
    ) -> SourceDocument | None:
        row = await self.conn.fetchrow(
            """
            UPDATE public.source_documents SET
              extraction_status = $2,
              extracted_text    = COALESCE($3, extracted_text),
              extracted_data    = COALESCE($4, extracted_data),
              field_confidence  = COALESCE($5, field_confidence),
              document_type     = COALESCE($6, document_type)
            WHERE id = $1
            RETURNING *
            """,
            doc_id, extraction_status, extracted_text, extracted_data, field_confidence, document_type,
        )
        return SourceDocument.from_record(row) if row else None

    async def approve(self, doc_id: UUID) -> SourceDocument | None:
        row = await self.conn.fetchrow(
            """
            UPDATE public.source_documents
            SET extraction_status = 'approved', user_approved_at = now()
            WHERE id = $1
            RETURNING *
            """,
            doc_id,
        )
        return SourceDocument.from_record(row) if row else None

    async def reject(self, doc_id: UUID, reason: str) -> SourceDocument | None:
        row = await self.conn.fetchrow(
            """
            UPDATE public.source_documents
            SET extraction_status = 'rejected', rejection_reason = $2
            WHERE id = $1
            RETURNING *
            """,
            doc_id, reason,
        )
        return SourceDocument.from_record(row) if row else None

    async def save_embedding(self, doc_id: UUID, embedding: list[float]) -> None:
        await self.conn.execute(
            "UPDATE public.source_documents SET embedding = $2 WHERE id = $1",
            doc_id, embedding,
        )

    async def delete(self, doc_id: UUID) -> bool:
        res = await self.conn.execute(
            "DELETE FROM public.source_documents WHERE id = $1",
            doc_id,
        )
        # res is something like "DELETE 1"
        return res == "DELETE 1"
