from app.models.source_document import SourceDocument
from app.pipeline.layer1_ingest.doctor_note import DoctorNoteExtractor
from app.pipeline.layer1_ingest.types import IngestedItem
from app.providers.llm.base import LLMProvider


class HandwrittenNoteExtractor(DoctorNoteExtractor):
    """
    Handwritten notes use the same GeminiVision doctor_note prompt.
    Extraction shape is identical to DoctorNoteExtractor.
    Only source_type differs so Layer 2 can assign correct reliability prior.
    """

    async def extract(
        self,
        document: SourceDocument,
        llm: LLMProvider | None = None,
    ) -> IngestedItem:
        item = await super().extract(document, llm)
        # Override source_type — handwritten = lower confidence than typed doctor note.
        item.source_type = "handwritten_note"
        return item
