"""
test_dart_model.py — Regression tests for dart_model.py, especially the
cluster-bootstrap LRT added under Amendment #A-001.

Run:
    cd research
    python -m pytest test_dart_model.py -v

These tests are deliberately quick (small n_learners, low n_boot) so they can
run in CI. They check correctness of the interface and basic statistical
behaviour, not full power/Type-I properties (those require power_analysis.py
runs on a laptop).
"""

from __future__ import annotations

import math

import numpy as np
import pytest

from dart_model import (
    ece,
    fit,
    half_life,
    lrt_alpha,
    lrt_alpha_cluster_bootstrap,
    mean_loglik,
    recall_prob,
)
from synth_logs import simulate


# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------

@pytest.fixture(scope="module")
def h0_data():
    """H0 true: alpha_true = 0."""
    rows, _ = simulate(n_learners=20, n_words=30, weeks=4, alpha_true=0.0, seed=123)
    return [r for r in rows if r["deltaDays"] > 0]


@pytest.fixture(scope="module")
def h1_data():
    """H1 true: alpha_true > 0."""
    rows, _ = simulate(n_learners=30, n_words=30, weeks=6, alpha_true=0.5, seed=42)
    return [r for r in rows if r["deltaDays"] > 0]


# ---------------------------------------------------------------------------
# Numerical safety of core functions
# ---------------------------------------------------------------------------

def test_half_life_clipped():
    theta = np.array([100.0, 0, 0, 0, 0])  # would blow up without clip
    X = np.array([[1, 0, 0, 0, 0]])
    D = np.array([0])
    h = half_life(theta, alpha=0.0, X=X, D=D)
    assert 1.0 / 24.0 <= h[0] <= 3650.0


def test_recall_prob_bounded():
    h = np.array([1.0, 100.0])
    delta = np.array([0.0, 1e6])
    p = recall_prob(h, delta)
    assert (p > 0).all() and (p < 1).all()


# ---------------------------------------------------------------------------
# Legacy asymptotic LRT still returns sensible things
# ---------------------------------------------------------------------------

def test_lrt_alpha_boundary_halves_naive():
    lr, p_bnd, p_naive = lrt_alpha(ll_full=-0.5, ll_restricted=-0.501, n=100)
    assert lr > 0
    assert p_bnd == pytest.approx(0.5 * p_naive)
    assert 0 <= p_bnd <= 1


def test_lrt_alpha_zero_diff():
    lr, p_bnd, p_naive = lrt_alpha(ll_full=-0.5, ll_restricted=-0.5, n=100)
    assert lr == 0
    assert p_bnd == 0.5  # χ²(1) sf(0) = 1, halved


# ---------------------------------------------------------------------------
# Cluster-bootstrap LRT (Amendment #A-001)
# ---------------------------------------------------------------------------

def test_cluster_bootstrap_rejects_single_cluster():
    rows = [{
        "userId": "u1", "featureVector": [1, 0, 0, 0, 0],
        "retrievalType": 0, "deltaDays": 1, "recall": 1,
    }]
    with pytest.raises(ValueError, match="clusters"):
        lrt_alpha_cluster_bootstrap(rows)


def test_cluster_bootstrap_rejects_single_retrieval_level():
    # All d=0 → alpha not identified
    rows = []
    for uid in ["u1", "u2", "u3"]:
        for i in range(10):
            rows.append({
                "userId": uid, "featureVector": [1.0, 0.5, 0, 0.5, 0],
                "retrievalType": 0, "deltaDays": float(i + 1), "recall": 1,
            })
    with pytest.raises(ValueError, match="retrieval-type"):
        lrt_alpha_cluster_bootstrap(rows, n_boot=5)


def test_cluster_bootstrap_returns_all_keys(h0_data):
    res = lrt_alpha_cluster_bootstrap(h0_data, n_boot=10, seed=7)
    for key in [
        "lr_observed", "alpha_hat", "ll_full", "ll_restricted",
        "n_boot_requested", "n_boot_valid",
        "p_cluster_naive", "p_cluster_boundary",
    ]:
        assert key in res, f"missing key {key}"
    assert 0 <= res["p_cluster_naive"] <= 1
    assert res["p_cluster_boundary"] == pytest.approx(0.5 * res["p_cluster_naive"])
    assert res["n_boot_valid"] <= res["n_boot_requested"]


def test_cluster_bootstrap_boundary_correction(h0_data):
    res = lrt_alpha_cluster_bootstrap(h0_data, n_boot=10, seed=1)
    assert res["p_cluster_boundary"] == pytest.approx(0.5 * res["p_cluster_naive"])


def test_cluster_bootstrap_seed_deterministic(h0_data):
    r1 = lrt_alpha_cluster_bootstrap(h0_data, n_boot=15, seed=100)
    r2 = lrt_alpha_cluster_bootstrap(h0_data, n_boot=15, seed=100)
    assert r1["lr_observed"] == r2["lr_observed"]
    assert r1["alpha_hat"] == r2["alpha_hat"]
    assert r1["p_cluster_naive"] == r2["p_cluster_naive"]


def test_cluster_bootstrap_return_boot(h0_data):
    res = lrt_alpha_cluster_bootstrap(h0_data, n_boot=8, seed=2, return_boot=True)
    assert "boot_lrs" in res
    assert len(res["boot_lrs"]) == res["n_boot_valid"]
    assert all(lr >= 0 for lr in res["boot_lrs"])


def test_cluster_bootstrap_alpha_hat_nonneg(h0_data, h1_data):
    """alpha ≥ 0 bound must be respected by the fitter."""
    r0 = lrt_alpha_cluster_bootstrap(h0_data, n_boot=5, seed=3)
    r1 = lrt_alpha_cluster_bootstrap(h1_data, n_boot=5, seed=3)
    assert r0["alpha_hat"] >= 0
    assert r1["alpha_hat"] >= 0


def test_cluster_bootstrap_h1_has_larger_alpha_hat(h0_data, h1_data):
    """Sanity check: under H1 (alpha_true=0.5), alpha_hat should be larger
    than under H0 (alpha_true=0). Not a formal test but catches gross bugs."""
    r0 = lrt_alpha_cluster_bootstrap(h0_data, n_boot=5, seed=4)
    r1 = lrt_alpha_cluster_bootstrap(h1_data, n_boot=5, seed=4)
    assert r1["alpha_hat"] > r0["alpha_hat"] - 0.05, (
        f"H1 alpha_hat={r1['alpha_hat']:.3f} not larger than H0 alpha_hat={r0['alpha_hat']:.3f}"
    )


# ---------------------------------------------------------------------------
# ECE sanity
# ---------------------------------------------------------------------------

def test_ece_perfect_calibration_is_small():
    rng = np.random.default_rng(0)
    p = rng.uniform(0, 1, 5000)
    y = (rng.uniform(0, 1, 5000) < p).astype(int)
    assert ece(y, p) < 0.05
