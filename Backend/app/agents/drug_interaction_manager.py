import asyncio
from itertools import combinations
from typing import Any
from uuid import UUID

import asyncpg

from app.agents.drug_pair_worker import DrugPairResult, DrugPairWorker
from app.cache.drug_interaction_cache import get_interaction, set_interaction
from app.core.logging import get_logger
from app.providers.llm.gemini import GeminiProvider
from app.repositories.drug_interaction_repository import DrugInteractionRepository
from app.repositories.lab_result_repository import LabResultRepository
from app.repositories.medication_repository import MedicationRepository
from app.repositories.notification_repository import NotificationRepository
from app.repositories.patient_repository import PatientRepository

logger = get_logger(__name__)

# Drugs with significant renal clearance.
# Creatinine > 1.5 mg/dL + interaction involving one of these → escalate urgency.
_RENAL_DRUGS = frozenset({
    "metformin", "digoxin", "atenolol", "lisinopril", "ramipril",
    "enalapril", "bisoprolol", "spironolactone", "furosemide",
    "allopurinol", "ciprofloxacin", "amoxicillin",
})

# Drugs affecting glycemic control.
# Rising glucose trend + interaction involving one of these → escalate urgency.
_GLYCEMIC_DRUGS = frozenset({
    "glimepiride", "glibenclamide", "glyburide", "glipizide",
    "insulin", "repaglinide", "nateglinide", "pioglitazone",
    "dapagliflozin", "empagliflozin", "voglibose", "acarbose",
    "sitagliptin", "vildagliptin",
})


def _escalate(urgency: str) -> str:
    """Step urgency up one level. inform → watch → alert."""
    if urgency == "inform":
        return "watch"
    if urgency == "watch":
        return "alert"
    return urgency


class DrugInteractionManager:
    """
    Manager pattern: fan-out drug pair checks in parallel, aggregate results.

    Flow:
      1. Load all active medications for patient.
      2. For each pair: cache check (skip if checked within 30 days).
      3. Fan out uncached pairs to DrugPairWorker via asyncio.gather (LLM calls parallel).
      4. Apply lab-value modifiers (creatinine, glucose trend) to each result.
      5. Store all results. Emit alert notification for confirmed+high severity.

    DB operations remain sequential on the single connection.
    Only LLM calls are parallelised.
    """

    def __init__(self, conn: asyncpg.Connection) -> None:
        self._conn = conn
        self._llm = GeminiProvider()
        self._med_repo = MedicationRepository(conn)
        self._interaction_repo = DrugInteractionRepository(conn)
        self._lab_repo = LabResultRepository(conn)
        self._patient_repo = PatientRepository(conn)
        self._notification_repo = NotificationRepository(conn)

    async def run(self, *, patient_id: UUID) -> list[DrugPairResult]:
        """
        Check unique medication generic-name pairs for this patient.
        Returns list of DrugPairResult for pairs that were actually checked (cache misses).
        """
        all_meds = await self._med_repo.get_active_by_patient(patient_id)
        if len(all_meds) < 2:
            logger.info(
                "drug_interaction_manager.skip",
                patient_id=str(patient_id),
                reason="fewer than 2 active medications",
            )
            return []

        # Group by generic name to avoid checking same pair multiple times (e.g. 2 Aspirin scripts)
        # Use first med found as the representative for ID/mapping
        meds_by_generic: dict[str, Any] = {}
        for m in all_meds:
            gn = m.generic_name.lower().strip()
            if gn not in meds_by_generic:
                meds_by_generic[gn] = m
        
        unique_meds = list(meds_by_generic.values())
        if len(unique_meds) < 2:
            return []

        # Fetch lab context once
        creatinine = await self._lab_repo.get_latest_by_test(patient_id, "serum_creatinine")
        glucose_trend = await self._lab_repo.get_trend(patient_id, "fasting_glucose", limit=3)

        # Separate cached vs uncached pairs
        worker = DrugPairWorker(self._llm)
        check_coroutines = []

        for med_a, med_b in combinations(unique_meds, 2):
            # Redis cache (fast) → DB 30-day cache → Gemini
            redis_hit = await get_interaction(med_a.generic_name, med_b.generic_name)
            if redis_hit:
                continue
            cached = await self._interaction_repo.get_recent_pair(
                med_a.generic_name, med_b.generic_name, within_days=30
            )
            if cached:
                # Backfill Redis
                await set_interaction(
                    med_a.generic_name, med_b.generic_name,
                    cached.model_dump(mode="json"),
                )
                continue

            check_coroutines.append(
                worker.check(
                    medication_a_id=med_a.id,
                    medication_b_id=med_b.id,
                    drug_a_generic=med_a.generic_name,
                    drug_b_generic=med_b.generic_name,
                )
            )

        if not check_coroutines:
            return []

        logger.info(
            "drug_interaction_manager.fan_out",
            patient_id=str(patient_id),
            pairs=len(check_coroutines),
        )

        # All LLM calls execute in parallel
        results: list[DrugPairResult] = await asyncio.gather(*check_coroutines)

        # Apply modifiers + store sequentially (single DB connection)
        stored: list[DrugPairResult] = []
        for result in results:
            result = self._apply_lab_modifiers(result, creatinine, glucose_trend)
            await self._store(patient_id, result)
            stored.append(result)

        # Emit alert notifications for confirmed+high severity
        patient = await self._patient_repo.get_by_id(patient_id)
        if patient:
            await self._emit_alerts(patient_id, patient.user_id, stored)

        logger.info(
            "drug_interaction_manager.complete",
            patient_id=str(patient_id),
            checked=len(stored),
        )
        return stored

    def _apply_lab_modifiers(
        self,
        result: DrugPairResult,
        creatinine,       # LabResult | None
        glucose_trend,    # list[LabResult]
    ) -> DrugPairResult:
        """
        Escalate urgency when lab values indicate heightened risk.
        Only escalates — never de-escalates.
        Returns modified result (mutates final_urgency and lab_modifier_applied in place).
        """
        if result.final_urgency == "alert":
            return result  # already max — no need to check

        generic_a = result.drug_a_generic.lower()
        generic_b = result.drug_b_generic.lower()
        involves_renal = generic_a in _RENAL_DRUGS or generic_b in _RENAL_DRUGS
        involves_glycemic = generic_a in _GLYCEMIC_DRUGS or generic_b in _GLYCEMIC_DRUGS

        # Modifier 1: elevated creatinine + renal-cleared drug
        creat_val = float(creatinine.value or 0) if creatinine else 0
        if creat_val > 1.5 and involves_renal:
            logger.info(
                "drug_interaction_manager.modifier.renal",
                drug_a=generic_a,
                drug_b=generic_b,
                creatinine=str(creatinine.value),
                before=result.final_urgency,
            )
            result.final_urgency = _escalate(result.final_urgency)
            result.lab_modifier_applied = True
            return result  # one modifier at a time — return after first triggers

        # Modifier 2: rising glucose trend + glycemic drug
        if len(glucose_trend) >= 2 and involves_glycemic:
            curr_val = float(glucose_trend[0].value or 0)
            prev_val = float(glucose_trend[-1].value or 0)
            is_rising = curr_val > prev_val
            if is_rising:
                logger.info(
                    "drug_interaction_manager.modifier.glycemic",
                    drug_a=generic_a,
                    drug_b=generic_b,
                    before=result.final_urgency,
                )
                result.final_urgency = _escalate(result.final_urgency)
                result.lab_modifier_applied = True

        return result

    async def _store(self, patient_id: UUID, result: DrugPairResult) -> None:
        # Always cache in Redis so subsequent checks skip Gemini (including unknowns)
        await set_interaction(
            result.drug_a_generic,
            result.drug_b_generic,
            {
                "interaction": result.interaction,
                "severity": result.severity,
                "mechanism": result.mechanism,
                "final_urgency": result.final_urgency,
            },
        )
        # Only persist confirmed/possible to DB — unknown means no clinically
        # significant interaction; storing it would inflate the interaction count.
        if result.interaction == "unknown":
            return
        await self._interaction_repo.create(
            patient_id=patient_id,
            medication_a_id=result.medication_a_id,
            medication_b_id=result.medication_b_id,
            drug_a_generic=result.drug_a_generic,
            drug_b_generic=result.drug_b_generic,
            interaction=result.interaction,
            severity=result.severity,
            mechanism=result.mechanism,
            gemini_confidence=result.confidence,
            gemini_note=result.gemini_note,
            gemini_raw_response=result.raw_response,
            lab_modifier_applied=result.lab_modifier_applied,
            final_urgency=result.final_urgency,
        )

    async def _emit_alerts(
        self,
        patient_id: UUID,
        user_id: UUID,
        results: list[DrugPairResult],
    ) -> None:
        """Create in-app notification for alert-level interactions."""
        for r in results:
            if r.final_urgency != "alert":
                continue
            title = f"Drug interaction: {r.drug_a_generic} + {r.drug_b_generic}"
            body = (
                f"{r.mechanism or 'Interaction detected.'}  "
                f"Flagged by AI — confirm with prescribing doctor before next dose."
            )
            await self._notification_repo.create(
                patient_id=patient_id,
                recipient_user_id=user_id,
                type="drug_interaction_alert",
                channel="in_app",
                title=title,
                body=body,
                linked_entity_type="medication",
                linked_entity_id=r.medication_a_id,
            )
            logger.info(
                "drug_interaction_manager.alert_emitted",
                drug_a=r.drug_a_generic,
                drug_b=r.drug_b_generic,
            )
