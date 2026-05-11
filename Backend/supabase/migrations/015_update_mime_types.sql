-- Migration: 015_update_mime_types
-- Description: Update file_mime_type check constraint in source_documents to support more audio formats (e.g. webm from browsers).

ALTER TABLE public.source_documents DROP CONSTRAINT source_documents_file_mime_type_check;

ALTER TABLE public.source_documents ADD CONSTRAINT source_documents_file_mime_type_check
  CHECK (
    file_mime_type LIKE 'image/%' OR 
    file_mime_type LIKE 'audio/%' OR 
    file_mime_type = 'application/pdf'
  );
