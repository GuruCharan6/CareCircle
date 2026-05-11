from app.pipeline.layer3_enrich.rules.rule1_med_without_food import Rule1MedWithoutFood
from app.pipeline.layer3_enrich.rules.rule2_drug_interaction import Rule2DrugInteraction
from app.pipeline.layer3_enrich.rules.rule3_lab_trend import Rule3LabTrend
from app.pipeline.layer3_enrich.rules.rule4_new_cardiac_med import Rule4NewCardiacMed
from app.pipeline.layer3_enrich.rules.rule5_caregiver_discrepancy import Rule5CaregiverDiscrepancy
from app.pipeline.layer3_enrich.rules.rule6_meal_skipping import Rule6MealSkipping

ALL_RULES = [
    Rule1MedWithoutFood(),
    Rule2DrugInteraction(),
    Rule3LabTrend(),
    Rule4NewCardiacMed(),
    Rule5CaregiverDiscrepancy(),
    Rule6MealSkipping(),
]
