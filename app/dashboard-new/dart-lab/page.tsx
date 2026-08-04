"use client";

// DART / CARTS Lab — interactive UI for the schedulers added in this iteration.
// Route: /dashboard-new/dart-lab
// Purpose: let a human eyeball every new endpoint without curl.

import { useEffect, useMemo, useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import {
  Brain, Activity, Sparkles, FlaskConical, Beaker,
  RefreshCw, Send, Loader2, CheckCircle2, XCircle,
} from "lucide-react";

type RetrievalType = 0 | 1 | 2 | 3;
const RETRIEVAL_LABELS = ["Recognition MCQ", "Cloze completion", "Constrained gen", "Open paraphrase"];

interface WeightsResp {
  success: boolean;
  weights: { theta: number[]; alpha: number; featureNames?: string[]; thresholds?: any };
  meta: { source: string | null; mtimeMs: number | null; trained: boolean };
}

interface ScheduleResp {
  success: boolean;
  schedule?: {
    interval?: number;
    intervalDays?: number;
    halfLife: number;
    nextRetrievalType: RetrievalType;
    predictedRecall?: number;
    contextId?: string;
    contextScore?: number;
    retrievalLabel?: string;
  };
  task?: any;
}

function Card({ title, icon: Icon, children }: any) {
  return (
    <section className="rounded-2xl border bg-white/70 dark:bg-neutral-900/60 p-5 shadow-sm">
      <div className="flex items-center gap-2 mb-3">
        <Icon size={18} className="text-indigo-600" />
        <h2 className="font-semibold text-sm tracking-wide uppercase text-neutral-700 dark:text-neutral-200">{title}</h2>
      </div>
      {children}
    </section>
  );
}

function Pill({ ok, label }: { ok: boolean; label: string }) {
  return (
    <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full border
      ${ok ? "border-emerald-300 text-emerald-700 bg-emerald-50"
           : "border-amber-300 text-amber-700 bg-amber-50"}`}>
      {ok ? <CheckCircle2 size={12} /> : <XCircle size={12} />} {label}
    </span>
  );
}

export default function DartLabPage() {
  // --- state ------------------------------------------------------------------
  const [weights, setWeights] = useState<WeightsResp | null>(null);
  const [weightsLoading, setWeightsLoading] = useState(false);
  const [vocabularyId, setVocabularyId] = useState("");
  const [userId, setUserId] = useState("demo-user");
  const [quality, setQuality] = useState(4);
  const [dPrev, setDPrev] = useState<RetrievalType>(0);
  const [dartSched, setDartSched] = useState<ScheduleResp | null>(null);
  const [cartsSched, setCartsSched] = useState<ScheduleResp | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [word, setWord] = useState("resilient");
  const [learnerSentence, setLearnerSentence] = useState("The bridge is resilient to floods.");
  const [judgeScores, setJudgeScores] = useState<any>(null);
  const [assignment, setAssignment] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  // --- helpers ----------------------------------------------------------------
  async function fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
    const r = await fetch(url, { ...init, headers: { "content-type": "application/json", ...(init?.headers || {}) } });
    if (!r.ok) throw new Error(`${url} → HTTP ${r.status}`);
    return r.json() as Promise<T>;
  }

  async function loadWeights() {
    setWeightsLoading(true);
    setError(null);
    try {
      const r = await fetchJson<WeightsResp>("/api/dart/weights");
      setWeights(r);
    } catch (e: any) { setError(e.message); }
    finally { setWeightsLoading(false); }
  }

  async function reloadWeights() {
    setWeightsLoading(true);
    setError(null);
    try {
      const r = await fetchJson<WeightsResp>("/api/dart/weights", { method: "POST" });
      setWeights(r);
    } catch (e: any) { setError(e.message); }
    finally { setWeightsLoading(false); }
  }

  async function runDartSchedule() {
    if (!vocabularyId) return setError("Enter a vocabularyId first");
    setBusy("dart"); setError(null);
    try {
      const r = await fetchJson<ScheduleResp>("/api/dart/schedule", {
        method: "POST",
        body: JSON.stringify({ vocabularyId, userId, quality, lastRetrievalType: dPrev }),
      });
      setDartSched(r);
    } catch (e: any) { setError(e.message); }
    finally { setBusy(null); }
  }

  async function runCartsSchedule() {
    if (!vocabularyId) return setError("Enter a vocabularyId first");
    setBusy("carts"); setError(null);
    try {
      const r = await fetchJson<ScheduleResp>("/api/carts/schedule", {
        method: "POST",
        body: JSON.stringify({ vocabularyId, userId, contextPool: "auto" }),
      });
      setCartsSched(r);
    } catch (e: any) { setError(e.message); }
    finally { setBusy(null); }
  }

  async function runJudge() {
    setBusy("judge"); setError(null);
    try {
      const r = await fetchJson<any>("/api/context-transfer/judge", {
        method: "POST",
        body: JSON.stringify({ word, learnerSentence, userId }),
      });
      setJudgeScores(r);
    } catch (e: any) { setError(e.message); }
    finally { setBusy(null); }
  }

  async function runAssign() {
    setBusy("assign"); setError(null);
    try {
      const r = await fetchJson<any>(`/api/experiment/assign?userId=${encodeURIComponent(userId)}`);
      setAssignment(r);
    } catch (e: any) { setError(e.message); }
    finally { setBusy(null); }
  }

  useEffect(() => { loadWeights(); }, []);

  // --- Half-life projection (client-side visualisation of the DART formula) ---
  const projection = useMemo(() => {
    if (!weights?.weights) return [];
    const { theta, alpha } = weights.weights;
    const PHI = [0, 0.33, 0.66, 1.0];
    const x = [1, 0.4, 0.5, 0.6, 0.3]; // demo feature vector
    const dot = theta.reduce((s, t, i) => s + t * (x[i] ?? 0), 0);
    const h0 = Math.pow(2, dot);
    return PHI.map((phi, d) => ({ d, phi, h: h0 * Math.exp(alpha * phi) }));
  }, [weights]);

  const maxH = Math.max(0.001, ...projection.map(p => p.h));

  // --- render -----------------------------------------------------------------
  return (
    <DashboardLayout>
      <div className="max-w-6xl mx-auto p-6 space-y-6">
        <header className="flex items-center gap-3">
          <div className="rounded-xl bg-indigo-600/10 p-3"><FlaskConical className="text-indigo-600" /></div>
          <div>
            <h1 className="text-2xl font-bold">DART / CARTS Lab</h1>
            <p className="text-sm text-neutral-500">
              Interactive tester for the new spaced-repetition endpoints — Algorithms 1–4 from <code>x.pdf</code>.
            </p>
          </div>
        </header>

        {error && (
          <div className="rounded-xl border border-red-300 bg-red-50 text-red-800 text-sm p-3">{error}</div>
        )}

        <div className="grid md:grid-cols-2 gap-4">
          {/* ---------- WEIGHTS ---------- */}
          <Card title="DART Weights" icon={Brain}>
            <div className="flex items-center gap-2 mb-3">
              <Pill ok={!!weights?.meta.trained} label={weights?.meta.trained ? "Trained on disk" : "Using defaults"} />
              <button onClick={reloadWeights}
                className="ml-auto text-xs inline-flex items-center gap-1 px-2 py-1 rounded-md border hover:bg-neutral-50">
                <RefreshCw size={12} /> Reload
              </button>
            </div>
            {weightsLoading ? <Loader2 className="animate-spin" size={16} /> : (
              <div className="text-xs font-mono grid grid-cols-2 gap-x-4 gap-y-1">
                <span className="text-neutral-500">α</span><span>{weights?.weights.alpha.toFixed(4)}</span>
                <span className="text-neutral-500">θ</span>
                <span className="truncate" title={weights?.weights.theta.join(", ")}>
                  [{weights?.weights.theta.map(v => v.toFixed(2)).join(", ")}]
                </span>
                <span className="text-neutral-500">source</span>
                <span className="truncate">{weights?.meta.source ?? "in-memory defaults"}</span>
              </div>
            )}
          </Card>

          {/* ---------- HALF-LIFE PROJECTION ---------- */}
          <Card title="Half-life vs retrieval difficulty" icon={Activity}>
            <div className="space-y-2">
              {projection.map(({ d, h }) => (
                <div key={d} className="flex items-center gap-2">
                  <span className="w-32 text-xs text-neutral-600">d={d} · {RETRIEVAL_LABELS[d]}</span>
                  <div className="flex-1 h-2 rounded bg-neutral-100 overflow-hidden">
                    <div className="h-full bg-indigo-500" style={{ width: `${(h / maxH) * 100}%` }} />
                  </div>
                  <span className="w-14 text-xs font-mono text-right">{h.toFixed(2)}d</span>
                </div>
              ))}
            </div>
            <p className="text-[11px] text-neutral-500 mt-3">
              h = 2<sup>θ⊤x</sup> · exp(α · φ(d)) — Alg 2 line 2 in <code>x.pdf</code>. x is a demo feature vector.
            </p>
          </Card>
        </div>

        {/* ---------- INPUTS ---------- */}
        <Card title="Try a schedule" icon={Sparkles}>
          <div className="grid md:grid-cols-4 gap-3 text-sm">
            <label className="col-span-2">
              <span className="text-xs text-neutral-500">vocabularyId (MongoDB _id)</span>
              <input value={vocabularyId} onChange={e => setVocabularyId(e.target.value)}
                     placeholder="65f2a3..." className="w-full border rounded-md px-2 py-1.5 mt-1 font-mono text-xs" />
            </label>
            <label>
              <span className="text-xs text-neutral-500">userId</span>
              <input value={userId} onChange={e => setUserId(e.target.value)}
                     className="w-full border rounded-md px-2 py-1.5 mt-1 font-mono text-xs" />
            </label>
            <label>
              <span className="text-xs text-neutral-500">quality (0-5)</span>
              <input type="number" min={0} max={5} value={quality}
                     onChange={e => setQuality(Number(e.target.value))}
                     className="w-full border rounded-md px-2 py-1.5 mt-1 font-mono text-xs" />
            </label>
            <label>
              <span className="text-xs text-neutral-500">last retrieval type (d_prev)</span>
              <select value={dPrev} onChange={e => setDPrev(Number(e.target.value) as RetrievalType)}
                      className="w-full border rounded-md px-2 py-1.5 mt-1 text-xs">
                {RETRIEVAL_LABELS.map((l, i) => <option key={i} value={i}>{i} · {l}</option>)}
              </select>
            </label>
          </div>
          <div className="flex gap-2 mt-4">
            <button onClick={runDartSchedule} disabled={busy === "dart"}
              className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm px-3 py-1.5 rounded-md disabled:opacity-50">
              {busy === "dart" ? <Loader2 className="animate-spin" size={14} /> : <Send size={14} />}
              Run DART
            </button>
            <button onClick={runCartsSchedule} disabled={busy === "carts"}
              className="inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm px-3 py-1.5 rounded-md disabled:opacity-50">
              {busy === "carts" ? <Loader2 className="animate-spin" size={14} /> : <Sparkles size={14} />}
              Run CARTS (auto pool)
            </button>
          </div>
        </Card>

        <div className="grid md:grid-cols-2 gap-4">
          {/* ---------- DART RESULT ---------- */}
          <Card title="DART schedule result" icon={Brain}>
            {dartSched?.schedule ? (
              <div className="text-sm space-y-1 font-mono">
                <div>halfLife: <b>{dartSched.schedule.halfLife.toFixed(3)} d</b></div>
                <div>interval: <b>{(dartSched.schedule.interval ?? dartSched.schedule.intervalDays)?.toFixed?.(2) ?? String(dartSched.schedule.interval ?? dartSched.schedule.intervalDays)} d</b></div>
                <div>next d: <b>{dartSched.schedule.nextRetrievalType} · {RETRIEVAL_LABELS[dartSched.schedule.nextRetrievalType]}</b></div>
                <div>predicted recall: <b>{dartSched.schedule.predictedRecall?.toFixed(4)}</b></div>
              </div>
            ) : <p className="text-xs text-neutral-500">No run yet.</p>}
          </Card>

          {/* ---------- CARTS RESULT ---------- */}
          <Card title="CARTS schedule + task" icon={Beaker}>
            {cartsSched?.schedule ? (
              <div className="text-sm space-y-1">
                <div className="font-mono text-xs">
                  h={cartsSched.schedule.halfLife.toFixed(2)}d · interval={cartsSched.schedule.intervalDays}d ·
                  d={cartsSched.schedule.nextRetrievalType} ({cartsSched.schedule.retrievalLabel})
                </div>
                <div className="font-mono text-xs">context: {cartsSched.schedule.contextId} · novelty={cartsSched.schedule.contextScore?.toFixed(3)}</div>
                {cartsSched.task && (
                  <div className="mt-2 border-t pt-2">
                    <div className="text-xs text-neutral-500">Generated task:</div>
                    <div className="text-sm mt-1">{cartsSched.task.prompt || "(no prompt)"}</div>
                    {cartsSched.task.options && (
                      <ul className="mt-1 text-xs list-disc list-inside">
                        {cartsSched.task.options.map((o: string, i: number) => <li key={i}>{o}</li>)}
                      </ul>
                    )}
                    <div className="text-[11px] text-neutral-500 mt-1">expected: {cartsSched.task.expectedAnswer ?? "—"}</div>
                  </div>
                )}
              </div>
            ) : <p className="text-xs text-neutral-500">No run yet.</p>}
          </Card>
        </div>

        {/* ---------- JUDGE ---------- */}
        <Card title="LLM-as-a-Judge (context transfer)" icon={Sparkles}>
          <div className="grid md:grid-cols-2 gap-3 text-sm">
            <label>
              <span className="text-xs text-neutral-500">target word</span>
              <input value={word} onChange={e => setWord(e.target.value)}
                     className="w-full border rounded-md px-2 py-1.5 mt-1" />
            </label>
            <label>
              <span className="text-xs text-neutral-500">learner sentence</span>
              <input value={learnerSentence} onChange={e => setLearnerSentence(e.target.value)}
                     className="w-full border rounded-md px-2 py-1.5 mt-1" />
            </label>
          </div>
          <button onClick={runJudge} disabled={busy === "judge"}
            className="mt-3 inline-flex items-center gap-2 bg-amber-600 hover:bg-amber-700 text-white text-sm px-3 py-1.5 rounded-md disabled:opacity-50">
            {busy === "judge" ? <Loader2 className="animate-spin" size={14} /> : <Send size={14} />}
            Judge
          </button>
          {judgeScores?.scores && (
            <div className="mt-4 grid grid-cols-4 gap-2 text-center text-sm">
              {(["accuracy","fluency","appropriateness","creativity"] as const).map(k => (
                <div key={k} className="rounded-lg border p-2">
                  <div className="text-[10px] uppercase text-neutral-500">{k}</div>
                  <div className="text-xl font-semibold">{judgeScores.scores[k]}/10</div>
                </div>
              ))}
              <div className="col-span-4 text-xs text-neutral-600 mt-1">
                composite = <b>{judgeScores.scores.composite?.toFixed(2)}</b>
                {judgeScores.scores.rationale && <span className="ml-2 italic">— {judgeScores.scores.rationale}</span>}
              </div>
            </div>
          )}
        </Card>

        {/* ---------- EXPERIMENT ASSIGNMENT ---------- */}
        <Card title="Experiment condition (paper Sec 2.4)" icon={FlaskConical}>
          <button onClick={runAssign} disabled={busy === "assign"}
            className="inline-flex items-center gap-2 bg-neutral-800 hover:bg-black text-white text-sm px-3 py-1.5 rounded-md disabled:opacity-50">
            {busy === "assign" ? <Loader2 className="animate-spin" size={14} /> : <Send size={14} />}
            Assign for user "{userId}"
          </button>
          {assignment?.assignment && (
            <div className="mt-3 text-sm font-mono">
              condition = <b>{assignment.assignment.condition}</b>
              {assignment.assignment.stratum && <> · stratum={assignment.assignment.stratum}</>}
              <div className="text-[11px] text-neutral-500 mt-1">Deterministic (FNV-1a on userId).</div>
            </div>
          )}
        </Card>

        <p className="text-[11px] text-neutral-500">
          See <code>IMPLEMENTATION_LOG.md</code> for the full paper-to-code mapping.
        </p>
      </div>
    </DashboardLayout>
  );
}
