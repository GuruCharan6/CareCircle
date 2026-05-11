-- Migration: 014_allow_null_lab_results
-- Description: Allow NULL values for value and unit in lab_results to support ordered tests without results.

ALTER TABLE public.lab_results ALTER COLUMN value DROP NOT NULL;
ALTER TABLE public.lab_results ALTER COLUMN unit DROP NOT NULL;
