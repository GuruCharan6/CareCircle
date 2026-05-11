-- Add patient_name and patient_dob to crisis_packets for quick display in emergency card
ALTER TABLE public.crisis_packets
  ADD COLUMN IF NOT EXISTS patient_name TEXT,
  ADD COLUMN IF NOT EXISTS patient_dob  TEXT;
