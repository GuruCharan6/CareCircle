-- Migration 021: Allow text/plain MIME type in source_documents
-- Required for crisis follow-up text notes stored as source_documents.

ALTER TABLE public.source_documents DROP CONSTRAINT source_documents_file_mime_type_check;

ALTER TABLE public.source_documents ADD CONSTRAINT source_documents_file_mime_type_check
  CHECK (
    file_mime_type LIKE 'image/%' OR
    file_mime_type LIKE 'audio/%' OR
    file_mime_type = 'application/pdf' OR
    file_mime_type = 'text/plain'
  );
