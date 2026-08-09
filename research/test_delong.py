"""
Unit tests for research/delong_test.py — DeLong (1988) paired ROC-AUC test.
"""
import math
import random
import pytest

from delong_test import delong_paired_test, _compute_midrank


# ── Midrank ───────────────────────────────────────────────────────────────────
class TestMidrank:
    def test_no_ties(self):
        assert _compute_midrank([3.0, 1.0, 2.0]) == [3.0, 1.0, 2.0]

    def test_all_ties(self):
        # 4 equal values → all get rank (0+3)/2 + 1 = 2.5
        assert _compute_midrank([5.0, 5.0, 5.0, 5.0]) == [2.5, 2.5, 2.5, 2.5]

    def test_partial_ties(self):
        # values 1, 2, 2, 3 → ranks 1, 2.5, 2.5, 4
        assert _compute_midrank([1.0, 2.0, 2.0, 3.0]) == [1.0, 2.5, 2.5, 4.0]


# ── Basic contracts ───────────────────────────────────────────────────────────
class TestContract:
    def test_length_mismatch_raises(self):
        with pytest.raises(ValueError):
            delong_paired_test([0, 1], [0.1], [0.2, 0.3])

    def test_non_binary_labels_raises(self):
        with pytest.raises(ValueError):
            delong_paired_test([0, 2], [0.1, 0.2], [0.3, 0.4])

    def test_no_positives_raises(self):
        with pytest.raises(ValueError):
            delong_paired_test([0, 0], [0.1, 0.2], [0.3, 0.4])

    def test_no_negatives_raises(self):
        with pytest.raises(ValueError):
            delong_paired_test([1, 1], [0.1, 0.2], [0.3, 0.4])


# ── Correctness ───────────────────────────────────────────────────────────────
class TestCorrectness:
    def test_identical_models_give_zero_diff(self):
        random.seed(1)
        labels = [random.randint(0, 1) for _ in range(50)]
        scores = [random.random() for _ in range(50)]
        z, p, aa, ab, diff, se = delong_paired_test(labels, scores, scores)
        assert abs(diff) < 1e-9
        assert p > 0.99   # under null, p should be essentially 1
        assert abs(z) < 1e-9

    def test_perfect_classifier_auc_is_1(self):
        labels = [0, 0, 0, 1, 1, 1]
        scores = [0.1, 0.2, 0.3, 0.8, 0.9, 1.0]
        random_scores = [0.5, 0.6, 0.4, 0.5, 0.5, 0.5]
        z, p, aa, ab, diff, se = delong_paired_test(labels, scores, random_scores)
        assert abs(aa - 1.0) < 1e-9

    def test_reversed_scores_give_auc_0_and_1(self):
        # Perfect separation → AUC values are exact (1 and 0). DeLong's variance
        # estimator degenerates when there are no ties across positive/negative
        # placements; documented behavior is se=0 → z=0 → p=1 as safe fallback.
        labels = [0, 0, 0, 1, 1, 1]
        good = [0.1, 0.2, 0.3, 0.8, 0.9, 1.0]
        bad = [1.0, 0.9, 0.8, 0.3, 0.2, 0.1]
        z, p, aa, ab, diff, se = delong_paired_test(labels, good, bad)
        assert abs(aa - 1.0) < 1e-9
        assert abs(ab - 0.0) < 1e-9
        assert diff > 0.99
        assert se == 0.0  # documented degenerate case
        assert p == 1.0

    def test_large_reversed_with_overlap_gives_significant_p(self):
        # With realistic overlap the SE is well-defined and the test IS significant.
        random.seed(3)
        N = 60
        labels = [0] * N + [1] * N
        good = [random.gauss(0.3, 0.15) for _ in range(N)] + [random.gauss(0.7, 0.15) for _ in range(N)]
        bad = [1 - g for g in good]
        z, p, aa, ab, diff, se = delong_paired_test(labels, good, bad)
        assert aa > 0.9
        assert ab < 0.1
        assert diff > 0.8
        assert se > 0
        assert p < 0.001

    def test_stronger_model_gives_positive_z(self):
        random.seed(42)
        N = 500
        labels = [random.randint(0, 1) for _ in range(N)]
        strong = [l + random.gauss(0, 0.5) for l in labels]
        weak = [l + random.gauss(0, 1.5) for l in labels]
        z, p, aa, ab, diff, se = delong_paired_test(labels, strong, weak)
        assert aa > ab
        assert z > 0
        assert p < 0.05

    def test_symmetric_swap_negates_z(self):
        random.seed(7)
        N = 200
        labels = [random.randint(0, 1) for _ in range(N)]
        a = [l + random.gauss(0, 0.6) for l in labels]
        b = [l + random.gauss(0, 1.2) for l in labels]
        z_ab, p_ab, *_ = delong_paired_test(labels, a, b)
        z_ba, p_ba, *_ = delong_paired_test(labels, b, a)
        assert abs(z_ab + z_ba) < 1e-9   # symmetric
        assert abs(p_ab - p_ba) < 1e-9   # two-sided p-value same


# ── Edge cases ────────────────────────────────────────────────────────────────
class TestEdge:
    def test_single_positive_single_negative(self):
        labels = [0, 1]
        z, p, aa, ab, diff, se = delong_paired_test(labels, [0.1, 0.9], [0.9, 0.1])
        assert aa == 1.0
        assert ab == 0.0

    def test_all_tied_scores(self):
        labels = [0, 0, 1, 1]
        # AUC of constant predictor = 0.5 (all midranks equal)
        z, p, aa, ab, diff, se = delong_paired_test(labels, [0.5, 0.5, 0.5, 0.5], [0.5, 0.5, 0.5, 0.5])
        assert aa == 0.5
        assert ab == 0.5
        assert abs(diff) < 1e-9
