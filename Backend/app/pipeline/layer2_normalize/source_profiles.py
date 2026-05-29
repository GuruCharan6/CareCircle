from app.pipeline.layer2_normalize.types import (
    BIAS_ANXIETY_FILTERED,
    BIAS_NONE,
    BIAS_OVER_REPORT,
    DIM_BEHAVIORAL_OBSERVABLE,
    DIM_BIOCHEMICAL,
    DIM_CLINICAL_INSTRUCTION,
    DIM_SUBJECTIVE_EXPERIENCE,
    RELIABILITY_HIGH,
    RELIABILITY_MODERATE,
    RELIABILITY_VERY_HIGH,
    SourceProfile,
)

# Maps source_type → (reliability, structural_bias, default_dimension).
# Dimension may be further refined by DimensionTagger for mixed-content sources.
_SOURCE_PROFILE_MAP: dict[str, tuple[str, str, str]] = {
    "prescription": (
        RELIABILITY_VERY_HIGH,
        BIAS_NONE,
        DIM_CLINICAL_INSTRUCTION,
    ),
    "lab_report": (
        RELIABILITY_VERY_HIGH,
        BIAS_NONE,
        DIM_BIOCHEMICAL,
    ),
    "doctor_note": (
        RELIABILITY_VERY_HIGH,
        BIAS_NONE,
        DIM_CLINICAL_INSTRUCTION,
    ),
    "handwritten_note": (
        RELIABILITY_HIGH,          # slightly lower — OCR uncertainty on handwriting
        BIAS_NONE,
        DIM_CLINICAL_INSTRUCTION,
    ),
    "voice_note_caregiver": (
        RELIABILITY_HIGH,
        BIAS_OVER_REPORT,
        DIM_BEHAVIORAL_OBSERVABLE,
    ),
    "voice_note_meera": (
        RELIABILITY_MODERATE,
        BIAS_ANXIETY_FILTERED,
        DIM_SUBJECTIVE_EXPERIENCE,  # Meera relays Dad's subjective experience + her filter
    ),
}


def get_source_profile(source_type: str) -> SourceProfile:
    """
    Returns fixed reliability, bias, dimension for a source type.
    Falls back to moderate/none/subjective_experience for unknown types.
    """
    entry = _SOURCE_PROFILE_MAP.get(source_type)
    if entry is None:
        return SourceProfile(
            source_type=source_type,
            reliability=RELIABILITY_MODERATE,
            structural_bias=BIAS_NONE,
            dimension=DIM_SUBJECTIVE_EXPERIENCE,
        )
    reliability, bias, dimension = entry
    return SourceProfile(
        source_type=source_type,
        reliability=reliability,
        structural_bias=bias,
        dimension=dimension,
    )
