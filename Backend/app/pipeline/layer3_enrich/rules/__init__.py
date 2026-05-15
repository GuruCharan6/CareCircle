from app.pipeline.layer3_enrich.rules.rule1_drug_interaction import Rule1DrugInteraction
from app.pipeline.layer3_enrich.rules.rule2_lab_trend import Rule2LabTrend
from app.pipeline.layer3_enrich.rules.rule3_caregiver_discrepancy import Rule3CaregiverDiscrepancy
from app.pipeline.layer3_enrich.rules.rule4_llm_general import Rule4LLMGeneral

ALL_RULES = [
    Rule1DrugInteraction(),
    Rule2LabTrend(),
    Rule3CaregiverDiscrepancy(),
    Rule4LLMGeneral(),
]
