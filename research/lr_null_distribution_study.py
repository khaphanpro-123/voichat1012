"""
lr_null_distribution_study.py — So sánh phân phối null của LR
   giữa (a) asymptotic 0.5 * chi2_1 và (b) cluster bootstrap.

MỤC TIÊU (Ngày 3):
- Nếu bootstrap null có 95% quantile lớn hơn nhiều so với chi2_1 (3.84) →
  xác nhận `lrt_alpha` KHÔNG được valid asymptotically trên dữ liệu clustered.
- Đây là bằng chứng chẩn đoán mạnh hơn so sánh reject rate quan sát.

CÁCH LÀM:
- Với mỗi seed (1 replicate):
  - Sinh dữ liệu synthetic ở alpha_true = 0 (H0 đúng).
  - Cluster-bootstrap 20 lần → 20 giá trị LR_boot.
- Gom tất cả LR_boot từ mọi replicate, tính quantile empirical.
- So sánh trực tiếp với chi2_1 quantile lý thuyết.

CẢNH BÁO:
- KHÔNG sửa `dart_model.py` — script này chỉ để chứng minh cần amendment
  pre-registration.
- Chi phí: mỗi bootstrap sample ~ 0.15s. 20 boot × 3 replicate = 9s + fit obs.
"""

from __future__ import annotations

import argparse
import json
import time
from pathlib import Path

import numpy as np
from scipy.stats import chi2

from dart_model import fit, mean_loglik
from synth_logs import simulate


def one_lr(rows: list[dict], seed: int, lam: float = 1e-3) -> float:
    X = np.array([r["featureVector"] for r in rows], dtype=np.float64)
    D = np.array([r["retrievalType"] for r in rows], dtype=np.int64)
    delta = np.array([r["deltaDays"] for r in rows], dtype=np.float64)
    y = np.array([r["recall"] for r in rows], dtype=np.float64)

    if len(np.unique(D)) < 2:
        return 0.0

    try:
        th_d, al_d, _ = fit(X, D, delta, y, lam=lam, fit_alpha=True,  seed=seed)
        th_h, _,    _ = fit(X, D, delta, y, lam=lam, fit_alpha=False, seed=seed)
        ll_f = mean_loglik(th_d, al_d, X, D, delta, y)
        ll_r = mean_loglik(th_h, 0.0, X, D, delta, y)
        return max(0.0, float(2.0 * len(rows) * (ll_f - ll_r)))
    except Exception:
        return float("nan")


def bootstrap_null(rows: list[dict], n_boot: int, seed: int) -> list[float]:
    rng = np.random.default_rng(seed)
    users = sorted({r["userId"] for r in rows})
    by_user: dict[str, list[dict]] = {u: [] for u in users}
    for r in rows:
        by_user[r["userId"]].append(r)
    n_users = len(users)

    out: list[float] = []
    for _ in range(n_boot):
        idx = rng.integers(0, n_users, size=n_users)
        sampled: list[dict] = []
        for i in idx:
            sampled.extend(by_user[users[i]])
        if len({r["retrievalType"] for r in sampled}) < 2:
            continue
        lr = one_lr(sampled, seed=int(rng.integers(0, 1_000_000)))
        if not np.isnan(lr):
            out.append(lr)
    return out


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--n-learners", type=int, default=30)
    ap.add_argument("--weeks",      type=int, default=4)
    ap.add_argument("--words",      type=int, default=30)
    ap.add_argument("--n-datasets", type=int, default=3, help="số replicate sinh dữ liệu độc lập")
    ap.add_argument("--boot",       type=int, default=15, help="số bootstrap mỗi replicate")
    ap.add_argument("--seed0",      type=int, default=9000)
    ap.add_argument("--out",        default="reports/lr_null_distribution_2026-08-06.json")
    args = ap.parse_args()

    print(f"N={args.n_learners}, weeks={args.weeks}, alpha_true=0, "
          f"{args.n_datasets} datasets × {args.boot} boot each")
    print()

    all_lrs: list[float] = []
    per_dataset = []

    for d in range(args.n_datasets):
        seed = args.seed0 + d * 100
        rows, _ = simulate(
            n_learners=args.n_learners, n_words=args.words,
            weeks=args.weeks, alpha_true=0.0, seed=seed,
        )
        rows = [r for r in rows if r["deltaDays"] > 0]

        t0 = time.time()
        lr_obs = one_lr(rows, seed=seed)
        lrs = bootstrap_null(rows, args.boot, seed=seed + 1)
        dt = time.time() - t0

        arr = np.array(lrs)
        per_dataset.append({
            "seed": seed,
            "n_rows": len(rows),
            "n_users": len({r["userId"] for r in rows}),
            "lr_observed": lr_obs,
            "boot_n": len(lrs),
            "boot_mean": float(arr.mean()) if len(arr) else 0.0,
            "boot_median": float(np.median(arr)) if len(arr) else 0.0,
            "boot_q90": float(np.quantile(arr, 0.90)) if len(arr) else 0.0,
            "boot_q95": float(np.quantile(arr, 0.95)) if len(arr) else 0.0,
            "sec": round(dt, 1),
        })
        all_lrs.extend(lrs)
        print(f"  dataset {d}: seed={seed}, obs LR={lr_obs:.3f}, "
              f"boot={len(lrs)}, q90={per_dataset[-1]['boot_q90']:.2f}, "
              f"q95={per_dataset[-1]['boot_q95']:.2f}, {dt:.1f}s")

    arr = np.array(all_lrs)
    print()
    print(f"== Phân phối null LR (pooled {len(all_lrs)} bootstrap reps) ==")
    print(f"  mean          = {arr.mean():.3f}")
    print(f"  median        = {np.median(arr):.3f}")
    print(f"  70% quantile  = {np.quantile(arr, 0.70):.3f}")
    print(f"  85% quantile  = {np.quantile(arr, 0.85):.3f}")
    print(f"  90% quantile  = {np.quantile(arr, 0.90):.3f}")
    print(f"  95% quantile  = {np.quantile(arr, 0.95):.3f}")
    print(f"  99% quantile  = {np.quantile(arr, 0.99):.3f}")
    print()
    print(f"== So với chi2_1 lý thuyết ==")
    for q in (0.70, 0.85, 0.90, 0.95, 0.99):
        theo = chi2.ppf(q, df=1)
        emp = np.quantile(arr, q)
        ratio = emp / max(theo, 1e-9)
        print(f"  q={q:.2f}: bootstrap={emp:>7.3f}  chi2_1={theo:>7.3f}  ratio={ratio:.2f}×")

    # Ngụ ý: nếu asymptotic dùng LR > chi2_1(0.90)=2.71 để reject ở p=0.05
    # (sau boundary), thì bootstrap nói LR như thế thực chất chỉ nằm ở quantile bao nhiêu?
    lr_thresh = chi2.ppf(0.90, df=1)  # threshold cho p_boundary=0.05
    empirical_p = float(np.mean(arr >= lr_thresh))
    print()
    print(f"== Xác suất bootstrap LR >= {lr_thresh:.3f} (chi2_1 90% cutoff) ==")
    print(f"  = {empirical_p:.4f}")
    print(f"  Nếu asymptotic đúng, con số này phải xấp xỉ 0.05.")
    if empirical_p > 0.10:
        verdict = "ANTI-CONSERVATIVE — bootstrap null có right tail dày hơn nhiều so với chi2_1"
    elif empirical_p > 0.07:
        verdict = "SUGGESTIVE — bootstrap tail hơi dày hơn chi2_1"
    else:
        verdict = "ACCEPTABLE — bootstrap tương thích với chi2_1"
    print(f"  Kết luận: {verdict}")

    out = {
        "config": vars(args),
        "n_boot_pooled": len(all_lrs),
        "boot_quantiles": {
            "0.70": float(np.quantile(arr, 0.70)),
            "0.85": float(np.quantile(arr, 0.85)),
            "0.90": float(np.quantile(arr, 0.90)),
            "0.95": float(np.quantile(arr, 0.95)),
            "0.99": float(np.quantile(arr, 0.99)),
        },
        "chi2_1_quantiles": {str(q): float(chi2.ppf(q, df=1)) for q in (0.70, 0.85, 0.90, 0.95, 0.99)},
        "prob_boot_ge_chi2_1_q90": empirical_p,
        "verdict": verdict,
        "per_dataset": per_dataset,
        "note": "Prototype. Do NOT modify dart_model.py without pre-registration amendment.",
    }
    out_path = Path(__file__).parent / args.out
    out_path.parent.mkdir(parents=True, exist_ok=True)
    out_path.write_text(json.dumps(out, indent=2))
    print(f"\nwrote {out_path.relative_to(Path(__file__).parent)}")


if __name__ == "__main__":
    main()
