from app.models.observation import Observation
from app.pipeline.layer2_normalize.types import NormalizedItem
from app.pipeline.layer4_reconcile.type_a_temporal import detect_temporal_conflicts
from app.pipeline.layer4_reconcile.type_b_observational import detect_observational_conflicts
from app.pipeline.layer4_reconcile.type_c_dimensional import detect_dimensional_conflicts
from app.pipeline.layer4_reconcile.type_d_factual import detect_factual_conflicts
from app.pipeline.layer4_reconcile.types import ClassifiedConflict


def classify_conflicts(
    item: NormalizedItem,
    recent_observations: list[Observation],
    recent_normalized_items: list[NormalizedItem],
) -> list[ClassifiedConflict]:
    """
    Run all conflict classifiers against current item and recent patient data.
    Returns all conflicts found — caller writes them to DB.

    Never resolves. Never picks winner. Never averages.
    The gap between what was reported and what was expected
    is where clinical signal lives.
    """
    all_conflicts: list[ClassifiedConflict] = []

    all_conflicts.extend(detect_temporal_conflicts(item, recent_observations))
    all_conflicts.extend(detect_observational_conflicts(item, recent_observations))
    all_conflicts.extend(detect_dimensional_conflicts(item, recent_normalized_items))
    all_conflicts.extend(detect_factual_conflicts(item, recent_observations))

    return all_conflicts
