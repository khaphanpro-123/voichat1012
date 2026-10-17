"""Unit tests for the pre-data RQ3 agreement gate; no participant data."""

from __future__ import annotations

import pytest

from judge_icc import analyse, build_calibration_matrices, icc_2_1_absolute_agreement


def calibration_rows() -> list[dict]:
    rows: list[dict] = []
    for index, score in enumerate([0, 2, 4, 6, 8], start=1):
        base = {"testResultId": f"synthetic-{index}", "itemId": f"ct-{index}", "isCalibrationItem": True}
        rows.extend([
            {**base, "judgeType": "llm", "judgeId": "llm:fixture", "totalScore": score},
            {**base, "judgeType": "human", "judgeId": "teacher_01", "totalScore": score},
            {**base, "judgeType": "human", "judgeId": "teacher_02", "totalScore": score},
        ])
    return rows


def test_icc_is_one_for_exact_agreement():
    matrix, humans, labels, ids = build_calibration_matrices(calibration_rows())
    assert labels == [f"synthetic-{i}::ct-{i}" for i in range(1, 6)]
    assert ids == ("teacher_01", "teacher_02")
    assert icc_2_1_absolute_agreement(matrix) == pytest.approx(1.0)
    assert icc_2_1_absolute_agreement(humans) == pytest.approx(1.0)


def test_analysis_passes_only_when_fixture_meets_explicit_minimum():
    report = analyse(calibration_rows(), minimum_items=5, threshold=0.70)
    assert report["status"] == "PASS"
    assert report["n_calibration_items"] == 5
    assert report["llm_vs_human_mean_icc_2_1"] == pytest.approx(1.0)


def test_missing_second_human_rater_is_rejected():
    rows = calibration_rows()
    rows.pop()
    with pytest.raises(ValueError, match="exactly two human"):
        build_calibration_matrices(rows)


def test_out_of_range_total_is_rejected():
    rows = calibration_rows()
    rows[0]["totalScore"] = 9
    with pytest.raises(ValueError, match="0–8"):
        build_calibration_matrices(rows)

