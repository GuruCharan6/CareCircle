from abc import ABC, abstractmethod

from app.models.source_document import SourceDocument
from app.pipeline.layer1_ingest.types import IngestedItem
from app.providers.llm.base import LLMProvider


class BaseExtractor(ABC):
    """
    One extractor per source type.
    Each is independently auditable and replaceable.
    Extractors do NOT call external APIs — data was already extracted at upload time.
    Exception: VoiceNoteExtractor uses LLM for NLP if extracted_data lacks structured fields.
    """

    @abstractmethod
    async def extract(
        self,
        document: SourceDocument,
        llm: LLMProvider | None = None,
    ) -> IngestedItem:
        """
        Parse document.extracted_data into a strongly-typed IngestedItem.
        Raises ValueError if required fields are missing or malformed.
        """
