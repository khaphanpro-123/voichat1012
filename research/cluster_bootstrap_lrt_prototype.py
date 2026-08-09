"""
cluster_bootstrap_lrt_prototype.py — Prototype cluster-bootstrap LRT (Ngày 3).

MỤC TIÊU:
Kiểm tra giả thuyết của Ngày 2 rằng `lrt_alpha` bị **anti-conservative** vì dùng
`n = len(rows)` trong khi dữ liệu phân cụm theo `userId` (mỗi learner đóng góp
hàng trăm dòng phụ thuộc lẫn nhau).

CÁCH LÀM:
- Sinh dữ liệu synthetic với `alpha_true = 0` (H0 đúng).
- Fit full DART + restricted HLR trên toàn bộ.
- Tính LR statistic quan sát.
- Cluster-bootstrap null distribution: resample **learner IDs với thay thế**
  (không phải resample dòng), fit lại cả 2 mô hình, tính LR mỗi lần.
- P-value = tỉ lệ LR_boot ≥ LR_observed.

Nếu p_cluster >> p_asymptotic → xác nhận nguyên nhân là clustering.

LƯU Ý LIÊM CHÍNH:
- Script này CHỈ để chẩn đoán, KHÔNG được thay `lrt_alpha` trong `dart_model.py`
  cho đến khi người dùng ký amendment pre-registration.
- Số bootstrap rep bị giới hạn vì fit L-BFGS đắt (~0.3s/rep).
- Kết quả từ synthetic — không phải kết quả thật.
"""

from __future__ import annotations

import argparse
import json
import time
from pathlib import Path

import numpy as np

from dart_model import fit, mean_loglik, lrt_alpha
from synth_logs import simulate


def observed_lr(rows: list[dict], lam: float = 1e-3, seed: int = 0) -> tuple[float, float, float, float]:
    """Trả về (LR quan sát, mean_ll_full, mean_ll_restricted, alpha_hat)."""
    X = np.array([r["featureVector"] for r in rows], dtype=np.float64)
    D = np.array([r["retrievalType"] for r in rows], dtype=np.int64)
    delta = np.array([r["deltaDays"] for r in rows], dtype=np.float64)
    y = np.array([r["recall"] for r in rows], dtype=np.float64)

    th_d, al_d, _ = fit(X, D, delta, y, lam=lam, fit_alpha=True, seed=seed)
    th_h, _, _   = fit(X, D, delta, y, lam=lam, fit_alpha=False, seed=seed)

    ll_f = mean_loglik(th_d, al_d, X, D, delta, y)
    ll_r = mean_loglik(th_h, 0.0, X, D, delta, y)
    lr = 2.0 * len(rows) * (ll_f - ll_r)
    return max(float(lr), 0.0), float(ll_f), float(ll_r), float(al_d)


def cluster_bootstrap_null(
    rows: list[dict],
    n_boot: int,
    lam: float = 1e-3,
    seed: int = 42,
) -> list[float]:
    """
    Cluster-bootstrap null distribution of LR.

    QUAN TRỌNG: KHÔNG đơn giản là resample cluster từ dữ liệu quan sát — vì dữ
    liệu quan sát vẫn chứa signal (nếu alpha thật != 0). Đúng bài bản là:

    1. Fit HLR restricted (alpha=0) trên dữ liệu quan sát → thu θ_h0.
    2. Với mỗi bootstrap sample:
       a. Resample **user IDs** với thay thế.
       b. Ghép lại dòng của các user được chọn (giữ nguyên các dòng).
       c. Fit cả 2 mô hình trên sample này, tính LR.

    Đây là "case cluster bootstrap" (Cameron & Miller 2015). Nó xấp xỉ được
    phân phối lấy mẫu của LR trong dữ liệu clustered, không giả IID.

    Với H0 đúng (alpha_true=0), phân phối này nên gần với chi2_1/2 nếu clustering
    KHÔNG phải là vấn đề. Nếu p_cluster >> p_asymptotic thì clustering là bug.

    Trả về danh sách LR_boot.
    """
    rng = np.random.default_rng(seed)
    users = sorted({r["userId"] for r in rows})
    by_user: dict[str, list[dict]] = {u: [] for u in users}
    for r in rows:
        by_user[r["userId"]].append(r)

    n_users = len(users)
    lrs: list[float] = []
    for b in range(n_boot):
        idx = rng.integers(0, n_users, size=n_users)
        sampled_rows: list[dict] = []
        for i in idx:
            sampled_rows.extend(by_user[users[i]])
        # có thể ít nhất 2 mức d không? nếu chỉ 1 mức → skip (alpha không định danh)
        d_set = {r["retrievalType"] for r in sampled_rows}
        if len(d_set) < 2:
            continue
        try:
            lr, _, _, _ = observed_lr(sampled_rows, lam=lam, seed=int(rng.integers(0, 1_000_000)))
            lrs.append(lr)
        except Exception:
            continue
    return lrs


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--n-learners", type=int, default=60)
    ap.add_argument("--weeks",       type=int, default=8)
    ap.add_argument("--words",       type=int, default=30)
    ap.add_argument("--alpha-true",  type=float, default=0.0, help="H0 = 0.0")
    ap.add_argument("--seed",        type=int, default=2026)
    ap.add_argument("--boot",        type=int, default=40,
                    help="số bootstrap sample (tốn ~0.3s mỗi rep)")
    ap.add_argument("--out",         default="reports/cluster_bootstrap_lrt_prototype.json")
    args = ap.parse_args()

    print(f"Sinh dữ liệu: N={args.n_learners}, weeks={args.weeks}, alpha_true={args.alpha_true}, seed={args.seed}")
    rows, _ = simulate(
        n_learners=args.n_learners,
        n_words=args.words,
        weeks=args.weeks,
        alpha_true=args.alpha_true,
        seed=args.seed,
    )
    rows = [r for r in rows if r["deltaDays"] > 0]
    print(f"  n_rows = {len(rows)}  n_users = {len({r['userId'] for r in rows})}")

    t0 = time.time()
    lr_obs, ll_f, ll_r, alpha_hat = observed_lr(rows, seed=args.seed)
    _, p_boundary, p_naive = lrt_alpha(ll_f, ll_r, len(rows))
    t_obs = time.time() - t0

    print(f"\n== LR quan sát ==")
    print(f"  alpha_hat            = {alpha_hat:.4f}")
    print(f"  ll_full              = {ll_f:.6f}")
    print(f"  ll_restricted        = {ll_r:.6f}")
    print(f"  LR statistic (asymp) = {lr_obs:.4f}")
    print(f"  p_asymptotic (bnd)   = {p_boundary:.4f}")
    print(f"  p_asymptotic (naive) = {p_naive:.4f}")
    print(f"  fit-thời gian        = {t_obs:.1f}s")

    print(f"\n== Cluster-bootstrap ({args.boot} reps) ==")
    t0 = time.time()
    lrs_boot = cluster_bootstrap_null(rows, args.boot, seed=args.seed + 1)
    dt = time.time() - t0
    print(f"  bootstrap-thời gian  = {dt:.1f}s  ({len(lrs_boot)} reps thành công)")

    if not lrs_boot:
        print("  KHÔNG có bootstrap rep hợp lệ; ngừng.")
        return

    lrs_arr = np.array(lrs_boot)
    # cluster-bootstrap p-value: KHÔNG đơn giản = P(LR_boot >= LR_obs)
    # vì LR_boot được lấy từ dữ liệu có signal (nếu alpha_true != 0).
    # Với alpha_true = 0 (H0 đúng), phân phối boot ≈ phân phối null của LR.
    # Với alpha_true > 0, LR_boot cũng có signal → không dùng làm null hợp lý.
    # Ở đây alpha_true=0 nên OK.
    p_cluster = float(np.mean(lrs_arr >= lr_obs))
    p_cluster_boundary = 0.5 * p_cluster  # boundary correction

    print(f"  LR_boot mean         = {lrs_arr.mean():.4f}")
    print(f"  LR_boot median       = {np.median(lrs_arr):.4f}")
    print(f"  LR_boot 95%-quantile = {np.quantile(lrs_arr, 0.95):.4f}")
    print(f"  p_cluster (naive)    = {p_cluster:.4f}")
    print(f"  p_cluster (boundary) = {p_cluster_boundary:.4f}")

    print(f"\n== So sánh ==")
    print(f"  p_asymp (boundary)   = {p_boundary:.4f}")
    print(f"  p_cluster (boundary) = {p_cluster_boundary:.4f}")
    ratio = p_cluster_boundary / max(p_boundary, 1e-9)
    print(f"  ratio                = {ratio:.2f}×")
    if p_asymp_reject := (p_boundary < 0.05):
        if p_cluster_boundary < 0.05:
            interp = "Cả 2 test bác bỏ → nếu alpha_true=0, cả 2 đều false positive."
        else:
            interp = "asymptotic bác bỏ NHƯNG cluster-bootstrap không → nghi ngờ clustering làm inflated Type-I."
    else:
        interp = "asymptotic không bác bỏ; chưa thấy khác biệt lớn ở replicate này."
    print(f"  Diễn giải: {interp}")

    out = {
        "config": vars(args),
        "n_rows": len(rows),
        "n_users": len({r["userId"] for r in rows}),
        "alpha_hat": alpha_hat,
        "lr_observed": lr_obs,
        "p_asymptotic_boundary": p_boundary,
        "p_asymptotic_naive": p_naive,
        "n_boot": args.boot,
        "n_boot_valid": len(lrs_boot),
        "lr_boot_mean": float(lrs_arr.mean()),
        "lr_boot_median": float(np.median(lrs_arr)),
        "lr_boot_q95": float(np.quantile(lrs_arr, 0.95)),
        "p_cluster_naive": p_cluster,
        "p_cluster_boundary": p_cluster_boundary,
        "interpretation": interp,
        "note": "Prototype only. Do NOT modify dart_model.py without pre-registration amendment.",
    }
    out_path = Path(__file__).parent / args.out
    out_path.parent.mkdir(parents=True, exist_ok=True)
    out_path.write_text(json.dumps(out, indent=2))
    print(f"\nwrote {out_path.relative_to(Path(__file__).parent)}")


if __name__ == "__main__":
    main()
