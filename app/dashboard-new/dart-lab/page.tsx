"use client";

/**
 * DART / CARTS Lab — Story-mode redesign (2026-08-09, Decision D-009 approach A).
 *
 * Trước: 4 tab rời (Tổng quan / Thử lịch / Chấm câu / Chia nhóm) — mỗi tab test 1 endpoint,
 * user không thấy được luồng nối các endpoint. Đặc biệt user hỏi "DART nằm chỗ nào" khi
 * xem tab Chấm câu → chỉ ra gap khoa học thật: judge score chưa từng feed vào DART.
 *
 * Sau (approach A trong D-009):
 *   1. Single-scroll narrative — 4 chương xuyên suốt 1 học viên giả định.
 *   2. Chương 1 "Vấn đề": SVG so sánh Anki (khoảng cách đều) vs DART (theo độ khó).
 *   3. Chương 2 "Bên trong DART": thanh cuộn ngang B1→B2→B3 (theo đề xuất của user)
 *      với SVG minh hoạ + text tiếng Việt cho từng bước.
 *   4. Chương 3 "Thử ngay": interactive schedule + judge được nối lại — sau khi chấm
 *      câu, tự động re-run DART với judgeComposite mới, hiển thị delta half-life.
 *      Đây chính là câu trả lời cho "DART nằm chỗ nào?".
 *   5. Chương 4 "Nghiên cứu": bảng so sánh 3 nhóm DART / HLR / SM-2, ai được gán gì,
 *      link tới paper draft.
 *
 * Kiến trúc dữ liệu mới (Amendment #A-002): recentJudgeComposite là feature x[5] mới
 * trong DART. Trang này VISUAL hoá đúng vòng feedback đó.
 */

import { useEffect, useMemo, useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import {
  Brain, Sparkles, FlaskConical, Beaker, RefreshCw, Send, Loader2,
  Info, PlayCircle, ChevronRight, ChevronLeft, ArrowRight, Zap, Users,
  BookOpen, Target, TrendingUp, HelpCircle,
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
    desc: "Đã ôn nhiều lần, làm được cả paraphrase",
    values: { vocabularyId: "demo-word-042", userId: "learner-advanced", quality: 5, dPrev: 3 as RetrievalType },
  },
  {
    name: "Học viên đang gặp khó",
    desc: "Làm cloze nhưng chỉ đúng một nửa",
    values: { vocabularyId: "demo-word-017", userId: "learner-struggling", quality: 2, dPrev: 1 as RetrievalType },
  },
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
  features?: { recentJudgeComposite?: number };
  task?: any;
}

// ═════════════════════════════════════════════════════════════════════════════
// SVG ILLUSTRATIONS
// ═════════════════════════════════════════════════════════════════════════════

function AnkiVsDartSvg() {
  return (
    <svg viewBox="0 0 640 220" className="w-full max-w-3xl" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <marker id="arrowRed" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto">
          <path d="M 0 0 L 10 5 L 0 10 z" fill="#dc2626" />
        </marker>
        <marker id="arrowIndigo" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto">
          <path d="M 0 0 L 10 5 L 0 10 z" fill="#4f46e5" />
        </marker>
      </defs>
      {/* Left: Anki-style, evenly spaced regardless of difficulty */}
      <g>
        <text x="20" y="24" fontSize="13" fontWeight="700" fill="#7c2d12">Anki / Quizlet</text>
        <text x="20" y="42" fontSize="10" fill="#7c2d12">bỏ qua độ khó bài</text>
        {/* Timeline line */}
        <line x1="20" y1="120" x2="300" y2="120" stroke="#fca5a5" strokeWidth="2" />
        {/* Even dots */}
        {[40, 100, 160, 220, 280].map((cx, i) => (
          <g key={i}>
            <circle cx={cx} cy="120" r="8" fill="#dc2626" />
            <text x={cx} y="145" textAnchor="middle" fontSize="9" fill="#7c2d12">ngày {i * 3 + 1}</text>
          </g>
        ))}
        <text x="20" y="180" fontSize="10" fill="#7c2d12" fontStyle="italic">
          → khoảng cách bằng nhau dù bài dễ hay khó
        </text>
      </g>
      {/* Divider */}
      <line x1="320" y1="10" x2="320" y2="210" stroke="#e5e7eb" strokeWidth="1" strokeDasharray="4 4" />
      {/* Right: DART, spacing scales with difficulty */}
      <g>
        <text x="340" y="24" fontSize="13" fontWeight="700" fill="#3730a3">DART</text>
        <text x="340" y="42" fontSize="10" fill="#3730a3">giãn theo độ khó bài vừa làm</text>
        <line x1="340" y1="120" x2="620" y2="120" stroke="#a5b4fc" strokeWidth="2" />
        {/* Variable-spaced dots */}
        {[
          { cx: 355, d: 0, label: "MCQ" },
          { cx: 395, d: 1, label: "Cloze" },
          { cx: 460, d: 2, label: "Gen" },
          { cx: 545, d: 3, label: "Para" },
          { cx: 610, d: 2, label: "" },
        ].map((p, i) => (
          <g key={i}>
            <circle cx={p.cx} cy="120" r="8" fill="#4f46e5" />
            {p.label && <text x={p.cx} y="106" textAnchor="middle" fontSize="9" fill="#3730a3">{p.label}</text>}
            <text x={p.cx} y="145" textAnchor="middle" fontSize="9" fill="#3730a3">
              {i === 0 ? "d1" : `d${[1, 4, 11, 22][i - 1]}`}
            </text>
          </g>
        ))}
        <text x="340" y="180" fontSize="10" fill="#3730a3" fontStyle="italic">
          → vừa làm bài khó → tự tin trí nhớ chắc → ôn muộn hơn
        </text>
      </g>
    </svg>
  );
}

function FeatureVectorSvg() {
  return (
    <svg viewBox="0 0 320 200" className="w-full" xmlns="http://www.w3.org/2000/svg">
      <text x="160" y="20" textAnchor="middle" fontSize="12" fontWeight="700" fill="#3730a3">
        Vector đặc trưng x
      </text>
      {[
        { y: 40, name: "CEFR", val: "B1" },
        { y: 62, name: "Tần suất", val: "10³" },
        { y: 84, name: "Độ chính xác", val: "0.72" },
        { y: 106, name: "Số lần ôn", val: "5" },
        { y: 128, name: "Điểm câu gần nhất", val: "0.85", hi: true },
      ].map((row, i) => (
        <g key={i}>
          <rect x="30" y={row.y - 12} width="180" height="18" rx="4"
                fill={row.hi ? "#fef3c7" : "#eef2ff"}
                stroke={row.hi ? "#f59e0b" : "#c7d2fe"} strokeWidth="1" />
          <text x="40" y={row.y} fontSize="10" fill="#374151">{row.name}</text>
          <text x="200" y={row.y} textAnchor="end" fontSize="10" fontWeight="600"
                fill={row.hi ? "#92400e" : "#4f46e5"}>{row.val}</text>
        </g>
      ))}
      <text x="30" y="160" fontSize="9" fill="#92400e">
        ★ Từ 2026-08-09: thêm điểm chấm câu (Amendment #A-002)
      </text>
      <text x="30" y="180" fontSize="9" fill="#6b7280" fontStyle="italic">
        6 con số này biểu diễn "học viên nào, học từ gì, quen chưa"
      </text>
    </svg>
  );
}

function HalfLifeFormulaSvg() {
  return (
    <svg viewBox="0 0 320 200" className="w-full" xmlns="http://www.w3.org/2000/svg">
      <text x="160" y="20" textAnchor="middle" fontSize="12" fontWeight="700" fill="#3730a3">
        Công thức nửa đời trí nhớ
      </text>
      <text x="160" y="65" textAnchor="middle" fontSize="18" fontWeight="700" fill="#111827"
            fontFamily="ui-monospace, monospace">
        h = 2<tspan fontSize="12" dy="-6">θ·x</tspan><tspan dy="6"> </tspan>·<tspan> </tspan>exp(α · φ(d))
      </text>
      <line x1="30" y1="90" x2="290" y2="90" stroke="#e5e7eb" strokeWidth="1" />
      {[
        { y: 108, sym: "θ·x", meaning: "6 feature × 6 hệ số → độ tự tin cơ bản" },
        { y: 128, sym: "α", meaning: "hệ số DART (mới) — độ khó bài quan trọng cỡ nào" },
        { y: 148, sym: "φ(d)", meaning: "độ khó bài vừa làm: 0 → 0.33 → 0.66 → 1.0" },
        { y: 168, sym: "h", meaning: "nửa đời: sau bao nhiêu ngày HV nhớ còn 50%" },
      ].map((r, i) => (
        <g key={i}>
          <rect x="30" y={r.y - 10} width="42" height="14" rx="3" fill="#eef2ff" />
          <text x="51" y={r.y} textAnchor="middle" fontSize="11" fontWeight="600" fill="#4f46e5"
                fontFamily="ui-monospace, monospace">{r.sym}</text>
          <text x="80" y={r.y} fontSize="10" fill="#374151">{r.meaning}</text>
        </g>
      ))}
      <text x="160" y="192" textAnchor="middle" fontSize="9" fill="#6b7280" fontStyle="italic">
        Alg 2 dòng 2 trong bài báo
      </text>
    </svg>
  );
}

function RetrievalLadderSvg() {
  return (
    <svg viewBox="0 0 320 220" className="w-full" xmlns="http://www.w3.org/2000/svg">
      <text x="160" y="20" textAnchor="middle" fontSize="12" fontWeight="700" fill="#3730a3">
        4 dạng bài — thang độ khó
      </text>
      {[
        { y: 50,  d: 0, label: "MCQ",        hint: "chọn 1 trong 4",     w: 60 },
        { y: 90,  d: 1, label: "Cloze",      hint: "điền chỗ trống",     w: 130 },
        { y: 130, d: 2, label: "Đặt câu",    hint: "tự viết có ràng buộc", w: 200 },
        { y: 170, d: 3, label: "Paraphrase", hint: "viết lại giữ nghĩa",  w: 260 },
      ].map((r, i) => (
        <g key={i}>
          <rect x="30" y={r.y - 14} width={r.w} height="26" rx="5"
                fill={`hsl(${240 - i * 20}, 70%, ${85 - i * 6}%)`}
                stroke={`hsl(${240 - i * 20}, 70%, ${55 - i * 5}%)`} strokeWidth="1" />
          <text x="40" y={r.y - 1} fontSize="10" fontWeight="600" fill="#1e293b">
            d={r.d} · {r.label}
          </text>
          <text x="40" y={r.y + 10} fontSize="9" fill="#475569">{r.hint}</text>
        </g>
      ))}
      <path d="M 285 40 L 285 190" stroke="#94a3b8" strokeWidth="1.5" strokeDasharray="3 3" />
      <text x="295" y="50" fontSize="9" fill="#475569">dễ</text>
      <text x="295" y="185" fontSize="9" fill="#475569">khó</text>
      <text x="160" y="210" textAnchor="middle" fontSize="9" fill="#6b7280" fontStyle="italic">
        Vượt qua bài khó → trí nhớ chắc hơn → ôn muộn hơn
      </text>
    </svg>
  );
}

function ThreeGroupsSvg() {
  const groups = [
    { name: "SM-2", desc: "baseline Anki",       cx: 60,  color: "#94a3b8" },
    { name: "HLR",  desc: "no-α ablation",       cx: 160, color: "#f59e0b" },
    { name: "DART", desc: "có α (ours)",         cx: 260, color: "#4f46e5" },
  ];
  return (
    <svg viewBox="0 0 320 180" className="w-full max-w-md" xmlns="http://www.w3.org/2000/svg">
      <text x="160" y="20" textAnchor="middle" fontSize="12" fontWeight="700" fill="#3730a3">
        Randomised controlled trial — 3 nhóm
      </text>
      {groups.map((g, i) => (
        <g key={i}>
          <circle cx={g.cx} cy="80" r="34" fill={g.color} opacity="0.15" stroke={g.color} strokeWidth="2" />
          <text x={g.cx} y="80" textAnchor="middle" fontSize="14" fontWeight="700" fill={g.color}>
            {g.name}
          </text>
          <text x={g.cx} y="94" textAnchor="middle" fontSize="9" fill="#374151">{g.desc}</text>
          <text x={g.cx} y="140" textAnchor="middle" fontSize="10" fontWeight="600" fill="#111827">
            n≈65
          </text>
          <text x={g.cx} y="154" textAnchor="middle" fontSize="9" fill="#6b7280">học viên</text>
        </g>
      ))}
      <text x="160" y="170" textAnchor="middle" fontSize="9" fill="#6b7280" fontStyle="italic">
        userId → hash FNV-1a → nhóm (ổn định, không phụ thuộc thời điểm gọi)
      </text>
    </svg>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// Small UI atoms
// ═════════════════════════════════════════════════════════════════════════════

function Chapter({ n, title, children }: { n: string; title: string; children: any }) {
  return (
    <section className="scroll-mt-6">
      <div className="flex items-baseline gap-3 mb-4">
        <span className="text-xs font-mono px-2 py-0.5 rounded bg-indigo-100 text-indigo-700 font-semibold">
          {n}
        </span>
        <h2 className="text-2xl font-bold text-neutral-900 dark:text-neutral-100">{title}</h2>
      </div>
      <div className="space-y-4">{children}</div>
    </section>
  );
}

function Card({ children, className = "" }: any) {
  return (
    <div className={`rounded-2xl border border-neutral-200 bg-white dark:bg-neutral-900 dark:border-neutral-800 shadow-sm p-6 ${className}`}>
      {children}
    </div>
  );
}

function PrimaryButton({ onClick, disabled, busy, children, color = "indigo" }: any) {
  const colors: Record<string, string> = {
    indigo:  "bg-indigo-600 hover:bg-indigo-700",
    emerald: "bg-emerald-600 hover:bg-emerald-700",
    amber:   "bg-amber-600 hover:bg-amber-700",
    neutral: "bg-neutral-800 hover:bg-black",
  };
  return (
    <button onClick={onClick} disabled={disabled}
      className={`inline-flex items-center gap-2 text-white text-base font-medium px-5 py-2.5 rounded-lg disabled:opacity-40 disabled:cursor-not-allowed shadow-sm transition ${colors[color]}`}>
      {busy ? <Loader2 className="animate-spin" size={18} /> : <Send size={18} />}
      {children}
    </button>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// Chapter 2 — horizontal B1→B2→B3 walkthrough
// ═════════════════════════════════════════════════════════════════════════════

function InsideDartWalkthrough() {
  const [step, setStep] = useState(0);
  const steps = [
    {
      id: "B1", title: "Biến học viên và từ thành số",
      svg: <FeatureVectorSvg />,
      body: (
        <>
          <p>
            Trước khi tính "bao giờ ôn lại", thuật toán biến <b>mọi thứ nó biết về học viên và từ</b>
            thành một dãy số gọi là <b>vector đặc trưng x</b>. Ví dụ: trình độ CEFR, tần suất của từ trong
            tiếng Anh, tỷ lệ đúng của chính học viên đó, số lần đã ôn.
          </p>
          <p>
            <b>Mới từ 2026-08-09</b> (Amendment #A-002): thêm phần thứ 6 — <i>điểm chấm câu gần nhất</i>.
            Nếu HV vừa viết câu và LLM chấm 8.5/10 → phần này = 0.85. Feature này là cầu nối giữa
            "Chương 3 chấm câu" và "Chương 3 tính lịch" — trước đây hai bên không nói chuyện.
          </p>
        </>
      ),
    },
    {
      id: "B2", title: "Tính nửa đời trí nhớ h",
      svg: <HalfLifeFormulaSvg />,
      body: (
        <>
          <p>
            Từ vector x, thuật toán tính <b>half-life h</b> — số ngày kể từ lần ôn cuối tới lúc HV
            còn nhớ khoảng 50%. Công thức có 2 phần nhân với nhau:
          </p>
          <ul className="list-disc pl-6 space-y-1">
            <li><b>Phần 1 (θ·x):</b> tính độ tự tin cơ bản từ 6 con số của học viên.</li>
            <li><b>Phần 2 (α·φ(d)):</b> nhân thêm nếu bài <i>vừa làm</i> là bài khó. <b>α là điểm mới của DART</b> —
                các thuật toán trước (HLR, SM-2) coi mọi bài như nhau (α = 0).</li>
          </ul>
          <p>
            Nói cách khác: <b>vừa vượt qua bài khó (paraphrase) → h dài gấp ~1.4 lần</b> so với vừa
            vượt bài dễ (MCQ), <i>với cùng học viên, cùng từ</i>. Đó là toàn bộ đóng góp của DART trong 1 câu.
          </p>
        </>
      ),
    },
    {
      id: "B3", title: "Chọn dạng bài kế tiếp",
      svg: <RetrievalLadderSvg />,
      body: (
        <>
          <p>
            Có h rồi → thuật toán chọn <b>dạng bài kế tiếp</b> theo thang: h ngắn → cho bài dễ
            (MCQ) để đỡ nản. h dài → cho bài khó (paraphrase) để "nạp sâu" trí nhớ hơn.
          </p>
          <p>
            Ba ngưỡng mặc định (có thể huấn luyện lại): h &lt; 2 ngày → MCQ, &lt; 7 ngày → Cloze,
            &lt; 30 ngày → Đặt câu, còn lại → Paraphrase.
          </p>
          <p className="text-neutral-500 text-sm italic">
            Ba bước B1 → B2 → B3 chạy trong đúng &lt; 5ms mỗi lần HV nộp 1 bài, chạy hàng nghìn lần
            mỗi phiên học của lớp thí nghiệm.
          </p>
        </>
      ),
    },
  ];

  return (
    <div className="rounded-2xl border border-neutral-200 bg-white dark:bg-neutral-900 dark:border-neutral-800 overflow-hidden shadow-sm">
      {/* Step nav */}
      <div className="grid grid-cols-3 divide-x divide-neutral-100 dark:divide-neutral-800 bg-neutral-50 dark:bg-neutral-950 border-b border-neutral-200">
        {steps.map((s, i) => (
          <button key={s.id} onClick={() => setStep(i)}
            className={`px-4 py-3 text-left transition ${step === i ? "bg-white dark:bg-neutral-900" : "hover:bg-white/60 dark:hover:bg-neutral-900/60"}`}>
            <div className={`text-[10px] font-mono font-bold ${step === i ? "text-indigo-700 dark:text-indigo-300" : "text-neutral-400"}`}>
              {s.id}
            </div>
            <div className={`text-sm font-semibold mt-0.5 ${step === i ? "text-neutral-900 dark:text-neutral-100" : "text-neutral-500"}`}>
              {s.title}
            </div>
          </button>
        ))}
      </div>
      {/* Step body */}
      <div className="grid md:grid-cols-2 gap-6 p-6">
        <div className="bg-neutral-50 dark:bg-neutral-950 rounded-xl p-4 flex items-center justify-center">
          {steps[step].svg}
        </div>
        <div className="prose prose-sm dark:prose-invert max-w-none text-base leading-relaxed space-y-3">
          {steps[step].body}
        </div>
      </div>
      {/* Prev / next */}
      <div className="flex items-center justify-between px-6 pb-5 -mt-2">
        <button onClick={() => setStep(Math.max(0, step - 1))} disabled={step === 0}
                className="inline-flex items-center gap-1.5 text-sm text-neutral-600 hover:text-neutral-900 disabled:opacity-30 disabled:cursor-not-allowed">
          <ChevronLeft size={16} /> Trước
        </button>
        <div className="text-xs text-neutral-400">{step + 1} / {steps.length}</div>
        <button onClick={() => setStep(Math.min(steps.length - 1, step + 1))} disabled={step === steps.length - 1}
                className="inline-flex items-center gap-1.5 text-sm text-neutral-600 hover:text-neutral-900 disabled:opacity-30 disabled:cursor-not-allowed">
          Sau <ChevronRight size={16} />
        </button>
      </div>
    </div>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// Main page
// ═════════════════════════════════════════════════════════════════════════════

export default function DartLabPage() {
  const [expert, setExpert] = useState(false);

  // Weights
  const [weights, setWeights] = useState<WeightsResp | null>(null);
  const [weightsLoading, setWeightsLoading] = useState(false);

  // Interactive demo state
  const [vocabularyId, setVocabularyId] = useState("");
  const [userId, setUserId] = useState("demo-user");
  const [quality, setQuality] = useState(4);
  const [dPrev, setDPrev] = useState<RetrievalType>(0);
  const [dartSched, setDartSched] = useState<ScheduleResp | null>(null);

  // Judge state
  const [word, setWord] = useState("resilient");
  const [learnerSentence, setLearnerSentence] = useState("The bridge is resilient to floods.");
  const [judgeScores, setJudgeScores] = useState<any>(null);
  // Simulated "next schedule if HV had judgeComposite = X" — computed locally
  const [schedAfterJudge, setSchedAfterJudge] = useState<number | null>(null);

  // Assign
  const [assignUserId, setAssignUserId] = useState("learner-new");
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
    if (!vocabularyId) return setError("Chưa chọn từ nào — bấm 1 ví dụ ở trên");
    setBusy("dart"); setError(null); setSchedAfterJudge(null);
    try {
      const r = await fetchJson<ScheduleResp>("/api/dart/schedule", {
        method: "POST",
        body: JSON.stringify({ vocabularyId, userId, quality, lastRetrievalType: dPrev }),
      });
      setDartSched(r);
    } catch (e: any) { setError(e.message); }
    finally { setBusy(null); }
  }

  async function runJudge() {
    setBusy("judge"); setError(null);
    try {
      // sync mode for interactive demo (async queue is for the study pipeline)
      const r = await fetchJson<any>("/api/context-transfer/judge?sync=1", {
        method: "POST",
        body: JSON.stringify({ word, learnerSentence, userId }),
      });
      setJudgeScores(r.scores);
      // Show visually: if judge composite were fed into DART, what's the new half-life?
      // Compute locally with current weights for immediate feedback.
      if (weights?.weights && dartSched?.schedule?.halfLife) {
        const composite01 = (r.scores?.composite ?? 5) / 10;
        // Current schedule was computed with default judgeComposite=0.5 when no prior judge.
        // Delta in feature space: (composite01 - 0.5) * theta[5]
        const delta = (composite01 - 0.5) * (weights.weights.theta[5] ?? 0);
        const newHalfLife = dartSched.schedule.halfLife * Math.pow(2, delta);
        setSchedAfterJudge(newHalfLife);
      }
    } catch (e: any) { setError(e.message); }
    finally { setBusy(null); }
  }

  async function runAssign() {
    setBusy("assign"); setError(null);
    try {
      const r = await fetchJson<any>(`/api/experiment/assign?userId=${encodeURIComponent(assignUserId)}`);
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
    // Feature vector demo — includes recentJudgeComposite default 0.5 for the 6th slot
    const x = [1, 0.4, 0.5, 0.6, 0.3, 0.5];
    const dot = theta.reduce((s, t, i) => s + t * (x[i] ?? 0), 0);
    const h0 = Math.pow(2, dot);
    return PHI.map((phi, d) => ({ d, phi, h: h0 * Math.exp(alpha * phi) }));
  }, [weights]);
  const maxH = Math.max(0.001, ...projection.map((p) => p.h));

  return (
    <DashboardLayout>
      <div className="max-w-5xl mx-auto p-6 space-y-12">
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
                Trang này kể lại toàn bộ luồng thuật toán bằng 1 câu chuyện: <b>Vấn đề → Cách hoạt động → Thử ngay → Nghiên cứu</b>.
                Cứ cuộn xuống, không cần bấm tab.
              </p>
            </div>
            <label className="flex items-center gap-2 text-sm text-neutral-600 whitespace-nowrap">
              <input type="checkbox" checked={expert} onChange={(e) => setExpert(e.target.checked)}
                     className="w-4 h-4 rounded" />
              Chế độ chuyên gia
            </label>
          </div>
        </header>

        {error && (
          <div className="rounded-xl border border-red-200 bg-red-50 text-red-800 p-4 flex gap-3">
            <span className="font-medium">Lỗi:</span> <span>{error}</span>
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════════════
             CHAPTER 1 — VẤN ĐỀ
           ═══════════════════════════════════════════════════════════════ */}
        <Chapter n="Chương 1" title="Vấn đề: các app hiện tại bỏ sót một tín hiệu quan trọng">
          <Card>
            <div className="grid md:grid-cols-2 gap-6 items-center">
              <div>
                <p className="text-base leading-relaxed">
                  Hầu hết ứng dụng học từ vựng (Anki, Quizlet, Duolingo) quyết định
                  "khi nào ôn từ này lần tới" chỉ dựa vào <b>thời gian đã trôi qua</b> và
                  <b> HV nhớ hay quên</b>. Chúng bỏ qua một tín hiệu quan trọng:
                  <b> bài retrieval HV vừa làm khó hay dễ</b>.
                </p>
                <p className="text-base leading-relaxed mt-3">
                  Chọn 1 trong 4 định nghĩa (MCQ) rất khác với tự viết một câu dùng từ đó.
                  Nếu HV vừa vượt qua bài <i>khó</i>, trí nhớ chắc hơn — có thể giãn khoảng ôn dài hơn.
                  Ngược lại, nếu vừa qua bài <i>dễ</i>, nên ôn sớm hơn để bù.
                </p>
                <p className="text-base leading-relaxed mt-3">
                  <b>DART</b> mở rộng thuật toán HLR bằng đúng 1 tham số — <b>α</b> — đo mức độ
                  "bài khó thì trí nhớ chắc hơn". Trang này giúp bạn thấy quyết định của α trong
                  từng tình huống cụ thể.
                </p>
              </div>
              <div className="bg-neutral-50 dark:bg-neutral-950 rounded-xl p-4">
                <AnkiVsDartSvg />
              </div>
            </div>
          </Card>
        </Chapter>

        {/* ═══════════════════════════════════════════════════════════════
             CHAPTER 2 — BÊN TRONG DART (horizontal B1→B2→B3)
           ═══════════════════════════════════════════════════════════════ */}
        <Chapter n="Chương 2" title="Bên trong DART: 3 bước B1 → B2 → B3">
          <p className="text-neutral-600 dark:text-neutral-400 text-base">
            Mỗi lần HV nộp 1 bài retrieval, hệ thống chạy 3 bước này. Bấm từng ô để xem chi tiết:
          </p>
          <InsideDartWalkthrough />

          {/* Live projection with current server weights */}
          <Card>
            <div className="flex items-baseline gap-2 mb-3">
              <TrendingUp className="text-indigo-600" size={18} />
              <h3 className="font-semibold">Thời gian đến lần ôn tiếp — theo độ khó bài vừa làm</h3>
            </div>
            <p className="text-sm text-neutral-600 mb-4">
              Với trọng số hiện tại của server ({weights?.meta.source ?? "in-memory defaults"}) và
              1 học viên demo. Cột càng dài = ôn càng muộn.
            </p>
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
                α={weights?.weights.alpha.toFixed(4)}
                · θ=[{weights?.weights.theta.map((v) => v.toFixed(2)).join(", ")}]
                <button onClick={() => loadWeights(true)}
                        className="ml-3 inline-flex items-center gap-1 px-2 py-0.5 rounded border hover:bg-neutral-50">
                  <RefreshCw size={11} /> Reload
                </button>
              </div>
            )}
          </Card>
        </Chapter>

        {/* ═══════════════════════════════════════════════════════════════
             CHAPTER 3 — THỬ NGAY (schedule + judge nối lại)
           ═══════════════════════════════════════════════════════════════ */}
        <Chapter n="Chương 3" title="Thử ngay: 1 học viên, 1 từ, thấy DART và LLM-Judge nói chuyện với nhau">
          <p className="text-neutral-600 dark:text-neutral-400 text-base">
            Đây là chỗ trả lời câu hỏi <i>"DART nằm chỗ nào trong việc chấm câu?"</i>.
            Chạy schedule trước → chấm câu HV → tự động thấy half-life kế đổi thế nào.
          </p>

          {/* Step 1: pick persona */}
          <Card>
            <div className="flex items-baseline gap-2 mb-3">
              <PlayCircle className="text-indigo-600" size={18} />
              <h3 className="font-semibold">Bước 1 — Chọn 1 học viên giả định</h3>
            </div>
            <div className="grid md:grid-cols-3 gap-3">
              {PRESETS.map((p) => (
                <button key={p.name} onClick={() => {
                  setVocabularyId(p.values.vocabularyId);
                  setUserId(p.values.userId);
                  setQuality(p.values.quality);
                  setDPrev(p.values.dPrev);
                  setDartSched(null);
                  setJudgeScores(null);
                  setSchedAfterJudge(null);
                }}
                  className={`text-left rounded-xl border-2 p-4 transition ${
                    userId === p.values.userId
                      ? "border-indigo-500 bg-indigo-50 dark:bg-indigo-950"
                      : "border-neutral-200 hover:border-indigo-300"
                  }`}>
                  <div className="font-semibold text-neutral-900 dark:text-neutral-100">{p.name}</div>
                  <div className="text-sm text-neutral-600 dark:text-neutral-400 mt-1">{p.desc}</div>
                </button>
              ))}
            </div>
            {expert && (
              <details className="mt-4">
                <summary className="text-xs text-neutral-500 cursor-pointer hover:text-neutral-800">Chỉnh chi tiết…</summary>
                <div className="grid md:grid-cols-2 gap-4 mt-3">
                  <label className="block text-sm">
                    <div className="text-neutral-700 mb-1">vocabularyId</div>
                    <input value={vocabularyId} onChange={(e) => setVocabularyId(e.target.value)}
                           className="w-full border border-neutral-300 rounded-lg px-3 py-2 text-sm font-mono" />
                  </label>
                  <label className="block text-sm">
                    <div className="text-neutral-700 mb-1">userId</div>
                    <input value={userId} onChange={(e) => setUserId(e.target.value)}
                           className="w-full border border-neutral-300 rounded-lg px-3 py-2 text-sm font-mono" />
                  </label>
                  <label className="block text-sm">
                    <div className="text-neutral-700 mb-1">quality 0–5</div>
                    <div className="flex gap-1">
                      {[0,1,2,3,4,5].map((q) => (
                        <button key={q} onClick={() => setQuality(q)}
                                className={`flex-1 py-1.5 rounded-lg border text-sm ${quality === q ? "border-indigo-500 bg-indigo-500 text-white" : "border-neutral-200 hover:border-indigo-300"}`}>
                          {q}
                        </button>
                      ))}
                    </div>
                  </label>
                  <label className="block text-sm">
                    <div className="text-neutral-700 mb-1">lastRetrievalType d</div>
                    <select value={dPrev} onChange={(e) => setDPrev(Number(e.target.value) as RetrievalType)}
                            className="w-full border border-neutral-300 rounded-lg px-3 py-2 text-sm">
                      {RETRIEVAL.map((r, i) => <option key={i} value={i}>d={i} · {r.vi}</option>)}
                    </select>
                  </label>
                </div>
              </details>
            )}
          </Card>

          {/* Step 2: DART schedule */}
          <Card>
            <div className="flex items-baseline justify-between mb-3">
              <div className="flex items-baseline gap-2">
                <Sparkles className="text-indigo-600" size={18} />
                <h3 className="font-semibold">Bước 2 — Chạy DART: khi nào nên ôn từ này?</h3>
              </div>
              <PrimaryButton onClick={runDartSchedule} busy={busy === "dart"} disabled={busy !== null}>
                Chạy DART
              </PrimaryButton>
            </div>
            {dartSched?.schedule ? (
              <div className="grid md:grid-cols-3 gap-4">
                <div className="rounded-xl bg-indigo-50 dark:bg-indigo-950 p-4">
                  <div className="text-xs uppercase font-semibold text-indigo-800 tracking-wide">Half-life h</div>
                  <div className="text-2xl font-bold text-indigo-900 dark:text-indigo-100 mt-1">
                    {dartSched.schedule.halfLife.toFixed(2)} <span className="text-sm font-normal">ngày</span>
                  </div>
                  <div className="text-xs text-indigo-700 mt-1">Sau ~ này HV còn nhớ 50%</div>
                </div>
                <div className="rounded-xl bg-emerald-50 dark:bg-emerald-950 p-4">
                  <div className="text-xs uppercase font-semibold text-emerald-800 tracking-wide">Ôn lại sau</div>
                  <div className="text-2xl font-bold text-emerald-900 dark:text-emerald-100 mt-1">
                    {(dartSched.schedule.intervalDays ?? dartSched.schedule.interval ?? 0).toFixed(2)} <span className="text-sm font-normal">ngày</span>
                  </div>
                  <div className="text-xs text-emerald-700 mt-1">Đặt lịch cho bài kế</div>
                </div>
                <div className="rounded-xl bg-amber-50 dark:bg-amber-950 p-4">
                  <div className="text-xs uppercase font-semibold text-amber-800 tracking-wide">Dạng bài kế</div>
                  <div className="text-lg font-bold text-amber-900 dark:text-amber-100 mt-1">
                    {RETRIEVAL[dartSched.schedule.nextRetrievalType].vi}
                  </div>
                  <div className="text-xs text-amber-700 mt-1">d = {dartSched.schedule.nextRetrievalType}</div>
                </div>
                <div className="md:col-span-3 text-sm text-neutral-600 border-t border-neutral-100 pt-3 flex items-start gap-2">
                  <Info size={14} className="mt-0.5 text-neutral-400" />
                  <span>
                    <b>Nghĩa là:</b> hệ thống dự đoán HV còn nhớ ~50% sau {dartSched.schedule.halfLife.toFixed(1)} ngày;
                    lịch đặt bài kế là {(dartSched.schedule.intervalDays ?? 0).toFixed(1)} ngày sau,
                    dạng bài <i>{RETRIEVAL[dartSched.schedule.nextRetrievalType].vi.toLowerCase()}</i>.
                    {typeof dartSched.features?.recentJudgeComposite === "number" && (
                      <span> Điểm chấm câu gần nhất input vào feature x[5] = {dartSched.features.recentJudgeComposite.toFixed(2)}.</span>
                    )}
                  </span>
                </div>
              </div>
            ) : (
              <div className="text-sm text-neutral-500">Chưa chạy. Chọn 1 học viên ở Bước 1, bấm <b>Chạy DART</b>.</div>
            )}
          </Card>

          {/* Step 3: Judge → feed back to DART */}
          <Card>
            <div className="flex items-baseline justify-between mb-3">
              <div className="flex items-baseline gap-2">
                <Beaker className="text-amber-600" size={18} />
                <h3 className="font-semibold">Bước 3 — HV viết câu → LLM chấm → DART nghe được</h3>
            </div>
              <PrimaryButton onClick={runJudge} busy={busy === "judge"} disabled={busy !== null || !dartSched} color="amber">
                Chấm câu
              </PrimaryButton>
            </div>
            {!dartSched ? (
              <div className="text-sm text-neutral-500">Chạy Bước 2 trước để có baseline half-life so sánh.</div>
            ) : (
              <div className="space-y-4">
                <div className="grid md:grid-cols-2 gap-4">
                  <label className="block">
                    <div className="text-sm font-medium mb-1">Từ mục tiêu</div>
                    <input value={word} onChange={(e) => setWord(e.target.value)}
                           className="w-full border border-neutral-300 rounded-lg px-3 py-2" />
                  </label>
                  <label className="block">
                    <div className="text-sm font-medium mb-1">Câu học viên viết</div>
                    <input value={learnerSentence} onChange={(e) => setLearnerSentence(e.target.value)}
                           className="w-full border border-neutral-300 rounded-lg px-3 py-2" />
                  </label>
                </div>
                {judgeScores && (
                  <>
                    <div className="grid grid-cols-4 gap-3">
                      {[
                        { k: "accuracy",        vi: "Đúng nghĩa" },
                        { k: "fluency",         vi: "Trôi chảy" },
                        { k: "appropriateness", vi: "Hợp ngữ cảnh" },
                        { k: "creativity",      vi: "Sáng tạo" },
                      ].map((d) => (
                        <div key={d.k} className="rounded-xl border border-neutral-200 p-3">
                          <div className="text-[10px] uppercase text-neutral-500 font-semibold tracking-wide">{d.vi}</div>
                          <div className="text-2xl font-bold text-neutral-900 dark:text-neutral-100 mt-1">
                            {judgeScores[d.k]}<span className="text-sm font-normal">/10</span>
                          </div>
                        </div>
                      ))}
                    </div>
                    <div className="rounded-xl bg-amber-50 dark:bg-amber-950 border border-amber-200 p-4">
                      <div className="text-xs uppercase text-amber-800 font-semibold">Điểm tổng</div>
                      <div className="text-3xl font-bold text-amber-900 dark:text-amber-100 mt-1">
                        {judgeScores.composite?.toFixed(2)}<span className="text-sm font-normal"> / 10</span>
                      </div>
                      {judgeScores.rationale && (
                        <div className="text-sm text-amber-900 dark:text-amber-200 italic mt-2">{judgeScores.rationale}</div>
                      )}
                    </div>

                    {/* ► THE KEY CONNECTION: judge → DART */}
                    {schedAfterJudge !== null && dartSched.schedule && (
                      <div className="rounded-xl border-2 border-indigo-300 bg-gradient-to-br from-indigo-50 to-white dark:from-indigo-950 dark:to-neutral-900 p-5">
                        <div className="flex items-baseline gap-2 mb-2">
                          <Zap className="text-indigo-600" size={16} />
                          <div className="text-sm font-semibold text-indigo-900 dark:text-indigo-100">
                            → DART cập nhật: half-life kế đổi theo điểm chấm này
                          </div>
                        </div>
                        <div className="flex items-baseline gap-4 mt-3">
                          <div>
                            <div className="text-xs text-neutral-500">Trước khi có điểm chấm</div>
                            <div className="text-lg font-mono font-bold text-neutral-700 line-through decoration-neutral-400 decoration-2">
                              {dartSched.schedule.halfLife.toFixed(2)} ngày
                            </div>
                          </div>
                          <ArrowRight className="text-indigo-500 mt-4" size={20} />
                          <div>
                            <div className="text-xs text-indigo-600 font-semibold">Sau khi cộng điểm chấm câu vào x[5]</div>
                            <div className={`text-2xl font-mono font-bold ${schedAfterJudge > dartSched.schedule.halfLife ? "text-emerald-700" : "text-red-700"}`}>
                              {schedAfterJudge.toFixed(2)} ngày
                              <span className="text-sm ml-2">
                                ({schedAfterJudge > dartSched.schedule.halfLife ? "+" : ""}
                                {(schedAfterJudge - dartSched.schedule.halfLife).toFixed(2)})
                              </span>
                            </div>
                          </div>
                        </div>
                        <div className="text-sm text-neutral-700 dark:text-neutral-300 mt-3 leading-relaxed">
                          <b>Đây chính là chỗ DART "nằm" trong việc chấm câu:</b> điểm 0–10 của LLM-Judge
                          được chia 10 → thành feature x[5] mới trong vector đặc trưng. Từ ngày{" "}
                          <code className="text-xs">2026-08-09</code> (Amendment #A-002), điểm chấm câu cao
                          → DART giãn khoảng ôn dài hơn; điểm thấp → ôn sớm hơn.
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
            )}
          </Card>
        </Chapter>

        {/* ═══════════════════════════════════════════════════════════════
             CHAPTER 4 — NGHIÊN CỨU
           ═══════════════════════════════════════════════════════════════ */}
        <Chapter n="Chương 4" title="Nghiên cứu: tại sao cần chia 3 nhóm?">
          <Card>
            <div className="grid md:grid-cols-2 gap-6 items-center">
              <div>
                <p className="text-base leading-relaxed">
                  Muốn tuyên bố "DART tốt hơn HLR" thì phải cho <b>cả hai chạy cùng một điều kiện</b>
                  trên các học viên tương đương — RCT (randomised controlled trial). Nghiên cứu này
                  chia học viên thành <b>3 nhóm</b> ngẫu nhiên:
                </p>
                <ul className="list-disc pl-6 space-y-2 mt-3 text-base">
                  <li><b>SM-2:</b> thuật toán mặc định của Anki. Baseline "công nghiệp".</li>
                  <li><b>HLR:</b> Half-Life Regression cổ điển (Settles & Meeder 2016) — <b>ablation của DART</b>,
                      giống DART nhưng α = 0. Nếu DART thắng HLR → chứng minh α có ý nghĩa.</li>
                  <li><b>DART:</b> mô hình đề xuất — có α.</li>
                </ul>
                <p className="text-base leading-relaxed mt-3">
                  <b>Cách chia:</b> hash FNV-1a của userId → nhóm. Cùng userId luôn ra cùng nhóm,
                  không phụ thuộc thời điểm gọi. HV được làm mù về điều kiện (không thấy chữ "DART"
                  hay "HLR" ở đâu trong app).
                </p>
              </div>
              <div className="bg-neutral-50 dark:bg-neutral-950 rounded-xl p-4">
                <ThreeGroupsSvg />
              </div>
            </div>
          </Card>

          <Card>
            <div className="flex items-baseline gap-2 mb-3">
              <Users className="text-neutral-800" size={18} />
              <h3 className="font-semibold">Thử chia nhóm: nhập userId, xem HV này sẽ vào nhóm nào</h3>
            </div>
            <div className="flex gap-3 items-end">
              <label className="flex-1">
                <div className="text-sm font-medium mb-1">userId</div>
                <input value={assignUserId} onChange={(e) => setAssignUserId(e.target.value)}
                       className="w-full border border-neutral-300 rounded-lg px-3 py-2 font-mono" />
              </label>
              <PrimaryButton onClick={runAssign} busy={busy === "assign"} disabled={busy !== null} color="neutral">
                Chia nhóm
              </PrimaryButton>
            </div>
            {assignment && (
              <div className="mt-4 rounded-xl border border-neutral-200 bg-neutral-50 p-4">
                <div className="text-xs uppercase text-neutral-500 font-semibold tracking-wide">Kết quả</div>
                <div className="text-2xl font-bold text-neutral-900 mt-1">
                  Nhóm <span className="text-indigo-700">{assignment.condition ?? assignment.assignment?.condition}</span>
                </div>
                <div className="text-sm text-neutral-600 mt-1">
                  Cùng userId <code className="text-xs">{assignUserId}</code> luôn ra cùng nhóm.
                </div>
              </div>
            )}
          </Card>
        </Chapter>

        {/* Footer */}
        <footer className="pt-8 border-t border-neutral-100 dark:border-neutral-800 text-center text-xs text-neutral-500 space-x-4">
          <span>Tài liệu đầy đủ: <code>docs/IMPLEMENTATION.md</code></span>
          <span>Bản thảo bài báo: <code>research/PAPER_DRAFT_v1.md</code></span>
          <span>Quyết định thiết kế: <code>docs/DECISIONS.md</code></span>
        </footer>
      </div>
    </DashboardLayout>
  );
}
