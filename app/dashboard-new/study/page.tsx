"use client";

/**
 * Study session runner (Ngày 18 kế hoạch — chưa từng được build đúng).
 *
 * Flow per PLAN_45_DAYS.md Ngày 18:
 *   1. Lấy danh sách từ đến hạn (GET /api/research/words + local due tracking)
 *   2. Với từng từ: gọi /api/dart/schedule → nhận nextRetrievalType (d ∈ 0..3)
 *   3. Render đúng component task (MCQ / cloze / gen / paraphrase)
 *   4. Nộp → POST /api/research/review → nhận trạng thái → sang từ kế tiếp
 *   5. Offline: lưu submission vào IndexedDB, sync khi có mạng
 *
 * Blinding (D-002 / Ngày 19): UI **giống hệt** cho cả 3 nhánh DART / HLR / SM-2.
 * KHÔNG show tên nhánh, KHÔNG show retrievalType name — chỉ render input widget
 * phù hợp. Học viên chỉ thấy "câu hỏi" không thấy jargon.
 *
 * Exit criterion Ngày 18: 20 từ liên tiếp không lỗi, tắt mạng giữa chừng vẫn không
 * mất câu trả lời.
 *
 * D-011 palette (Duolingo) giữ nhất quán với dart-lab landing.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";

type RetrievalType = 0 | 1 | 2 | 3;

const C = {
  green: "#58cc02", greenDark: "#58a700", greenLight: "#d7ffb8",
  yellow: "#ffc800", yellowDark: "#e5a500", yellowLight: "#fff4d6",
  red: "#ff4b4b", redDark: "#ea2b2b", redLight: "#ffdfe0",
  blue: "#1cb0f6", blueDark: "#0a91d3", blueLight: "#ddf4ff",
  purple: "#ce82ff", purpleDark: "#a560e8", purpleLight: "#f4e4ff",
  grayText: "#4b4b4b", grayBorder: "#e5e5e5", grayLight: "#f7f7f7",
};

// ═════════════════════════════════════════════════════════════════════════════
// TYPES
// ═════════════════════════════════════════════════════════════════════════════

interface WordEntry {
  id: string;
  word: string;
  band?: string;      // CEFR band
  defVi?: string;     // Vietnamese gloss (only shown after answer)
}

interface Task {
  vocabularyId: string;
  word: string;
  retrievalType: RetrievalType;
  prompt: string;                 // fully-rendered question
  options?: string[];             // MCQ only
  // Present only in the local preview. Authenticated study tasks never expose
  // an answer key; the review endpoint computes the stored recall outcome.
  expectedAnswer?: string;
  featureVector: number[];
  decisionReceipt?: string;       // issued only by /api/research/schedule
}

interface PendingSubmission {
  clientEventId: string;          // UUIDv4
  sessionId: string;
  decisionReceipt: string;
  vocabularyId: string;
  word: string;
  retrievalType: RetrievalType;
  featureVector: number[];
  taskPrompt: string;
  servedWeightsVersion: string;
  scheduledAt: string;
  servedAt: string;
  elapsedMs: number;
  responseTimeMs: number;
  // Self-rated 0–5 SM-2 quality. This is collected after every answer for all
  // blinded study arms; the server stores it next to the objective recall.
  quality: number;
  answerText: string;             // learner's typed / picked answer
}

// ═════════════════════════════════════════════════════════════════════════════
// IndexedDB helpers — minimal, no library
// ═════════════════════════════════════════════════════════════════════════════

const DB_NAME = "voichat-study";
const STORE = "pending-submissions";

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE, { keyPath: "clientEventId" });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function idbPut(sub: PendingSubmission): Promise<void> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).put(sub);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

async function idbDelete(clientEventId: string): Promise<void> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).delete(clientEventId);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

async function idbAll(): Promise<PendingSubmission[]> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, "readonly");
    const req = tx.objectStore(STORE).getAll();
    req.onsuccess = () => resolve(req.result as PendingSubmission[]);
    req.onerror = () => reject(req.error);
  });
}

// ═════════════════════════════════════════════════════════════════════════════
// UI atoms (Duolingo palette, D-011)
// ═════════════════════════════════════════════════════════════════════════════

function BigButton({ onClick, disabled, children, color = "green", size = "md" }: any) {
  const p = {
    green:  { bg: C.green,  shadow: C.greenDark,  text: "white" },
    yellow: { bg: C.yellow, shadow: C.yellowDark, text: C.grayText },
    red:    { bg: C.red,    shadow: C.redDark,    text: "white" },
    blue:   { bg: C.blue,   shadow: C.blueDark,   text: "white" },
    white:  { bg: "white",  shadow: C.grayBorder, text: C.grayText },
  }[color as string]!;
  const sz = size === "lg" ? "text-lg px-8 py-4" : size === "sm" ? "text-sm px-4 py-2" : "text-base px-6 py-3";
  return (
    <button onClick={onClick} disabled={disabled}
      className={`${sz} font-bold uppercase tracking-wide rounded-2xl transition-all active:translate-y-1 active:shadow-none disabled:opacity-40 disabled:cursor-not-allowed`}
      style={{ background: p.bg, color: p.text, boxShadow: `0 4px 0 ${p.shadow}`, border: `2px solid ${p.shadow}` }}>
      {children}
    </button>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// Task widgets — one per retrievalType. All look similar (blinding D-002).
// ═════════════════════════════════════════════════════════════════════════════

function TaskWidget({ task, onAnswer }: { task: Task; onAnswer: (text: string) => void }) {
  const [text, setText] = useState("");
  const [picked, setPicked] = useState<string | null>(null);

  // MCQ: click a choice → auto-submit
  if (task.retrievalType === 0 && task.options) {
    return (
      <div className="space-y-3">
        {task.options.map((opt, i) => (
          <button key={i} onClick={() => { setPicked(opt); onAnswer(opt); }}
            disabled={picked !== null}
            className="w-full text-left rounded-2xl p-4 transition-all hover:scale-[1.01] disabled:hover:scale-100"
            style={{
              background: picked === opt ? C.blueLight : "white",
              border: `2px solid ${picked === opt ? C.blue : C.grayBorder}`,
              boxShadow: `0 3px 0 ${picked === opt ? C.blueDark : C.grayBorder}`,
            }}>
            <span className="font-mono text-xs mr-3" style={{ color: C.grayText, opacity: 0.5 }}>{String.fromCharCode(65 + i)}.</span>
            <span className="text-base font-medium" style={{ color: C.grayText }}>{opt}</span>
          </button>
        ))}
      </div>
    );
  }

  // Cloze / gen / paraphrase — text input
  const placeholder =
    task.retrievalType === 1 ? "Điền từ vào chỗ trống…" :
    task.retrievalType === 2 ? "Viết 1 câu dùng từ này…" :
    "Viết lại đoạn văn (2-3 câu)…";
  const isLong = task.retrievalType === 3;

  return (
    <div className="space-y-3">
      {isLong ? (
        <textarea value={text} onChange={(e) => setText(e.target.value)} placeholder={placeholder}
          rows={5}
          className="w-full rounded-2xl px-4 py-3 text-base"
          style={{ border: `2px solid ${C.grayBorder}`, background: "white" }} />
      ) : (
        <input value={text} onChange={(e) => setText(e.target.value)} placeholder={placeholder}
          className="w-full rounded-2xl px-4 py-3 text-lg"
          style={{ border: `2px solid ${C.grayBorder}`, background: "white" }} />
      )}
      <div className="text-right">
        <BigButton onClick={() => onAnswer(text)} disabled={!text.trim()} color="green">
          Nộp
        </BigButton>
      </div>
    </div>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// Task fetcher & grader (simplified — real prod would call generateRetrievalTask)
// ═════════════════════════════════════════════════════════════════════════════

// For pilot / dev, we fabricate tasks client-side from the word entry.
// In production this would call /api/retrieval-task/generate which uses the
// cached callAICached (D-013) to keep task content consistent across the arm.
function fabricateTaskFromWord(word: WordEntry, retrievalType: RetrievalType, featureVector: number[]): Task {
  const w = word.word;
  const promptByType: Record<RetrievalType, string> = {
    0: `"${w}" nghĩa là gì?`,
    1: `Điền từ vào chỗ trống: "The idea is ____ to the audience."`,
    2: `Đặt một câu ngắn dùng từ "${w}".`,
    3: `Viết lại đoạn văn ngắn dùng từ "${w}" một cách tự nhiên.`,
  };
  const optionsByType: Record<RetrievalType, string[] | undefined> = {
    0: [word.defVi || "định nghĩa 1", "định nghĩa 2 (nhiễu)", "định nghĩa 3 (nhiễu)", "định nghĩa 4 (nhiễu)"],
    1: undefined, 2: undefined, 3: undefined,
  };
  return {
    vocabularyId: word.id,
    word: w,
    retrievalType,
    prompt: promptByType[retrievalType],
    options: optionsByType[retrievalType],
    expectedAnswer: retrievalType === 0 ? (word.defVi || "định nghĩa 1") : w,
    featureVector,
  };
}

// Very forgiving grader — L2 morphology tolerance à la Nation 2001.
function gradeAnswer(task: Task, answerText: string): 0 | 1 {
  const norm = (s: string) => s.trim().toLowerCase();
  if (task.retrievalType === 0) {
    return norm(answerText) === norm(task.expectedAnswer) ? 1 : 0;
  }
  const answer = norm(answerText);
  const gold = norm(task.expectedAnswer);
  if (task.retrievalType === 1) {
    // Cloze: exact match after normalisation OR edit-distance ≤ 1 for words ≥ 5
    if (answer === gold) return 1;
    if (gold.length >= 5 && levenshtein(answer, gold) <= 1) return 1;
    return 0;
  }
  // Gen / paraphrase: presence of target word = "recall" (proper judging via LLM)
  return answer.includes(gold) ? 1 : 0;
}

function levenshtein(a: string, b: string): number {
  const m = a.length, n = b.length;
  const dp: number[] = new Array(n + 1).fill(0).map((_, j) => j);
  for (let i = 1; i <= m; i++) {
    let prev = dp[0]; dp[0] = i;
    for (let j = 1; j <= n; j++) {
      const tmp = dp[j];
      dp[j] = a[i - 1] === b[j - 1]
        ? prev
        : 1 + Math.min(dp[j - 1], dp[j], prev);
      prev = tmp;
    }
  }
  return dp[n];
}

// ═════════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═════════════════════════════════════════════════════════════════════════════

export default function StudyPage() {
  const [participantToken, setParticipantToken] = useState<string | null>(null);
  const [words, setWords] = useState<WordEntry[]>([]);
  const [wordIdx, setWordIdx] = useState(0);
  const [currentTask, setCurrentTask] = useState<Task | null>(null);
  const [taskStartTs, setTaskStartTs] = useState<number>(0);
  const [scheduledAt, setScheduledAt] = useState<string>("");
  const [feedback, setFeedback] = useState<null | { correct: 0 | 1; expected: string }>(null);
  const [pendingReview, setPendingReview] = useState<PendingSubmission | null>(null);
  const [status, setStatus] = useState<"idle" | "loading" | "ready" | "done">("idle");
  const [error, setError] = useState<string | null>(null);
  const [online, setOnline] = useState(true);
  const [pendingCount, setPendingCount] = useState(0);
  const [sessionId] = useState(() => `sess_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`);
  const submissionsRef = useRef<PendingSubmission[]>([]);

  // ── Online status & IndexedDB restore ──────────────────────────────
  useEffect(() => {
    if (typeof window === "undefined") return;
    const on = () => { setOnline(true); flushPending(); };
    const off = () => setOnline(false);
    setOnline(navigator.onLine);
    window.addEventListener("online", on);
    window.addEventListener("offline", off);
    // Load pending
    idbAll().then((list) => setPendingCount(list.length)).catch(() => {});
    return () => { window.removeEventListener("online", on); window.removeEventListener("offline", off); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Load participant token & word list on mount ────────────────────
  useEffect(() => {
    // Token flow: for pilot dev, read from localStorage; real enrolment writes it.
    const t = typeof window !== "undefined" ? localStorage.getItem("participantToken") : null;
    setParticipantToken(t);
    loadWords(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function loadWords(token: string | null) {
    setStatus("loading"); setError(null);
    try {
      // Dev / demo fallback if no token — synthetic word list of 20 for exit criterion demo
      if (!token) {
        setWords(Array.from({ length: 20 }, (_, i) => ({
          id: `demo-w-${String(i).padStart(3, "0")}`,
          word: DEMO_WORDS[i % DEMO_WORDS.length],
          band: i % 2 === 0 ? "B1" : "B2",
          defVi: DEMO_DEF_VI[i % DEMO_DEF_VI.length],
        })));
        setStatus("ready");
        return;
      }
      const r = await fetch("/api/research/words", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const j = await r.json();
      const list = (j.words ?? []).slice(0, 20);
      setWords(list);
      setStatus(list.length > 0 ? "ready" : "done");
    } catch (e: any) {
      setError(e.message);
      setStatus("idle");
    }
  }

  // ── Fetch next task through the participant-authenticated scheduler ──────
  const fetchNextTask = useCallback(async (word: WordEntry) => {
    setError(null);
    const sched = new Date().toISOString();
    setScheduledAt(sched);
    let featureVector = [1, 0.4, 0.5, 0.5, 0.2, 0.5];
    if (participantToken) {
      if (!online) {
        setError("Cần kết nối để nhận nhiệm vụ học đã được hệ thống cấp.");
        setStatus("idle");
        return;
      }
      try {
        const r = await fetch("/api/research/schedule", {
          method: "POST",
          headers: {
            "content-type": "application/json",
            Authorization: `Bearer ${participantToken}`,
          },
          body: JSON.stringify({ vocabularyId: word.id }),
        });
        const j = await r.json();
        const t = j?.task;
        if (r.status === 409 && j?.code === "not_due") {
          // The server owns due timing. Skip an ineligible SM-2 item rather
          // than fabricating a local task or treating it as a failed review.
          if (wordIdx + 1 >= words.length) setStatus("done");
          else setWordIdx((i) => i + 1);
          return;
        }
        if (!r.ok || !j?.decisionReceipt || !t?.prompt || ![0, 1, 2, 3].includes(t.retrievalType)) {
          throw new Error(j?.message || "Không nhận được nhiệm vụ học hợp lệ.");
        }
        featureVector = Array.isArray(t.featureVector) ? t.featureVector : featureVector;
        setScheduledAt(j.scheduledAt || sched);
        setCurrentTask({
          vocabularyId: t.vocabularyId,
          word: t.word,
          retrievalType: t.retrievalType as RetrievalType,
          prompt: t.prompt,
          options: t.options,
          featureVector,
          decisionReceipt: j.decisionReceipt,
        });
        setTaskStartTs(performance.now());
        setFeedback(null);
        return;
      } catch (error: any) {
        setError(error?.message || "Không thể nhận nhiệm vụ học. Hãy thử lại khi có kết nối.");
        setStatus("idle");
        return;
      }
    }

    // Preview mode never submits research data and is intentionally separate
    // from the authenticated participant flow above.
    setCurrentTask(fabricateTaskFromWord(word, 0, featureVector));
    setTaskStartTs(performance.now());
    setFeedback(null);
  }, [participantToken, online, wordIdx, words.length]);

  // Auto-fetch task when we advance to a new word
  useEffect(() => {
    if (status === "ready" && wordIdx < words.length) {
      fetchNextTask(words[wordIdx]);
    }
  }, [wordIdx, status, words, fetchNextTask]);

  // ── Handle answer submission ──────────────────────────────────────────
  async function handleAnswer(text: string) {
    if (!currentTask) return;
    // Preview mode is deliberately separate and never submits a research row.
    // An authenticated task is scored only by the server after the learner has
    // supplied the self-rating below.
    if (!participantToken && currentTask.expectedAnswer) {
      const recall = gradeAnswer(currentTask, text);
      setFeedback({ correct: recall, expected: currentTask.expectedAnswer });
    }

    const now = Date.now();
    const elapsedMs = performance.now() - taskStartTs;
    // Do not enqueue yet: the study protocol collects a 0–5 self-rating after
    // the objective answer is graded. Keeping this separate prevents a client
    // from silently fabricating a default SM-2 quality.
    const sub = {
      clientEventId: (typeof crypto !== "undefined" && (crypto as any).randomUUID)
        ? (crypto as any).randomUUID()
        : `${now}-${Math.random().toString(36).slice(2)}`,
      sessionId,
      decisionReceipt: currentTask.decisionReceipt ?? "",
      vocabularyId: currentTask.vocabularyId,
      word: currentTask.word,
      retrievalType: currentTask.retrievalType,
      featureVector: currentTask.featureVector,
      taskPrompt: currentTask.prompt,
      scheduledAt,
      servedAt: new Date(taskStartTs).toISOString(),
      elapsedMs: Math.round(elapsedMs),
      responseTimeMs: Math.round(elapsedMs),
      answerText: text,
    };
    setPendingReview(sub as PendingSubmission);
  }

  async function submitRatedReview(quality: number) {
    if (!pendingReview) return;
    const sub: PendingSubmission = { ...pendingReview, quality };
    if (!participantToken) {
      // Preview never reaches IndexedDB or the research endpoint.
      advance();
      return;
    }
    submissionsRef.current.push(sub);

    // Always persist to IndexedDB first — durability before network.
    try { await idbPut(sub); } catch {}
    setPendingCount((n) => n + 1);

    const result = online ? await trySubmit(sub) : null;
    setPendingReview(null);
    if (result && (result.recall === 0 || result.recall === 1) && typeof result.expectedAnswer === "string") {
      setFeedback({ correct: result.recall, expected: result.expectedAnswer });
      return;
    }
    advance();
  }

  async function trySubmit(sub: PendingSubmission): Promise<any | null> {
    try {
      const r = await fetch("/api/research/review", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          Authorization: `Bearer ${participantToken}`,
        },
        body: JSON.stringify(sub),
      });
      if (r.ok) {
        const result = await r.json();
        await idbDelete(sub.clientEventId);
        setPendingCount((n) => Math.max(0, n - 1));
        return result;
      }
    } catch {
      // Stay in IndexedDB, retry later
    }
    return null;
  }

  async function flushPending() {
    if (!participantToken) return;
    const list = await idbAll();
    for (const sub of list) {
      await trySubmit(sub as PendingSubmission);
    }
  }

  function advance() {
    setCurrentTask(null);
    setFeedback(null);
    setPendingReview(null);
    if (wordIdx + 1 >= words.length) {
      setStatus("done");
    } else {
      setWordIdx((i) => i + 1);
    }
  }

  const progressPct = words.length ? ((wordIdx) / words.length) * 100 : 0;

  // ═══════════════════════════════════════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════════════════════════════════════

  return (
    <DashboardLayout>
      <div className="max-w-2xl mx-auto p-6 space-y-5">
        {/* Top bar: progress + online + pending queue */}
        <div className="flex items-center gap-3">
          <div className="flex-1 h-4 rounded-full overflow-hidden"
               style={{ background: C.grayLight, border: `2px solid ${C.grayBorder}` }}>
            <div className="h-full transition-all duration-500"
                 style={{ width: `${progressPct}%`, background: `linear-gradient(90deg, ${C.green}, ${C.greenDark})` }} />
          </div>
          <div className="text-sm font-bold whitespace-nowrap" style={{ color: C.grayText }}>
            {Math.min(wordIdx, words.length)} / {words.length}
          </div>
          <div className="text-xs px-2 py-1 rounded-full font-bold"
               style={{ background: online ? C.greenLight : C.yellowLight,
                        color: online ? C.greenDark : C.yellowDark,
                        border: `1px solid ${online ? C.green : C.yellow}` }}
               title={online ? "Đang online — bài nộp gửi ngay" : "Offline — bài lưu tạm, sẽ gửi khi có mạng"}>
            {online ? "Online" : "Offline"}
          </div>
          {pendingCount > 0 && (
            <div className="text-xs px-2 py-1 rounded-full font-bold"
                 style={{ background: C.yellowLight, color: C.yellowDark, border: `1px solid ${C.yellow}` }}>
              {pendingCount} chờ gửi
            </div>
          )}
        </div>

        {error && (
          <div className="rounded-2xl p-3 flex items-center justify-between"
               style={{ background: C.redLight, border: `2px solid ${C.red}` }}>
            <span className="text-sm font-medium" style={{ color: C.redDark }}>{error}</span>
            <button onClick={() => setError(null)}
                    className="text-xs px-3 py-1 rounded-full font-bold"
                    style={{ background: C.red, color: "white" }}>Đóng</button>
          </div>
        )}

        {status === "loading" && (
          <div className="rounded-3xl p-10 text-center"
               style={{ background: "white", border: `2px solid ${C.grayBorder}` }}>
            <div className="text-lg" style={{ color: C.grayText }}>Đang tải danh sách từ…</div>
          </div>
        )}

        {status === "ready" && currentTask && !feedback && !pendingReview && (
          <div className="rounded-3xl p-6"
               style={{ background: "white", border: `2px solid ${C.grayBorder}` }}>
            <div className="text-xs uppercase font-bold mb-2 tracking-wide" style={{ color: C.grayText, opacity: 0.6 }}>
              Câu hỏi {wordIdx + 1}
            </div>
            <div className="text-xl font-bold mb-6 leading-relaxed" style={{ color: C.grayText }}>
              {currentTask.prompt}
            </div>
            <TaskWidget task={currentTask} onAnswer={handleAnswer} />
          </div>
        )}

        {feedback && currentTask && (
          <div className="rounded-3xl p-6"
               style={{ background: feedback.correct ? C.greenLight : C.yellowLight,
                        border: `3px solid ${feedback.correct ? C.green : C.yellow}` }}>
            <div className="text-2xl font-black mb-2" style={{ color: feedback.correct ? C.greenDark : C.yellowDark }}>
              {feedback.correct ? "Đúng!" : "Chưa đúng"}
            </div>
            <div className="text-sm" style={{ color: C.grayText }}>
              Đáp án: <b>{feedback.expected}</b>
            </div>
              {pendingReview ? <div className="mt-5 rounded-2xl p-4" style={{ background: "white", border: `2px solid ${C.grayBorder}` }}>
              <div className="font-bold" style={{ color: C.grayText }}>
                Bạn nhớ từ này ở mức nào?
              </div>
              <p className="text-xs mt-1" style={{ color: C.grayText }}>
                Chọn theo mức độ nhớ của bạn, không phải chỉ đúng/sai. Câu hỏi này giống nhau cho mọi người học.
              </p>
              <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 mt-3">
                {[
                  [0, "Quên hẳn"], [1, "Rất khó"], [2, "Khó"],
                  [3, "Nhớ được"], [4, "Có do dự"], [5, "Rất dễ"],
                ].map(([quality, label]) => (
                  <button
                    key={quality}
                    onClick={() => submitRatedReview(quality as number)}
                    disabled={!pendingReview}
                    className="rounded-xl px-2 py-2 text-xs font-bold disabled:opacity-40"
                    style={{ background: C.blueLight, border: `2px solid ${C.blue}`, color: C.blueDark }}
                    aria-label={`Mức nhớ ${quality}: ${label}`}>
                    <span className="block text-base">{quality}</span>{label}
                  </button>
                ))}
              </div>
              </div> : (
                <div className="mt-5">
                  <BigButton onClick={advance} color="blue">Tiếp tục</BigButton>
                </div>
              )}
            </div>
        )}

        {status === "ready" && currentTask && pendingReview && !feedback && (
          <div className="rounded-3xl p-6" style={{ background: "white", border: `2px solid ${C.grayBorder}` }}>
            <div className="text-lg font-bold" style={{ color: C.grayText }}>Bạn nhớ từ này ở mức nào?</div>
            <p className="text-xs mt-1" style={{ color: C.grayText }}>
              Chọn theo mức độ nhớ của bạn, không phải chỉ đúng/sai. Câu hỏi này giống nhau cho mọi người học.
            </p>
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 mt-3">
              {[
                [0, "Quên hẳn"], [1, "Rất khó"], [2, "Khó"],
                [3, "Nhớ được"], [4, "Có do dự"], [5, "Rất dễ"],
              ].map(([quality, label]) => (
                <button key={quality} onClick={() => submitRatedReview(quality as number)}
                  className="rounded-xl px-2 py-2 text-xs font-bold"
                  style={{ background: C.blueLight, border: `2px solid ${C.blue}`, color: C.blueDark }}
                  aria-label={`Mức nhớ ${quality}: ${label}`}>
                  <span className="block text-base">{quality}</span>{label}
                </button>
              ))}
            </div>
          </div>
        )}

        {status === "done" && (
          <div className="rounded-3xl p-10 text-center"
               style={{ background: C.greenLight, border: `3px solid ${C.green}` }}>
            <div className="text-3xl font-black" style={{ color: C.greenDark }}>Hoàn tất phiên học!</div>
            <div className="text-sm mt-2" style={{ color: C.grayText }}>
              Đã học {words.length} từ. {pendingCount > 0 ? `Còn ${pendingCount} bài đợi gửi khi có mạng.` : "Tất cả đã đồng bộ."}
            </div>
            <div className="mt-6">
              <BigButton onClick={() => { setWordIdx(0); setStatus("ready"); }} color="blue" size="lg">
                Học phiên mới
              </BigButton>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// Demo fallback data (used when no participant token — dev / preview mode)
// ═════════════════════════════════════════════════════════════════════════════

const DEMO_WORDS = [
  "resilient", "acknowledge", "contribute", "diverse", "sustainable",
  "collaborate", "innovate", "significant", "efficient", "adapt",
  "emerge", "enhance", "facilitate", "generate", "impact",
  "integrate", "maintain", "optimize", "prioritize", "utilize",
];
const DEMO_DEF_VI = [
  "kiên cường, dễ hồi phục", "thừa nhận", "đóng góp", "đa dạng", "bền vững",
  "hợp tác", "đổi mới", "quan trọng", "hiệu quả", "thích nghi",
  "xuất hiện, nổi lên", "tăng cường", "tạo điều kiện", "tạo ra", "tác động",
  "tích hợp", "duy trì", "tối ưu hoá", "ưu tiên", "sử dụng",
];

