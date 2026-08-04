"""
dart_model.py — Core DART math, shared by every script in research/.

Model
-----
    h_i = 2^(theta . x_i) * exp(alpha * phi(d_i))       # half-life, days
    p_i = 2^(-Delta_i / h_i)                            # recall probability
    NLL = -mean[ r_i log p_i + (1 - r_i) log(1 - p_i) ]

HLR is the NESTED special case alpha = 0. That nesting is what lets us run a
likelihood-ratio test instead of an informal "our model scores higher" claim.

Boundary caveat (important for the paper): alpha is constrained to alpha >= 0,
so under H0 the parameter sits ON the boundary of the parameter space. The
asymptotic null is then a 50:50 mixture of chi2(0) and chi2(1) (Self & Liang,
1987; Chernoff, 1954), which means:

    p = 0.5 * P(chi2_1 > LR)

Using the naive chi2(1) p-value would be conservative by a factor of 2. Say so
explicitly in the Method section — reviewers who know mixed models will look
for it.
"""

from __future__ import annotations

import math

import numpy as np

LN2 = math.log(2.0)

# phi(d): difficulty embedding for the four retrieval formats.
#   0 = recognition MCQ, 1 = cloze, 2 = constrained generation, 3 = open paraphrase
PHI = np.array([0.0, 0.33, 0.66, 1.0], dtype=np.float64)

FEATURE_NAMES = ["bias", "cefr", "wordFreqLog", "userAvgAcc", "timesReviewedLog"]

# Numerical guards. Half-life is clipped to [1 hour, 10 years] in days.
H_MIN, H_MAX = 1.0 / 24.0, 3650.0
P_EPS = 1e-9


def half_life(theta: np.ndarray, alpha: float, X: np.ndarray, D: np.ndarray) -> np.ndarray:
    """h = 2^(theta.x) * exp(alpha * phi(d)), clipped for numerical safety."""
    lin = np.clip(X @ theta, -40.0, 40.0)
    h = np.exp2(lin) * np.exp(alpha * PHI[D])
    return np.clip(h, H_MIN, H_MAX)


def recall_prob(h: np.ndarray, delta: np.ndarray) -> np.ndarray:
    """p = 2^(-Delta/h)."""
    return np.clip(np.exp2(-delta / h), P_EPS, 1.0 - P_EPS)


def nll_and_grad(params: np.ndarray, X, D, delta, r, lam: float, fit_alpha: bool):
    """
    Negative log-likelihood + analytic gradient.

    params = [theta..., alpha] if fit_alpha else [theta...]

    Chain rule:
        dL/dp  = -(r/p - (1-r)/(1-p)) / N
        dp/dh  =  p * ln2 * Delta / h^2
        dh/dth =  h * ln2 * x          <-- the `h` factor is easy to drop; don't
        dh/da  =  h * phi(d)           <-- same here
    """
    if fit_alpha:
        theta, alpha = params[:-1], float(params[-1])
    else:
        theta, alpha = params, 0.0

    n = X.shape[0]
    h = half_life(theta, alpha, X, D)
    p = recall_prob(h, delta)

    nll = -np.mean(r * np.log(p) + (1.0 - r) * np.log(1.0 - p))
    obj = nll + lam * float(theta @ theta)

    dL_dp = -(r / p - (1.0 - r) / (1.0 - p)) / n
    dp_dh = p * LN2 * delta / (h * h)
    dL_dh = dL_dp * dp_dh

    g_theta = (dL_dh * h * LN2)[:, None] * X
    g_theta = g_theta.sum(axis=0) + 2.0 * lam * theta

    if fit_alpha:
        g_alpha = float(np.sum(dL_dh * h * PHI[D]))
        return obj, np.concatenate([g_theta, [g_alpha]])
    return obj, g_theta


def fit(X, D, delta, r, lam: float = 1e-3, fit_alpha: bool = True, seed: int = 0):
    """
    Fit by L-BFGS-B with alpha bounded to [0, 5]. Far more reliable than the
    hand-rolled fixed-step gradient descent it replaces — no learning rate to
    tune and it actually converges.

    Returns (theta, alpha, result).
    """
    from scipy.optimize import minimize

    f = X.shape[1]
    rng = np.random.default_rng(seed)
    x0 = np.concatenate([rng.normal(0, 0.01, f), [0.1]]) if fit_alpha else rng.normal(0, 0.01, f)
    # Start the bias near log2(median observed interval) so we begin in a sane basin.
    med = float(np.median(delta[delta > 0])) if np.any(delta > 0) else 1.0
    x0[0] = math.log2(max(med, 0.5))

    bounds = [(-20, 20)] * f + ([(0.0, 5.0)] if fit_alpha else [])

    res = minimize(
        nll_and_grad, x0, args=(X, D, delta, r, lam, fit_alpha),
        jac=True, method="L-BFGS-B", bounds=bounds,
        options={"maxiter": 2000, "ftol": 1e-12, "gtol": 1e-10},
    )
    if fit_alpha:
        return res.x[:-1].copy(), float(res.x[-1]), res
    return res.x.copy(), 0.0, res


def mean_loglik(theta, alpha, X, D, delta, r) -> float:
    """Mean log-likelihood per observation (no regularisation term)."""
    h = half_life(theta, alpha, X, D)
    p = recall_prob(h, delta)
    return float(np.mean(r * np.log(p) + (1.0 - r) * np.log(1.0 - p)))


# ----------------------------------------------------------------------------
# Metrics (numpy-only: no sklearn dependency, so this runs anywhere)
# ----------------------------------------------------------------------------

def auc(y_true: np.ndarray, score: np.ndarray) -> float:
    """ROC AUC via the Mann-Whitney U identity, with tie correction."""
    y = np.asarray(y_true).astype(int)
    pos, neg = int(y.sum()), int((1 - y).sum())
    if pos == 0 or neg == 0:
        return float("nan")
    order = np.argsort(score, kind="mergesort")
    ranks = np.empty(len(score), dtype=np.float64)
    s = np.asarray(score)[order]
    i = 0
    while i < len(s):
        j = i
        while j + 1 < len(s) and s[j + 1] == s[i]:
            j += 1
        ranks[order[i:j + 1]] = 0.5 * (i + j) + 1.0
        i = j + 1
    return float((ranks[y == 1].sum() - pos * (pos + 1) / 2.0) / (pos * neg))


def brier(y_true: np.ndarray, p: np.ndarray) -> float:
    return float(np.mean((p - y_true) ** 2))


def ece(y_true: np.ndarray, p: np.ndarray, bins: int = 10) -> float:
    """Expected calibration error — equal-width bins."""
    edges = np.linspace(0.0, 1.0, bins + 1)
    idx = np.clip(np.digitize(p, edges[1:-1]), 0, bins - 1)
    total = 0.0
    for b in range(bins):
        m = idx == b
        if not m.any():
            continue
        total += m.mean() * abs(float(y_true[m].mean()) - float(p[m].mean()))
    return float(total)


def calibration_table(y_true: np.ndarray, p: np.ndarray, bins: int = 10):
    edges = np.linspace(0.0, 1.0, bins + 1)
    idx = np.clip(np.digitize(p, edges[1:-1]), 0, bins - 1)
    rows = []
    for b in range(bins):
        m = idx == b
        if not m.any():
            continue
        rows.append({
            "bin": f"[{edges[b]:.1f},{edges[b + 1]:.1f})",
            "n": int(m.sum()),
            "pred": float(p[m].mean()),
            "obs": float(y_true[m].mean()),
        })
    return rows


def delong_auc_test(y_true: np.ndarray, p1: np.ndarray, p2: np.ndarray):
    """
    DeLong test for two correlated ROC curves (same subjects, two models).
    Returns (auc1, auc2, z, two_sided_p).

    Reference: DeLong, DeLong & Clarke-Pearson (1988); fast implementation
    following Sun & Xu (2014).
    """
    from scipy.stats import norm

    y = np.asarray(y_true).astype(int)
    pos_mask, neg_mask = y == 1, y == 0
    m, n = int(pos_mask.sum()), int(neg_mask.sum())
    if m == 0 or n == 0:
        return float("nan"), float("nan"), float("nan"), float("nan")

    def midrank(x):
        order = np.argsort(x, kind="mergesort")
        s = x[order]
        out = np.empty(len(x), dtype=np.float64)
        i = 0
        while i < len(s):
            j = i
            while j + 1 < len(s) and s[j + 1] == s[i]:
                j += 1
            out[order[i:j + 1]] = 0.5 * (i + j) + 1.0
            i = j + 1
        return out

    preds = np.vstack([p1, p2])
    k = preds.shape[0]
    v01 = np.empty((k, m))
    v10 = np.empty((k, n))
    aucs = np.empty(k)
    for i in range(k):
        pos, neg = preds[i][pos_mask], preds[i][neg_mask]
        tz = midrank(np.concatenate([pos, neg]))
        tx, ty = midrank(pos), midrank(neg)
        aucs[i] = (tz[:m].sum() - m * (m + 1) / 2.0) / (m * n)
        v01[i] = (tz[:m] - tx) / n
        v10[i] = 1.0 - (tz[m:] - ty) / m

    s01 = np.cov(v01) if k > 1 else np.array([[np.var(v01[0], ddof=1)]])
    s10 = np.cov(v10) if k > 1 else np.array([[np.var(v10[0], ddof=1)]])
    s = s01 / m + s10 / n
    contrast = np.array([1.0, -1.0])
    var = float(contrast @ s @ contrast)
    if var <= 0:
        return float(aucs[0]), float(aucs[1]), float("nan"), float("nan")
    z = float((aucs[0] - aucs[1]) / math.sqrt(var))
    return float(aucs[0]), float(aucs[1]), z, float(2 * (1 - norm.cdf(abs(z))))


def lrt_alpha(ll_full: float, ll_restricted: float, n: int):
    """
    Likelihood-ratio test of H0: alpha = 0 (DART degenerates to HLR).

    ll_* are MEAN log-likelihoods, so multiply by n to get totals.
    Because alpha >= 0 puts H0 on the boundary, the null is a 50:50 chi2(0)/chi2(1)
    mixture -> halve the naive p-value.

    Returns (LR_statistic, p_boundary, p_naive_chi2_1).
    """
    from scipy.stats import chi2

    lr = float(2.0 * n * (ll_full - ll_restricted))
    lr = max(lr, 0.0)
    p_naive = float(chi2.sf(lr, df=1))
    return lr, 0.5 * p_naive, p_naive
