-- Migration 020: Remove unknown drug interaction records
-- unknown = Gemini found no clinically significant interaction.
-- These inflate the interaction count. Redis handles the 30-day re-query cache.

DELETE FROM public.drug_interaction_results
WHERE interaction = 'unknown';
