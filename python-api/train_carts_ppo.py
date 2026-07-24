"""
train_carts_ppo.py — PPO training scaffold for CARTS (Algorithm 3 in x.pdf).

This is a SCAFFOLD, not a production trainer. It defines the four networks
described in the paper (encoder fψ, actor πθ, critic Vφ, memory estimator gω)
and a single PPO update step. It is intended to be run offline on collected
ReviewLog data; live training against real learners is out of scope for the
Vercel/Railway deploy.

Reward (Alg 3 line 14):
    ρ = α·r + β·CtxTransfer(l, w) − γ·RT
Default weights follow the paper: α = β = 0.4, γ = 0.2.

Usage:
    python train_carts_ppo.py --epochs 5 --rollout 32 --batch 8
"""

from __future__ import annotations

import argparse
import math
from dataclasses import dataclass
from typing import Tuple

try:
    import torch
    import torch.nn as nn
    import torch.nn.functional as F
    from torch.distributions import Categorical
except ImportError as e:  # keep import-guard so the file loads without torch
    raise SystemExit("torch is required to run this scaffold: pip install torch") from e


# --- Networks -----------------------------------------------------------------

class TransformerEncoder(nn.Module):
    """f_ψ — encodes review history [(r_i, d_i, e_{c_i})] into h_t."""
    def __init__(self, ctx_dim: int, hidden: int = 128, heads: int = 4, layers: int = 2):
        super().__init__()
        self.in_proj = nn.Linear(2 + ctx_dim, hidden)  # (r, d, e_c)
        enc_layer = nn.TransformerEncoderLayer(hidden, heads, dim_feedforward=256, batch_first=True)
        self.encoder = nn.TransformerEncoder(enc_layer, num_layers=layers)

    def forward(self, seq: torch.Tensor) -> torch.Tensor:  # (B, T, F) -> (B, hidden)
        h = self.in_proj(seq)
        h = self.encoder(h)
        return h[:, -1]  # last-step representation


class Actor(nn.Module):
    """π_θ — joint categorical over (d, c). We factor as π(d|h)·π(c|h) for efficiency."""
    def __init__(self, hidden: int, n_retrieval: int = 4, n_context: int = 32):
        super().__init__()
        self.d_head = nn.Linear(hidden, n_retrieval)
        self.c_head = nn.Linear(hidden, n_context)

    def forward(self, h: torch.Tensor):
        return self.d_head(h), self.c_head(h)


class Critic(nn.Module):
    """V_φ — state-value baseline."""
    def __init__(self, hidden: int):
        super().__init__()
        self.head = nn.Sequential(nn.Linear(hidden, hidden), nn.ReLU(), nn.Linear(hidden, 1))

    def forward(self, h): return self.head(h).squeeze(-1)


class MemoryEstimator(nn.Module):
    """g_ω — half-life estimate m̂ (Alg 3 line 7)."""
    def __init__(self, hidden: int):
        super().__init__()
        self.head = nn.Sequential(nn.Linear(hidden, hidden), nn.ReLU(), nn.Linear(hidden, 1), nn.Softplus())

    def forward(self, h): return self.head(h).squeeze(-1)


# --- PPO update ---------------------------------------------------------------

@dataclass
class PPOConfig:
    clip: float = 0.2
    entropy_coef: float = 0.01
    critic_coef: float = 0.5
    gamma: float = 0.99
    gae_lambda: float = 0.95
    lr: float = 3e-4
    update_steps: int = 4


def gae(rewards: torch.Tensor, values: torch.Tensor, gamma: float, lam: float) -> torch.Tensor:
    """Generalized Advantage Estimation, Alg 3 lines 17-18."""
    T = rewards.shape[0]
    adv = torch.zeros_like(rewards)
    running = 0.0
    for t in reversed(range(T)):
        next_v = values[t + 1] if t + 1 < T else 0.0
        delta = rewards[t] + gamma * next_v - values[t]
        running = delta + gamma * lam * running
        adv[t] = running
    return (adv - adv.mean()) / (adv.std() + 1e-8)


def ppo_update(encoder, actor, critic, memory, optim, batch, cfg: PPOConfig):
    """One PPO parameter update (Alg 3 lines 20-27). `batch` is a dict of tensors."""
    seq = batch["seq"]                # (B, T, F)
    d_act = batch["d"]                # (B,)
    c_act = batch["c"]                # (B,)
    old_logp = batch["logp"]          # (B,)
    returns = batch["returns"]        # (B,)
    adv = batch["adv"]                # (B,)

    for _ in range(cfg.update_steps):
        h = encoder(seq)
        d_logits, c_logits = actor(h)
        d_dist = Categorical(logits=d_logits)
        c_dist = Categorical(logits=c_logits)
        logp = d_dist.log_prob(d_act) + c_dist.log_prob(c_act)
        entropy = d_dist.entropy().mean() + c_dist.entropy().mean()

        ratio = (logp - old_logp).exp()
        surr1 = ratio * adv
        surr2 = torch.clamp(ratio, 1 - cfg.clip, 1 + cfg.clip) * adv
        actor_loss = -torch.min(surr1, surr2).mean()

        v = critic(h)
        critic_loss = F.mse_loss(v, returns)

        loss = actor_loss + cfg.critic_coef * critic_loss - cfg.entropy_coef * entropy
        optim.zero_grad()
        loss.backward()
        optim.step()
    return {"actor": float(actor_loss), "critic": float(critic_loss), "entropy": float(entropy)}


def build_networks(ctx_dim=32, n_retrieval=4, n_context=32):
    enc = TransformerEncoder(ctx_dim)
    return enc, Actor(128, n_retrieval, n_context), Critic(128), MemoryEstimator(128)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--epochs", type=int, default=1)
    ap.add_argument("--rollout", type=int, default=8)
    ap.add_argument("--batch", type=int, default=4)
    ap.add_argument("--ctx-dim", type=int, default=32)
    args = ap.parse_args()

    enc, actor, critic, mem = build_networks(ctx_dim=args.ctx_dim)
    cfg = PPOConfig()
    optim = torch.optim.AdamW(
        list(enc.parameters()) + list(actor.parameters()) +
        list(critic.parameters()) + list(mem.parameters()),
        lr=cfg.lr,
    )

    # Dummy rollout — replace with real ReviewLog-driven rollouts before training.
    for epoch in range(args.epochs):
        seq = torch.randn(args.batch, args.rollout, 2 + args.ctx_dim)
        d = torch.randint(0, 4, (args.batch,))
        c = torch.randint(0, 32, (args.batch,))
        rewards = torch.randn(args.batch)
        values = torch.zeros(args.batch)
        returns = rewards
        adv = gae(rewards.unsqueeze(0).expand(args.rollout, -1)[:, 0], values, cfg.gamma, cfg.gae_lambda)
        with torch.no_grad():
            h = enc(seq)
            d_logits, c_logits = actor(h)
            logp = Categorical(logits=d_logits).log_prob(d) + Categorical(logits=c_logits).log_prob(c)
        losses = ppo_update(
            enc, actor, critic, mem, optim,
            {"seq": seq, "d": d, "c": c, "logp": logp, "returns": returns, "adv": adv},
            cfg,
        )
        print(f"epoch={epoch} {losses}")


if __name__ == "__main__":
    main()
