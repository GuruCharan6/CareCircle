from __future__ import annotations

from uuid import UUID

# ── TTL constants (seconds) ───────────────────────────────────────────────────
# patient_state: 5 min — staleness_check runs every 5 min (same cadence)
PATIENT_STATE_TTL = 300

# crisis_packet: 1 hour — nightly rebuild + on-demand refresh; freshness note shown to user
CRISIS_PACKET_TTL = 3600

# drug_interaction: 30 days — matches DB cache window (avoid Gemini re-query same pair)
DRUG_INTERACTION_TTL = 2_592_000

# medication_list: 10 min — changes rarely mid-session; invalidated on create/discontinue
MEDICATION_LIST_TTL = 600

# phone_otp: 10 min — user must verify before TTL expires
PHONE_OTP_TTL = 600

# query_embedding: 1 hour — same query text always produces same vector
QUERY_EMBEDDING_TTL = 3600


# ── Key templates ─────────────────────────────────────────────────────────────
# Prefix: cc:{entity}:{id}[:{variant}]

def patient_state_key(patient_id: UUID) -> str:
    return f"cc:patient_state:{patient_id}"


def crisis_packet_key(patient_id: UUID) -> str:
    return f"cc:crisis_packet:{patient_id}"


def drug_interaction_key(drug_a: str, drug_b: str) -> str:
    # Normalize pair order → same key regardless of argument order
    a, b = sorted([drug_a.lower().strip(), drug_b.lower().strip()])
    return f"cc:drug_ix:{a}:{b}"


def medication_list_key(patient_id: UUID) -> str:
    return f"cc:med_list:{patient_id}"


def phone_otp_key(user_id: UUID) -> str:
    return f"cc:phone_otp:{user_id}"


def query_embedding_key(query: str) -> str:
    import hashlib
    h = hashlib.sha256(query.lower().strip().encode()).hexdigest()[:16]
    return f"cc:qemb:{h}"
