import json

from app.core.logging import get_logger
from app.pipeline.layer3_enrich.types import URGENCY_ALERT, URGENCY_INFORM, URGENCY_WATCH
from app.pipeline.layer5_reason.system_prompt import LAYER5_PROMPT_TEMPLATE, LAYER5_SYSTEM_PROMPT
from app.pipeline.layer5_reason.types import ReasoningInput, ThreePartOutput
from app.providers.llm.base import LLMProvider

logger = get_logger(__name__)

_URGENCY_ORDER = {URGENCY_ALERT: 3, URGENCY_WATCH: 2, URGENCY_INFORM: 1}

_STRUCTURED_SYSTEM_PROMPT = LAYER5_SYSTEM_PROMPT + """

IMPORTANT: Return a JSON object with this exact structure:
{
  "known_facts": ["<fact 1 attributed to source>", ...],
  "hypotheses_text": ["<hypothesis in plain language>", ...],
  "unknowns": ["<specific gap + concrete action>", ...],
  "plain_summary": "<full readable summary, 3-4 short paragraphs max>"
}
"""


def _build_hypotheses_block(input: ReasoningInput) -> str:
    if not input.hypotheses:
        return "No clinical concerns flagged by rules engine."
    lines = []
    for h in input.hypotheses:
        lines.append(f"- [{h.urgency.upper()}] {h.hypothesis_text}")
    return "\n".join(lines)


def _build_conflicts_block(input: ReasoningInput) -> str:
    if not input.conflicts:
        return "No conflicts detected between data sources."
    lines = []
    for c in input.conflicts:
        lines.append(
            f"- [{c.conflict_type.upper()}] {c.conflict_description}"
            + (f" Suggested action: {c.meera_suggested_action}" if c.meera_suggested_action else "")
        )
    return "\n".join(lines)


def _determine_max_urgency(input: ReasoningInput) -> str:
    if not input.hypotheses:
        return URGENCY_INFORM
    return max(
        (h.urgency for h in input.hypotheses),
        key=lambda u: _URGENCY_ORDER.get(u, 0),
    )


async def format_three_part_output(
    input: ReasoningInput,
    llm: LLMProvider,
) -> ThreePartOutput:
    """
    Call LLM to produce the three-part output from pre-built inference.
    LLM explains — it does NOT generate new clinical logic.
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

    prompt = LAYER5_PROMPT_TEMPLATE.format(
        patient_name=input.patient_name,
        conditions=", ".join(input.known_conditions) if input.known_conditions else "no documented conditions",
        hypotheses_block=_build_hypotheses_block(input),
        conflicts_block=_build_conflicts_block(input),
        source_type=input.source_type,
        dimension=input.dimension,
    )

    try:
        result = await llm.complete_json(prompt, system_prompt=_STRUCTURED_SYSTEM_PROMPT)
    except Exception as exc:
        logger.error("layer5.llm_error", patient_id=str(input.patient_id), error=str(exc))
        # Fallback: return raw hypothesis text without LLM formatting.
        return _fallback_output(input)

    max_urgency = _determine_max_urgency(input)

    return ThreePartOutput(
        known_facts=result.get("known_facts") or [],
        hypotheses_text=result.get("hypotheses_text") or [],
        unknowns=result.get("unknowns") or [],
        max_urgency=max_urgency,
        plain_summary=result.get("plain_summary") or "",
        patient_id=input.patient_id,
    )


def _fallback_output(input: ReasoningInput) -> ThreePartOutput:
    """Used when LLM call fails — surfaces raw rule output without formatting."""
    max_urgency = _determine_max_urgency(input)
    facts = [h.hypothesis_text for h in input.hypotheses]
    return ThreePartOutput(
        known_facts=facts,
        hypotheses_text=[],
        unknowns=[c.meera_suggested_action or "" for c in input.conflicts if c.meera_suggested_action],
        max_urgency=max_urgency,
        plain_summary="\n".join(facts) if facts else "No concerns flagged.",
        patient_id=input.patient_id,
    )
