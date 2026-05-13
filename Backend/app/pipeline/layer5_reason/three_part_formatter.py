from app.core.logging import get_logger
from app.pipeline.layer3_enrich.types import URGENCY_ALERT, URGENCY_INFORM, URGENCY_WATCH
from app.pipeline.layer5_reason.types import ReasoningInput, ThreePartOutput

logger = get_logger(__name__)

_URGENCY_ORDER = {URGENCY_ALERT: 3, URGENCY_WATCH: 2, URGENCY_INFORM: 1}


def _determine_max_urgency(input: ReasoningInput) -> str:
    if not input.hypotheses:
        return URGENCY_INFORM
    return max(
        (h.urgency for h in input.hypotheses),
        key=lambda u: _URGENCY_ORDER.get(u, 0),
    )


def _build_plain_summary(
    known_facts: list[str],
    hypotheses_text: list[str],
    unknowns: list[str],
    patient_name: str,
) -> str:
    parts: list[str] = []
    if known_facts:
        parts.append(f"For {patient_name}: " + " ".join(known_facts))
    if hypotheses_text:
        parts.append("Concerns to watch: " + " ".join(hypotheses_text))
    if unknowns:
        parts.append("Action needed: " + " ".join(unknowns))
    if not parts:
        return "No new clinical concerns from this document."
    return "\n\n".join(parts)


async def format_three_part_output(
    input: ReasoningInput,
    llm=None,  # kept for call-site compatibility — no longer used
) -> ThreePartOutput:
    """
    Build three-part output from pre-structured hypothesis/conflict data.
    No LLM call — input is already plain-English from the rules engine.
    """
    if not input.hypotheses and not input.conflicts:
        return ThreePartOutput(
            known_facts=["No new clinical concerns from this document."],
            hypotheses_text=[],
            unknowns=[],
            max_urgency=URGENCY_INFORM,
            plain_summary="Nothing requires your attention today.",
            patient_id=input.patient_id,
        )

    # known_facts: inform-urgency hypotheses — background context, no action needed
    known_facts = [
        h.hypothesis_text
        for h in input.hypotheses
        if h.urgency == URGENCY_INFORM
    ]

    # hypotheses_text: watch + alert hypotheses — clinical concerns requiring attention
    hypotheses_text = [
        h.hypothesis_text
        for h in input.hypotheses
        if h.urgency in (URGENCY_WATCH, URGENCY_ALERT)
    ]

    # unknowns: conflicts — data gaps with suggested actions
    unknowns = []
    for c in input.conflicts:
        entry = c.conflict_description
        if c.meera_suggested_action:
            entry += f" → {c.meera_suggested_action}"
        unknowns.append(entry)

    max_urgency = _determine_max_urgency(input)
    plain_summary = _build_plain_summary(
        known_facts, hypotheses_text, unknowns, input.patient_name
    )

    logger.info(
        "layer5.template_output",
        patient_id=str(input.patient_id),
        known_facts=len(known_facts),
        hypotheses=len(hypotheses_text),
        unknowns=len(unknowns),
        max_urgency=max_urgency,
    )

    return ThreePartOutput(
        known_facts=known_facts,
        hypotheses_text=hypotheses_text,
        unknowns=unknowns,
        max_urgency=max_urgency,
        plain_summary=plain_summary,
        patient_id=input.patient_id,
    )
