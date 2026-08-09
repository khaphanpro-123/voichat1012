#!/usr/bin/env python3
"""
simulate_judge_feedback.py — Feedback-loop oscillation test cho Amendment #A-002.

Câu hỏi khoa học:
    Thêm feature x[5] = recentJudgeComposite vào DART có tạo vòng lặp dao động
    (judge cao → half-life dài → ôn muộn → quên → judge thấp → half-life ngắn → ôn sớm)
    làm HV học không ổn định không?

Chiến lược:
    Với alpha_true = 0 (α không thực sự có tác dụng — worst case cho A-002),
    theta[5]_true = 0.4 (giá trị init), mô phỏng chuỗi 20 lần ôn của 200 HV × 60 từ.
    Đo:
      1. Coefficient of variation (CV) của interval giữa các lần ôn (per user-word).
         CV cao = dao động; CV thấp = ổn định.
      2. So sánh CV giữa (a) DART có x[5], (b) DART không x[5]. Nếu (a) không cao hơn
         (b) > 20%, kết luận "không tạo oscillation đáng lo".

Đây là simulation exploratory, không phải kết quả nghiên cứu. Điều kiện ký #A-002.

Chạy: python3 research/simulate_judge_feedback.py
"""

from __future__ import annotations
import math
import random
import statistics
from dataclasses import dataclass
from typing import List

# ── Tham số mô phỏng ──────────────────────────────────────────────────────────
N_USERS = 200
N_WORDS_PER_USER = 60
N_REVIEWS = 20                # số lần ôn mỗi user-word
TAU = 0.9                     # target recall probability
ALPHA_TRUE = 0.0              # worst case: α không có tác dụng thật
THETA_TRUE = [1.2, -0.4, 0.3, 0.8, 0.5, 0.4]   # bias, cefr, wordFreq, acc, reviewed, judge
PHI = [0.0, 0.33, 0.66, 1.0]
JUDGE_NOISE_SIGMA = 0.15      # nhiễu quanh true recall khi tính "judge composite"
SEED = 42

random.seed(SEED)

# ── Helper functions (mirror lib/dart.ts) ────────────────────────────────────
def build_x(cefr01: float, word_freq_log: float, acc: float, reviewed_log: float, judge01: float) -> List[float]:
    return [1.0, cefr01, word_freq_log, acc, reviewed_log, judge01]

def half_life(theta: List[float], alpha: float, x: List[float], d_prev: int) -> float:
    dot = sum(t * xi for t, xi in zip(theta, x))
    return (2 ** dot) * math.exp(alpha * PHI[d_prev])

def next_interval(h: float) -> float:
    return h * math.log2(1 / TAU)

def next_retrieval_type(h: float) -> int:
    if h < 2: return 0
    if h < 7: return 1
    if h < 30: return 2
    return 3

def sim_recall(elapsed: float, h_true: float) -> float:
    """True recall from ground-truth half-life."""
    return 2 ** (-elapsed / h_true)

# ── Simulation core ──────────────────────────────────────────────────────────
@dataclass
class UserWordTrace:
    intervals: List[float]        # ngày giữa các lần ôn liên tiếp
    judges: List[float]           # judge composite (0..1) mỗi lần

def simulate_one(with_judge_feature: bool) -> List[UserWordTrace]:
    """
    Trả về trace của mọi (user, word). with_judge_feature=True mô phỏng theta[5] hoạt động;
    False mô phỏng bỏ x[5] (thay bằng 0.5 mặc định — như trước A-002).
    """
    traces: List[UserWordTrace] = []
    theta_scheduler = list(THETA_TRUE)
    if not with_judge_feature:
        theta_scheduler[5] = 0.0   # neutralise judge feature slot

    for u in range(N_USERS):
        cefr = random.uniform(0.2, 0.8)
        acc0 = random.uniform(0.4, 0.75)
        for w in range(N_WORDS_PER_USER):
            wf = random.uniform(0.2, 0.7)  # word freq log
            reviewed = 0.0
            judge_prev = 0.5   # neutral prior
            elapsed = 1.0
            intervals: List[float] = []
            judges: List[float] = []
            d_prev = 0
            for r in range(N_REVIEWS):
                x = build_x(cefr, wf, acc0, math.log(1 + reviewed) / math.log(50), judge_prev if with_judge_feature else 0.5)
                # True half-life uses THETA_TRUE (with x[5]=judge_prev regardless — that's ground truth)
                x_true = build_x(cefr, wf, acc0, math.log(1 + reviewed) / math.log(50), judge_prev)
                h_true = half_life(THETA_TRUE, ALPHA_TRUE, x_true, d_prev)
                # Scheduler uses theta_scheduler (which zeroes x[5] slot when ablated)
                h_sched = half_life(theta_scheduler, ALPHA_TRUE, x, d_prev)
                interval = next_interval(h_sched)
                intervals.append(interval)
                # HV recall at scheduled interval
                p_recall = sim_recall(interval, h_true)
                # Judge composite = noisy proxy of recall (0..1)
                judge = max(0.0, min(1.0, p_recall + random.gauss(0, JUDGE_NOISE_SIGMA)))
                judges.append(judge)
                # Update state
                judge_prev = judge
                reviewed += 1
                d_prev = next_retrieval_type(h_sched)
                elapsed += interval
            traces.append(UserWordTrace(intervals, judges))
    return traces

def cv(xs: List[float]) -> float:
    if len(xs) < 2 or statistics.mean(xs) == 0: return 0.0
    return statistics.stdev(xs) / statistics.mean(xs)

def summarise(traces: List[UserWordTrace], label: str) -> dict:
    cvs = [cv(t.intervals) for t in traces]
    mean_intervals = [statistics.mean(t.intervals) for t in traces]
    judge_finals = [t.judges[-1] for t in traces]
    return {
        "label": label,
        "n_traces": len(traces),
        "cv_interval_mean": statistics.mean(cvs),
        "cv_interval_p95": sorted(cvs)[int(0.95 * len(cvs))],
        "interval_mean_days": statistics.mean(mean_intervals),
        "judge_final_mean": statistics.mean(judge_finals),
    }

# ── Main ─────────────────────────────────────────────────────────────────────
def main():
    print(f"Running Amendment #A-002 oscillation simulation")
    print(f"  users={N_USERS}, words/user={N_WORDS_PER_USER}, reviews={N_REVIEWS}")
    print(f"  alpha_true={ALPHA_TRUE} (worst case — α has no real effect)")
    print(f"  theta_true[5]={THETA_TRUE[5]} (judge feature init value)")
    print()

    traces_with = simulate_one(with_judge_feature=True)
    traces_without = simulate_one(with_judge_feature=False)

    s_with = summarise(traces_with, "DART + judge feature (x[5] active)")
    s_without = summarise(traces_without, "DART without judge feature (baseline)")

    print(f"{'Metric':<32} {'With x[5]':>15} {'Without x[5]':>15} {'Δ %':>10}")
    print("-" * 74)
    for k in ["cv_interval_mean", "cv_interval_p95", "interval_mean_days", "judge_final_mean"]:
        a = s_with[k]; b = s_without[k]
        delta = 100 * (a - b) / b if b else float("inf")
        print(f"{k:<32} {a:>15.4f} {b:>15.4f} {delta:>+9.1f}%")
    print()

    # Acceptance criterion from Amendment #A-002:
    # If CV(intervals) with judge feature is NOT > 20% higher than baseline, safe.
    cv_delta = 100 * (s_with["cv_interval_mean"] - s_without["cv_interval_mean"]) / s_without["cv_interval_mean"]
    print(f"Oscillation criterion (Amendment #A-002):")
    print(f"  ΔCV(intervals) = {cv_delta:+.1f}% (threshold: must be < +20%)")
    if cv_delta < 20:
        print(f"  ✅ PASS — judge feature does NOT create runaway oscillation")
        print(f"  Amendment #A-002 safe to sign on this criterion.")
    else:
        print(f"  ❌ FAIL — judge feature makes intervals significantly more variable")
        print(f"  Amendment #A-002 should either (a) reduce theta[5] init, (b) cap composite range,")
        print(f"  or (c) require dampening (EMA over last 3 judges).")

if __name__ == "__main__":
    main()
