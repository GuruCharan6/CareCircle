-- Add structured emergency fields to patients
ALTER TABLE public.patients
  ADD COLUMN IF NOT EXISTS emergency_contact_primary   jsonb DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS emergency_contact_secondary jsonb DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS primary_physician           jsonb DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS nearest_hospital            jsonb DEFAULT NULL;

-- emergency_contact_primary / secondary: {name, phone, relationship}
-- primary_physician: {name, phone}
-- nearest_hospital: {name, phone}
