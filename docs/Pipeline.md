# The Five-Layer AI Pipeline

CareCircle's AI pipeline processes health documents through five distinct layers. Each layer has a specific responsibility, and **only Layer 5 uses LLMs for medical reasoning** — and even then, only for formatting, not hypothesis generation.

---

## Design Philosophy

**Core principle:** LLMs are translators, not reasoners.

Medical reasoning happens in deterministic, auditable rules (Layers 1-4). The LLM in Layer 5 only translates structured findings into human-readable text. This design:

- **Prevents hallucinations** from influencing clinical decisions
- **Makes every hypothesis auditable** — traces back to a specific rule
- **Keeps latency predictable** — one LLM call per document, not per rule
- **Enables confident scoring** — deterministic rules know when they're uncertain

---

## Pipeline Flow

```
Document Upload
      ↓
[Layer 1: INGEST]
  ↓ Structured JSON
[Layer 2: NORMALIZE]
  ↓ Health dimension tags
[Layer 3: ENRICH]
  ↓ Clinical hypotheses (rule-based)
[Layer 4: RECONCILE]
  ↓ Conflict records
[Layer 5: REASON]
  ↓ Human-readable summaries
Final Output
```

---

## Layer 1: Ingest

**Purpose:** Extract structured data from unstructured documents.

**Input:** Prescription photo, lab report PDF, doctor note image, or voice note audio.

**Output:** Structured JSON with confidence scores.

### Parsers

| Parser | File | Tech | What it extracts |
|--------|------|------|------------------|
| Prescription | `prescription.py` | Gemini Vision | Medications (name, dose, frequency, route, duration), prescriber, date, patient name |
| Lab Report | `lab_report.py` | Gemini Vision | Test results (name, value, unit, reference range, is_abnormal), lab name, collection date |
| Doctor Note | `doctor_note.py` | Gemini Vision | Chief complaint, assessment, plan, follow-up date, ordered tests |
| Voice Note | `voice_note.py` | Sarvam STT + Gemini NLP | Transcription → extracted observations (symptom, medication adherence, mood, meals) |
| Handwritten Note | `handwritten_note.py` | Gemini Vision | Freeform text extraction with OCR confidence |
| Generic Document | `generic_document.py` | Gemini Vision | Fallback for unrecognized document types |

### Confidence Scoring

Every extracted field gets a confidence score (0.0 - 1.0). If **any field scores <0.7**, the document's `extraction_status` is set to `review_required`.

**Example:**
```json
{
  "medication_name": {
    "value": "Metformin",
    "confidence": 0.95
  },
  "dose": {
    "value": "500",
    "confidence": 0.65  // ← Low confidence, triggers review
  }
}
```

**Human approval gate:** Documents with `review_required` status block pipeline progression. User must approve or edit extracted fields before Layer 2 runs.

**Files:** `Backend/app/pipeline/layer1_ingest/`

---

## Layer 2: Normalize

**Purpose:** Tag each piece of extracted data with its health dimension.

**Input:** Structured extraction from Layer 1.

**Output:** Same data + dimension tags.

### Health Dimensions

| Dimension | Definition | Examples |
|-----------|------------|----------|
| `biochemical` | Lab values, vital signs, objective clinical measurements | HbA1c, blood pressure, creatinine, cholesterol |
| `behavioral` | Observable actions, adherence patterns | Medication timing, diet compliance, exercise |
| `subjective` | Patient self-reports, symptoms without lab confirmation | "Feeling tired", "chest discomfort", "mood low" |
| `clinical` | Professional assessments, diagnoses, prescriptions | Doctor's diagnosis, prescribed treatments, medical history |

**Why this matters:** Layer 4 (Reconcile) uses dimensions to classify conflict types. A `subjective` report contradicting `biochemical` data is a Type C conflict.

**Logic:** Purely deterministic. Medication → `clinical`. Lab result → `biochemical`. Caregiver observation of adherence → `behavioral`. Patient symptom → `subjective`.

**Files:** `Backend/app/pipeline/layer2_normalize/normalizer.py`

---

## Layer 3: Enrich

**Purpose:** Generate clinical hypotheses using deterministic rules.

**Input:** Normalized document data + patient baseline + recent observations.

**Output:** Clinical hypotheses with urgency levels (alert/watch/inform).

### Enrichment Rules

| Rule | File | What it does | Output urgency |
|------|------|-------------|----------------|
| Rule 1 | `rule_1_abnormal_lab.py` | Flags lab values outside reference range. Delta from previous reading. | watch (if first abnormal), alert (if worsening trend) |
| Rule 2 | `rule_2_medication_deviation.py` | Detects timing shifts, missed doses, discontinuation without prescription change. | watch (minor timing), alert (13+ hour shift or 3+ consecutive misses) |
| Rule 3 | `rule_3_symptom_cluster.py` | Matches symptom patterns to known clinical presentations. | inform (single symptom), watch (cluster), alert (red-flag cluster) |
| Rule 4 | `rule_4_open_ended.py` | Gemini identifies patterns not covered by Rules 1-3. **LLM output validated against rule constraints.** | varies (LLM suggests, rule engine validates) |

### Rule 1 Example: Abnormal Lab

```python
# Patient's HbA1c reference range: 4.0 - 5.6%
# Current reading: 9.2%
# Previous reading (30 days ago): 8.5%

hypothesis = {
  "rule_id": "rule_1_abnormal_lab",
  "urgency": "alert",  # Worsening trend
  "supporting_evidence": {
    "current_value": 9.2,
    "reference_range": "4.0 - 5.6%",
    "delta_from_prev": +0.7,
    "trend": "worsening"
  },
  "description": "HbA1c significantly elevated and worsening"
}
```

### Rule 4: LLM Validation

Rule 4 uses Gemini to identify open-ended patterns, but **all LLM output is validated**:

1. LLM suggests hypothesis with urgency level
2. Rule engine checks: Does this match a pattern from Rules 1-3? If yes → reject (covered by deterministic rule)
3. Rule engine validates: Is urgency level justified by supporting evidence? If no → downgrade
4. Final hypothesis stored with `llm_suggested: true` flag for audit trail

**Files:** `Backend/app/pipeline/layer3_enrich/rules/`

---

## Layer 4: Reconcile

**Purpose:** Detect conflicts when different sources contradict each other.

**Input:** Current normalized document + patient baseline + recent observations.

**Output:** Conflict records with classification.

### Conflict Types

| Type | Name | Definition | Example |
|------|------|------------|---------|
| A | Temporal | Same metric changed over time | Medication timing shifted from 8 AM → 9 PM |
| B | Observational | Different observers report conflicting accounts | Caregiver: "ate breakfast", Patient: "didn't eat" |
| C | Dimensional | Subjective report contradicts objective data | Patient: "feeling fine", Lab: HbA1c 9.2% |
| D | Factual | Hard factual contradiction | Two prescriptions, same drug, different doses |

### Conflict Detection Logic

Each classifier runs independently:

**Type A (Temporal):**
- Compares current medication timing against previous `medications` records
- Threshold: ≥2 hour shift triggers conflict
- Severity: Minor (<6h), Moderate (6-12h), Major (≥12h)

**Type B (Observational):**
- Compares caregiver `observations` against patient self-reports from same day
- Looks for direct contradictions (presence/absence of event)

**Type C (Dimensional):**
- Compares `subjective` dimension reports against `biochemical` data
- Example: "Feeling great" + HbA1c 9.2% → conflict

**Type D (Factual):**
- Checks for impossible states: two active prescriptions, same drug, different doses
- Checks for timeline violations: follow-up date before prescription date

**Files:** `Backend/app/pipeline/layer4_reconcile/`

---

## Layer 5: Reason

**Purpose:** Translate structured findings into human-readable text.

**Input:** Clinical hypotheses from Layer 3, conflict records from Layer 4.

**Output:** Natural language summaries.

### What the LLM Does

Gemini receives structured JSON:
```json
{
  "hypotheses": [
    {
      "rule_id": "rule_1_abnormal_lab",
      "urgency": "alert",
      "supporting_evidence": {...}
    }
  ],
  "conflicts": [
    {
      "type": "C",
      "sources": ["patient_subjective", "lab_biochemical"]
    }
  ]
}
```

Gemini outputs:
```
HbA1c elevated at 9.2% (reference: 4.0-5.6%), worsening from 8.5% 
30 days ago. Patient reports feeling fine, which conflicts with 
objective lab findings. Consider discussing symptom awareness with 
patient and prescribing doctor.
```

### What the LLM Does NOT Do

- ❌ Generate new hypotheses
- ❌ Add medical claims not present in structured input
- ❌ Suggest treatments or dosage changes
- ❌ Invent lab values or medication details

**Validation:** Output is checked for hallucination. If the summary mentions a lab value not present in input JSON → regenerated with stricter prompt.

**Files:** `Backend/app/pipeline/layer5_reason/formatter.py`

---

## Pipeline Orchestration

### Entry Point

`PipelineOrchestrator.run()` in `Backend/app/pipeline/orchestrator.py`

### Execution Flow

1. **Document approved** → `POST /api/v1/documents/{doc_id}/approve`
2. **Celery task fires** → `run_full_pipeline.apply_async(document_id)`
3. **Orchestrator loads document** from DB
4. **Layer 1-5 run sequentially** (no parallelization — each layer depends on previous)
5. **Hypotheses written** to `clinical_hypotheses` table
6. **Conflicts written** to `conflict_records` table
7. **Notifications emitted** for alert-level hypotheses
8. **Document status** → `extraction_status = "complete"`

### Error Handling

- Layer 1 failure → `extraction_status = "failed"`, no retry (manual re-upload)
- Layer 2-4 failure → Retry 3x with exponential backoff
- Layer 5 failure → Use fallback structured template (no LLM formatting)

### Parallelization

**Within Layer 3:** All enrichment rules run in parallel (`asyncio.gather`). Hypotheses are aggregated after all rules complete.

**Across Layers:** Sequential — Layer N+1 depends on Layer N output.

---

## Performance

| Metric | Value |
|--------|-------|
| Total pipeline runtime (prescription) | ~20-30 seconds |
| Layer 1 (OCR) | ~5-7 seconds |
| Layer 2 (Normalize) | <100ms |
| Layer 3 (Enrich, 4 rules) | ~8-12 seconds (parallel) |
| Layer 4 (Reconcile) | ~2-3 seconds |
| Layer 5 (Reason) | ~3-5 seconds |

**Bottleneck:** Gemini API latency (Layers 1, 3, 5). Mitigated by caching and parallel execution where possible.

---

## Testing the Pipeline

```python
# Backend/tests/test_pipeline.py

async def test_prescription_full_pipeline():
    # Upload prescription image
    doc = await create_document(patient_id, type="prescription")
    
    # Run Layer 1
    extraction = await Layer1Ingest.run(doc)
    assert extraction["medication_name"]["confidence"] > 0.7
    
    # Approve
    await approve_document(doc.id)
    
    # Run full pipeline
    await PipelineOrchestrator.run(doc.id)
    
    # Verify hypotheses created
    hypotheses = await get_hypotheses(patient_id)
    assert len(hypotheses) > 0
```

---

## Monitoring

Pipeline execution is instrumented with Prometheus metrics:

- `pipeline_layer_duration_seconds` — Histogram per layer
- `pipeline_failures_total` — Counter with layer label
- `llm_api_calls_total` — Counter (Gemini calls)
- `confidence_score_distribution` — Histogram (Layer 1 extractions)

Grafana dashboards track:
- Pipeline throughput (documents/hour)
- Layer-by-layer latency percentiles (p50, p95, p99)
- Confidence score trends (declining scores indicate OCR issues)
- LLM token usage (cost tracking)

---

## Future Improvements

1. **Streaming pipeline:** Return Layer 1 results immediately, run 2-5 in background
2. **Rule learning:** Extract new patterns from validated conflicts → suggest new deterministic rules
3. **Multi-model ensemble:** Run critical extractions through Gemini + Claude, compare outputs
4. **Confidence calibration:** Train confidence predictor on human corrections to improve review thresholds