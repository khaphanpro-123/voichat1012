#!/usr/bin/env python3
"""
analyze_familiarity.py — Analyze H5 word familiarity screening results.

Usage:
    MONGO_URI="mongodb+srv://..." python research/analyze_familiarity.py

Output:
    - Console table sorted by familiarity rate (highest first)
    - research/familiarity_results.json with full data
    - Flags words where ≥ FAMILIARITY_THRESHOLD screeners report already knowing the word

Pre-registered constant: FAMILIARITY_THRESHOLD = 0.70
Action: Words flagged for removal must be reviewed by PI and supervisor before removing
        from lib/wordBank.ts (set pilotStatus="removed", pilotRemovalReason=<reason>).
"""

import os
import sys
import json
from collections import defaultdict
from datetime import datetime, timezone

try:
    from pymongo import MongoClient
except ImportError:
    print("pip install pymongo --break-system-packages")
    sys.exit(1)

# ── Pre-registered constant ────────────────────────────────────────────────────
FAMILIARITY_THRESHOLD = 0.70  # Remove if ≥70% of screeners already know the word
MIN_SCREENERS = 20             # Minimum screeners needed before results are actionable

def main() -> None:
    mongo_uri = os.environ.get("MONGO_URI")
    if not mongo_uri:
        print("❌  MONGO_URI not set. Export it before running this script.")
        sys.exit(1)

    client = MongoClient(mongo_uri, serverSelectionTimeoutMS=8000)
    try:
        client.admin.command("ping")
    except Exception as e:
        print(f"❌  MongoDB connection failed: {e}")
        sys.exit(1)

    db = client.get_database()
    responses = list(db.familiarityresponses.find({}, {"_id": 0}))
    n_screeners = len(responses)

    print(f"\n{'═'*60}")
    print(f"  H5 Familiarity Screening Analysis")
    print(f"  Run at: {datetime.now(timezone.utc).strftime('%Y-%m-%d %H:%M UTC')}")
    print(f"{'═'*60}")
    print(f"\n  Screeners collected: {n_screeners} / {MIN_SCREENERS} (minimum)")

    if n_screeners == 0:
        print("\n  No responses yet. Share /research/familiarity-screen with H5 participants.")
        return

    if n_screeners < MIN_SCREENERS:
        print(f"\n  ⚠️  Only {n_screeners}/{MIN_SCREENERS} screeners — results are preliminary.")
        print(f"      Need {MIN_SCREENERS - n_screeners} more before treating as actionable.\n")

    # ── Tally per word ─────────────────────────────────────────────────────────
    known_counts: dict[str, int] = defaultdict(int)
    for resp in responses:
        resp_map: dict[str, bool] = resp.get("responses", {})
        for word_id, known in resp_map.items():
            if known:
                known_counts[word_id] += 1

    # ── Load word meta from DB (for word labels) ───────────────────────────────
    # Fallback: just use wordId if no meta available
    # (Full word meta would require importing TypeScript — use wordId labels only)
    all_word_ids = set(known_counts.keys())
    for resp in responses:
        all_word_ids.update(resp.get("responses", {}).keys())

    # ── Build per-word table ───────────────────────────────────────────────────
    results = []
    for word_id in sorted(all_word_ids):
        count = known_counts.get(word_id, 0)
        rate = count / n_screeners
        results.append({
            "wordId": word_id,
            "knownCount": count,
            "nScreeners": n_screeners,
            "familiarityRate": round(rate, 4),
            "flagged": rate >= FAMILIARITY_THRESHOLD,
        })

    results.sort(key=lambda x: -x["familiarityRate"])

    # ── Print table ────────────────────────────────────────────────────────────
    print(f"\n  {'wordId':<12} {'known':>6} {'N':>4}  {'rate':>7}  status")
    print(f"  {'─'*12} {'─'*6} {'─'*4}  {'─'*7}  {'─'*14}")
    for r in results:
        status = "⚠️  REMOVE CANDIDATE" if r["flagged"] else "✅ keep"
        print(f"  {r['wordId']:<12} {r['knownCount']:>6} {r['nScreeners']:>4}  {r['familiarityRate']:>6.1%}  {status}")

    # ── Summary ────────────────────────────────────────────────────────────────
    flagged = [r for r in results if r["flagged"]]
    unflagged = [r for r in results if not r["flagged"]]

    print(f"\n{'─'*60}")
    print(f"  Total words screened   : {len(results)}")
    print(f"  Words to keep          : {len(unflagged)}")
    print(f"  Words flagged (≥{FAMILIARITY_THRESHOLD:.0%}) : {len(flagged)}")

    if flagged:
        print(f"\n  ⚠️  Flagged for removal (review with supervisor before removing):")
        for r in flagged:
            print(f"    {r['wordId']}  ({r['familiarityRate']:.1%} already known by screeners)")
        print(f"\n  Action: In lib/wordBank.ts set pilotStatus='removed' and pilotRemovalReason='H5 familiarity screen'")
        print(f"          for the above word IDs. Do NOT delete — just mark removed.")
    else:
        print(f"\n  ✅ Word bank passes familiarity screening — no words need removal.")

    # ── Screener-level check ───────────────────────────────────────────────────
    print(f"\n{'─'*60}")
    print(f"  Screener summary:")
    for resp in sorted(responses, key=lambda x: x.get("screenerId", "")):
        resp_map = resp.get("responses", {})
        n_known = sum(1 for v in resp_map.values() if v)
        sid = resp.get("screenerId", "?")
        dur = resp.get("metadata", {}).get("durationSecs")
        dur_str = f"{dur//60}m{dur%60:02d}s" if dur else "—"
        submitted = resp.get("submittedAt", "?")
        print(f"    {sid:<10}  {n_known:>3}/{len(resp_map)} known  {dur_str:>8}  submitted {submitted}")

    # ── Save JSON ──────────────────────────────────────────────────────────────
    output_path = os.path.join(
        os.path.dirname(os.path.abspath(__file__)), "familiarity_results.json"
    )
    output = {
        "generatedAt": datetime.now(timezone.utc).isoformat(),
        "nScreeners": n_screeners,
        "threshold": FAMILIARITY_THRESHOLD,
        "actionable": n_screeners >= MIN_SCREENERS,
        "totalWords": len(results),
        "flaggedCount": len(flagged),
        "flagged": [r["wordId"] for r in flagged],
        "results": results,
    }
    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(output, f, indent=2, ensure_ascii=False)

    print(f"\n  💾 Results saved to research/familiarity_results.json")
    print(f"{'═'*60}\n")

    sys.exit(0 if len(flagged) == 0 else 2)  # exit 2 = flags exist (not error)


if __name__ == "__main__":
    main()
