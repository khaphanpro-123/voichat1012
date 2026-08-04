# IMPLEMENTATION_LOG.md — DART & CARTS integration

> Reference: `x.pdf` (Algorithms 1–4) + Abstract 315.pdf (CARTS paper, EMNLP 2026 submission).
> Baseline this replaces: SM-2 (`lib/spacedRepetition.ts`).

Paper direction the code should support:
- **RQ1** DART > HLR (difficulty-aware scheduling matters).
- **RQ2** CARTS > 4 baselines (SM-2, HLR, KARL, LECTOR).
- **RQ3** LLM-as-a-Judge context transfer metric (Accuracy / Fluency / Appropriateness / Creativity, 0–10).
- **RQ4** Ablation: DART contributes ~61% of the CARTS gain, context ~39%.

The code is arranged so the **DART path is production-ready** and the **CARTS path is a rule-based scaffold** with a separate PPO trainer kept offline. That mirrors the paper's ablation (turn context off → DART-only condition).

---

## 0. Files touched

```
app/models/Vocabulary.ts            (extended)
app/models/ReviewLog.ts             (new)
lib/dart.ts                         (new)
lib/spacedRepetition.ts             (extended, SM-2 kept)
lib/contextDiversity.ts             (new)
app/api/dart/schedule/route.ts      (new)
app/api/carts/schedule/route.ts     (new)
app/api/vocabulary-review/route.ts  (extended, logs ReviewLog)
python-api/train_dart.py            (new — offline)
python-api/train_carts_ppo.py       (new — offline scaffold)
```

Nothing existing was deleted; SM-2 keeps working when `scheduler = 'sm2'`.

---

## Task 1 — Extend `Vocabulary` schema

Add DART/CARTS fields without breaking SM-2. `halfLife`, `lastRetrievalType`, `nextRetrievalType`, `featureVector`, `seenContextIds`, `scheduler` are all optional.

```ts
// app/models/Vocabulary.ts (excerpt)
halfLife?: number;
lastRetrievalType?: 0 | 1 | 2 | 3;
nextRetrievalType?: 0 | 1 | 2 | 3;
featureVector?: number[];
seenContextIds?: string[];
scheduler?: 'sm2' | 'dart' | 'carts';
```

Migration: none. Old docs read the default from Mongoose (`scheduler='sm2'`, `lastRetrievalType=0`).

---

## Task 2 — Add `ReviewLog` model

Every review call inserts one row shaped like the training tuple `H = {(w, Δ, d, x, r)}` from Algorithm 1, plus `RT` and `contextId` that CARTS needs.

```ts
// app/models/ReviewLog.ts (excerpt)
userId, vocabularyId, word,
deltaDays,        // Δ_i
retrievalType,    // d_i
featureVector,    // x_i
contextId,        // c_i (CARTS)
recall,           // r_i ∈ {0,1}
responseTimeMs,   // RT_i (CARTS reward)
quality           // 0-5 legacy
```

Two indexes: `{userId, createdAt:-1}` and `{vocabularyId, createdAt:-1}` — both queries needed by `train_dart.py`.

---

## Task 3 — DART inference library (`lib/dart.ts`)

Pure functions matching the paper's notation. Uses default weights until the Python trainer produces `dart_weights.json`.

```ts
// lib/dart.ts (excerpt)
export function halfLife(theta, alpha, x, dPrev) {
  return Math.pow(2, dot(theta, x)) * Math.exp(alpha * PHI[dPrev]);
}
export function dartSchedule(weights, x, dPrev, tau = 0.9) {
  const h = halfLife(weights.theta, weights.alpha, x, dPrev);
  const tNext = h * Math.log2(1 / tau);
  return { halfLife: h, intervalDays: Math.max(1, tNext),
           nextRetrievalType: selectNextRetrievalType(h, weights.thresholds),
           predictedRecall: predictRecall(h, tNext) };
}
```

`PHI = [0, 0.33, 0.66, 1.0]` — the difficulty embedding for `d ∈ {0,1,2,3}` = MCQ / cloze / constrained-gen / paraphrase, matching Section 2.1 of the paper.

---

## Task 4 — Wire DART into `lib/spacedRepetition.ts`

New `calculateNextReviewDart(...)` accepts the 0–5 quality (so the frontend doesn't change) and maps `quality>=3 → r=1`. Failed reviews shrink the interval to 30% of the DART-scheduled one — same behaviour as SM-2's "reset on lapse" but softer.

```ts
// lib/spacedRepetition.ts (excerpt)
export function calculateNextReviewDart(input, weights = DEFAULT_DART_WEIGHTS, tau = 0.9) {
  const x = input.featureVector?.length ? input.featureVector : buildFeatureVector({});
  const dPrev = input.lastRetrievalType ?? 0;
  const sched = dartSchedule(weights, x, dPrev, tau);
  const recall = input.quality >= 3 ? 1 : 0;
  const interval = recall ? sched.intervalDays : Math.max(1, sched.intervalDays * 0.3);
  // ...
}
```

SM-2 (`calculateNextReview`) is untouched — clients that still send `quality` without a `scheduler` field keep SM-2.

---

## Task 5 — New endpoint `POST /api/dart/schedule`

Body: `{ vocabularyId, userId?, quality?, lastRetrievalType? }`. Returns `{ halfLife, intervalDays, nextRetrievalType, predictedRecall }`. Also supports `GET` for a dry-run "when would this word be scheduled if I nailed it right now".

```ts
// app/api/dart/schedule/route.ts (excerpt)
const x = await featureVectorFor(vocab);
const dPrev = (lastRetrievalType ?? vocab.lastRetrievalType ?? 0);
const sched = calculateNextReviewDart({ featureVector: x, lastRetrievalType: dPrev, quality });
return NextResponse.json({ success: true, schedule: sched });
```

---

## Task 6 — Extend `POST /api/vocabulary-review`

Now:
1. Computes Δ = days since last review.
2. Builds feature vector `x`.
3. Runs SM-2 **or** DART based on `scheduler` (defaults to whatever the doc already has, else `sm2`).
4. Inserts a `ReviewLog` row for training.

```ts
// app/api/vocabulary-review/route.ts (excerpt)
const useDart = (scheduler ?? vocabulary.scheduler ?? 'sm2') !== 'sm2';
const nextSRS = useDart
  ? calculateNextReviewDart({ featureVector: x, lastRetrievalType: dPrev, quality })
  : calculateNextReview(currentSRS, quality);
await ReviewLog.create({ userId, vocabularyId: vocabulary._id, word: vocabulary.word,
                         deltaDays, retrievalType: dPrev, featureVector: x, contextId,
                         recall: quality >= 3 ? 1 : 0, responseTimeMs, quality });
```

Backward compatible — old clients (no `retrievalType`, no `scheduler`) still work, and a `ReviewLog` still gets written with defaults so the trainer eventually sees them.

---

## Task 7 — Offline DART trainer (`python-api/train_dart.py`)

Vectorized gradient descent on the closed-form gradients of the weighted BCE loss with the exact formulas from Algorithm 1.

```python
# train_dart.py (excerpt)
h  = np.exp2(X @ theta) * np.exp(alpha * PHI[D])
p  = np.exp2(-Delta / h)
loss = -(R*np.log(p) + (1-R)*np.log(1-p)).mean() + lam * theta @ theta
# gradient closed form: dp/dh, dh/dθ, dh/dα
theta -= lr * dLdtheta
alpha  = max(0.0, alpha - lr * dLdalpha)   # enforce α ≥ 0 (line 13 of Alg 1)
```

Reads MongoDB directly (`MONGO_URI` env var), writes `dart_weights.json`. That file is what the Next.js server will `import` (next step: add a loader in `lib/dart.ts` when the file is present — trivial `fs.readFileSync` on cold start).

---

## Task 8 — Max-min context diversity (`lib/contextDiversity.ts`)

Model-free implementation of Alg 4 Step 4. Works today with any embedding source (Pinecone, in-memory, whatever).

```ts
// lib/contextDiversity.ts (excerpt)
const valid = seenMean
  ? pool.filter(c => cosineDist(c.embedding, seenMean) >= deltaMin)
  : pool.slice();
const candidates = valid.length ? valid : pool;         // fallback per Alg 4 line 10
let best = candidates[0], bestScore = -Infinity;
for (const c of candidates) {
  const minDist = Math.min(...seen.map(s => cosineDist(c.embedding, s.embedding))) || 1;
  if (minDist > bestScore) { bestScore = minDist; best = c; }
}
```

---

## Task 9 — `POST /api/carts/schedule` (CARTS-lite)

Full Alg 4 control flow but the Step 1–3 networks are stubbed with DART. This is the ablation-friendly setup the paper describes: "context on / off" is a config flag.

```ts
// app/api/carts/schedule/route.ts (excerpt)
const sched  = calculateNextReviewDart({ featureVector: x, lastRetrievalType: dPrev, quality: 5 }, undefined, targetRecall);
const choice = pickDiverseContext(contextPool, seen, deltaMin);
const prompt = `Word: "${vocab.word}"\nRetrieval type: ${RETRIEVAL_LABELS[sched.nextRetrievalType]}\nContext passage: "${choice.chosen.text}"\n...`;
const llm    = await callAI(prompt, {openaiKey, groqKey, cohereKey}, {maxTokens: 300});
return NextResponse.json({ success: true, schedule: {...}, task: llm });
```

When `train_carts_ppo.py` produces trained networks, swap the DART call for actor/memory inference.

---

## Task 10 — PPO scaffold (`python-api/train_carts_ppo.py`)

All four networks from the paper plus a single-step PPO update. Not production; a starting point.

```python
# train_carts_ppo.py (excerpt)
class TransformerEncoder(nn.Module): ...   # f_ψ
class Actor(nn.Module):                    # π_θ (d, c) factored
    def forward(self, h): return self.d_head(h), self.c_head(h)
class Critic(nn.Module): ...               # V_φ
class MemoryEstimator(nn.Module): ...      # g_ω

def ppo_update(enc, actor, critic, mem, optim, batch, cfg):
    logp   = d_dist.log_prob(d_act) + c_dist.log_prob(c_act)
    ratio  = (logp - old_logp).exp()
    surr1  = ratio * adv
    surr2  = torch.clamp(ratio, 1 - clip, 1 + clip) * adv
    loss   = -min(surr1, surr2).mean() + 0.5*mse(V, R) - β_H*entropy
```

Rollout collection against the real learner interface is intentionally left blank — that hookup only makes sense once there is a live user pool per the paper (200 learners).

---

## Task 11 — Paper alignment map

| Paper section | Code location | Status |
| --- | --- | --- |
| 2.1 DART formulation | `lib/dart.ts` | done |
| 2.2 CARTS state encoder f_ψ | `python-api/train_carts_ppo.py::TransformerEncoder` | scaffold |
| 2.2 PPO policy π_θ | `train_carts_ppo.py::Actor` + `ppo_update` | scaffold |
| 2.2 Reward (α·r + β·CtxTransfer − γ·RT) | `ReviewLog.responseTimeMs`, α/β/γ in trainer | data logged |
| 2.4 Baselines (SM-2, HLR, KARL, LECTOR) | `calculateNextReview` = SM-2, DART covers HLR-family | 1/4 baselines |
| 2.5 LLM-as-a-Judge (4 dimensions) | **TODO** `app/api/context-transfer/judge/route.ts` | pending |
| 3.4 RQ3 LLM-Judge validation | needs GPT-4 call + human ICC calc | pending |
| 3.5 Component ablation | Toggle `scheduler ∈ {sm2,dart,carts}` per user | supported |

All three "follow-up" items from the previous pass are now built. Additional expansion tasks (12–20) below.

---

---

## Task 12 — DART weight loader with hot-reload (`lib/dartWeights.ts`)

Cold path when no file exists: falls back to `DEFAULT_DART_WEIGHTS`.
Hot path: reads mtime and re-parses when the file changes on disk. Both `/api/dart/schedule` and `/api/carts/schedule` now pull weights through `getDartWeights()`.

```ts
// lib/dartWeights.ts (excerpt)
const CANDIDATE_PATHS = [
  process.env.DART_WEIGHTS_PATH,
  path.join(process.cwd(), "dart_weights.json"),
  path.join(process.cwd(), "python-api", "dart_weights.json"),
].filter(Boolean) as string[];

export function getDartWeights(): DartWeights {
  for (const p of CANDIDATE_PATHS) {
    const stat = fs.statSync(p);
    if (cache && cache.source === p && cache.mtimeMs === stat.mtimeMs) return cache.weights;
    const w = readWeights(p);
    if (w) { cache = { weights: w, source: p, mtimeMs: stat.mtimeMs }; return w; }
  }
  return DEFAULT_DART_WEIGHTS;
}
```

Admin endpoint `POST /api/dart/weights` invalidates the cache after retraining without needing a redeploy.

---

## Task 13 — HLR baseline (`lib/baselines/hlr.ts`)

Half-Life Regression = DART with `α = 0`, so it's a 5-line wrapper around `dartSchedule`. This is what the paper's **RQ1** ("DART vs HLR", Cohen's d = 0.375) needs as its control.

```ts
// lib/baselines/hlr.ts (excerpt)
export function hlrSchedule(weights, x, tau = 0.9) {
  const noDifficulty = { ...weights, alpha: 0 };
  return dartSchedule(noDifficulty, x, 0, tau);
}
```

---

## Task 14 — KARL baseline (`lib/baselines/karl.ts`)

Compact version of KARL: logistic gate on `(quality, learnerAccuracy, cefr, freq)` multiplied by an interval growth factor. Success expands, failure shrinks to 30 %.

```ts
// lib/baselines/karl.ts (excerpt)
const gate = sigma(1.5*(q - 3) + 1.2*(acc - 0.5) - 0.8*cefr + 0.5*freq);
const growth = 1 + 1.6 * gate;                 // ∈ (1, 2.6)
const next = success ? cur * growth : cur * 0.3;
```

---

## Task 15 — LECTOR baseline (`lib/baselines/lector.ts`)

Contextual baseline: HLR interval × novelty damping factor derived from the max-min coverage of the chosen pool item. Same context-selection principle as CARTS but no policy learning.

```ts
// lib/baselines/lector.ts (excerpt)
const damp = 0.5 + 0.5 * bestCov;              // ∈ [0.5, 1]
const interval = Math.round(hlr.interval * damp);
```

`lib/baselines/index.ts` exposes a `SchedulerRegistry` used by the ablation endpoint.

---

## Task 16 — LLM-as-a-Judge (`lib/contextTransferJudge.ts` + `/api/context-transfer/judge`)

Implements the paper's Section 2.5 rubric with a strict-JSON prompt and clamped 0–10 integers. Scores are optionally persisted onto a `ReviewLog` row so the RQ3 time-series (β = 0.0191) can be plotted straight from Mongo.

```ts
// lib/contextTransferJudge.ts (excerpt)
const RUBRIC = `Rate accuracy, fluency, appropriateness, creativity (0-10 int each). ...`;
const parsed  = extractJSON(await callAI(prompt, keys, { temperature: 0 }));
const composite = (accuracy + fluency + appropriateness + creativity) / 4;
```

---

## Task 17 — Retrieval-task generator (`lib/retrievalTaskGenerator.ts`)

One prompt template per `d ∈ {0,1,2,3}` — MCQ / cloze / constrained-gen / paraphrase. Returns typed `{ prompt, options?, expectedAnswer }`. `POST /api/carts/schedule` now calls this instead of an ad-hoc prompt string.

```ts
// lib/retrievalTaskGenerator.ts (excerpt)
const TEMPLATES = {
  0: (w, ctx) => `Generate ONE recognition MCQ for "${w}"... options[4], expected_answer.`,
  1: (w, ctx) => `Cloze fill-in-the-blank for "${w}" using ${ctx}.`,
  2: (w, ctx) => `Constrained generation (≤20 words) using "${w}" in the same sense.`,
  3: (w, ctx) => `Paraphrase the passage in 2-3 sentences using "${w}".`,
};
```

---

## Task 18 — Ablation experiment endpoint (`/api/experiment/assign`)

Deterministic FNV-1a hash on `userId` (optionally stratified by CEFR) picks 1 of 6 conditions. Same user → same condition on every request, which is what the paper's mixed-effects model assumes.

```ts
// lib/experimentAssignment.ts (excerpt)
const bucket = fnv1a(stratum ? `${stratum}::${userId}` : userId) % SCHEDULER_NAMES.length;
return { userId, condition: SCHEDULER_NAMES[bucket], stratum, createdAt: new Date().toISOString() };
```

---

## Task 19 — Pinecone-backed context pool (`lib/contextPool.ts`)

`buildContextPool({ word, fallbackSentences })` returns `ContextItem[]` for CARTS Step 4. Chain of fallbacks:
1. Pinecone `topK` query (Cohere multilingual embed for the word).
2. Cohere-embedded vocab example sentences.
3. Deterministic hash-based pseudo-embedding (for tests / offline dev).

`POST /api/carts/schedule` now accepts `"contextPool": "auto"` and builds the pool server-side.

---

## Task 20 — Jest tests (`__tests__/dart.test.ts`, `contextDiversity.test.ts`, `baselines.test.ts`)

20 tests total, all green:
- DART: `baseHalfLife`, monotonicity in d, `predictRecall`, BCE endpoints, threshold routing, PHI ordering, schedule identity.
- Diversity: cosine identities, mean embedding, empty-seen handling, farthest-first pick, fallback when `Cvalid = ∅`.
- Baselines: SM-2 grow/reset, HLR = DART|α=0, KARL monotonicity in quality, LECTOR farthest-pool selection, DART interval direction.
- Assignment: deterministic per userId, range check, stratum change.

```bash
npx jest __tests__/dart.test.ts __tests__/contextDiversity.test.ts __tests__/baselines.test.ts
# → 20 passed, 20 total
```

---

## Paper alignment map (updated)

| Paper section | Code location | Status |
| --- | --- | --- |
| 2.1 DART formulation | `lib/dart.ts` + `lib/spacedRepetition.ts::calculateNextReviewDart` | done |
| 2.2 CARTS state encoder f_ψ | `python-api/train_carts_ppo.py::TransformerEncoder` | scaffold |
| 2.2 PPO policy π_θ | `train_carts_ppo.py::Actor` + `ppo_update` | scaffold |
| 2.2 Reward (α·r + β·CtxTransfer − γ·RT) | `ReviewLog` fields + trainer inputs | data ready |
| 2.3 Baseline SM-2 | `lib/spacedRepetition.ts` | done |
| 2.3 Baseline HLR | `lib/baselines/hlr.ts` | done |
| 2.3 Baseline KARL | `lib/baselines/karl.ts` | done |
| 2.3 Baseline LECTOR | `lib/baselines/lector.ts` | done |
| 2.4 Randomised assignment | `lib/experimentAssignment.ts` + `/api/experiment/assign` | done |
| 2.5 LLM-as-a-Judge | `lib/contextTransferJudge.ts` + `/api/context-transfer/judge` | done |
| 3.4 RQ3 time series | `ReviewLog.judge.*` fields | logged |
| 3.5 Component ablation | `SchedulerRegistry` toggle per user | done |

---

## Complete file diff (this pass)

New:
```
lib/dartWeights.ts
lib/baselines/hlr.ts
lib/baselines/karl.ts
lib/baselines/lector.ts
lib/baselines/index.ts
lib/contextTransferJudge.ts
lib/retrievalTaskGenerator.ts
lib/experimentAssignment.ts
lib/contextPool.ts
app/api/dart/weights/route.ts
app/api/context-transfer/judge/route.ts
app/api/experiment/assign/route.ts
__tests__/dart.test.ts
__tests__/contextDiversity.test.ts
__tests__/baselines.test.ts
```

Modified:
```
app/api/dart/schedule/route.ts     (uses getDartWeights)
app/api/carts/schedule/route.ts    (auto pool + task generator)
```

---

## Task 22 — Frontend: DART/CARTS Lab page (`app/dashboard-new/dart-lab/page.tsx`)

Single-page React tester so all the new endpoints have a visible surface. Nothing was reachable from the UI before this; that's why "chưa thấy sự thay đổi ntn ở giao diện frontend" was correct.

What the page does, section by section:
1. **DART Weights card** — hits `GET /api/dart/weights` on mount, shows α, θ, source path. A `Reload` button posts to the same route to invalidate the on-disk cache after `train_dart.py` writes a new file.
2. **Half-life vs difficulty bar chart** — client-side computes h(d) for d∈{0..3} using the current weights (`h = 2^(θ⊤x)·exp(α·φ(d))`), draws a horizontal-bar visualisation. This is the paper's Sec 2.1 formula rendered live.
3. **Try a schedule** — form with `vocabularyId`, `userId`, `quality`, `d_prev`. Two buttons:
   - **Run DART** → `POST /api/dart/schedule`, prints `halfLife / interval / nextRetrievalType / predictedRecall`.
   - **Run CARTS** → `POST /api/carts/schedule` with `contextPool: "auto"`, prints scheduler output plus the generated LLM task (prompt + options + expected answer).
4. **LLM-as-a-Judge card** — free-text `word` + `learner sentence`, `POST /api/context-transfer/judge`, renders the four 0-10 scores as tiles and shows the composite + rationale.
5. **Experiment assignment card** — hits `GET /api/experiment/assign` and shows the deterministic condition ∈ {sm2, hlr, karl, lector, dart, carts}.

```tsx
// app/dashboard-new/dart-lab/page.tsx (excerpts)
async function runDartSchedule() {
  const r = await fetchJson<ScheduleResp>("/api/dart/schedule", {
    method: "POST",
    body: JSON.stringify({ vocabularyId, userId, quality, lastRetrievalType: dPrev }),
  });
  setDartSched(r);
}

// half-life bars come from the DART formula itself
const projection = useMemo(() => {
  const { theta, alpha } = weights.weights;
  const PHI = [0, 0.33, 0.66, 1.0];
  const h0  = Math.pow(2, theta.reduce((s, t, i) => s + t * demoX[i], 0));
  return PHI.map((phi, d) => ({ d, phi, h: h0 * Math.exp(alpha * phi) }));
}, [weights]);
```

---

## Task 23 — Sidebar nav (`components/DashboardLayout.tsx`)

New entry with the `Brain` lucide icon, sitting right after "Ablation Study":

```ts
{ href: "/dashboard-new/dart-lab", label: "DART/CARTS Lab", icon: Brain },
```

That's the only path change to `DashboardLayout.tsx`; every existing route keeps working.

---

## Task 24 — Smoke-test scripts (`scripts/check-dart-carts.{sh,ps1}`)

One-shot verification for both shells. Both scripts hit the same endpoints in order:
`/api/dart/weights` (GET+POST) → `/api/experiment/assign` (GET+POST) → `/api/dart/schedule` → `/api/carts/schedule` → `/api/context-transfer/judge`.

```bash
# bash
BASE=http://localhost:3000 VOCAB=65f... USER=alice bash scripts/check-dart-carts.sh
```

```powershell
# PowerShell
$env:BASE = "http://localhost:3000"; $env:VOCAB = "65f..."; $env:USER_ID = "alice"
./scripts/check-dart-carts.ps1
```

Both scripts exit with code 1 if any endpoint returns `success != true`, so they slot straight into CI later. Schedule tests are auto-skipped when `VOCAB` is unset — the other endpoints still run.

---

## Where to click after `npm run dev`

1. Log in → dashboard sidebar → **"DART/CARTS Lab"**.
2. Paste a vocabulary `_id` from Mongo (any doc in the `vocabularies` collection).
3. Hit **Run DART** — you should see a half-life and a `nextRetrievalType`.
4. Hit **Run CARTS** — same interval, plus a generated MCQ / cloze / paraphrase from the LLM.
5. Type any sentence in the Judge card, submit; the four rubric scores appear.
6. Click **Assign** — the deterministic condition for the current `userId` is displayed.

If any of these are blank, run `bash scripts/check-dart-carts.sh` to isolate which endpoint failed.

---

## How to test locally

```bash
# 1. Types
npx tsc --noEmit

# 2. Unit tests
npx jest __tests__/dart.test.ts __tests__/contextDiversity.test.ts __tests__/baselines.test.ts

# 3. Endpoints
curl -X POST http://localhost:3000/api/dart/schedule \
  -H 'content-type: application/json' \
  -d '{"vocabularyId":"...","quality":4}'

curl -X POST http://localhost:3000/api/carts/schedule \
  -H 'content-type: application/json' \
  -d '{"vocabularyId":"...","contextPool":"auto"}'

curl -X POST http://localhost:3000/api/context-transfer/judge \
  -H 'content-type: application/json' \
  -d '{"word":"resilient","learnerSentence":"The bridge is resilient to floods.","targetContext":"engineering"}'

curl "http://localhost:3000/api/experiment/assign?userId=alice&stratum=B1"

# 4. Weight reload after retraining
curl -X POST http://localhost:3000/api/dart/weights

# 5. Offline DART training
cd python-api && MONGO_URI=... python train_dart.py --epochs 100 --out dart_weights.json

# 6. PPO scaffold smoke test
cd python-api && python train_carts_ppo.py --epochs 1
```
