-- Add lab_results snapshot and known_conditions to crisis_packets
ALTER TABLE public.crisis_packets
  ADD COLUMN IF NOT EXISTS lab_results    jsonb   NOT NULL DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS known_conditions text[] NOT NULL DEFAULT '{}';
