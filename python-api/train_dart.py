"""
train_dart.py — Offline training for DART (Algorithm 1 in x.pdf).

Reads ReviewLog collection from MongoDB, fits (theta, alpha) via gradient descent
on weighted binary cross-entropy, then writes the parameters to disk. The Next.js
server loads them from JSON at runtime.

Loss (per row):
    h0 = 2 ** (theta . x)
    h  = h0 * exp(alpha * phi(d))
    p  = 2 ** (-delta / h)
    L  = -[ r*log(p) + (1-r)*log(1-p) ] + lambda * ||theta||^2

Usage:
    export MONGO_URI="mongodb+srv://..."
    python train_dart.py --epochs 100 --lr 0.05 --out dart_weights.json
"""

from __future__ import annotations

import argparse
import json
import math
import os
from typing import List, Tuple

import numpy as np

PHI = np.array([0.0, 0.33, 0.66, 1.0], dtype=np.float64)  # difficulty embedding


def load_dataset(mongo_uri: str) -> Tuple[np.ndarray, np.ndarray, np.ndarray, np.ndarray]:
    from pymongo import MongoClient  # imported lazily so unit tests can skip
    client = MongoClient(mongo_uri)
    db = client.get_default_database()
    rows = list(db.reviewlogs.find({}, {
        "featureVector": 1, "deltaDays": 1, "retrievalType": 1, "recall": 1,
    }))
    if not rows:
        raise RuntimeError("No review logs found — collect data first.")

    F = max(len(r.get("featureVector") or []) for r in rows)
    X, Delta, D, R = [], [], [], []
    for r in rows:
        fv = list(r.get("featureVector") or [])
        if len(fv) < F:
            fv = fv + [0.0] * (F - len(fv))
        X.append(fv)
        Delta.append(float(r.get("deltaDays") or 0))
        D.append(int(r.get("retrievalType") or 0))
        R.append(int(r.get("recall") or 0))
    return (
        np.asarray(X, dtype=np.float64),
        np.asarray(Delta, dtype=np.float64),
        np.asarray(D, dtype=np.int64),
        np.asarray(R, dtype=np.float64),
    )


def forward(theta: np.ndarray, alpha: float, X: np.ndarray, D: np.ndarray, Delta: np.ndarray):
    dot = X @ theta                                  # (N,)
    h0 = np.exp2(dot)                                # 2^(theta·x)
    h = h0 * np.exp(alpha * PHI[D])
    h = np.clip(h, 1e-6, 1e6)
    p = np.exp2(-Delta / h)
    return h, p


def loss_and_grads(theta, alpha, X, D, Delta, R, lam):
    N = X.shape[0]
    h, p = forward(theta, alpha, X, D, Delta)
    p = np.clip(p, 1e-9, 1 - 1e-9)

    bce = -(R * np.log(p) + (1 - R) * np.log(1 - p))
    total = bce.mean() + lam * float(theta @ theta)

    # dL/dp
    dLdp = -(R / p - (1 - R) / (1 - p)) / N
    # p = 2^(-Δ/h) → dp/dh = p * (ln 2) * Δ / h^2
    dpdh = p * math.log(2) * Delta / (h * h)
    dLdh = dLdp * dpdh
    # h = 2^(θ·x) * exp(α·φ(d))
    # dh/dθ_j = h * ln 2 * x_j
    dLdtheta = (dLdh[:, None] * (math.log(2) * X)).sum(axis=0) + 2 * lam * theta
    # dh/dα = h * φ(d)
    dLdalpha = float((dLdh * PHI[D]).sum())
    return total, dLdtheta, dLdalpha


def train(X, Delta, D, R, epochs=100, lr=0.05, lam=1e-3):
    F = X.shape[1]
    theta = np.zeros(F, dtype=np.float64)
    alpha = 0.0
    for epoch in range(1, epochs + 1):
        L, gTheta, gAlpha = loss_and_grads(theta, alpha, X, D, Delta, R, lam)
        theta -= lr * gTheta
        alpha = max(0.0, alpha - lr * gAlpha)  # enforce α ≥ 0 (Alg 1 line 13)
        if epoch == 1 or epoch % 10 == 0:
            print(f"epoch={epoch:03d}  loss={L:.4f}  alpha={alpha:.4f}")
    return theta, alpha


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--mongo-uri", default=os.environ.get("MONGO_URI"))
    ap.add_argument("--epochs", type=int, default=100)
    ap.add_argument("--lr", type=float, default=0.05)
    ap.add_argument("--lam", type=float, default=1e-3)
    ap.add_argument("--out", default="dart_weights.json")
    args = ap.parse_args()

    if not args.mongo_uri:
        raise SystemExit("MONGO_URI is required")

    X, Delta, D, R = load_dataset(args.mongo_uri)
    print(f"loaded {X.shape[0]} rows, F={X.shape[1]}, positive rate={R.mean():.3f}")
    theta, alpha = train(X, Delta, D, R, args.epochs, args.lr, args.lam)

    out = {
        "theta": theta.tolist(),
        "alpha": alpha,
        "featureNames": ["bias", "cefr", "wordFreqLog", "userAvgAcc", "timesReviewedLog"],
        "thresholds": {"low": 2, "mid": 7, "high": 30},
    }
    with open(args.out, "w", encoding="utf-8") as f:
        json.dump(out, f, indent=2)
    print(f"wrote {args.out}")


if __name__ == "__main__":
    main()
