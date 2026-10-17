"""
export_logs.py — Pull ReviewLog / Participant / TestResult / JudgeScore out of
MongoDB, anonymise, and write analysis-ready JSONL + CSV.

Ethics: real userIds never leave the database. Each is replaced by a salted
SHA-256 hash truncated to 12 hex chars. Keep RESEARCH_SALT secret and out of
git — without it the mapping cannot be reversed, which is the point.

Field names here MUST stay in sync with:
  - app/models/ReviewLog.ts
  - app/models/Participant.ts
  - app/models/TestResult.ts
  - app/models/JudgeScore.ts

Any renaming in the TS models means updating this file too, or the analysis
scripts (fit_dart.py, power_analysis.py) will see NaN columns and silently
drop rows.

Usage
-----
    export MONGO_URI="mongodb+srv://..."
    export RESEARCH_SALT="pick-something-long-and-random"
    python export_logs.py --out data/export
"""

from __future__ import annotations

import argparse
import csv
import hashlib
import json
import os
from datetime import datetime

REVIEW_FIELDS = [
    "participant", "word", "condition", "schedulerVersion", "weightsVersion",
    "sessionId", "deltaDays", "serverDeltaDays", "retrievalType", "recall",
    "taskPolicyVersion", "heuristicRetrievalType", "explorationEpsilon",
    "explorationDraw", "explorationSelected", "explorationEligibleTypes",
    "explorationSelectionDraw",
    "responseTimeMs", "elapsedMs", "quality", "contextId", "isCatchUp",
    "scheduledAt", "servedAt", "createdAt", "dayIndex",
]


def anon(user_id: str, salt: str) -> str:
    return hashlib.sha256((salt + "|" + str(user_id)).encode()).hexdigest()[:12]


def iso(v):
    return v.isoformat() if hasattr(v, "isoformat") else (str(v) if v else None)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--mongo-uri", default=os.environ.get("MONGO_URI"))
    ap.add_argument("--salt", default=os.environ.get("RESEARCH_SALT"))
    ap.add_argument("--out", default="data/export")
    ap.add_argument("--since", default=None, help="ISO date, e.g. 2026-09-01")
    args = ap.parse_args()

    if not args.mongo_uri:
        raise SystemExit("MONGO_URI required")
    if not args.salt:
        raise SystemExit("RESEARCH_SALT required — refusing to export identifiable data")

    from pymongo import MongoClient
    db = MongoClient(args.mongo_uri).get_default_database()

    q = {}
    if args.since:
        q["createdAt"] = {"$gte": datetime.fromisoformat(args.since)}

    os.makedirs(args.out, exist_ok=True)

    # ---- reviews -----------------------------------------------------------
    # ReviewLog.userId in the RCT context stores the participantCode (see
    # /api/research/review). No cross-join with the Participant table needed
    # to anonymise, since the participantCode is already the study identifier.
    n = 0
    first_day = {}
    rows = []
    for r in db.reviewlogs.find(q).sort("createdAt", 1):
        raw_uid = str(r.get("userId", ""))
        pid = anon(raw_uid, args.salt)
        created = r.get("createdAt")
        if pid not in first_day and created:
            first_day[pid] = created
        day_index = None
        if created and pid in first_day:
            day_index = round((created - first_day[pid]).total_seconds() / 86400.0, 3)

        rows.append({
            "participant": pid,
            "word": r.get("word"),
            "condition": r.get("condition"),
            "schedulerVersion": r.get("schedulerVersion"),
            "weightsVersion": r.get("weightsVersion"),
            "sessionId": r.get("sessionId"),
            "deltaDays": r.get("deltaDays"),
            "serverDeltaDays": r.get("serverDeltaDays"),
            "retrievalType": r.get("retrievalType"),
            "taskPolicyVersion": r.get("taskPolicyVersion"),
            "heuristicRetrievalType": r.get("heuristicRetrievalType"),
            "explorationEpsilon": r.get("explorationEpsilon"),
            "explorationDraw": r.get("explorationDraw"),
            "explorationSelected": r.get("explorationSelected"),
            "explorationEligibleTypes": r.get("explorationEligibleTypes"),
            "explorationSelectionDraw": r.get("explorationSelectionDraw"),
            "recall": r.get("recall"),
            "responseTimeMs": r.get("responseTimeMs"),
            "elapsedMs": r.get("elapsedMs"),
            "quality": r.get("quality"),
            "contextId": r.get("contextId"),
            "isCatchUp": r.get("isCatchUp"),
            "scheduledAt": iso(r.get("scheduledAt")),
            "servedAt": iso(r.get("servedAt")),
            "createdAt": iso(created),
            "dayIndex": day_index,
            "featureVector": r.get("featureVector") or [],
        })
        n += 1

    with open(os.path.join(args.out, "reviews.jsonl"), "w", encoding="utf-8") as f:
        for r in rows:
            f.write(json.dumps(r, default=str) + "\n")

    with open(os.path.join(args.out, "reviews.csv"), "w", encoding="utf-8", newline="") as f:
        w = csv.DictWriter(f, fieldnames=REVIEW_FIELDS, extrasaction="ignore")
        w.writeheader()
        w.writerows(rows)

    # ---- participants ------------------------------------------------------
    # participantCode is the study identifier and is already anonymous by
    # design (P0001, P0002, ...). We keep it as-is for join with reviews only
    # if you also export the raw code — normally you don't, and use the salted
    # anon(participantCode) so exports match reviews.
    parts = []
    for p in db.participants.find({}):
        pcode = str(p.get("participantCode", ""))
        parts.append({
            "participant": anon(pcode, args.salt),
            "participantCode": pcode,   # ok to keep — already anonymous
            "condition": p.get("condition"),
            "cefrLevel": p.get("cefrLevel"),
            "stratum": p.get("stratum"),
            "pretestScore": p.get("pretestScore"),
            "enrolledAt": iso(p.get("enrolledAt")),
            "dropoutAt": iso(p.get("dropoutAt")),
            "dropoutReason": p.get("dropoutReason"),
            "finishedAt": iso(p.get("finishedAt")),
            "daysActive": p.get("daysActive"),
            "totalReviews": p.get("totalReviews"),
            "lastActiveAt": iso(p.get("lastActiveAt")),
        })
    with open(os.path.join(args.out, "participants.json"), "w", encoding="utf-8") as f:
        json.dump(parts, f, indent=2)

    # ---- tests -------------------------------------------------------------
    tests = []
    for t in db.testresults.find({}):
        pcode = str(t.get("participantCode", ""))
        sec = t.get("sectionScores") or {}
        tests.append({
            "participant": anon(pcode, args.salt),
            "participantCode": pcode,
            "testType": t.get("testType"),
            "totalScore": t.get("totalScore"),
            "recallScore": sec.get("recall"),
            "clozeScore": sec.get("cloze"),
            "contextTransferScore": sec.get("contextTransfer"),
            "formVersion": t.get("formVersion"),
            "isBlindGraded": t.get("isBlindGraded"),
            "administeredAt": iso(t.get("administeredAt")),
        })
    with open(os.path.join(args.out, "tests.json"), "w", encoding="utf-8") as f:
        json.dump(tests, f, indent=2)

    # ---- judge scores (rubric) --------------------------------------------
    # Needed for ICC (LLM vs human) validation on the calibration subset.
    judges = []
    for j in db.judgescores.find({}):
        rub = j.get("rubric") or {}
        judges.append({
            "testResultId": str(j.get("testResultId")),
            "itemId": j.get("itemId"),
            "judgeType": j.get("judgeType"),
            "judgeId": j.get("judgeId"),
            "form": rub.get("form"),
            "meaning": rub.get("meaning"),
            "use": rub.get("use"),
            "contextFit": rub.get("contextFit"),
            "totalScore": j.get("totalScore"),
            "isCalibrationItem": j.get("isCalibrationItem"),
            "gradedAt": iso(j.get("gradedAt")),
        })
    with open(os.path.join(args.out, "judgescores.json"), "w", encoding="utf-8") as f:
        json.dump(judges, f, indent=2)

    print(f"reviews       : {n:,}")
    print(f"participants  : {len(parts)}")
    print(f"test results  : {len(tests)}")
    print(f"judge scores  : {len(judges)}")
    print(f"written to    : {args.out}/")
    print("\nNext step: python dq_check.py --dir " + args.out)


if __name__ == "__main__":
    main()

