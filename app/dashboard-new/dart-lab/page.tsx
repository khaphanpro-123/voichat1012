"use client";

/**
 * DART / CARTS Lab — User-facing redesign (2026-08-09).
 *
 * Trước redesign: trang này viết theo lối dev-tool — jargon dày đặc, chữ 11px,
 * layout dense, không giải thích kết quả. User không biết phải làm gì.
 *
 * Sau redesign:
 *   1. Hero rõ ràng — "cái gì, để làm gì, ai dùng".
 *   2. Tab-based — 4 tab thay vì đổ hết ra một trang.
 *   3. Preset "Ví dụ có sẵn" để chạy được trong 1 click, không cần nhớ ID.
 *   4. Chữ ≥ 14px, spacing thoáng, không có text-[11px].
 *   5. Mỗi trường có helper text tiếng Việt, không chỉ tên biến.
 *   6. Kết quả có giải thích: "3.5 ngày = lúc bạn nhớ ~50%".
 *   7. Jargon (θ, α, LRT, φ) chỉ hiện khi bật "Chế độ chuyên gia".
 */

import { useEffect, useMemo, useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import {
  Brain, Activity, Sparkles, FlaskConical, Beaker,
  RefreshCw, Send, Loader2, CheckCircle2, XCircle,
  Info, PlayCircle, HelpCircle, ChevronRight, BookOpen,
} from "lucide-react";

type RetrievalType = 0 | 1 | 2 | 3;

const RETRIEVAL: Array<{ label: string; vi: string; hint: string }> = [
  { label: "Recognition MCQ",   vi: "Trắc nghiệm (nhận diện)",       hint: "Dễ nhất — chọn 1 trong 4 định nghĩa" },
  { label: "Cloze completion",  vi: "Điền chỗ trống",                hint: "Trung bình — điền từ vào câu có gợi ý" },
  { label: "Constrained gen",   vi: "Đặt câu có ràng buộc",          hint: "Khó — tự viết câu dùng từ đó" },
  { label: "Open paraphrase",   vi: "Viết lại đoạn văn",             hint: "Khó nhất — paraphrase giữ nguyên nghĩa" },
];

const PRESETS = [
  {
    name: "Học viên mới",
    desc: "Vừa gặp từ này lần đầu, làm MCQ đúng",
    values: { vocabularyId: "demo-word-001", userId: "learner-new", quality: 4, dPrev: 0 as RetrievalType },
  },
  {
    name: "Học viên thành thạo",
    desc: "Đã ôn nhiều lần, giờ làm được cả paraphrase",
    values: { vocabularyId: "demo-word-042", userId: "learner-advanced", quality: 5, dPrev: 3 as RetrievalType },
  },
  {
    name: "Học viên đang gặp khó",
    desc: "Làm cloze nhưng chỉ đúng một nửa",
    values: { vocabularyId: "demo-word-017", userId: "learner-struggling", quality: 2, dPrev: 1 as RetrievalType },
  },
];

const JUDGE_EXAMPLES = [
  { word: "resilient", sentence: "The bridge is resilient to floods." },
  { word: "contribute", sentence: "She contributed to the community by teaching English." },
  { word: "acknowledge", sentence: "The manager acknowledged the team's hard work." },
];

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

// ─────────────────────────────────────────────────────────────────────────────
// Small UI atoms
// ─────────────────────────────────────────────────────────────────────────────

function Section({ title, subtitle, icon: Icon, children }: any) {
  return (
    <section className="rounded-2xl border border-neutral-200 bg-white dark:bg-neutral-900 dark:border-neutral-800 shadow-sm">
      <div className="flex items-start gap-3 p-6 border-b border-neutral-100 dark:border-neutral-800">
        {Icon && <div className="rounded-xl bg-indigo-50 text-indigo-600 dark:bg-indigo-950 p-2.5"><Icon size={22} /></div>}
        <div>
          <h2 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">{title}</h2>
          {subtitle && <p className="text-sm text-neutral-600 dark:text-neutral-400 mt-0.5">{subtitle}</p>}
        </div>
      </div>
      <div className="p-6">{children}</div>
    </section>
  );
}

function Field({ label, hint, expert, children }: any) {
  return (
    <label className="block">
      <div className="flex items-center gap-1.5 mb-1.5">
        <span className="text-sm font-medium text-neutral-800 dark:text-neutral-200">{label}</span>
        {expert && (
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 uppercase tracking-wide font-semibold">
            Nâng cao
          </span>
        )}
      </div>
      {children}
      {hint && (
        <p className="mt-1.5 text-xs text-neutral-500 leading-relaxed flex items-start gap-1.5">
          <Info size={12} className="mt-0.5 flex-shrink-0" />
          <span>{hint}</span>
        </p>
      )}
    </label>
  );
}

function PrimaryButton({ onClick, disabled, busy, children, color = "indigo" }: any) {
  const colors: Record<string, string> = {
    indigo: "bg-indigo-600 hover:bg-indigo-700",
    emerald: "bg-emerald-600 hover:bg-emerald-700",
    amber: "bg-amber-600 hover:bg-amber-700",
    neutral: "bg-neutral-800 hover:bg-black",
  };
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex items-center gap-2 text-white text-base font-medium px-5 py-2.5 rounded-lg disabled:opacity-40 disabled:cursor-not-allowed shadow-sm transition ${colors[color]}`}
    >
      {busy ? <Loader2 className="animate-spin" size={18} /> : <Send size={18} />}
      {children}
    </button>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main page
// ─────────────────────────────────────────────────────────────────────────────

export default function DartLabPage() {
  // Tab state
  const [tab, setTab] = useState<"overview" | "schedule" | "judge" | "assign">("overview");
  const [expert, setExpert] = useState(false);

  // Weights
  const [weights, setWeights] = useState<WeightsResp | null>(null);
  const [weightsLoading, setWeightsLoading] = useState(false);

  // Schedule form
  const [vocabularyId, setVocabularyId] = useState("");
  const [userId, setUserId] = useState("demo-user");
  const [quality, setQuality] = useState(4);
  const [dPrev, setDPrev] = useState<RetrievalType>(0);
  const [dartSched, setDartSched] = useState<ScheduleResp | null>(null);
  const [cartsSched, setCartsSched] = useState<ScheduleResp | null>(null);

  // Judge
  const [word, setWord] = useState("resilient");
  const [learnerSentence, setLearnerSentence] = useState("The bridge is resilient to floods.");
  const [judgeScores, setJudgeScores] = useState<any>(null);

  // Assign
  const [assignment, setAssignment] = useState<any>(null);

  // Common
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
    const r = await fetch(url, {
      ...init,
      headers: { "content-type": "application/json", ...(init?.headers || {}) },
    });
    if (!r.ok) throw new Error(`${url} → HTTP ${r.status}`);
    return r.json() as Promise<T>;
  }

  async function loadWeights(force = false) {
    setWeightsLoading(true); setError(null);
    try {
      const r = await fetchJson<WeightsResp>("/api/dart/weights", force ? { method: "POST" } : undefined);
      setWeights(r);
    } catch (e: any) { setError(e.message); }
    finally { setWeightsLoading(false); }
  }

  async function runDartSchedule() {
    if (!vocabularyId) return setError("Chưa chọn từ nào — bấm 'Ví dụ có sẵn' hoặc nhập ID từ ở trên");
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
    if (!vocabularyId) return setError("Chưa chọn từ nào");
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

  // Half-life projection using current weights
  const projection = useMemo(() => {
    if (!weights?.weights) return [];
    const { theta, alpha } = weights.weights;
    const PHI = [0, 0.33, 0.66, 1.0];
    const x = [1, 0.4, 0.5, 0.6, 0.3];
    const dot = theta.reduce((s, t, i) => s + t * (x[i] ?? 0), 0);
    const h0 = Math.pow(2, dot);
    return PHI.map((phi, d) => ({ d, phi, h: h0 * Math.exp(alpha * phi) }));
  }, [weights]);
  const maxH = Math.max(0.001, ...projection.map((p) => p.h));

  const tabs: Array<{ id: typeof tab; label: string; icon: any }> = [
    { id: "overview", label: "Tổng quan",       icon: BookOpen },
    { id: "schedule", label: "Thử lịch học",    icon: Sparkles },
    { id: "judge",    label: "Chấm câu",        icon: Beaker },
    { id: "assign",   label: "Chia nhóm",       icon: FlaskConical },
  ];

  return (
    <DashboardLayout>
      <div className="max-w-5xl mx-auto p-6 space-y-6">
        {/* ── Hero ────────────────────────────────────────────────────── */}
        <header className="rounded-2xl bg-gradient-to-br from-indigo-50 to-white dark:from-indigo-950 dark:to-neutral-900 border border-indigo-100 dark:border-indigo-900 p-6">
          <div className="flex items-start gap-4">
            <div className="rounded-2xl bg-white dark:bg-neutral-900 p-3 shadow-sm border border-indigo-100">
              <FlaskConical className="text-indigo-600" size={28} />
            </div>
            <div className="flex-1">
              <h1 className="text-2xl font-bold text-neutral-900 dark:text-neutral-100">
                Phòng thử DART / CARTS
              </h1>
              <p className="text-base text-neutral-700 dark:text-neutral-300 mt-1 leading-relaxed">
                Đây là nơi <b>thử thuật toán ôn tập</b> mà nhóm đang phát triển cho ứng dụng học từ vựng.
                Bạn nhập một tình huống (học viên nào, học từ nào, làm bài đúng bao nhiêu) → hệ thống trả về
                <b> khi nào nên ôn lại từ đó và bài kế tiếp là dạng gì</b>.
              </p>
              <p className="text-sm text-neutral-600 dark:text-neutral-400 mt-2">
                Không cần sửa gì trong ứng dụng thật — mọi thao tác ở đây chỉ chạy thử. Kết quả không lưu lại nếu bạn không muốn.
              </p>
            </div>
            <label className="flex items-center gap-2 text-sm text-neutral-600 whitespace-nowrap">
              <input type="checkbox" checked={expert} onChange={(e) => setExpert(e.target.checked)}
                     className="w-4 h-4 rounded" />
              Chế độ chuyên gia
            </label>
          </div>
        </header>

        {/* ── Tabs ────────────────────────────────────────────────────── */}
        <nav className="flex gap-1 bg-neutral-100 dark:bg-neutral-800 p-1 rounded-xl">
          {tabs.map(({ id, label, icon: Icon }) => (
            <button key={id} onClick={() => setTab(id)}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg text-sm font-medium transition
                ${tab === id
                  ? "bg-white dark:bg-neutral-900 text-indigo-700 dark:text-indigo-300 shadow-sm"
                  : "text-neutral-600 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-neutral-200"}`}>
              <Icon size={16} /> {label}
            </button>
          ))}
        </nav>

        {error && (
          <div className="rounded-xl border border-red-200 bg-red-50 text-red-800 p-4 flex gap-3">
            <XCircle size={20} className="flex-shrink-0" />
            <div>
              <div className="font-medium">Có lỗi xảy ra</div>
              <div className="text-sm mt-0.5">{error}</div>
            </div>
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════════════
             TAB 1 — OVERVIEW
           ═══════════════════════════════════════════════════════════════ */}
        {tab === "overview" && (
          <div className="space-y-6">
            <Section title="Thuật toán này là gì?" icon={Brain}>
              <div className="prose prose-sm dark:prose-invert max-w-none text-base leading-relaxed">
                <p>
                  Hầu hết ứng dụng học từ vựng (Anki, Quizlet, Duolingo) quyết định "khi nào ôn từ này lần tới"
                  chỉ dựa vào <b>thời gian đã trôi qua</b> và <b>bạn nhớ hay quên</b>. Chúng bỏ qua một tín hiệu quan trọng:
                  <b> bài retrieval bạn vừa làm khó hay dễ</b>.
                </p>
                <p>
                  Chọn 1 trong 4 định nghĩa (MCQ) rất khác với tự viết một câu dùng từ đó. Nếu bạn vừa vượt qua
                  bài <i>khó</i>, trí nhớ chắc hơn — có thể giãn khoảng ôn dài hơn. Ngược lại, nếu bạn vừa qua bài
                  <i>dễ</i>, nên ôn sớm hơn để bù.
                </p>
                <p>
                  <b>DART</b> mở rộng thuật toán HLR (Half-life Regression) bằng đúng một tham số này. <b>CARTS</b>
                  thêm bước chọn ngữ cảnh phù hợp cho bài kế. Mục đích của phòng thử này: cho bạn xem
                  <b> quyết định của thuật toán trong từng tình huống cụ thể</b>, trước khi triển khai cho học viên thật.
                </p>
              </div>
            </Section>

            <Section title="4 dạng bài retrieval" icon={Activity}>
              <div className="grid md:grid-cols-2 gap-3">
                {RETRIEVAL.map((r, i) => (
                  <div key={i} className="rounded-xl border border-neutral-200 dark:border-neutral-800 p-4">
                    <div className="flex items-baseline gap-2">
                      <span className="text-xs font-mono bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded">
                        d={i}
                      </span>
                      <span className="font-semibold">{r.vi}</span>
                    </div>
                    <p className="text-sm text-neutral-600 mt-1">{r.hint}</p>
                  </div>
                ))}
              </div>
            </Section>

            <Section title="Thời gian đến lần ôn tiếp — theo độ khó bài vừa làm" icon={Activity}
                     subtitle="Đây là dự đoán trực quan với vector đặc trưng demo. Cột càng dài = ôn càng muộn.">
              {weightsLoading ? (
                <div className="text-neutral-500 flex items-center gap-2"><Loader2 className="animate-spin" size={16} /> Đang tải…</div>
              ) : (
                <div className="space-y-3">
                  {projection.map(({ d, h }) => (
                    <div key={d}>
                      <div className="flex items-baseline justify-between mb-1">
                        <span className="text-sm font-medium">d={d} · {RETRIEVAL[d].vi}</span>
                        <span className="font-mono text-sm text-indigo-700 font-semibold">{h.toFixed(2)} ngày</span>
                      </div>
                      <div className="h-3 rounded-full bg-neutral-100 dark:bg-neutral-800 overflow-hidden">
                        <div className="h-full bg-gradient-to-r from-indigo-500 to-indigo-600 transition-all"
                             style={{ width: `${(h / maxH) * 100}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
              )}
              {expert && (
                <div className="mt-4 pt-4 border-t border-neutral-100 text-xs font-mono text-neutral-500">
                  h = 2<sup>θ⊤x</sup> · exp(α · φ(d)) · α={weights?.weights.alpha.toFixed(4)}
                  · θ=[{weights?.weights.theta.map((v) => v.toFixed(2)).join(", ")}]
                  · nguồn: {weights?.meta.source ?? "in-memory defaults"}
                  <button onClick={() => loadWeights(true)}
                          className="ml-3 inline-flex items-center gap-1 px-2 py-0.5 rounded border hover:bg-neutral-50">
                    <RefreshCw size={11} /> Reload
                  </button>
                </div>
              )}
            </Section>

            <div className="rounded-xl bg-indigo-50 dark:bg-indigo-950 border border-indigo-200 p-5">
              <div className="flex items-start gap-3">
                <PlayCircle className="text-indigo-600 flex-shrink-0" size={22} />
                <div className="flex-1">
                  <div className="font-semibold text-indigo-900 dark:text-indigo-100">Sẵn sàng thử?</div>
                  <p className="text-sm text-indigo-800 dark:text-indigo-200 mt-1">
                    Chuyển sang tab <b>Thử lịch học</b> — có 3 ví dụ sẵn, bấm 1 nút là chạy được, không cần điền gì.
                  </p>
                  <button onClick={() => setTab("schedule")}
                          className="mt-3 inline-flex items-center gap-1.5 text-sm font-medium text-indigo-700 hover:text-indigo-900">
                    Sang tab Thử lịch học <ChevronRight size={16} />
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════════════
             TAB 2 — SCHEDULE
           ═══════════════════════════════════════════════════════════════ */}
        {tab === "schedule" && (
          <div className="space-y-6">
            <Section title="Bước 1 — Chọn tình huống" icon={PlayCircle}
                     subtitle="Bấm 1 trong 3 ví dụ để điền tự động, hoặc tự điền ở dưới.">
              <div className="grid md:grid-cols-3 gap-3">
                {PRESETS.map((p) => (
                  <button key={p.name} onClick={() => {
                    setVocabularyId(p.values.vocabularyId);
                    setUserId(p.values.userId);
                    setQuality(p.values.quality);
                    setDPrev(p.values.dPrev);
                  }}
                    className="text-left rounded-xl border-2 border-neutral-200 hover:border-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-950 p-4 transition">
                    <div className="font-semibold text-neutral-900 dark:text-neutral-100">{p.name}</div>
                    <div className="text-sm text-neutral-600 dark:text-neutral-400 mt-1">{p.desc}</div>
                  </button>
                ))}
              </div>
            </Section>

            <Section title="Bước 2 — Xem hoặc chỉnh chi tiết" icon={Sparkles}>
              <div className="grid md:grid-cols-2 gap-5">
                <Field label="Từ vựng cần lên lịch"
                       hint="Nhập id của từ (nếu có DB) hoặc dùng id demo. Ví dụ có sẵn đã điền hộ bạn.">
                  <input value={vocabularyId} onChange={(e) => setVocabularyId(e.target.value)}
                         placeholder="Chưa chọn — bấm một Ví dụ ở trên"
                         className="w-full border border-neutral-300 rounded-lg px-3 py-2.5 text-base font-mono" />
                </Field>

                <Field label="Học viên"
                       hint="Tên hoặc mã học viên. Cùng userId → thuật toán ghi nhớ lịch sử của người đó.">
                  <input value={userId} onChange={(e) => setUserId(e.target.value)}
                         className="w-full border border-neutral-300 rounded-lg px-3 py-2.5 text-base font-mono" />
                </Field>

                <Field label="Học viên làm bài vừa rồi được mấy điểm?"
                       hint="0 = sai hoàn toàn, 5 = đúng và trả lời rất nhanh. Thuật toán dùng để tính độ tự tin.">
                  <div className="flex gap-1.5">
                    {[0, 1, 2, 3, 4, 5].map((q) => (
                      <button key={q} onClick={() => setQuality(q)}
                        className={`flex-1 py-2.5 rounded-lg border-2 font-semibold transition text-base
                          ${quality === q
                            ? "border-indigo-500 bg-indigo-500 text-white"
                            : "border-neutral-200 bg-white hover:border-indigo-300 dark:bg-neutral-900"}`}>
                        {q}
                      </button>
                    ))}
                  </div>
                </Field>

                <Field label="Bài vừa rồi thuộc dạng nào?"
                       hint="Dạng khó (paraphrase) trả về half-life dài hơn — vì vượt qua bài khó cho thấy trí nhớ chắc.">
                  <select value={dPrev} onChange={(e) => setDPrev(Number(e.target.value) as RetrievalType)}
                          className="w-full border border-neutral-300 rounded-lg px-3 py-2.5 text-base bg-white dark:bg-neutral-900">
                    {RETRIEVAL.map((r, i) => (
                      <option key={i} value={i}>d={i} · {r.vi} — {r.hint}</option>
                    ))}
                  </select>
                </Field>
              </div>
            </Section>

            <Section title="Bước 3 — Chạy thử" icon={Send}
                     subtitle="DART chỉ trả lịch; CARTS trả lịch + gợi ý luôn bài kế (có context).">
              <div className="flex flex-wrap gap-3">
                <PrimaryButton onClick={runDartSchedule} busy={busy === "dart"} disabled={busy !== null} color="indigo">
                  Chạy DART (chỉ lịch)
                </PrimaryButton>
                <PrimaryButton onClick={runCartsSchedule} busy={busy === "carts"} disabled={busy !== null} color="emerald">
                  Chạy CARTS (lịch + bài kế)
                </PrimaryButton>
              </div>

              <div className="grid md:grid-cols-2 gap-4 mt-6">
                <div className="rounded-xl border border-neutral-200 dark:border-neutral-800 p-5">
                  <div className="flex items-center gap-2 mb-3">
                    <Brain size={16} className="text-indigo-600" />
                    <span className="font-semibold">Kết quả DART</span>
                  </div>
                  {dartSched?.schedule ? (
                    <div className="space-y-3">
                      <div>
                        <div className="text-xs uppercase tracking-wide text-neutral-500">Ôn lại sau</div>
                        <div className="text-3xl font-bold text-indigo-700">
                          {(dartSched.schedule.interval ?? dartSched.schedule.intervalDays)?.toFixed?.(1)} ngày
                        </div>
                        <p className="text-xs text-neutral-500 mt-1">
                          Sau chừng đó ngày bạn sẽ nhớ khoảng 50% — thời điểm tối ưu để ôn lại.
                        </p>
                      </div>
                      <div>
                        <div className="text-xs uppercase tracking-wide text-neutral-500">Dạng bài kế</div>
                        <div className="text-lg font-semibold">
                          {RETRIEVAL[dartSched.schedule.nextRetrievalType].vi}
                        </div>
                      </div>
                      {expert && (
                        <div className="pt-2 border-t text-xs font-mono text-neutral-500 space-y-0.5">
                          <div>halfLife = {dartSched.schedule.halfLife.toFixed(3)} d</div>
                          <div>predictedRecall = {dartSched.schedule.predictedRecall?.toFixed(4)}</div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <p className="text-sm text-neutral-500">Chưa chạy. Bấm nút <b>Chạy DART</b> ở trên.</p>
                  )}
                </div>

                <div className="rounded-xl border border-neutral-200 dark:border-neutral-800 p-5">
                  <div className="flex items-center gap-2 mb-3">
                    <Beaker size={16} className="text-emerald-600" />
                    <span className="font-semibold">Kết quả CARTS</span>
                  </div>
                  {cartsSched?.schedule ? (
                    <div className="space-y-3">
                      <div>
                        <div className="text-xs uppercase tracking-wide text-neutral-500">Ôn lại sau</div>
                        <div className="text-3xl font-bold text-emerald-700">
                          {cartsSched.schedule.intervalDays?.toFixed(1)} ngày
                        </div>
                      </div>
                      <div>
                        <div className="text-xs uppercase tracking-wide text-neutral-500">Dạng bài kế</div>
                        <div className="text-lg font-semibold">
                          {cartsSched.schedule.retrievalLabel || RETRIEVAL[cartsSched.schedule.nextRetrievalType]?.vi}
                        </div>
                      </div>
                      {cartsSched.task?.prompt && (
                        <div className="rounded-lg bg-neutral-50 dark:bg-neutral-800 p-3">
                          <div className="text-xs uppercase tracking-wide text-neutral-500 mb-1">Đề bài kế</div>
                          <div className="text-sm">{cartsSched.task.prompt}</div>
                          {cartsSched.task.options && (
                            <ul className="mt-2 text-sm space-y-0.5">
                              {cartsSched.task.options.map((o: string, i: number) => (
                                <li key={i} className="pl-2">• {o}</li>
                              ))}
                            </ul>
                          )}
                        </div>
                      )}
                      {expert && (
                        <div className="pt-2 border-t text-xs font-mono text-neutral-500">
                          context={cartsSched.schedule.contextId} · novelty={cartsSched.schedule.contextScore?.toFixed(3)}
                        </div>
                      )}
                    </div>
                  ) : (
                    <p className="text-sm text-neutral-500">Chưa chạy. Bấm nút <b>Chạy CARTS</b> ở trên.</p>
                  )}
                </div>
              </div>
            </Section>
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════════════
             TAB 3 — JUDGE
           ═══════════════════════════════════════════════════════════════ */}
        {tab === "judge" && (
          <div className="space-y-6">
            <Section title="Chấm câu do học viên viết" icon={Beaker}
                     subtitle="Cho AI chấm 4 tiêu chí: dùng từ đúng nghĩa, câu ngữ pháp, phù hợp ngữ cảnh, có sáng tạo không.">
              <div className="flex flex-wrap gap-2 mb-5">
                <span className="text-xs text-neutral-500 self-center">Ví dụ nhanh:</span>
                {JUDGE_EXAMPLES.map((ex) => (
                  <button key={ex.word} onClick={() => { setWord(ex.word); setLearnerSentence(ex.sentence); }}
                    className="text-xs px-3 py-1.5 rounded-full border border-neutral-300 hover:bg-neutral-50">
                    {ex.word}
                  </button>
                ))}
              </div>

              <div className="grid md:grid-cols-3 gap-5">
                <Field label="Từ mục tiêu" hint="Từ mà bạn kiểm tra học viên biết dùng.">
                  <input value={word} onChange={(e) => setWord(e.target.value)}
                         className="w-full border border-neutral-300 rounded-lg px-3 py-2.5 text-base" />
                </Field>
                <Field label="Câu học viên viết"
                       hint="Câu chứa từ mục tiêu do học viên tự đặt. AI sẽ chấm 4 tiêu chí."
                >
                  <input value={learnerSentence} onChange={(e) => setLearnerSentence(e.target.value)}
                         className="w-full border border-neutral-300 rounded-lg px-3 py-2.5 text-base" />
                </Field>
                <div className="flex items-end">
                  <PrimaryButton onClick={runJudge} busy={busy === "judge"} disabled={busy !== null} color="amber">
                    Chấm
                  </PrimaryButton>
                </div>
              </div>

              {judgeScores?.scores && (
                <div className="mt-6 space-y-4">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {[
                      { k: "accuracy",         vi: "Dùng đúng nghĩa" },
                      { k: "fluency",          vi: "Ngữ pháp / trôi chảy" },
                      { k: "appropriateness",  vi: "Hợp ngữ cảnh" },
                      { k: "creativity",       vi: "Sáng tạo" },
                    ].map(({ k, vi }) => (
                      <div key={k} className="rounded-xl border border-neutral-200 p-4 text-center">
                        <div className="text-xs text-neutral-500 uppercase tracking-wide">{vi}</div>
                        <div className="text-3xl font-bold text-neutral-900 mt-1">
                          {judgeScores.scores[k]}<span className="text-lg text-neutral-400">/10</span>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="rounded-xl bg-amber-50 border border-amber-200 p-4">
                    <div className="flex items-baseline gap-2 mb-1">
                      <span className="text-sm font-semibold text-amber-900">Điểm tổng:</span>
                      <span className="text-2xl font-bold text-amber-700">{judgeScores.scores.composite?.toFixed(2)}</span>
                      <span className="text-sm text-amber-700">/ 10</span>
                    </div>
                    {judgeScores.scores.rationale && (
                      <p className="text-sm text-amber-900 mt-2 italic leading-relaxed">
                        {judgeScores.scores.rationale}
                      </p>
                    )}
                  </div>
                </div>
              )}
            </Section>
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════════════
             TAB 4 — ASSIGN
           ═══════════════════════════════════════════════════════════════ */}
        {tab === "assign" && (
          <Section title="Chia học viên vào nhóm thí nghiệm" icon={FlaskConical}
                   subtitle="Nghiên cứu có 3 nhóm: DART / HLR / SM-2. Học viên được chia đều, ngẫu nhiên nhưng lặp lại (cùng userId → cùng nhóm).">
            <Field label="Học viên (userId)"
                   hint="Nhập mã học viên. Bấm 'Chia nhóm' để xem học viên này sẽ vào nhóm nào.">
              <input value={userId} onChange={(e) => setUserId(e.target.value)}
                     className="w-full border border-neutral-300 rounded-lg px-3 py-2.5 text-base font-mono max-w-md" />
            </Field>

            <div className="mt-5">
              <PrimaryButton onClick={runAssign} busy={busy === "assign"} disabled={busy !== null} color="neutral">
                Chia nhóm cho "{userId}"
              </PrimaryButton>
            </div>

            {assignment?.assignment && (
              <div className="mt-6 rounded-xl border border-neutral-200 p-5 max-w-md">
                <div className="text-xs uppercase tracking-wide text-neutral-500">Kết quả</div>
                <div className="text-3xl font-bold text-neutral-900 mt-1">
                  Nhóm {assignment.assignment.condition}
                </div>
                {assignment.assignment.stratum && (
                  <div className="text-sm text-neutral-600 mt-2">
                    Stratum (tầng): <b>{assignment.assignment.stratum}</b>
                  </div>
                )}
                <p className="text-xs text-neutral-500 mt-3">
                  Chia nhóm dùng hash FNV-1a trên userId — cùng userId luôn ra cùng nhóm, không phụ thuộc thời điểm gọi.
                </p>
              </div>
            )}
          </Section>
        )}

        <p className="text-xs text-neutral-400 text-center pt-4">
          Tài liệu đầy đủ: xem <code className="bg-neutral-100 dark:bg-neutral-800 px-1.5 py-0.5 rounded">docs/IMPLEMENTATION.md</code>
          {" · "}Bản thảo bài báo: <code className="bg-neutral-100 dark:bg-neutral-800 px-1.5 py-0.5 rounded">research/PAPER_DRAFT_v1.md</code>
        </p>
      </div>
    </DashboardLayout>
  );
}
