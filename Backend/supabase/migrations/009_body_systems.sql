-- ============================================================
-- Migration 009: Body System Labels on drug_generic_lookup
-- Adds body_systems text[] to classify each drug by the body
-- system(s) it targets — shown on medication lists everywhere.
-- ============================================================

-- 1. Add column
ALTER TABLE public.drug_generic_lookup
  ADD COLUMN IF NOT EXISTS body_systems text[] NOT NULL DEFAULT '{}';

-- 2. Populate by drug class (ILIKE for case safety)
--    Mix style: condition-first + organ (user preference: Q2 = Mix, Q3 = Both)

-- Diabetes / Metabolic
UPDATE public.drug_generic_lookup
  SET body_systems = ARRAY['Diabetes', 'Metabolic']
  WHERE drug_class ILIKE '%biguanide%'
     OR drug_class ILIKE '%sulfonylurea%'
     OR drug_class ILIKE '%dpp-4%'
     OR drug_class ILIKE '%thiazolidinedione%'
     OR drug_class ILIKE '%glp-1%'
     OR drug_class ILIKE '%alpha-glucosidase%';

-- SGLT2 inhibitors — dual benefit: diabetes + cardioprotective
UPDATE public.drug_generic_lookup
  SET body_systems = ARRAY['Diabetes', 'Heart']
  WHERE drug_class ILIKE '%sglt2%';

-- Cardiac — pure heart function
UPDATE public.drug_generic_lookup
  SET body_systems = ARRAY['Heart']
  WHERE drug_class ILIKE '%nitrate%'
     OR drug_class ILIKE '%cardiac glycoside%';

-- Heart + BP (antihypertensives / anti-arrhythmics)
UPDATE public.drug_generic_lookup
  SET body_systems = ARRAY['Heart', 'BP']
  WHERE drug_class ILIKE '%arb%' AND drug_class NOT ILIKE '%diuretic%'
     OR drug_class ILIKE '%beta blocker%'
     OR drug_class ILIKE '%alpha%blocker%'
     OR drug_class ILIKE '%calcium channel blocker%';

-- ACE Inhibitors — heart + BP + kidney protection
UPDATE public.drug_generic_lookup
  SET body_systems = ARRAY['Heart', 'BP', 'Kidney']
  WHERE drug_class ILIKE '%ace inhibitor%';

-- ARB + Diuretic combo
UPDATE public.drug_generic_lookup
  SET body_systems = ARRAY['Heart', 'BP', 'Kidney']
  WHERE drug_class ILIKE '%arb%' AND drug_class ILIKE '%diuretic%';

-- Diuretics
UPDATE public.drug_generic_lookup
  SET body_systems = ARRAY['Heart', 'Kidney']
  WHERE drug_class ILIKE '%loop diuretic%'
     OR drug_class ILIKE '%potassium-sparing diuretic%'
     OR drug_class ILIKE '%diuretic%'
    AND body_systems = '{}';        -- don't overwrite ARB+Diuretic already set

-- Statins / Cholesterol
UPDATE public.drug_generic_lookup
  SET body_systems = ARRAY['Heart', 'Cholesterol']
  WHERE drug_class ILIKE '%statin%';

-- Antiplatelet / Anticoagulant
UPDATE public.drug_generic_lookup
  SET body_systems = ARRAY['Heart', 'Blood']
  WHERE drug_class ILIKE '%antiplatelet%';

UPDATE public.drug_generic_lookup
  SET body_systems = ARRAY['Blood', 'Heart']
  WHERE drug_class ILIKE '%anticoagulant%'
     OR drug_class ILIKE '%doac%'
     OR drug_class ILIKE '%vitamin k antagonist%';

-- Thyroid
UPDATE public.drug_generic_lookup
  SET body_systems = ARRAY['Thyroid', 'Hormonal']
  WHERE drug_class ILIKE '%thyroid%';

-- GI / Stomach
UPDATE public.drug_generic_lookup
  SET body_systems = ARRAY['Stomach', 'GI']
  WHERE drug_class ILIKE '%proton pump%'
     OR drug_class ILIKE '%ppi%'
     OR drug_class ILIKE '%laxative%';

-- Pain / NSAIDs
UPDATE public.drug_generic_lookup
  SET body_systems = ARRAY['Pain', 'Inflammation']
  WHERE drug_class ILIKE '%nsaid%';

UPDATE public.drug_generic_lookup
  SET body_systems = ARRAY['Pain', 'Fever']
  WHERE drug_class ILIKE '%analgesic%'
     OR drug_class ILIKE '%antipyretic%';

-- Infection / Antibiotics
UPDATE public.drug_generic_lookup
  SET body_systems = ARRAY['Infection']
  WHERE drug_class ILIKE '%penicillin%'
     OR drug_class ILIKE '%macrolide%'
     OR drug_class ILIKE '%fluoroquinolone%'
     OR drug_class ILIKE '%antibiotic%';

-- Bone / Vitamins
UPDATE public.drug_generic_lookup
  SET body_systems = ARRAY['Bone', 'Immune']
  WHERE drug_class ILIKE '%vitamin d%';

UPDATE public.drug_generic_lookup
  SET body_systems = ARRAY['Nervous System', 'Vitamins']
  WHERE drug_class ILIKE '%vitamin b12%'
     OR drug_class ILIKE '%methylcobalamin%'
     OR drug_class ILIKE '%vitamin b complex%'
     OR drug_class ILIKE '%b complex%';

UPDATE public.drug_generic_lookup
  SET body_systems = ARRAY['Bone', 'Vitamins']
  WHERE drug_class ILIKE '%supplement%'
     AND body_systems = '{}';

-- 3. Add GIN index for fast array containment queries (optional but useful)
CREATE INDEX IF NOT EXISTS idx_drug_generic_lookup_body_systems
  ON public.drug_generic_lookup USING GIN (body_systems);
