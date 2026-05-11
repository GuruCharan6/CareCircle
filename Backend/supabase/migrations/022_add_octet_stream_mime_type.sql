-- Migration 022: Allow application/octet-stream MIME type in source_documents
-- Required to bypass specific storage bucket MIME restrictions while maintaining DB integrity.

ALTER TABLE public.source_documents DROP CONSTRAINT IF EXISTS source_documents_file_mime_type_check;

ALTER TABLE public.source_documents ADD CONSTRAINT source_documents_file_mime_type_check
  CHECK (
    file_mime_type LIKE 'image/%' OR
    file_mime_type LIKE 'audio/%' OR
    file_mime_type = 'application/pdf' OR
    file_mime_type = 'text/plain' OR
    file_mime_type = 'application/octet-stream'
  );
