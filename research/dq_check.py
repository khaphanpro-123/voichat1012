"""
dq_check.py — Data-quality report on an export.

Run AFTER export_logs.py. Reads reviews.jsonl + participants.json + tests.json
and prints a report with ✅ / ⚠️ / 🚨 flags. Non-zero exit code if any 🚨.

Checks (each maps to a decision the paper needs to defend):

  1. Missing required fields on reviews (should be <1% per RESEARCH_PROGRESS.md)
  1b. Optional-but-tracked fields missing rate (elapsedMs, contextId for CARTS)
  2. retrievalType balance (each of d=0/1/2/3 should be ≥10%)
  3. Per-condition row counts (should be within 30% of each other)
  4. Per-participant tuân thủ (compliance): days_active ≥ 70% of study weeks
  5. First-exposure rows (deltaDays == 0) — flag count, RQ1 will exclude these
  6. weightsVersion consistency — if any row served by "default" weights, warn
  7. serverDeltaDays vs deltaDays discrepancy — clock drift or bug
  8. TestResult coverage — every enrolled participant should have pretest;
     completers should have posttest_delayed
  9. Learners with 0 review rows (enrolled but never studied — attritors)
  10. Δ out of expected range [0, 60] days (clock skew / stale review)

Usage
-----
    python dq_check.py --dir data/export
    python dq_check.py --dir data/export --study-weeks 8
"""

from __future__ import annotations

import argparse
import json
import os
import sys
from collections import Counter, defaultdict
from datetime import datetime, timedelta, timezone

# Study runs in Vietnam. Bucketing "days_active" by UTC would split ICT-morning
# sessions across two calendar days and over-count. Convert createdAt (which is
# UTC ISO from Mongo) to ICT before slicing the date.
ICT = timezone(timedelta(hours=7))


def to_ict_date(iso_str: str) -> str:
    """Return YYYY-MM-DD in Asia/Ho_Chi_Minh for a UTC ISO timestamp."""
    if not iso_str:
        return ""
    # Handle both trailing 'Z' and offset formats
    s = iso_str.replace("Z", "+00:00")
    try:
        dt = datetime.fromisoformat(s)
    except ValueError:
        # Best effort: slice first 10 chars if unparseable
        return iso_str[:10]
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    return dt.astimezone(ICT).date().isoformat()

REQUIRED_REVIEW_FIELDS = [
    "participant", "condition", "retrievalType", "recall",
    "serverDeltaDays", "createdAt",
]


def load_jsonl(path):
    with open(path, encoding="utf-8") as f:
        return [json.loads(line) for line in f if line.strip()]


def load_json(path):
    with open(path, encoding="utf-8") as f:
        return json.load(f)


def flag(level, msg):
    icon = {"ok": "✅", "warn": "⚠️", "crit": "🚨"}[level]
    print(f"  {icon} {msg}")
    return level


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--dir", required=True, help="export dir produced by export_logs.py")
    ap.add_argument("--study-weeks", type=int, default=8)
    ap.add_argument("--min-retrieval-share", type=float, default=0.10)
    ap.add_argument("--min-compliance", type=float, default=0.70)
    args = ap.parse_args()

    reviews_path = os.path.join(args.dir, "reviews.jsonl")
    parts_path = os.path.join(args.dir, "participants.json")
    tests_path = os.path.join(args.dir, "tests.json")

    if not os.path.exists(reviews_path):
        raise SystemExit(f"Missing {reviews_path} — run export_logs.py first")

    reviews = load_jsonl(reviews_path)
    parts = load_json(parts_path) if os.path.exists(parts_path) else []
    tests = load_json(tests_path) if os.path.exists(tests_path) else []

    print(f"\nDQ report on {args.dir}")
    print(f"  reviews={len(reviews):,}  participants={len(parts)}  tests={len(tests)}")
    print()

    worst = "ok"

    def bump(level):
        nonlocal worst
        order = {"ok": 0, "warn": 1, "crit": 2}
        if order[level] > order[worst]:
            worst = level

    # ---------------- 1. Missing required fields ----------------------------
    print("1. Missing required fields")
    if not reviews:
        bump(flag("crit", "no reviews exported"))
    else:
        missing_counts = Counter()
        for r in reviews:
            for k in REQUIRED_REVIEW_FIELDS:
                if r.get(k) is None:
                    missing_counts[k] += 1
        total = len(reviews)
        any_bad = False
        for k in REQUIRED_REVIEW_FIELDS:
            pct = missing_counts[k] / total
            if pct > 0.01:
                bump(flag("crit", f"{k}: {missing_counts[k]}/{total} ({pct:.1%}) missing (>1%)"))
                any_bad = True
            elif missing_counts[k] > 0:
                bump(flag("warn", f"{k}: {missing_counts[k]}/{total} ({pct:.2%}) missing"))
                any_bad = True
        if not any_bad:
            flag("ok", "all required fields present on all rows")

    # ---------------- 1b. Optional-but-tracked fields ----------------------
    print("\n1b. Optional field coverage (elapsedMs, contextId)")
    if reviews:
        n = len(reviews)
        miss_elapsed = sum(1 for r in reviews if r.get("elapsedMs") is None)
        pct_e = miss_elapsed / n
        level_e = "ok" if pct_e < 0.01 else "warn" if pct_e < 0.05 else "crit"
        bump(flag(level_e, f"elapsedMs missing: {miss_elapsed:,}/{n} ({pct_e:.2%})"))

        # contextId only expected for CARTS condition — filter first
        carts_rows = [r for r in reviews if r.get("condition") == "carts"]
        if carts_rows:
            miss_ctx = sum(1 for r in carts_rows if not r.get("contextId"))
            pct_c = miss_ctx / len(carts_rows)
            level_c = "ok" if pct_c < 0.01 else "warn" if pct_c < 0.05 else "crit"
            bump(flag(level_c, f"contextId missing on CARTS rows: {miss_ctx:,}/{len(carts_rows)} ({pct_c:.2%})"))
        else:
            flag("ok", "no CARTS rows yet — skip contextId check")

    # ---------------- 2. retrievalType balance ------------------------------
    print("\n2. retrievalType distribution (need each ≥ {:.0%})".format(args.min_retrieval_share))
    if reviews:
        counts = Counter(r.get("retrievalType") for r in reviews)
        total = sum(counts.values())
        for d in [0, 1, 2, 3]:
            share = counts.get(d, 0) / total
            level = "ok" if share >= args.min_retrieval_share else "crit"
            bump(flag(level, f"d={d}: {counts.get(d, 0):>7,} ({share:>6.1%})"))
        if any(counts.get(d, 0) == 0 for d in [0, 1, 2, 3]):
            bump(flag("crit", "at least one retrievalType has zero rows — α not identifiable"))

    # ---------------- 3. Per-condition balance ------------------------------
    print("\n3. Per-condition row counts")
    if reviews:
        by_cond = Counter(r.get("condition") for r in reviews)
        if by_cond:
            mx = max(by_cond.values())
            mn = min(by_cond.values())
            for c, n in sorted(by_cond.items()):
                print(f"     {c}: {n:,}")
            if mn > 0 and (mx - mn) / mx > 0.30:
                bump(flag("warn", f"imbalance {(mx-mn)/mx:.1%} — check dropout by arm"))
            else:
                flag("ok", "conditions within 30% of each other")

    # ---------------- 4. Per-participant compliance -------------------------
    print(f"\n4. Compliance: ≥{args.min_compliance:.0%} of {args.study_weeks*7} study days active")
    if reviews:
        days_by_p = defaultdict(set)
        for r in reviews:
            if r.get("createdAt"):
                day = to_ict_date(r["createdAt"])  # ICT calendar day (VN study)
                if day:
                    days_by_p[r["participant"]].add(day)
        threshold = args.study_weeks * 7 * args.min_compliance
        compliant = sum(1 for days in days_by_p.values() if len(days) >= threshold)
        total_p = len(days_by_p)
        pct = compliant / total_p if total_p else 0
        level = "ok" if pct >= args.min_compliance else "warn"
        bump(flag(level, f"{compliant}/{total_p} ({pct:.1%}) hit compliance threshold"))

    # ---------------- 5. First-exposure rows --------------------------------
    print("\n5. First-exposure rows (Δ=0 or serverΔ=0) — excluded from RQ1")
    if reviews:
        first_exposure = sum(1 for r in reviews
                             if (r.get("serverDeltaDays") or 0) == 0
                             or (r.get("deltaDays") or 0) == 0)
        flag("ok", f"{first_exposure:,} rows ({first_exposure/len(reviews):.1%}) — informational")

    # ---------------- 6. weightsVersion consistency ------------------------
    print("\n6. weightsVersion coverage")
    if reviews:
        wv = Counter(r.get("weightsVersion") or "unset" for r in reviews)
        for v, n in wv.most_common():
            print(f"     {v}: {n:,}")
        if wv.get("default", 0) > 0:
            bump(flag("warn", f"{wv['default']:,} rows served by DEFAULT weights (no training) — exclude from RQ1?"))
        if wv.get("unset", 0) > 0:
            bump(flag("crit", f"{wv['unset']:,} rows missing weightsVersion — cannot audit"))

    # ---------------- 7. Server vs client Δ ---------------------------------
    print("\n7. serverDeltaDays vs deltaDays drift")
    if reviews:
        drift_big = 0
        drift_any = 0
        for r in reviews:
            s = r.get("serverDeltaDays")
            c = r.get("deltaDays")
            if s is None or c is None:
                continue
            if abs(s - c) > 0.01:
                drift_any += 1
            if abs(s - c) > 1.0:
                drift_big += 1
        if drift_big > 0:
            bump(flag("warn", f"{drift_big:,} rows with |server-client Δ| > 1 day — likely clock skew"))
        elif drift_any > 0:
            flag("ok", f"{drift_any:,} rows with sub-day drift (normal)")
        else:
            flag("ok", "server and client Δ match on all rows")

    # ---------------- 8. Test coverage -------------------------------------
    print("\n8. Test coverage")
    if parts and tests:
        by_p_and_type = defaultdict(set)
        for t in tests:
            by_p_and_type[t.get("participantCode")].add(t.get("testType"))
        no_pretest = [p["participantCode"] for p in parts
                      if "pretest_cefr" not in by_p_and_type.get(p["participantCode"], set())]
        # A "completer" = didn't drop out
        completers = [p for p in parts if not p.get("dropoutAt")]
        no_posttest = [p["participantCode"] for p in completers
                       if "posttest_delayed" not in by_p_and_type.get(p["participantCode"], set())]
        if no_pretest:
            bump(flag("crit", f"{len(no_pretest)} enrolled participants missing pretest_cefr"))
        else:
            flag("ok", "all enrolled participants have pretest_cefr")
        if no_posttest:
            bump(flag("warn", f"{len(no_posttest)}/{len(completers)} completers missing posttest_delayed (may be pending)"))
        else:
            flag("ok", "all completers have posttest_delayed")
    else:
        flag("ok", "no participants/tests yet — skip")

    # ---------------- 9. Learners with 0 review rows ------------------------
    print("\n9. Enrolled learners with 0 review rows (attritors)")
    if parts:
        reviewers = {r.get("participant") for r in reviews if r.get("participant")}
        zero_review = [p["participantCode"] for p in parts if p.get("participantCode") not in reviewers]
        pct = len(zero_review) / len(parts)
        # >10% zero-review attrition is concerning for internal validity
        level = "ok" if pct < 0.05 else "warn" if pct < 0.10 else "crit"
        bump(flag(level, f"{len(zero_review)}/{len(parts)} enrolled but 0 reviews ({pct:.1%})"))
    else:
        flag("ok", "no participants yet — skip")

    # ---------------- 10. Δ out of range [0, 60] ----------------------------
    print("\n10. deltaDays out of expected range [0, 60]")
    if reviews:
        neg = sum(1 for r in reviews if (r.get("serverDeltaDays") or 0) < 0)
        toobig = sum(1 for r in reviews if (r.get("serverDeltaDays") or 0) > 60)
        n = len(reviews)
        if neg > 0:
            bump(flag("crit", f"{neg:,} rows with Δ < 0 (clock skew / stale event) — MUST fix before analysis"))
        else:
            flag("ok", "no negative Δ")
        if toobig > 0:
            pct = toobig / n
            level = "warn" if pct < 0.02 else "crit"
            bump(flag(level, f"{toobig:,} rows with Δ > 60 days ({pct:.2%}) — likely stale event or delivery lapse"))
        else:
            flag("ok", "no Δ > 60 days")

    print(f"\nOverall: {worst.upper()}")
    sys.exit(0 if worst != "crit" else 1)


if __name__ == "__main__":
    main()
