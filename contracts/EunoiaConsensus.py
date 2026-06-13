# EunoiaConsensus - GenLayer intelligent contract for Eunoia.
#
# One contract, five review methods + three read helpers. Validators reach
# consensus on subjective wellness accountability events using the equivalence
# principle. The contract stores only review-level metadata; raw private data
# (journal text, name, email, location, therapy notes, medical records) is
# never accepted as input and never stored.
#
# Target: GenLayer Studionet.
# Language: Python (genlayer-py-std).

from genlayer import *
import json
import hashlib


# Storage record kept on-chain for every review.
class ReviewRecord(TypedDict):
    review_id: str
    user_hash: str
    input_hash: str
    review_type: str          # wellness | goal | reply | consent | checkin
    verdict: str              # primary verdict string (riskLevel | outcome | classification | status | shouldTrigger)
    confidence: float
    reasoning: str            # structured reasoning string, JSON-encoded
    recommendations: str      # JSON-encoded list of safe recommendations
    timestamp: int


def _hash(payload: str) -> str:
    return "h_" + hashlib.sha256(payload.encode("utf-8")).hexdigest()[:16]


def _review_id(kind: str, payload: str) -> str:
    return f"rev_{kind}_{_hash(payload)[2:10]}"


# Shared prompt scaffolding used by every review. Keeping these in one place
# keeps tone, safety, and JSON shape consistent across validators.
SAFETY_FRAME = (
    "You are a wellness accountability reviewer. You are NOT a medical professional, "
    "therapist, or crisis responder. Never produce medical diagnoses, therapy claims, "
    "or crisis-care advice. Use gentle, non-clinical language. If you detect crisis "
    "language, classify accordingly and stop normal coaching. Output ONLY valid JSON "
    "matching the schema described below - no prose outside the JSON."
)


class EunoiaConsensus(IContract):
    """One intelligent contract covering all subjective wellness reviews."""

    def __init__(self):
        # reviewId -> ReviewRecord
        self.reviews: TreeMap[str, ReviewRecord] = TreeMap()
        # userHash -> list of reviewIds
        self.user_index: TreeMap[str, DynArray[str]] = TreeMap()
        # protocol-wide counters
        self.total_reviews: u256 = u256(0)
        self.count_wellness: u256 = u256(0)
        self.count_goal: u256 = u256(0)
        self.count_reply: u256 = u256(0)
        self.count_consent: u256 = u256(0)
        self.count_checkin: u256 = u256(0)

    # -----------------------------------------------------------------
    # Internal helpers
    # -----------------------------------------------------------------

    def _record(self, kind: str, user_hash: str, input_hash: str,
                verdict: str, confidence: float,
                reasoning_obj: dict, recommendations: list) -> str:
        rid = _review_id(kind, input_hash + verdict)
        rec = ReviewRecord(
            review_id=rid,
            user_hash=user_hash,
            input_hash=input_hash,
            review_type=kind,
            verdict=verdict,
            confidence=float(confidence),
            reasoning=json.dumps(reasoning_obj),
            recommendations=json.dumps(recommendations),
            timestamp=block.timestamp,
        )
        self.reviews[rid] = rec
        if user_hash not in self.user_index:
            self.user_index[user_hash] = DynArray[str]()
        self.user_index[user_hash].append(rid)
        self.total_reviews += u256(1)
        return rid

    def _consensus_json(self, prompt: str) -> dict:
        """Run the equivalence principle and return parsed JSON.

        We use a comparative equivalence principle so validators only have
        to agree on the meaning of the verdict, not on every byte of text.
        """
        def leader_fn() -> str:
            return gl.nondet.exec_prompt(prompt)

        result = gl.eq_principle_prompt_comparative(
            leader_fn,
            "Two outputs are equivalent if they pick the same verdict / "
            "classification / outcome / status, agree on whether a check-in "
            "is recommended, and produce non-medical safe recommendations.",
        )
        # Validators may wrap JSON in ```json fences; strip defensively.
        text = result.strip()
        if text.startswith("```"):
            text = text.strip("`")
            if text.lower().startswith("json"):
                text = text[4:]
        try:
            return json.loads(text)
        except Exception:
            # Fallback: never crash a review; return a safe default envelope.
            return {"_parse_error": True, "raw": text[:512]}

    # -----------------------------------------------------------------
    # 1. review_wellness_signal
    # -----------------------------------------------------------------

    @gl.public.write
    def review_wellness_signal(self, signal_bundle_json: str) -> str:
        bundle = json.loads(signal_bundle_json)
        # Defensive: drop any forbidden fields if a client sends them.
        for forbidden in ("rawJournal", "journalText", "name", "email",
                          "location", "therapyNotes", "medicalRecords"):
            bundle.pop(forbidden, None)
        bundle["rawJournalIncluded"] = False

        input_hash = bundle.get("inputHash") or _hash(json.dumps(bundle, sort_keys=True))
        user_hash = bundle.get("userHash", "user_unknown_hidden")

        prompt = f"""{SAFETY_FRAME}

Task: classify the following reduced wellness signal bundle.

Bundle:
{json.dumps(bundle, indent=2)}

Output JSON schema:
{{
  "riskLevel": "STEADY" | "WATCH" | "ELEVATED" | "HIGH",
  "score": integer 0..100,
  "checkInRecommended": boolean,
  "signals": [string, ...],            // 1-4 short non-clinical observations
  "recommendedActions": [string, ...], // 2-4 gentle non-medical actions
  "safetyNote": "This is not a medical diagnosis."
}}
"""
        parsed = self._consensus_json(prompt)
        verdict = str(parsed.get("riskLevel", "STEADY"))
        rid = self._record(
            "wellness", user_hash, input_hash, verdict,
            confidence=float(parsed.get("score", 0)) / 100.0,
            reasoning_obj={"signals": parsed.get("signals", []),
                           "score": parsed.get("score", 0),
                           "checkInRecommended": parsed.get("checkInRecommended", False),
                           "safetyNote": parsed.get("safetyNote", "This is not a medical diagnosis.")},
            recommendations=parsed.get("recommendedActions", []),
        )
        self.count_wellness += u256(1)
        return json.dumps({"reviewId": rid, **parsed})

    # -----------------------------------------------------------------
    # 2. review_goal_accountability
    # -----------------------------------------------------------------

    @gl.public.write
    def review_goal_accountability(self, evidence_json: str) -> str:
        ev = json.loads(evidence_json)
        ev["rawJournalIncluded"] = False
        for forbidden in ("rawJournal", "journalText", "name", "email",
                          "location", "therapyNotes", "medicalRecords"):
            ev.pop(forbidden, None)
        user_hash = ev.get("userHash", "user_unknown_hidden")
        input_hash = _hash(json.dumps(ev, sort_keys=True))

        prompt = f"""{SAFETY_FRAME}

Task: review whether the submitted evidence reasonably supports the user's
wellness commitment. Use gentle, non-shaming language.

Evidence:
{json.dumps(ev, indent=2)}

Allowed outcomes: COMPLETED | PARTIAL | INSUFFICIENT_EVIDENCE | MISSED | NEEDS_MORE_CONTEXT.

Output JSON schema:
{{
  "outcome": one of the allowed outcomes,
  "confidence": float 0..1,
  "reasoning": short non-clinical explanation,
  "nextStep": one gentle next step (no shame language)
}}
"""
        parsed = self._consensus_json(prompt)
        verdict = str(parsed.get("outcome", "NEEDS_MORE_CONTEXT"))
        rid = self._record(
            "goal", user_hash, input_hash, verdict,
            confidence=float(parsed.get("confidence", 0.5)),
            reasoning_obj={"reasoning": parsed.get("reasoning", "")},
            recommendations=[parsed.get("nextStep", "Try one small step.")],
        )
        self.count_goal += u256(1)
        return json.dumps({"reviewId": rid, **parsed})

    # -----------------------------------------------------------------
    # 3. review_support_reply
    # -----------------------------------------------------------------

    @gl.public.write
    def review_support_reply(self, reply_json: str) -> str:
        r = json.loads(reply_json)
        user_hash = r.get("userHash", "user_unknown_hidden")
        input_hash = _hash(json.dumps(r, sort_keys=True))
        reply_text = str(r.get("replyText", ""))

        prompt = f"""{SAFETY_FRAME}

Task: classify a support-circle reply.

Reply (verbatim, do not echo back):
{json.dumps(reply_text)}

Allowed classifications: SUPPORTIVE | NEUTRAL | UNSAFE | MEDICAL_ADVICE | CRISIS_LANGUAGE.

Rules:
- SUPPORTIVE: warm, non-clinical, non-judgemental, suggests gentle action.
- NEUTRAL: acceptable but unremarkable.
- UNSAFE: hostile, shaming, or harmful.
- MEDICAL_ADVICE: makes diagnostic / treatment / medication claims.
- CRISIS_LANGUAGE: any self-harm / suicide / immediate-danger language.

Output JSON schema:
{{
  "classification": one of the allowed classifications,
  "visible": boolean,           // true only for SUPPORTIVE or NEUTRAL
  "qualityBadge": boolean,      // true only for SUPPORTIVE
  "reasoning": short non-clinical reason
}}
"""
        parsed = self._consensus_json(prompt)
        verdict = str(parsed.get("classification", "NEUTRAL"))
        rid = self._record(
            "reply", user_hash, input_hash, verdict,
            confidence=0.9 if verdict in ("SUPPORTIVE", "NEUTRAL") else 0.95,
            reasoning_obj={"reasoning": parsed.get("reasoning", "")},
            recommendations=[],
        )
        self.count_reply += u256(1)
        return json.dumps({"reviewId": rid, **parsed})

    # -----------------------------------------------------------------
    # 4. review_research_consent
    # -----------------------------------------------------------------

    @gl.public.write
    def review_research_consent(self, consent_json: str) -> str:
        c = json.loads(consent_json)
        input_hash = _hash(json.dumps(c, sort_keys=True))

        prompt = f"""{SAFETY_FRAME}

Task: review a research consent request for clarity and privacy risk.

Request:
{json.dumps(c, indent=2)}

Sensitive categories that should never appear in dataRequested: journal text,
name, email, exact location, therapy notes, medical records.

Allowed statuses: CLEAR | NEEDS_REVISION | HIGH_PRIVACY_RISK | REJECTED.

Output JSON schema:
{{
  "status": one of the allowed statuses,
  "privacyRisk": "LOW" | "MEDIUM" | "HIGH",
  "reasoning": short non-clinical explanation,
  "requiredUserSummary": a 1-2 sentence plain-language summary the user must see
}}
"""
        parsed = self._consensus_json(prompt)
        verdict = str(parsed.get("status", "NEEDS_REVISION"))
        rid = self._record(
            "consent", "user_consent_request", input_hash, verdict,
            confidence=0.8,
            reasoning_obj={"privacyRisk": parsed.get("privacyRisk", "MEDIUM"),
                           "reasoning": parsed.get("reasoning", "")},
            recommendations=[parsed.get("requiredUserSummary", "")],
        )
        self.count_consent += u256(1)
        return json.dumps({"reviewId": rid, **parsed})

    # -----------------------------------------------------------------
    # 5. review_checkin_trigger
    # -----------------------------------------------------------------

    @gl.public.write
    def review_checkin_trigger(self, checkin_json: str) -> str:
        c = json.loads(checkin_json)
        user_hash = c.get("userHash", "user_unknown_hidden")
        input_hash = _hash(json.dumps(c, sort_keys=True))

        prompt = f"""{SAFETY_FRAME}

Task: decide whether a bounded wellness check-in should be triggered.

Context:
{json.dumps(c, indent=2)}

Allowed tones: gentle | direct | reflective | practical | motivational.

Output JSON schema:
{{
  "shouldTrigger": boolean,
  "tone": one of the allowed tones,
  "reason": short non-clinical reason,
  "checkinPrompt": one short user-facing prompt (no medical claims),
  "disclaimer": "This is a wellness reflection, not medical advice, therapy, diagnosis, or crisis support."
}}
"""
        parsed = self._consensus_json(prompt)
        verdict = "TRIGGER" if parsed.get("shouldTrigger", False) else "SKIP"
        rid = self._record(
            "checkin", user_hash, input_hash, verdict,
            confidence=0.85,
            reasoning_obj={"tone": parsed.get("tone", "gentle"),
                           "reason": parsed.get("reason", ""),
                           "checkinPrompt": parsed.get("checkinPrompt", ""),
                           "disclaimer": parsed.get("disclaimer", "")},
            recommendations=[parsed.get("checkinPrompt", "")],
        )
        self.count_checkin += u256(1)
        return json.dumps({"reviewId": rid, **parsed})

    # -----------------------------------------------------------------
    # Read helpers
    # -----------------------------------------------------------------

    @gl.public.view
    def get_review(self, review_id: str) -> str:
        if review_id not in self.reviews:
            return json.dumps({"error": "not_found"})
        return json.dumps(dict(self.reviews[review_id]))

    @gl.public.view
    def get_user_reviews(self, user_hash: str) -> str:
        if user_hash not in self.user_index:
            return json.dumps([])
        ids = list(self.user_index[user_hash])
        return json.dumps([dict(self.reviews[i]) for i in ids if i in self.reviews])

    @gl.public.view
    def get_protocol_stats(self) -> str:
        return json.dumps({
            "totalReviews": int(self.total_reviews),
            "byType": {
                "wellness": int(self.count_wellness),
                "goal": int(self.count_goal),
                "reply": int(self.count_reply),
                "consent": int(self.count_consent),
                "checkin": int(self.count_checkin),
            }
        })
