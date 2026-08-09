"""
test_dq_check.py — Synthetic-fixture tests for dq_check.py (Ngày 13).

Runs the script as a subprocess against a temp dir we build ourselves, then
asserts on exit code and printed flags. This is the same interface a real
export would use, so passing here is genuine end-to-end coverage of dq_check
without needing pilot data.
"""

from __future__ import annotations
import json
import os
import subprocess
import sys
from pathlib import Path
import pytest

HERE = Path(__file__).parent
SCRIPT = HERE / "dq_check.py"

# ── Fixture builder ───────────────────────────────────────────────────────────
def write_export(tmp_path: Path, reviews: list, parts: list = None, tests: list = None):
    tmp_path.mkdir(exist_ok=True)
    with open(tmp_path / "reviews.jsonl", "w", encoding="utf-8") as f:
        for r in reviews:
            f.write(json.dumps(r) + "\n")
    with open(tmp_path / "participants.json", "w", encoding="utf-8") as f:
        json.dump(parts or [], f)
    with open(tmp_path / "tests.json", "w", encoding="utf-8") as f:
        json.dump(tests or [], f)


def run_dq(tmp_path: Path, extra: list[str] = None) -> subprocess.CompletedProcess:
    args = [sys.executable, str(SCRIPT), "--dir", str(tmp_path)]
    if extra:
        args += extra
    return subprocess.run(args, capture_output=True, text=True)


# ── Baseline: a clean, balanced study extract ─────────────────────────────────
def make_clean_reviews(n_per_d: int = 30, n_participants: int = 6, week: int = 8):
    """
    n_per_d reviews for each retrievalType, spread over n_participants and
    'week' study weeks with balanced conditions.
    """
    import datetime as dt
    conds = ["sm2", "hlr", "dart"]
    reviews = []
    parts = [{"participantCode": f"P{i:03d}", "condition": conds[i % 3], "dropoutAt": None}
             for i in range(n_participants)]
    base = dt.datetime(2026, 9, 1, 0, 0, tzinfo=dt.timezone.utc)
    for d in [0, 1, 2, 3]:
        for i in range(n_per_d):
            p = parts[i % n_participants]
            ts = base + dt.timedelta(days=(i * (week * 7)) // n_per_d, hours=i % 24)
            reviews.append({
                "participant": p["participantCode"],
                "condition": p["condition"],
                "retrievalType": d,
                "recall": (i + d) % 2,
                "deltaDays": 1.5,
                "serverDeltaDays": 1.5,
                "elapsedMs": 3500 + (i * 37) % 500,
                "createdAt": ts.isoformat(),
                "weightsVersion": "v1.0.0",
            })
    tests = [{"participantCode": p["participantCode"], "testType": tt}
             for p in parts for tt in ("pretest_cefr", "posttest_delayed")]
    return reviews, parts, tests


# ── Tests ─────────────────────────────────────────────────────────────────────
class TestCleanExtract:
    def test_clean_data_exits_zero(self, tmp_path):
        reviews, parts, tests = make_clean_reviews()
        write_export(tmp_path, reviews, parts, tests)
        r = run_dq(tmp_path)
        # exit 0 iff no crit flag — WARN is acceptable (e.g. compliance <100% on tiny fixture)
        assert r.returncode == 0, r.stdout + r.stderr
        assert "🚨" not in r.stdout   # no crit flags on baseline synthetic data

    def test_clean_data_no_crit_flags(self, tmp_path):
        reviews, parts, tests = make_clean_reviews()
        write_export(tmp_path, reviews, parts, tests)
        r = run_dq(tmp_path)
        assert "🚨" not in r.stdout


class TestMissingRequiredFields:
    def test_missing_recall_field_over_1pct_is_crit(self, tmp_path):
        reviews, parts, tests = make_clean_reviews()
        # Wipe recall on 5% of rows
        for r in reviews[:len(reviews) // 20 + 1]:
            r["recall"] = None
        write_export(tmp_path, reviews, parts, tests)
        result = run_dq(tmp_path)
        assert result.returncode == 1
        assert "recall" in result.stdout
        assert "missing" in result.stdout.lower()


class TestRetrievalBalance:
    def test_missing_d3_flags_zero_share(self, tmp_path):
        reviews, parts, tests = make_clean_reviews()
        reviews = [r for r in reviews if r["retrievalType"] != 3]
        write_export(tmp_path, reviews, parts, tests)
        result = run_dq(tmp_path)
        assert result.returncode == 1
        # Message about α identifiability
        assert "α" in result.stdout or "identifiable" in result.stdout

    def test_low_d_share_flags_crit(self, tmp_path):
        reviews, parts, tests = make_clean_reviews(n_per_d=30)
        # Reduce d=2 to 1 row → ~1% share
        reviews = [r for r in reviews if r["retrievalType"] != 2] + [
            {"participant": "P000", "condition": "sm2", "retrievalType": 2, "recall": 1,
             "deltaDays": 1.0, "serverDeltaDays": 1.0, "elapsedMs": 2000,
             "createdAt": "2026-09-05T10:00:00+00:00", "weightsVersion": "v1.0.0"}
        ]
        write_export(tmp_path, reviews, parts, tests)
        result = run_dq(tmp_path)
        assert result.returncode == 1


class TestDeltaDaysRange:
    def test_negative_delta_flags_crit(self, tmp_path):
        reviews, parts, tests = make_clean_reviews()
        reviews[0]["serverDeltaDays"] = -1.5
        write_export(tmp_path, reviews, parts, tests)
        result = run_dq(tmp_path)
        assert result.returncode == 1
        assert "Δ < 0" in result.stdout or "MUST fix" in result.stdout

    def test_delta_over_60_flags(self, tmp_path):
        reviews, parts, tests = make_clean_reviews()
        # Make 5% of rows have Δ > 60
        for r in reviews[:len(reviews) // 20 + 1]:
            r["serverDeltaDays"] = 90.0
        write_export(tmp_path, reviews, parts, tests)
        result = run_dq(tmp_path)
        assert "60 days" in result.stdout


class TestOptionalFieldCoverage:
    def test_missing_elapsedMs_over_5pct_flags_crit(self, tmp_path):
        reviews, parts, tests = make_clean_reviews()
        for r in reviews[:len(reviews) // 10]:
            r["elapsedMs"] = None
        write_export(tmp_path, reviews, parts, tests)
        result = run_dq(tmp_path)
        assert "elapsedMs" in result.stdout


class TestZeroReviewLearners:
    def test_high_zero_review_attrition_flags_crit(self, tmp_path):
        reviews, parts, tests = make_clean_reviews(n_participants=6)
        # Add 4 extra participants with 0 reviews (4/10 = 40% attrition)
        parts += [{"participantCode": f"Z{i}", "condition": "dart", "dropoutAt": None}
                  for i in range(4)]
        write_export(tmp_path, reviews, parts, tests)
        result = run_dq(tmp_path)
        assert result.returncode == 1
        assert "0 reviews" in result.stdout
