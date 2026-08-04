"""
synth_logs.py — Synthetic learner simulator producing ReviewLog-shaped rows.

WHAT THIS IS FOR
----------------
1. Dry-running the whole analysis pipeline BEFORE a single real learner exists.
2. Power analysis: how many learners / weeks do we need to detect alpha > 0?
3. Type-I error check: run with --alpha-true 0 and confirm the LRT rejects at
   roughly the nominal 5%. If it rejects far more often, the test is broken and
   any "significant" result on real data would be an artefact.

WHAT THIS IS *NOT* FOR
----------------------
Evidence. The generative model here has a difficulty-modulated half-life baked
in, so DART necessarily beats HLR on this data. That is circular by construction.
NEVER report a number produced by this script as a finding. Real conclusions
come only from `fit_dart.py --source mongo` on logs from actual learners.

Usage
-----
    python synth_logs.py --learners 180 --weeks 8 --out data/synth.jsonl
    python synth_logs.py --alpha-true 0 --seed 7 --out data/null.jsonl
"""

from __future__ import annotations

import argparse
import json
import math
import os

import numpy as np

from dart_model import PHI, FEATURE_NAMES

CONDITIONS = ["sm2", "hlr", "dart"]


def build_x(cefr: int, word_freq: float, avg_acc: float, times_reviewed: int) -> np.ndarray:
    """Must stay byte-for-byte consistent with lib/dart.ts::buildFeatureVector."""
    return np.array([
        1.0,
        cefr / 5.0,
        math.log(1.0 + word_freq) / math.log(1e6),
        min(max(avg_acc, 0.0), 1.0),
        math.log(1.0 + times_reviewed) / math.log(50.0),
    ], dtype=np.float64)


def next_type_dart(h: float, thresholds=(2.0, 7.0, 30.0)) -> int:
    lo, mid, hi = thresholds
    if h < lo:
        return 0
    if h < mid:
        return 1
    if h < hi:
        return 2
    return 3


def simulate(
    n_learners=180, n_words=60, weeks=8, alpha_true=0.45, seed=42,
    theta_true=(1.10, -0.55, 0.35, 0.90, 0.60), tau=0.9, dropout_weekly=0.02,
):
    rng = np.random.default_rng(seed)
    theta_true = np.asarray(theta_true, dtype=np.float64)
    horizon = weeks * 7

    # Zipf-ish corpus frequencies
    word_freq = 10 ** rng.uniform(2.0, 5.5, n_words)
    words = [f"w{ i :04d}" for i in range(n_words)]

    rows, participants = [], []

    for u in range(n_learners):
        uid = f"P{u:04d}"
        cefr = int(rng.integers(1, 4))                 # A2..B2
        condition = CONDITIONS[u % len(CONDITIONS)]    # balanced allocation
        ability = float(rng.normal(0, 0.25))           # learner random effect
        drop_day = horizon + 1
        for d in range(horizon):
            if rng.random() < dropout_weekly / 7.0:
                drop_day = d
                break

        participants.append({
            "userId": uid, "cefr": cefr, "condition": condition,
            "ability": round(ability, 4), "dropDay": int(drop_day),
        })

        n_active = int(rng.integers(25, n_words))
        active = rng.choice(n_words, size=n_active, replace=False)

        for wi in active:
            day = float(rng.uniform(0, 3))
            interval = 1.0
            d_prev = 0
            times_reviewed = 0
            correct = 0
            last_day = None

            while day < min(horizon, drop_day):
                acc = correct / times_reviewed if times_reviewed else 0.5
                x = build_x(cefr, float(word_freq[wi]), acc, times_reviewed)

                # ---- ground-truth memory (unknown to any scheduler) ----
                h_true = float(np.exp2(x @ theta_true + ability) * math.exp(alpha_true * PHI[d_prev]))
                h_true = max(h_true, 1e-3)
                delta = 0.0 if last_day is None else day - last_day
                p = 2.0 ** (-delta / h_true) if last_day is not None else 0.95
                r = int(rng.random() < p)

                # learners take longer on harder formats and on items they miss
                rt = float(rng.lognormal(mean=7.9 + 0.28 * d_prev + (0.35 if r == 0 else 0.0), sigma=0.45))

                rows.append({
                    "userId": uid,
                    "word": words[wi],
                    "condition": condition,
                    "deltaDays": round(delta, 4),
                    "retrievalType": int(d_prev),
                    "featureVector": [round(float(v), 6) for v in x],
                    "recall": r,
                    "responseTimeMs": round(rt, 1),
                    "dayIndex": round(day, 3),
                    "cefr": cefr,
                })

                times_reviewed += 1
                correct += r

                # ---- scheduler decides the next visit ----
                if condition == "sm2":
                    interval = max(1.0, interval * (2.5 if r else 0.2))
                    d_next = 0
                elif condition == "hlr":
                    h_est = float(np.exp2(x @ theta_true))          # no difficulty term
                    interval = max(1.0, h_est * math.log2(1 / tau))
                    d_next = 0
                else:                                              # dart
                    h_est = float(np.exp2(x @ theta_true) * math.exp(alpha_true * PHI[d_prev]))
                    interval = max(1.0, h_est * math.log2(1 / tau))
                    if not r:
                        interval *= 0.3
                    d_next = next_type_dart(h_est)

                last_day = day
                day += interval * float(rng.uniform(0.85, 1.4))     # learners are not punctual
                d_prev = d_next

    return rows, participants


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--learners", type=int, default=180)
    ap.add_argument("--words", type=int, default=60)
    ap.add_argument("--weeks", type=int, default=8)
    ap.add_argument("--alpha-true", type=float, default=0.45,
                    help="set 0 to generate data under H0 for a Type-I error check")
    ap.add_argument("--seed", type=int, default=42)
    ap.add_argument("--out", default="data/synth.jsonl")
    args = ap.parse_args()

    rows, participants = simulate(
        n_learners=args.learners, n_words=args.words, weeks=args.weeks,
        alpha_true=args.alpha_true, seed=args.seed,
    )

    os.makedirs(os.path.dirname(args.out) or ".", exist_ok=True)
    with open(args.out, "w", encoding="utf-8") as f:
        for r in rows:
            f.write(json.dumps(r) + "\n")

    pfile = os.path.splitext(args.out)[0] + "_participants.json"
    with open(pfile, "w", encoding="utf-8") as f:
        json.dump(participants, f, indent=2)

    by_cond = {}
    for r in rows:
        by_cond[r["condition"]] = by_cond.get(r["condition"], 0) + 1

    print(f"alpha_true = {args.alpha_true}")
    print(f"wrote {len(rows):,} review rows -> {args.out}")
    print(f"wrote {len(participants)} participants -> {pfile}")
    print(f"rows/condition: {by_cond}")
    print(f"overall recall rate: {np.mean([r['recall'] for r in rows]):.3f}")
    print("\nREMINDER: synthetic data validates the PIPELINE, never a hypothesis.")


if __name__ == "__main__":
    main()
