from __future__ import annotations

import json

from app.core.logging import get_logger
from app.pipeline.layer2_normalize.types import NormalizedItem
from app.pipeline.layer3_enrich.types import (
    URGENCY_ALERT,
    URGENCY_INFORM,
    URGENCY_WATCH,
    Hypothesis,
    PatientContext,
)
from app.providers.llm.base import LLMProvider

logger = get_logger(__name__)

# Rule 4: LLM General Hypothesis
#
# Async rule — runs outside the sync rules engine, called separately by orchestrator.
# Works for ALL patient types (not condition-specific).
#
# Sends patient context + new document to Gemini → gets 0–3 plain-English clinical
# concerns a family caregiver should know about.
#
# LLM translates data into readable hypotheses. It does NOT generate clinical logic —
# it identifies patterns from the structured data we provide.

_SYSTEM_PROMPT = """You are a clinical assistant helping a family caregiver understand a patient's health.

You will receive structured patient data. Your job is to identify 0 to 3 clinical concerns
that a non-medical family caregiver should be aware of, based ONLY on the data provided.

Rules:
- Base every concern on data explicitly provided. Never invent or assume.
- Write in plain English. No jargon. No abbreviations.
- Do not diagnose. Do not prescribe. Frame as "worth discussing with doctor."
- 0 concerns is valid if nothing is concerning.
- Maximum 3 concerns.

Respond with JSON only:
{
  "hypotheses": [
    {
      "text": "concern in one or two plain-English sentences",
      "confidence": "high|medium|low",
      "urgency": "alert|watch|inform"
    }
  ]
}

urgency guide:
- alert: needs attention today (critical lab, worsening trend, dangerous combination)
- watch: flag for next appointment or daily digest
- inform: background context, no action needed"""


def _build_prompt(item: NormalizedItem, context: PatientContext) -> str:
    patient = context.patient
    conditions = ", ".join(patient.known_conditions or []) or "none recorded"
    meds = ", ".join(
        f"{m.generic_name} ({m.drug_class or 'unknown class'})"
        for m in context.active_medications
    ) or "none"

    obs_lines = []
    for o in sorted(context.recent_observations, key=lambda x: x.observation_date, reverse=True)[:5]:
        parts = [f"[{o.observation_date}] source={o.source_type}"]
        if o.symptoms_reported:
            parts.append(f"symptoms={o.symptoms_reported}")
        if o.symptoms_denied:
            parts.append(f"denied={o.symptoms_denied}")
        if o.symptoms_absent:
            parts.append(f"absent={o.symptoms_absent}")
        if o.mood or o.energy_level:
            parts.append(f"mood={o.mood or 'normal'} energy={o.energy_level or 'normal'}")

        # Observation model has specific notes fields instead of a generic 'notes' field
        notes_bits = []
        if o.meal_notes: notes_bits.append(f"meal: {o.meal_notes}")
        if o.medication_timing_notes: notes_bits.append(f"meds: {o.medication_timing_notes}")
        if o.mobility_notes: notes_bits.append(f"mobility: {o.mobility_notes}")

        if notes_bits:
            notes_text = " | ".join(notes_bits)
            parts.append(f"notes={notes_text[:200]}")
        obs_lines.append(" | ".join(parts))

    labs_lines = []
    for lr in context.recent_lab_results:
        if lr.is_abnormal:
            labs_lines.append(
                f"[{lr.test_date}] {lr.test_name}={lr.value} {lr.unit or ''} (ABNORMAL)"
            )

    interactions_lines = []
    for ix in context.known_interactions:
        interactions_lines.append(
            f"{ix.get('drug_a')} + {ix.get('drug_b')}: severity={ix.get('severity')}, "
            f"type={ix.get('interaction')}"
        )

    extracted = item.ingest.extracted_data or {}

    lines = [
        f"Patient: {patient.name or 'Unknown'}",
        f"Known conditions: {conditions}",
        f"Active medications: {meds}",
        f"",
        f"New document type: {item.source_type}",
        f"Document dimension: {item.profile.dimension}",
    ]

    if extracted:
        lines.append(f"Extracted data from document: {json.dumps(extracted, default=str)[:1000]}")

    if obs_lines:
        lines.append(f"\nRecent observations (newest first):")
        lines.extend(obs_lines)

    if labs_lines:
        lines.append(f"\nAbnormal lab results (last 90 days):")
        lines.extend(labs_lines)

    if interactions_lines:
        lines.append(f"\nKnown drug interactions:")
        lines.extend(interactions_lines)

    return "\n".join(lines)


_VALID_URGENCIES = {URGENCY_ALERT, URGENCY_WATCH, URGENCY_INFORM}
_VALID_CONFIDENCES = {"high", "medium", "low"}


class Rule4LLMGeneral:
    """
    Async LLM-backed rule. Called separately by orchestrator after sync rules.
    Not a BaseRule subclass — async interface.
    """

    async def evaluate(
        self,
        item: NormalizedItem,
        context: PatientContext,
        llm: LLMProvider,
    ) -> list[Hypothesis]:
        prompt = _build_prompt(item, context)

        try:
            result = await llm.complete_json(prompt, system_prompt=_SYSTEM_PROMPT)
        except Exception as exc:
            logger.error("rule4_llm_general.llm_error", error=str(exc))
            return []

        raw_hypotheses = result.get("hypotheses", [])
        if not isinstance(raw_hypotheses, list):
            logger.warning("rule4_llm_general.bad_response", result=result)
            return []

        hypotheses = []
        for h in raw_hypotheses[:3]:
            text = h.get("text", "").strip()
            confidence = h.get("confidence", "medium")
            urgency = h.get("urgency", URGENCY_WATCH)

            if not text:
                continue
            if confidence not in _VALID_CONFIDENCES:
                confidence = "medium"
            if urgency not in _VALID_URGENCIES:
                urgency = URGENCY_WATCH

            hypotheses.append(Hypothesis(
                rule_id="rule_4_llm_general",
                patient_id=context.patient_id,
                trigger_event_type=item.trigger_event_type,
                trigger_event_id=item.ingest.source_document_id,
                hypothesis_text=text,
                confidence=confidence,
                urgency=urgency,
                supporting_evidence=[],
            ))

        return hypotheses
