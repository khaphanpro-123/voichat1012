#!/usr/bin/env python3
"""
delong_test.py — DeLong et al. (1988) paired ROC-AUC test for RQ1 (row 16 roadmap).

Purpose
-------
RQ1 requires an out-of-sample test that DART (with α) beats HLR (nested, α=0) at
predicting recall on held-out reviews. Cluster-bootstrap LRT (Amendment #A-001)
handles the in-model side; DeLong handles the out-of-model side. §9.1 of
PREREGISTRATION.md pre-registers **both** must be p < .05 for H₁ RQ1 to be
supported.

DeLong's method compares two AUCs computed on the SAME test cases (paired).
It gives a variance estimate via the covariance of the two "structural components"
(placements of positives among negatives), no bootstrap needed. Complexity O(N log N).

References
----------
- DeLong, DeLong & Clarke-Pearson (1988), Biometrics 44(3):837-845.
- Sun & Xu (2014), IEEE SPL 21(11):1389-1393  — fast midrank implementation used here.
- Reimplemented from scratch for auditability (no sklearn.metrics dependency).

Usage
-----
    from research.delong_test import delong_paired_test

    # scores_a, scores_b: predicted P(recall=1) from model A and B, same order
    # labels: ground truth 0/1
    z, p_two_sided, auc_a, auc_b, auc_diff, se_diff = delong_paired_test(
        labels, scores_a, scores_b
    )

CLI: python3 research/delong_test.py  → runs self-test on synthetic data.
"""

from __future__ import annotations
import math
from typing import Tuple, Sequence
import statistics

# ── Midrank ───────────────────────────────────────────────────────────────────
def _compute_midrank(x: Sequence[float]) -> list[float]:
    """
    Return midrank of each element in x. Ties get averaged rank.
    O(N log N). Rank is 1-based.
    """
    n = len(x)
    order = sorted(range(n), key=lambda i: x[i])
    ranks = [0.0] * n
    i = 0
    while i < n:
        j = i
        while j < n - 1 and x[order[j + 1]] == x[order[i]]:
            j += 1
        # positions [i..j] are tied → assign midrank = (i+j)/2 + 1  (1-based)
        mid = (i + j) / 2 + 1
        for k in range(i, j + 1):
            ranks[order[k]] = mid
        i = j + 1
    return ranks

# ── DeLong core ───────────────────────────────────────────────────────────────
def _delong_covariance(
    scores_pos: list[list[float]],
    scores_neg: list[list[float]],
) -> Tuple[list[float], list[list[float]]]:
    """
    Fast implementation of DeLong (Sun & Xu 2014). Given K classifiers' scores
    on m positives and n negatives, return (AUCs list, KxK covariance matrix
    of the AUC estimates).
    """
    K = len(scores_pos)
    m = len(scores_pos[0])
    n = len(scores_neg[0])
    if any(len(s) != m for s in scores_pos) or any(len(s) != n for s in scores_neg):
        raise ValueError("All classifiers must have same #positives and #negatives")

    aucs = []
    V01 = [[0.0] * m for _ in range(K)]  # V^{(1)}: for positives
    V10 = [[0.0] * n for _ in range(K)]  # V^{(0)}: for negatives

    for k in range(K):
        tx = _compute_midrank(scores_pos[k])
        ty = _compute_midrank(scores_neg[k])
        tz = _compute_midrank(scores_pos[k] + scores_neg[k])
        tz_pos = tz[:m]
        tz_neg = tz[m:]
        auc = (sum(tz_pos) / m - (m + 1) / 2) / n
        aucs.append(auc)
        for i in range(m):
            V01[k][i] = (tz_pos[i] - tx[i]) / n
        for j in range(n):
            V10[k][j] = 1 - (tz_neg[j] - ty[j]) / m

    # covariance matrix
    def cov_matrix(V, denom):
        # V is KxL; returns KxK cov of column means (sample cov of rows-of-V-across-L)
        L = len(V[0])
        means = [sum(V[k]) / L for k in range(K)]
        S = [[0.0] * K for _ in range(K)]
        for i in range(K):
            for j in range(i, K):
                s = 0.0
                for l in range(L):
                    s += (V[i][l] - means[i]) * (V[j][l] - means[j])
                s /= (L - 1) if L > 1 else 1
                S[i][j] = S[j][i] = s / denom
        return S

    S01 = cov_matrix(V01, m)
    S10 = cov_matrix(V10, n)
    S = [[S01[i][j] + S10[i][j] for j in range(K)] for i in range(K)]
    return aucs, S

def _erf(x: float) -> float:
    # Abramowitz & Stegun 7.1.26
    a1, a2, a3, a4, a5 = 0.254829592, -0.284496736, 1.421413741, -1.453152027, 1.061405429
    p_ = 0.3275911
    sign = 1 if x >= 0 else -1
    x = abs(x)
    t = 1.0 / (1.0 + p_ * x)
    y = 1.0 - (((((a5 * t + a4) * t) + a3) * t + a2) * t + a1) * t * math.exp(-x * x)
    return sign * y

def _norm_sf(z: float) -> float:
    """Two-tailed complementary normal survival: P(|Z| > |z|)."""
    return math.erfc(abs(z) / math.sqrt(2)) if hasattr(math, "erfc") else 1 - _erf(abs(z) / math.sqrt(2))

# ── Public API ────────────────────────────────────────────────────────────────
def delong_paired_test(
    labels: Sequence[int],
    scores_a: Sequence[float],
    scores_b: Sequence[float],
) -> Tuple[float, float, float, float, float, float]:
    """
    Two-sided paired DeLong test: H₀: AUC_a = AUC_b.

    Parameters
    ----------
    labels    : 0/1 ground-truth (list, len=N)
    scores_a  : predicted score from model A (higher → more likely 1)
    scores_b  : predicted score from model B, same order & length

    Returns
    -------
    z          : test statistic
    p_two      : two-sided p-value (normal approximation)
    auc_a      : AUC of model A
    auc_b      : AUC of model B
    auc_diff   : auc_a − auc_b
    se_diff    : standard error of the difference
    """
    if len(labels) != len(scores_a) or len(labels) != len(scores_b):
        raise ValueError("labels, scores_a, scores_b must have same length")
    if not all(l in (0, 1) for l in labels):
        raise ValueError("labels must be 0/1")

    pos_idx = [i for i, l in enumerate(labels) if l == 1]
    neg_idx = [i for i, l in enumerate(labels) if l == 0]
    if not pos_idx or not neg_idx:
        raise ValueError("need at least one positive and one negative")

    sa_pos = [scores_a[i] for i in pos_idx]
    sa_neg = [scores_a[i] for i in neg_idx]
    sb_pos = [scores_b[i] for i in pos_idx]
    sb_neg = [scores_b[i] for i in neg_idx]

    aucs, S = _delong_covariance([sa_pos, sb_pos], [sa_neg, sb_neg])
    auc_a, auc_b = aucs
    var_diff = S[0][0] + S[1][1] - 2 * S[0][1]
    if var_diff <= 0:
        return 0.0, 1.0, auc_a, auc_b, auc_a - auc_b, 0.0
    se = math.sqrt(var_diff)
    z = (auc_a - auc_b) / se
    p_two = _norm_sf(z)
    return z, p_two, auc_a, auc_b, auc_a - auc_b, se

# ── Self-test ─────────────────────────────────────────────────────────────────
def _self_test():
    """Synthetic sanity: model A better than model B → z > 0, p < .05."""
    import random
    random.seed(0)
    N = 500
    labels = [random.randint(0, 1) for _ in range(N)]
    # A is well-calibrated to labels; B is noisier
    scores_a = [(l + random.gauss(0, 0.6)) for l in labels]
    scores_b = [(l + random.gauss(0, 1.4)) for l in labels]
    z, p, aa, ab, diff, se = delong_paired_test(labels, scores_a, scores_b)
    print(f"Self-test (A stronger than B):")
    print(f"  AUC_A = {aa:.4f}")
    print(f"  AUC_B = {ab:.4f}")
    print(f"  ΔAUC  = {diff:+.4f}  (SE = {se:.4f})")
    print(f"  z     = {z:+.4f}")
    print(f"  p_two = {p:.6f}")
    assert diff > 0, "expected A > B"
    assert p < 0.05, f"expected significant, got p={p}"
    print("  ✅ PASS")

    # Null test: same model twice → z ≈ 0, p ≈ 1
    z, p, aa, ab, diff, se = delong_paired_test(labels, scores_a, scores_a)
    print(f"\nNull test (same scores):")
    print(f"  z = {z:.4f}, p = {p:.4f}, ΔAUC = {diff:.6f}")
    assert abs(diff) < 1e-9, "same scores must give ΔAUC = 0"
    assert p > 0.99, f"expected p ≈ 1, got {p}"
    print("  ✅ PASS")

if __name__ == "__main__":
    _self_test()
