"""Pre-data ICC gate for the RQ3 context-transfer judge.

The input is the ``judgescores.json`` export produced by ``export_logs.py``.
Only rows explicitly flagged ``isCalibrationItem: true`` are eligible.  Each
calibration item must have one LLM score and exactly two independently entered
human scores from the same two human rater IDs across the entire set.

This utility does not call an LLM, generate ratings, or make an RQ3 claim.  It
only makes the planned agreement calculation reproducible once genuine,
independent calibration ratings exist.
"""

from __future__ import annotations

import argparse
import json
from collections import defaultdict
from pathlib import Path
from typing import Any

import numpy as np


RUBRIC_MIN = 0
RUBRIC_MAX = 8


def icc_2_1_absolute_agreement(values: np.ndarray) -> float:
    """Return ICC(2,1) for an n-target by k-rater matrix.

    Formula: two-way random-effects, absolute agreement, single measurement.
    ICC(2,1) is the notation named by the protocol documents.  The caller is
    responsible for defining the rater columns before interpreting this value.
    """
    values = np.asarray(values, dtype=float)
    if values.ndim != 2 or values.shape[0] < 2 or values.shape[1] < 2:
        raise ValueError("ICC(2,1) requires at least two targets and two raters")
    if not np.isfinite(values).all():
        raise ValueError("ICC input contains a non-finite score")

    n_targets, n_raters = values.shape
    grand_mean = float(values.mean())
    target_means = values.mean(axis=1)
    rater_means = values.mean(axis=0)
    ms_targets = n_raters * float(np.square(target_means - grand_mean).sum()) / (n_targets - 1)
    ms_raters = n_targets * float(np.square(rater_means - grand_mean).sum()) / (n_raters - 1)
    residual = values - target_means[:, None] - rater_means[None, :] + grand_mean
    ms_error = float(np.square(residual).sum()) / ((n_targets - 1) * (n_raters - 1))
    denominator = ms_targets + (n_raters - 1) * ms_error + n_raters * (ms_raters - ms_error) / n_targets
    if np.isclose(denominator, 0.0):
        raise ValueError("ICC denominator is zero; calibration ratings have no usable variance")
    return float((ms_targets - ms_error) / denominator)


def _score(value: Any, label: str) -> int:
    if isinstance(value, bool) or not isinstance(value, (int, float)) or int(value) != value:
        raise ValueError(f"{label} must be an integer total score from {RUBRIC_MIN} to {RUBRIC_MAX}")
    score = int(value)
    if not RUBRIC_MIN <= score <= RUBRIC_MAX:
        raise ValueError(f"{label}={score} is outside the 0–8 post-test rubric")
    return score


def build_calibration_matrices(rows: list[dict[str, Any]]) -> tuple[np.ndarray, np.ndarray, list[str], tuple[str, str]]:
    """Validate exported JudgeScore rows and return protocol-relevant matrices.

    The first matrix compares one LLM value with the mean of two human raters,
    exactly as currently described by the draft protocol.  The second is the
    human-human diagnostic.  Both are reported; no fabricated ratings are ever
    accepted to fill a missing cell.
    """
    groups: dict[tuple[str, str], list[dict[str, Any]]] = defaultdict(list)
    for index, row in enumerate(rows):
        if not isinstance(row, dict):
            raise ValueError(f"row {index} is not an object")
        if row.get("isCalibrationItem") is not True:
            continue
        test_result_id, item_id = row.get("testResultId"), row.get("itemId")
        if not isinstance(test_result_id, str) or not test_result_id or not isinstance(item_id, str) or not item_id:
            raise ValueError(f"row {index} needs non-empty testResultId and itemId")
        groups[(test_result_id, item_id)].append(row)
    if not groups:
        raise ValueError("no rows with isCalibrationItem=true")

    human_ids: tuple[str, str] | None = None
    labels: list[str] = []
    llm_vs_human_mean: list[list[float]] = []
    human_pairs: list[list[float]] = []
    for key in sorted(groups):
        records = groups[key]
        llm = [r for r in records if r.get("judgeType") == "llm"]
        humans = [r for r in records if r.get("judgeType") == "human"]
        unexpected = [r.get("judgeType") for r in records if r.get("judgeType") not in {"llm", "human"}]
        label = f"{key[0]}::{key[1]}"
        if unexpected:
            raise ValueError(f"{label} has unsupported judgeType values: {unexpected}")
        if len(llm) != 1:
            raise ValueError(f"{label} needs exactly one LLM score; found {len(llm)}")
        if len(humans) != 2:
            raise ValueError(f"{label} needs exactly two human scores; found {len(humans)}")
        current_ids = tuple(sorted(str(r.get("judgeId", "")) for r in humans))
        if not all(current_ids):
            raise ValueError(f"{label} has a human score without judgeId")
        if current_ids[0] == current_ids[1]:
            raise ValueError(f"{label} requires two distinct human judgeId values")
        if human_ids is None:
            human_ids = current_ids
        elif human_ids != current_ids:
            raise ValueError("the same two human judgeId values must score every calibration item")
        by_id = {str(r["judgeId"]): _score(r.get("totalScore"), f"{label} human {r.get('judgeId')}") for r in humans}
        llm_score = _score(llm[0].get("totalScore"), f"{label} LLM")
        human_pair = [float(by_id[human_ids[0]]), float(by_id[human_ids[1]])]
        labels.append(label)
        human_pairs.append(human_pair)
        llm_vs_human_mean.append([float(llm_score), float(np.mean(human_pair))])

    assert human_ids is not None
    return np.asarray(llm_vs_human_mean), np.asarray(human_pairs), labels, human_ids


def analyse(rows: list[dict[str, Any]], minimum_items: int, threshold: float) -> dict[str, Any]:
    if minimum_items < 2:
        raise ValueError("minimum_items must be at least 2")
    if not 0 <= threshold <= 1:
        raise ValueError("threshold must be between 0 and 1")
    llm_matrix, human_matrix, labels, human_ids = build_calibration_matrices(rows)
    llm_icc = icc_2_1_absolute_agreement(llm_matrix)
    human_icc = icc_2_1_absolute_agreement(human_matrix)
    enough_items = len(labels) >= minimum_items
    return {
        "analysis": "ICC(2,1), absolute agreement, single measurement",
        "source_contract": "export_logs.py judgescores.json; only independently scored calibration rows",
        "n_calibration_items": len(labels),
        "minimum_items_required": minimum_items,
        "human_rater_ids": list(human_ids),
        "llm_vs_human_mean_icc_2_1": llm_icc,
        "human_rater_icc_2_1": human_icc,
        "threshold": threshold,
        "status": "PASS" if enough_items and llm_icc >= threshold else "BLOCKED",
        "interpretation": (
            "No study result is implied. PASS only means this supplied calibration file meets the configured mechanical gate; "
            "the research team must retain the independently scored source records and freeze the rubric/model protocol."
        ),
    }


def main() -> None:
    parser = argparse.ArgumentParser(description="Compute the pre-specified RQ3 ICC calibration gate from JudgeScore export JSON.")
    parser.add_argument("--input", required=True, type=Path, help="Path to judgescores.json produced by research/export_logs.py")
    parser.add_argument("--out", type=Path, default=None, help="Optional JSON report destination")
    parser.add_argument("--minimum-items", type=int, default=40, help="Minimum dual-scored calibration items (default: 40)")
    parser.add_argument("--threshold", type=float, default=0.70, help="LLM-vs-human-mean ICC threshold (default: 0.70)")
    args = parser.parse_args()
    try:
        rows = json.loads(args.input.read_text(encoding="utf-8"))
        if not isinstance(rows, list):
            raise ValueError("input JSON must be an array of exported JudgeScore rows")
        report = analyse(rows, args.minimum_items, args.threshold)
    except (OSError, json.JSONDecodeError, ValueError) as exc:
        raise SystemExit(f"BLOCKED: {exc}") from exc

    rendered = json.dumps(report, indent=2, sort_keys=True)
    if args.out:
        args.out.write_text(rendered + "\n", encoding="utf-8")
    print(rendered)
    if report["status"] != "PASS":
        raise SystemExit(2)


if __name__ == "__main__":
    main()

