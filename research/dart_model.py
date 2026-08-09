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

    ANTI-CONSERVATIVE UNDER CLUSTERING (Ngày 3 diagnostic). This asymptotic test
    assumes IID rows but ReviewLog is clustered by userId. Empirical Type-I at
    the study parameters (weeks=8, N=60) = 0.146 (Wilson 95% CI [0.092, 0.223])
    vs 0.05 nominal. Per Amendment #A-001 (signed 2026-08-07), the pre-registered
    primary test for RQ1 is `lrt_alpha_cluster_bootstrap` below. This function is
    retained for legacy reports and for comparison in the Method section.

    Returns (LR_statistic, p_boundary, p_naive_chi2_1).
    """
    from scipy.stats import chi2

    lr = float(2.0 * n * (ll_full - ll_restricted))
    lr = max(lr, 0.0)
    p_naive = float(chi2.sf(lr, df=1))
    return lr, 0.5 * p_naive, p_naive


# ----------------------------------------------------------------------------
# Cluster-bootstrap LRT — Amendment #A-001 (signed 2026-08-07)
# ----------------------------------------------------------------------------
#
# Pre-registered primary test for RQ1. Case cluster bootstrap resampling users
# with replacement, refitting both DART and HLR on each bootstrap sample, and
# comparing the observed LR against the empirical null distribution.
#
# Rationale: see Amendment #A-001 in `research/AMENDMENTS.md`. Cameron & Miller
# (2015, "A Practitioner's Guide to Cluster-Robust Inference") justifies the
# case cluster bootstrap for clustered data with a moderate number of clusters
# (>=30). At N=60 learners we are near the lower end; sandwich adjustment
# (Amendment option B, not chosen) was the alternative.
#
# Convention: `rows` is a list of dicts with keys
#   userId, featureVector, retrievalType, deltaDays, recall
# matching the ReviewLog schema (`app/models/ReviewLog.ts`) and synth_logs.py.

def _fit_lr_from_rows(rows, lam=1e-3, seed=0):
    """Fit DART + HLR on a list of row dicts, return (LR, ll_full, ll_restricted, alpha_hat).
    Returns None if the sample has fewer than 2 retrieval-type levels (alpha unidentified)."""
    if len(rows) == 0:
        return None
    X = np.asarray([r["featureVector"] for r in rows], dtype=np.float64)
    D = np.asarray([r["retrievalType"] for r in rows], dtype=np.int64)
    delta = np.asarray([r["deltaDays"] for r in rows], dtype=np.float64)
    r_arr = np.asarray([r["recall"] for r in rows], dtype=np.float64)
    if len(set(D.tolist())) < 2:
        return None
    th_d, al_d, _ = fit(X, D, delta, r_arr, lam=lam, fit_alpha=True, seed=seed)
    th_h, _, _ = fit(X, D, delta, r_arr, lam=lam, fit_alpha=False, seed=seed)
    ll_f = mean_loglik(th_d, al_d, X, D, delta, r_arr)
    ll_r = mean_loglik(th_h, 0.0, X, D, delta, r_arr)
    lr = max(2.0 * len(rows) * (ll_f - ll_r), 0.0)
    return float(lr), float(ll_f), float(ll_r), float(al_d)


def lrt_alpha_cluster_bootstrap(
    rows,
    n_boot: int = 1000,
    lam: float = 1e-3,
    seed: int = 42,
    return_boot: bool = False,
    verbose: bool = False,
):
    """
    Pre-registered primary RQ1 test (Amendment #A-001).

    Case cluster bootstrap: resample userId with replacement, refit both models,
    compute LR* on each bootstrap sample. p-value is the fraction of bootstrap
    LR* that exceed the observed LR. Boundary correction (0.5x) is applied.

    Parameters
    ----------
    rows : list of dict
        Each row must have keys: userId, featureVector, retrievalType, deltaDays, recall.
    n_boot : int
        Number of bootstrap replicates. Pre-registered value is 1000; the analytic
        SE for a proportion at p=0.05 is ~0.007 at B=1000, adequate for a 0.05 gate.
    lam : float
        L2 penalty (default 1e-3 to match `fit`).
    seed : int
        RNG seed.
    return_boot : bool
        If True, also return the raw list of bootstrap LR statistics for diagnostics.
    verbose : bool
        If True, print progress every 100 reps.

    Returns
    -------
    dict with keys:
        lr_observed, alpha_hat, ll_full, ll_restricted,
        n_boot_requested, n_boot_valid,
        p_cluster_naive, p_cluster_boundary,
        boot_lrs (only if return_boot=True)
    """
    rng = np.random.default_rng(seed)

    users = sorted({r["userId"] for r in rows})
    if len(users) < 2:
        raise ValueError(f"Need >=2 clusters for cluster bootstrap; got {len(users)}")
    by_user: dict = {u: [] for u in users}
    for r in rows:
        by_user[r["userId"]].append(r)
    n_users = len(users)

    obs = _fit_lr_from_rows(rows, lam=lam, seed=seed)
    if obs is None:
        raise ValueError("Original data has <2 retrieval-type levels; alpha not identified.")
    lr_obs, ll_f, ll_r, alpha_hat = obs

    boot_lrs: list = []
    for b in range(n_boot):
        idx = rng.integers(0, n_users, size=n_users)
        sampled = []
        for i in idx:
            sampled.extend(by_user[users[i]])
        res = _fit_lr_from_rows(
            sampled, lam=lam, seed=int(rng.integers(0, 1_000_000))
        )
        if res is None:
            continue
        boot_lrs.append(res[0])
        if verbose and (b + 1) % 100 == 0:
            print(f"  bootstrap {b + 1}/{n_boot}, valid so far: {len(boot_lrs)}")

    if not boot_lrs:
        raise RuntimeError(
            "No valid bootstrap replicates (all had <2 retrieval-type levels). "
            "Original sample may be too small or too imbalanced."
        )

    boot_arr = np.asarray(boot_lrs)
    p_naive = float(np.mean(boot_arr >= lr_obs))
    p_boundary = 0.5 * p_naive  # boundary correction (Self & Liang 1987)

    result = {
        "lr_observed": lr_obs,
        "alpha_hat": alpha_hat,
        "ll_full": ll_f,
        "ll_restricted": ll_r,
        "n_boot_requested": n_boot,
        "n_boot_valid": len(boot_lrs),
        "p_cluster_naive": p_naive,
        "p_cluster_boundary": p_boundary,
    }
    if return_boot:
        result["boot_lrs"] = boot_lrs
    return result
