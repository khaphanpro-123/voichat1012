"""
export_logs.py — Pull ReviewLog / Participant / TestResult out of MongoDB,
anonymise, and write analysis-ready JSONL + CSV.

Ethics: real userIds never leave the database. Each is replaced by a salted
SHA-256 hash truncated to 12 hex chars. Keep RESEARCH_SALT secret and out of
git — without it the mapping cannot be reversed, which is the point.

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

FIELDS = [
    "participant", "word", "condition", "schedulerVersion", "weightsVersion",
    "sessionId", "deltaDays", "serverDeltaDays", "retrievalType", "recall",
    "responseTimeMs", "elapsedMs", "quality", "contextId", "isCatchUp",
    "createdAt", "dayIndex",
]


def anon(user_id: str, salt: str) -> str:
    return hashlib.sha256((salt + "|" + str(user_id)).encode()).hexdigest()[:12]


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
    n = 0
    first_day = {}
    rows = []
    for r in db.reviewlogs.find(q).sort("createdAt", 1):
        uid = str(r.get("userId", ""))
        pid = anon(uid, args.salt)
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
            "recall": r.get("recall"),
            "responseTimeMs": r.get("responseTimeMs"),
            "elapsedMs": r.get("elapsedMs"),
            "quality": r.get("quality"),
            "contextId": r.get("contextId"),
            "isCatchUp": r.get("isCatchUp"),
            "createdAt": created.isoformat() if created else None,
            "dayIndex": day_index,
            "featureVector": r.get("featureVector") or [],
        })
        n += 1

    with open(os.path.join(args.out, "reviews.jsonl"), "w", encoding="utf-8") as f:
        for r in rows:
            f.write(json.dumps(r, default=str) + "\n")

    with open(os.path.join(args.out, "reviews.csv"), "w", encoding="utf-8", newline="") as f:
        w = csv.DictWriter(f, fieldnames=FIELDS, extrasaction="ignore")
        w.writeheader()
        w.writerows(rows)

    # ---- participants ------------------------------------------------------
    parts = []
    for p in db.participants.find({}):
        parts.append({
            "participant": anon(str(p.get("userId", "")), args.salt),
            "condition": p.get("condition"),
            "cefrPretest": p.get("cefrPretest"),
            "stratum": p.get("stratum"),
            "enrolledAt": str(p.get("enrolledAt")),
            "droppedAt": str(p.get("droppedAt")) if p.get("droppedAt") else None,
            "ageBand": p.get("ageBand"),
            "educationLevel": p.get("educationLevel"),
        })
    with open(os.path.join(args.out, "participants.json"), "w", encoding="utf-8") as f:
        json.dump(parts, f, indent=2)

    # ---- tests -------------------------------------------------------------
    tests = []
    for t in db.testresults.find({}):
        tests.append({
            "participant": anon(str(t.get("userId", "")), args.salt),
            "phase": t.get("phase"),
            "recallScore": t.get("recallScore"),
            "transferScore": t.get("transferScore"),
            "productiveScore": t.get("productiveScore"),
            "takenAt": str(t.get("takenAt")),
        })
    with open(os.path.join(args.out, "tests.json"), "w", encoding="utf-8") as f:
        json.dump(tests, f, indent=2)

    print(f"reviews      : {n:,}")
    print(f"participants : {len(parts)}")
    print(f"test results : {len(tests)}")
    print(f"written to   : {args.out}/")
    print("\nCheck before analysing:")
    print("  - any participant with 0 reviews?  (enrolled but never started)")
    print("  - reviews with deltaDays == 0      (first exposures, excluded from RQ1)")
    print("  - retrievalType distribution       (all four formats represented?)")
    print("  - condition counts                 (allocation actually balanced?)")


if __name__ == "__main__":
    main()
