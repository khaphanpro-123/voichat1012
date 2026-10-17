"""
power_analysis.py — How many learners and weeks do we actually need?

Two jobs, both required by the pre-registration:

  A) POWER. Simulate under alpha_true > 0 at several sample sizes and count how
     often the boundary-corrected LRT rejects. Report the smallest N reaching
     80% power. Run this BEFORE recruiting anyone.

  B) TYPE-I ERROR DIAGNOSTIC. Simulate under alpha_true = 0 to expose
     miscalibration in the legacy IID LRT. This does not establish power for a
     primary clustered RQ1 procedure.

Runtime warning: each replicate fits two models. Start with --reps 20 to gauge
the speed on your machine, then raise it. --reps 200 is publication grade.

Usage
-----
    python power_analysis.py --grid 30,60,120,180 --weeks 8 --reps 50
    python power_analysis.py --grid 60,180 --alpha-true 0 --reps 200   # Type-I
"""

from __future__ import annotations

import argparse
import json
import os
import time

import numpy as np

from dart_model import fit, lrt_alpha, mean_loglik
from synth_logs import simulate


def one_replicate(n_learners, weeks, alpha_true, seed, lam=1e-3, words=60):
    rows, _ = simulate(
        n_learners=n_learners, n_words=words, weeks=weeks,
        alpha_true=alpha_true, seed=seed,
    )
    rows = [r for r in rows if r["deltaDays"] > 0]
    if len(rows) < 200:
        return None

    X = np.array([r["featureVector"] for r in rows], dtype=np.float64)
    D = np.array([r["retrievalType"] for r in rows], dtype=np.int64)
    delta = np.array([r["deltaDays"] for r in rows], dtype=np.float64)
    y = np.array([r["recall"] for r in rows], dtype=np.float64)

    # alpha is only identifiable if more than one retrieval format was served
    if len(np.unique(D)) < 2:
        return {"alpha": 0.0, "p": 1.0, "reject": 0, "n_rows": len(rows), "identifiable": False}

    th_d, al_d, _ = fit(X, D, delta, y, lam=lam, fit_alpha=True, seed=seed)
    th_h, _, _ = fit(X, D, delta, y, lam=lam, fit_alpha=False, seed=seed)
    ll_f = mean_loglik(th_d, al_d, X, D, delta, y)
    ll_r = mean_loglik(th_h, 0.0, X, D, delta, y)
    _, p_boundary, _ = lrt_alpha(ll_f, ll_r, len(rows))

    return {
        "alpha": float(al_d), "p": float(p_boundary),
        "reject": int(p_boundary < 0.05), "n_rows": len(rows), "identifiable": True,
    }


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--grid", default="30,60,120,180",
                    help="comma-separated learner counts")
    ap.add_argument("--weeks", type=int, default=8)
    ap.add_argument("--words", type=int, default=60)
    ap.add_argument("--alpha-true", type=float, default=0.45)
    ap.add_argument("--reps", type=int, default=50)
    ap.add_argument("--seed0", type=int, default=1000)
    ap.add_argument("--out", default="reports/power.json")
    args = ap.parse_args()

    grid = [int(g) for g in args.grid.split(",")]
    mode = "TYPE-I ERROR" if args.alpha_true == 0 else "POWER"

    print(f"{mode} study | alpha_true={args.alpha_true} | weeks={args.weeks} | reps={args.reps}")
    print(f"{'N':>6}{'reps':>7}{'reject rate':>14}{'mean alpha':>12}{'mean rows':>12}{'sec':>8}")
    print("-" * 59)

    results = []
    for n in grid:
        t0 = time.time()
        reps = []
        for i in range(args.reps):
            r = one_replicate(n, args.weeks, args.alpha_true, args.seed0 + i, words=args.words)
            if r:
                reps.append(r)
        if not reps:
            continue
        rate = float(np.mean([r["reject"] for r in reps]))
        row = {
            "n_learners": n,
            "reps": len(reps),
            "reject_rate_iid_diagnostic": rate,
            "mean_alpha": float(np.mean([r["alpha"] for r in reps])),
            "mean_rows": float(np.mean([r["n_rows"] for r in reps])),
            "seconds": round(time.time() - t0, 1),
        }
        results.append(row)
        print(f"{n:>6}{row['reps']:>7}{rate:>14.3f}{row['mean_alpha']:>12.3f}"
              f"{row['mean_rows']:>12,.0f}{row['seconds']:>8.1f}")

    print()
    if args.alpha_true == 0:
        worst = max((r["reject_rate_iid_diagnostic"] for r in results), default=0)
        print(f"Nominal alpha = 0.05. Highest observed rejection rate = {worst:.3f}")
        if worst > 0.10:
            print("!! Test is ANTI-CONSERVATIVE. Do not trust p-values until this is fixed.")
        else:
            print("Legacy IID diagnostic did not exceed the heuristic threshold.")
        print("!! Diagnostic-only: do not use this result to select confirmatory RQ1 sample size.")
    else:
        ok = [r["n_learners"] for r in results if r["reject_rate_iid_diagnostic"] >= 0.80]
        if ok:
            print(f"Smallest N reaching 80% power under the legacy IID diagnostic: {min(ok)} learners")
        else:
            print("No tested N reached 80% power. Increase learners, weeks, or words —")
            print("or accept that the study is powered only for a larger effect.")

    print("!! All power/type-I output from this script is diagnostic-only until a clustered-null primary test is implemented and calibrated.")

    os.makedirs(os.path.dirname(args.out) or ".", exist_ok=True)
    with open(args.out, "w", encoding="utf-8") as f:
        json.dump({"mode": mode, "alpha_true": args.alpha_true, "weeks": args.weeks,
                   "reps": args.reps, "confirmatory_status": "BLOCKED_PENDING_CLUSTERED_NULL_TEST",
                   "results": results}, f, indent=2)
    print(f"wrote {args.out}")


if __name__ == "__main__":
    main()

