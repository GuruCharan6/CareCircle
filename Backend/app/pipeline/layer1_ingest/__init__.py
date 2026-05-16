from app.models.source_document import SourceDocument
from app.pipeline.layer1_ingest.doctor_note import DoctorNoteExtractor
from app.pipeline.layer1_ingest.handwritten import HandwrittenNoteExtractor
from app.pipeline.layer1_ingest.lab_report import LabReportExtractor
from app.pipeline.layer1_ingest.prescription import PrescriptionExtractor
from app.pipeline.layer1_ingest.types import IngestedItem
from app.pipeline.layer1_ingest.voice_note import VoiceNoteExtractor
from app.providers.llm.base import LLMProvider

_EXTRACTORS = {
    "prescription":     PrescriptionExtractor,
    "lab_report":       LabReportExtractor,
    "doctor_note":      DoctorNoteExtractor,
    "handwritten_note": HandwrittenNoteExtractor,
    "voice_note":       VoiceNoteExtractor,
}


async def ingest(document: SourceDocument, llm: LLMProvider | None = None) -> IngestedItem:
    extractor_cls = _EXTRACTORS.get(document.document_type)
    if extractor_cls is None:
        raise ValueError(
            f"No extractor for document_type '{document.document_type}' "
            f"(document {document.id})"
        )
    return await extractor_cls().extract(document, llm)
