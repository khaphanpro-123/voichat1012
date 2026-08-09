"""
Aggregate weeks=8 Type-I chunks (v2) — 2026-08-06.

Kết hợp toàn bộ chunk weeks=8 hiện có (a, b, c, d5, e, f, g, h, i, j) thành
1 con số tổng và 95% Wald CI đủ hẹp để chốt.

Không sửa dart_model.py, không sửa power_analysis.py — chỉ đọc JSON.
"""

from __future__ import annotations
import json
import math
from pathlib import Path

# reject_rate * reps của mỗi chunk có thể suy ngược ra "hits"
CHUNKS = [
    ("reports/type1_weeks8_chunk_a.json",   15),
    ("reports/type1_weeks8_chunk_b.json",   15),
    ("reports/type1_weeks8_chunk_c.json",   15),
    ("reports/type1_weeks8_chunk_d5.json",   5),
    ("reports/type1_weeks8_chunk_e.json",   10),
    ("reports/type1_weeks8_chunk_f.json",   10),
    ("reports/type1_weeks8_chunk_g.json",   10),
    ("reports/type1_weeks8_chunk_h.json",   10),
    ("reports/type1_weeks8_chunk_i.json",   10),
    ("reports/type1_weeks8_chunk_j.json",   10),
]


def wald_ci(k: int, n: int, z: float = 1.96) -> tuple[float, float]:
    p = k / n if n > 0 else 0.0
    se = math.sqrt(p * (1 - p) / n) if n > 0 else 0.0
    return max(0.0, p - z * se), min(1.0, p + z * se)


def wilson_ci(k: int, n: int, z: float = 1.96) -> tuple[float, float]:
    if n == 0:
        return 0.0, 1.0
    p = k / n
    denom = 1 + z * z / n
    centre = (p + z * z / (2 * n)) / denom
    half = z * math.sqrt((p * (1 - p) / n) + z * z / (4 * n * n)) / denom
    return max(0.0, centre - half), min(1.0, centre + half)


def main() -> None:
    root = Path(__file__).parent
    chunks_out = []
    total_hits = 0
    total_reps = 0
    weighted_alpha_num = 0.0
    weighted_alpha_den = 0

    for rel, expected_reps in CHUNKS:
        path = root / rel
        if not path.exists():
            print(f"MISSING: {rel}")
            continue
        with path.open() as f:
            data = json.load(f)
        rec = data["results"][0]
        reps = rec["reps"]
        rate = rec["reject_rate"]
        mean_alpha = rec["mean_alpha"]
        hits = round(rate * reps)
        chunks_out.append({
            "file": rel,
            "reps": reps,
            "reject_rate": rate,
            "mean_alpha": mean_alpha,
            "hits": hits,
        })
        total_hits += hits
        total_reps += reps
        weighted_alpha_num += mean_alpha * reps
        weighted_alpha_den += reps

    overall_rate = total_hits / total_reps if total_reps else 0.0
    lo_w, hi_w = wald_ci(total_hits, total_reps)
    lo_wilson, hi_wilson = wilson_ci(total_hits, total_reps)
    mean_alpha_pooled = weighted_alpha_num / weighted_alpha_den if weighted_alpha_den else 0.0

    if lo_wilson > 0.05:
        verdict = "ANTI-CONSERVATIVE (Wilson CI floor > 0.05)"
    elif hi_wilson < 0.05:
        verdict = "CONSERVATIVE (Wilson CI ceiling < 0.05)"
    else:
        verdict = "INCONCLUSIVE (Wilson CI straddles 0.05)"

    out = {
        "aggregated": {
            "n_learners": 60,
            "weeks": 8,
            "words": 30,
            "total_reps": total_reps,
            "total_hits": total_hits,
            "reject_rate": overall_rate,
            "ci95_wald": [lo_w, hi_w],
            "ci95_wilson": [lo_wilson, hi_wilson],
            "mean_alpha_pooled": mean_alpha_pooled,
            "verdict": verdict,
        },
        "chunks": chunks_out,
    }

    out_path = root / "reports/type1_weeks8_aggregated_v2.json"
    out_path.write_text(json.dumps(out, indent=2))

    print(f"Chunks: {len(chunks_out)}, Total reps: {total_reps}, Hits: {total_hits}")
    print(f"Reject rate: {overall_rate:.4f}")
    print(f"  Wald 95%   : [{lo_w:.4f}, {hi_w:.4f}]")
    print(f"  Wilson 95% : [{lo_wilson:.4f}, {hi_wilson:.4f}]")
    print(f"Mean alpha under H0 (pooled): {mean_alpha_pooled:.4f}")
    print(f"Verdict: {verdict}")
    print(f"wrote {out_path.relative_to(root)}")


if __name__ == "__main__":
    main()
