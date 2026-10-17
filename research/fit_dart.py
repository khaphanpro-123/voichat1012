"""
fit_dart.py — Fit DART, test H0: alpha = 0, and emit dart_weights.json.

This is the script that answers RQ1. It does four things the old
python-api/train_dart.py did not:

  1. LEARNER-LEVEL cross-validation. Splitting by row leaks a learner's own
     history into their test fold and inflates AUC. Reviewers check this.
  2. A diagnostic likelihood-ratio comparison plus a bootstrap CI for alpha
     clustered by learner. The IID LRT is not confirmatory RQ1 inference.
  3. Calibration (Brier, ECE, reliability table) — a scheduler needs correct
     probabilities, not just correct ranking.
  4. DeLong test on the held-out AUC difference between DART and HLR.

Usage
-----
    python fit_dart.py --source jsonl --path data/synth.jsonl
    python fit_dart.py --source mongo --mongo-uri "$MONGO_URI" --out ../dart_weights.json
"""

from __future__ import annotations

import argparse
import json
import os
from collections import defaultdict

import numpy as np

from dart_model import (
    FEATURE_NAMES, auc, brier, calibration_table, delong_auc_test, ece, fit,
    half_life, lrt_alpha, mean_loglik, recall_prob,
)


# ---------------------------------------------------------------- loading

def load_jsonl(path):
    rows = []
    with open(path, "r", encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if line:
                rows.append(json.loads(line))
    return rows


def load_mongo(uri, min_delta=0.0):
    from pymongo import MongoClient
    client = MongoClient(uri)
    db = client.get_default_database()
    cur = db.reviewlogs.find({}, {
        "userId": 1, "word": 1, "featureVector": 1, "deltaDays": 1,
        "retrievalType": 1, "recall": 1, "condition": 1, "responseTimeMs": 1,
    })
    return [dict(r, _id=str(r.get("_id", ""))) for r in cur]


def to_arrays(rows, drop_first_exposure=True):
    """
    Returns X, D, delta, r, groups(userId).

    drop_first_exposure: the very first sighting of a word has delta = 0, which
    carries no forgetting information and forces p -> 1. Keeping those rows
    inflates every model's accuracy identically and hides real differences.
    """
    keep = []
    for r in rows:
        fv = r.get("featureVector") or []
        if len(fv) == 0:
            continue
        d = float(r.get("deltaDays") or 0.0)
        if drop_first_exposure and d <= 0:
            continue
        keep.append(r)

    if not keep:
        raise SystemExit("No usable rows. Have any reviews with deltaDays > 0 been logged?")

    width = max(len(r["featureVector"]) for r in keep)
    X = np.zeros((len(keep), width))
    for i, r in enumerate(keep):
        fv = r["featureVector"]
        X[i, :len(fv)] = fv

    D = np.array([int(r.get("retrievalType") or 0) for r in keep], dtype=np.int64)
    delta = np.array([float(r["deltaDays"]) for r in keep], dtype=np.float64)
    y = np.array([float(r.get("recall") or 0) for r in keep], dtype=np.float64)
    groups = np.array([str(r.get("userId", "unknown")) for r in keep])
    return X, D, delta, y, groups, keep


# ------------------------------------------------------- CV by learner

def group_kfold(groups, k=5, seed=0):
    """Yield (train_idx, test_idx) so no learner appears in both."""
    uniq = np.unique(groups)
    rng = np.random.default_rng(seed)
    rng.shuffle(uniq)
    folds = np.array_split(uniq, k)
    for f in folds:
        test_users = set(f.tolist())
        mask = np.array([g in test_users for g in groups])
        yield np.where(~mask)[0], np.where(mask)[0]


def cluster_bootstrap_alpha(X, D, delta, y, groups, lam, n_boot=400, seed=0):
    """
    Bootstrap CI for alpha, resampling LEARNERS (not rows). Row-level bootstrap
    would ignore within-learner correlation and give an interval that is too
    narrow.
    """
    rng = np.random.default_rng(seed)
    uniq = np.unique(groups)
    index_of = defaultdict(list)
    for i, g in enumerate(groups):
        index_of[g].append(i)

    out = []
    for b in range(n_boot):
        picked = rng.choice(uniq, size=len(uniq), replace=True)
        idx = np.concatenate([index_of[g] for g in picked])
        try:
            _, a, _ = fit(X[idx], D[idx], delta[idx], y[idx], lam=lam, fit_alpha=True, seed=b)
            out.append(a)
        except Exception:
            continue
    return np.array(out)


# ------------------------------------------------------------------ main

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--source", choices=["jsonl", "mongo"], default="jsonl")
    ap.add_argument("--path", default="data/synth.jsonl")
    ap.add_argument("--mongo-uri", default=os.environ.get("MONGO_URI"))
    ap.add_argument("--condition", default=None,
                    help="fit on one arm only, e.g. --condition dart")
    ap.add_argument("--lam", type=float, default=1e-3)
    ap.add_argument("--folds", type=int, default=5)
    ap.add_argument("--boot", type=int, default=400)
    ap.add_argument("--seed", type=int, default=0)
    ap.add_argument("--out", default="dart_weights.json")
    ap.add_argument("--report", default="reports/rq1_report.json")
    args = ap.parse_args()

    rows = load_jsonl(args.path) if args.source == "jsonl" else load_mongo(args.mongo_uri)
    if args.condition:
        rows = [r for r in rows if r.get("condition") == args.condition]

    X, D, delta, y, groups, kept = to_arrays(rows)
    n, f = X.shape
    print(f"rows={n:,}  features={f}  learners={len(np.unique(groups))}  recall_rate={y.mean():.3f}")
    print(f"retrieval-type counts: {dict(zip(*np.unique(D, return_counts=True)))}\n")

    if len(np.unique(D)) < 2:
        print("!! WARNING: only one retrieval type present. alpha is NOT identifiable.")
        print("!! The DART-vs-HLR comparison is meaningless until the four task")
        print("!! formats are actually served to learners. Fix the frontend first.\n")

    # ---------------- in-sample fits: full (DART) vs restricted (HLR) --------
    theta_d, alpha_d, res_d = fit(X, D, delta, y, lam=args.lam, fit_alpha=True, seed=args.seed)
    theta_h, _, res_h = fit(X, D, delta, y, lam=args.lam, fit_alpha=False, seed=args.seed)

    ll_full = mean_loglik(theta_d, alpha_d, X, D, delta, y)
    ll_rest = mean_loglik(theta_h, 0.0, X, D, delta, y)
    lr, p_boundary, p_naive = lrt_alpha(ll_full, ll_rest, n)

    print("=" * 66)
    print("RQ1 — Does retrieval difficulty modulate the forgetting rate?")
    print("=" * 66)
    print(f"alpha_hat           = {alpha_d:.4f}")
    print(f"mean loglik  DART   = {ll_full:.5f}")
    print(f"mean loglik  HLR    = {ll_rest:.5f}")
    print(f"LR statistic        = {lr:.3f}")
    print(f"p (boundary-correct, IID diagnostic only) = {p_boundary:.3e}")
    print(f"p (naive chi2_1, diagnostic only)         = {p_naive:.3e}")
    print("!! PRIMARY RQ1 INFERENCE BLOCKED: no statistician-approved clustered-null test is wired here.")
    print("!! Do not report either LRT p-value as confirmatory evidence.")
    print(f"theta_hat           = {np.round(theta_d, 4).tolist()}")
    print(f"  feature names     = {FEATURE_NAMES[:f]}")

    # ---------------- bootstrap CI for alpha ---------------------------------
    print(f"\nCluster bootstrap over learners (B={args.boot}) ...")
    boots = cluster_bootstrap_alpha(X, D, delta, y, groups, args.lam, args.boot, args.seed)
    if len(boots):
        lo, hi = np.percentile(boots, [2.5, 97.5])
        share_zero = float(np.mean(boots <= 1e-6))
        print(f"alpha 95% CI        = [{lo:.4f}, {hi:.4f}]")
        print(f"share of boots at 0 = {share_zero:.3f}")
        if lo <= 0.0:
            print("  -> CI touches 0: cannot claim difficulty modulates forgetting.")
    else:
        lo = hi = float("nan")
        share_zero = float("nan")

    # ---------------- learner-level CV --------------------------------------
    print(f"\n{args.folds}-fold CV, split BY LEARNER (no leakage)")
    pd_all, ph_all, y_all = [], [], []
    per_fold = []
    for k, (tr, te) in enumerate(group_kfold(groups, args.folds, args.seed), 1):
        th_d, al_d, _ = fit(X[tr], D[tr], delta[tr], y[tr], lam=args.lam, fit_alpha=True, seed=k)
        th_h, _, _ = fit(X[tr], D[tr], delta[tr], y[tr], lam=args.lam, fit_alpha=False, seed=k)

        p_dart = recall_prob(half_life(th_d, al_d, X[te], D[te]), delta[te])
        p_hlr = recall_prob(half_life(th_h, 0.0, X[te], D[te]), delta[te])

        row = {
            "fold": k, "n_test": int(len(te)), "alpha": float(al_d),
            "auc_dart": auc(y[te], p_dart), "auc_hlr": auc(y[te], p_hlr),
            "brier_dart": brier(y[te], p_dart), "brier_hlr": brier(y[te], p_hlr),
            "ll_dart": mean_loglik(th_d, al_d, X[te], D[te], delta[te], y[te]),
            "ll_hlr": mean_loglik(th_h, 0.0, X[te], D[te], delta[te], y[te]),
        }
        per_fold.append(row)
        print(f"  fold {k}: n={row['n_test']:>6,}  alpha={row['alpha']:.3f}  "
              f"AUC {row['auc_dart']:.4f} vs {row['auc_hlr']:.4f}  "
              f"Brier {row['brier_dart']:.4f} vs {row['brier_hlr']:.4f}")

        pd_all.append(p_dart); ph_all.append(p_hlr); y_all.append(y[te])

    pd_all = np.concatenate(pd_all); ph_all = np.concatenate(ph_all); y_all = np.concatenate(y_all)

    a1, a2, z, p_delong = delong_auc_test(y_all, pd_all, ph_all)
    print("\nPooled out-of-fold")
    print(f"  AUC   DART {a1:.4f} | HLR {a2:.4f} | DeLong z={z:.3f}, p={p_delong:.3e}")
    print(f"  Brier DART {brier(y_all, pd_all):.4f} | HLR {brier(y_all, ph_all):.4f}")
    print(f"  ECE   DART {ece(y_all, pd_all):.4f} | HLR {ece(y_all, ph_all):.4f}")

    print("\nReliability (DART, out-of-fold)")
    print(f"  {'bin':<12}{'n':>8}{'pred':>9}{'obs':>9}")
    for rrow in calibration_table(y_all, pd_all):
        print(f"  {rrow['bin']:<12}{rrow['n']:>8,}{rrow['pred']:>9.3f}{rrow['obs']:>9.3f}")

    # ---------------- write artefacts ---------------------------------------
    weights = {
        "theta": theta_d.tolist(),
        "alpha": float(alpha_d),
        "featureNames": FEATURE_NAMES[:f],
        "thresholds": {"low": 2, "mid": 7, "high": 30},
        "meta": {
            "trained": True,
            "nRows": int(n),
            "nLearners": int(len(np.unique(groups))),
            "converged": bool(res_d.success),
            "source": args.source,
            "condition": args.condition,
            "primaryRq1Inference": "BLOCKED_PENDING_CLUSTERED_NULL_TEST",
        },
    }
    os.makedirs(os.path.dirname(args.out) or ".", exist_ok=True)
    with open(args.out, "w", encoding="utf-8") as fh:
        json.dump(weights, fh, indent=2)

    report = {
        "n_rows": int(n), "n_learners": int(len(np.unique(groups))),
        "alpha_hat": float(alpha_d),
        "alpha_ci95": [float(lo), float(hi)],
        "alpha_boot_share_zero": share_zero,
        "loglik_dart": ll_full, "loglik_hlr": ll_rest,
        "asymptotic_lrt_diagnostic": {
            "lr_stat": lr,
            "p_boundary": p_boundary,
            "p_naive_chi2_1": p_naive,
            "not_for_confirmatory_rq1": True,
        },
        "primary_rq1_inference": {
            "status": "BLOCKED",
            "reason": "No statistician-approved clustered-null test is implemented in fit_dart.py.",
        },
        "cv": per_fold,
        "pooled": {
            "auc_dart": a1, "auc_hlr": a2, "delong_z": z, "delong_p": p_delong,
            "brier_dart": brier(y_all, pd_all), "brier_hlr": brier(y_all, ph_all),
            "ece_dart": ece(y_all, pd_all), "ece_hlr": ece(y_all, ph_all),
        },
        "calibration_dart": calibration_table(y_all, pd_all),
    }
    os.makedirs(os.path.dirname(args.report) or ".", exist_ok=True)
    with open(args.report, "w", encoding="utf-8") as fh:
        json.dump(report, fh, indent=2)

    print(f"\nwrote weights -> {args.out}")
    print(f"wrote report  -> {args.report}")


if __name__ == "__main__":
    main()

