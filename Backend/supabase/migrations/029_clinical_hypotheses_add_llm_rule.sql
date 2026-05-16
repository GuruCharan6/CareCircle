-- Migration 029: Add rule_4_llm_general to clinical_hypotheses rule_id check constraint
-- The pipeline's rule4_llm_general.py produces hypotheses with this rule_id,
-- which was not present in the original constraint.

ALTER TABLE public.clinical_hypotheses
  DROP CONSTRAINT IF EXISTS clinical_hypotheses_rule_id_check;

ALTER TABLE public.clinical_hypotheses
  ADD CONSTRAINT clinical_hypotheses_rule_id_check
  CHECK (rule_id IN (
    'rule_1_medication_without_food',
    'rule_2_drug_interaction',
    'rule_3_lab_trend',
    'rule_4_new_cardiac_med',
    'rule_4_llm_general',
    'rule_5_caregiver_patient_discrepancy',
    'rule_6_meal_skipping_pattern'
  ));
