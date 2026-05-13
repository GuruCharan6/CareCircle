"""
Rule-based observation extractor for voice note transcripts.
Replaces LLM NLP extraction — zero API cost.
Used by both app-uploaded voice notes and WhatsApp voice messages.
"""

# ── Keyword sets ────────────────────────────────────────────────────────────

_MOOD_GOOD = {"happy", "cheerful", "fine", "okay", "good", "well", "better", "smiling", "positive", "theek"}
_MOOD_LOW = {"sad", "low", "depressed", "unhappy", "crying", "weeping", "upset", "gloomy", "udaas"}
_MOOD_ANXIOUS = {"anxious", "worried", "nervous", "scared", "fearful", "restless", "panic", "ghabraaya", "ghabra"}
_MOOD_IRRITABLE = {"irritable", "angry", "agitated", "rude", "shouting", "fighting", "chidchida"}
_MOOD_CONFUSED = {"confused", "disoriented", "forgetful", "not recognizing", "hallucinating", "bhool"}

_ENERGY_VERY_LOW = {"exhausted", "very tired", "extremely tired", "can't move", "cannot move", "bedridden", "bilkul kamzor"}
_ENERGY_LOW = {"tired", "weak", "lethargic", "fatigue", "fatigued", "sleepy", "sluggish", "low energy", "kamzori", "kamzor"}

_MED_TAKEN_POS = {
    "gave medicine", "gave tablet", "gave pill", "took medicine", "took tablet",
    "given medicine", "administered", "medication given", "dose given", "took the medicine",
    "dawai di", "dawai li", "dawa di", "dawa li",
}
_MED_TAKEN_NEG = {
    "missed dose", "didn't take", "did not take", "refused medicine", "refused tablet",
    "no medicine", "medicine not given", "forgot medicine", "skipped medicine",
    "dawai nahi", "dawa nahi", "dawa khatam",
}

_MEAL_WORDS = {"ate", "eaten", "had", "finished", "consumed", "khaya", "khana khaya"}
_MEAL_DENIAL = {
    "didn't eat", "did not eat", "refused food", "refused to eat", "no appetite",
    "not eating", "skipped meal", "ate nothing", "ate very little", "ate less",
    "khana nahi", "nahi khaya", "bhookh nahi",
}

_CONCERN_KEYWORDS = {
    "pain", "fever", "temperature", "breathless", "short of breath", "difficulty breathing",
    "chest pain", "vomiting", "vomit", "nausea", "dizzy", "dizziness", "fall", "fell",
    "swelling", "bleeding", "unconscious", "faint", "fainting", "seizure", "fit",
    "hospital", "emergency", "serious", "not responding", "low bp", "high bp",
    "blood pressure", "sugar low", "sugar high", "glucose",
    "bukhar", "dard", "ulti", "chakkar", "gir gaye", "behosh",
}

_SYMPTOM_KEYWORDS = {
    "cough", "cold", "runny nose", "sneezing", "headache", "body ache", "joint pain",
    "stomach pain", "abdominal pain", "back pain", "leg pain", "swollen", "rash",
    "itching", "constipation", "diarrhea", "loose motion", "insomnia", "not sleeping",
    "loss of appetite", "weight loss",
    "khansi", "nazla", "sar dard", "pet dard", "kamar dard",
}


def _words_in(text: str, keywords: set) -> bool:
    t = text.lower()
    return any(kw in t for kw in keywords)


def extract_observations_from_transcript(transcript: str) -> dict:
    """
    Extract structured clinical observations from English (or Hinglish) transcript.
    No LLM — pure keyword matching. Both paths use this:
      - App-uploaded voice notes (VoiceNoteExtractor)
      - WhatsApp caregiver voice messages (process_whatsapp_media)
    """
    t = transcript.lower()

    # Mood
    if _words_in(t, _MOOD_CONFUSED):
        mood = "confused"
    elif _words_in(t, _MOOD_IRRITABLE):
        mood = "irritable"
    elif _words_in(t, _MOOD_ANXIOUS):
        mood = "anxious"
    elif _words_in(t, _MOOD_LOW):
        mood = "low"
    elif _words_in(t, _MOOD_GOOD):
        mood = "good"
    else:
        mood = "normal"

    # Energy
    if _words_in(t, _ENERGY_VERY_LOW):
        energy_level = "very_low"
    elif _words_in(t, _ENERGY_LOW):
        energy_level = "low"
    else:
        energy_level = "normal"

    # Medications
    if _words_in(t, _MED_TAKEN_NEG):
        medications_taken: bool | None = False
    elif _words_in(t, _MED_TAKEN_POS):
        medications_taken = True
    else:
        medications_taken = None

    # Meals
    meals_eaten: dict = {"breakfast": None, "lunch": None, "dinner": None}
    for meal in ("breakfast", "lunch", "dinner"):
        if meal in t:
            denied = _words_in(t, _MEAL_DENIAL) or any(
                neg in t for neg in (
                    f"no {meal}", f"skipped {meal}", f"refused {meal}", f"didn't have {meal}"
                )
            )
            if denied:
                meals_eaten[meal] = False
            elif any(w in t for w in _MEAL_WORDS):
                meals_eaten[meal] = True

    meal_notes: str | None = None
    if _words_in(t, _MEAL_DENIAL):
        meal_notes = "Patient showed low appetite or refused food."

    # Symptoms and concerns
    symptoms_reported = [kw for kw in _SYMPTOM_KEYWORDS if kw in t]
    concerns_flagged = [kw for kw in _CONCERN_KEYWORDS if kw in t]

    # Summary — raw transcript truncated
    summary = transcript.strip()
    if len(summary) > 300:
        summary = summary[:297] + "…"

    return {
        "mood": mood,
        "energy_level": energy_level,
        "medications_taken": medications_taken,
        "meals_eaten": meals_eaten,
        "meal_notes": meal_notes,
        "symptoms_reported": symptoms_reported,
        "symptoms_denied": [],
        "symptoms_absent": [],
        "medication_timing_notes": None,
        "mobility_notes": None,
        "meera_mood_read": None,
        "concerns_flagged": concerns_flagged,
        "summary": summary,
    }
