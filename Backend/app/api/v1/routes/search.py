from __future__ import annotations

from typing import Any
from uuid import UUID

from fastapi import APIRouter, Query
from pydantic import BaseModel

from app.api.deps import CurrentPatient, CurrentUser, DBConn
from app.services.search_service import SearchService

router = APIRouter(prefix="/patients/{patient_id}/search", tags=["search"])


class SearchResultItem(BaseModel):
    entity_id: UUID
    entity_type: str  # 'document' | 'observation' | 'medication' | 'calendar_event'
    title: str
    subtitle: str | None = None
    event_date: str | None = None
    created_at: str
    excerpt: str | None = None
    relevance_type: str
    score: float = 0.0
    metadata: dict[str, Any] = {}


class SearchResponse(BaseModel):
    query: str
    results: list[SearchResultItem]
    total: int


@router.get("", response_model=SearchResponse)
async def global_search(
    patient_id: UUID,
    current_user: CurrentUser,
    current_patient: CurrentPatient,
    conn: DBConn,
    q: str = Query(..., min_length=2, description="Search query"),
    filter_type: str | None = Query(
        None,
        description="Filter by type: prescription|lab_report|observation|medication|appointment",
    ),
    limit: int = Query(20, ge=1, le=50),
) -> SearchResponse:
    """Universal search across documents, observations, medications, and calendar."""
    svc = SearchService(conn)
    results = await svc.search(q, patient_id, filter_type=filter_type, limit=limit)
    items = [
        SearchResultItem(
            entity_id=r.entity_id,
            entity_type=r.entity_type,
            title=r.title,
            subtitle=r.subtitle,
            event_date=r.event_date,
            created_at=r.created_at,
            excerpt=r.excerpt,
            relevance_type=r.relevance_type,
            score=r.score,
            metadata=r.metadata,
        )
        for r in results
    ]
    return SearchResponse(query=q, results=items, total=len(items))
