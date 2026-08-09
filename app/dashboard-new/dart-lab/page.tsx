"use client";

/**
 * DART / CARTS Lab — Duolingo-style redesign (2026-08-09, D-011).
 *
 * Palette: #58cc02 xanh · #ffc800 vàng · #ff4b4b đỏ · #1cb0f6 xanh nước · #ce82ff tím.
 * Mascot "Voi Con" dẫn dắt xuyên 4 level. Nút 3D shadow, chữ tối thiểu, XP bar.
 * Chi tiết khoa học chuyển hết vào Chế độ chuyên gia.
 */

import { useEffect, useMemo, useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";

type RetrievalType = 0 | 1 | 2 | 3;

// ═════════════════════════════════════════════════════════════════════════════
// DUOLINGO-STYLE PALETTE
// ═════════════════════════════════════════════════════════════════════════════

const C = {
  green: "#58cc02", greenDark: "#58a700", greenLight: "#d7ffb8",
  yellow: "#ffc800", yellowDark: "#e5a500", yellowLight: "#fff4d6",
  red: "#ff4b4b", redDark: "#ea2b2b", redLight: "#ffdfe0",
  blue: "#1cb0f6", blueDark: "#0a91d3", blueLight: "#ddf4ff",
  purple: "#ce82ff", purpleDark: "#a560e8", purpleLight: "#f4e4ff",
  grayText: "#4b4b4b", grayBorder: "#e5e5e5", grayLight: "#f7f7f7",
};

// ═════════════════════════════════════════════════════════════════════════════
// MASCOT — "Voi Con" (little elephant, our study buddy)
// ═════════════════════════════════════════════════════════════════════════════

function Mascot({ size = 120, mood = "happy" }: { size?: number; mood?: "happy" | "wave" | "think" | "cheer" }) {
  return (
    <svg viewBox="0 0 120 120" width={size} height={size} xmlns="http://www.w3.org/2000/svg">
      {/* body */}
      <ellipse cx="60" cy="78" rx="38" ry="34" fill={C.blue} />
      <ellipse cx="60" cy="82" rx="30" ry="26" fill="#67c6ff" />
      {/* head */}
      <circle cx="60" cy="48" r="30" fill={C.blue} />
      {/* ears */}
      <ellipse cx="30" cy="46" rx="14" ry="18" fill={C.blueDark} />
      <ellipse cx="90" cy="46" rx="14" ry="18" fill={C.blueDark} />
      <ellipse cx="30" cy="46" rx="8" ry="12" fill="#ff9db8" />
      <ellipse cx="90" cy="46" rx="8" ry="12" fill="#ff9db8" />
      {/* trunk */}
      {mood === "wave" ? (
        <path d="M 55 60 Q 45 75, 55 85 Q 60 90, 70 82 Q 75 78, 72 72" fill="none" stroke={C.blue} strokeWidth="10" strokeLinecap="round" />
      ) : (
        <path d="M 55 60 Q 55 78, 62 84 Q 68 88, 68 78" fill="none" stroke={C.blue} strokeWidth="10" strokeLinecap="round" />
      )}
      {/* eyes */}
      <circle cx="48" cy="45" r="6" fill="white" />
      <circle cx="72" cy="45" r="6" fill="white" />
      <circle cx="49" cy="46" r="3" fill="#1a1a1a" />
      <circle cx="73" cy="46" r="3" fill="#1a1a1a" />
      <circle cx="50" cy="45" r="1" fill="white" />
      <circle cx="74" cy="45" r="1" fill="white" />
      {/* mouth (mood-dependent) */}
      {mood === "cheer" ? (
        <path d="M 54 58 Q 60 66, 66 58" fill="#ff9db8" stroke={C.grayText} strokeWidth="1.5" />
      ) : mood === "think" ? (
        <line x1="56" y1="60" x2="64" y2="60" stroke={C.grayText} strokeWidth="2" strokeLinecap="round" />
      ) : (
        <path d="M 56 58 Q 60 62, 64 58" fill="none" stroke={C.grayText} strokeWidth="2" strokeLinecap="round" />
      )}
      {/* cheeks */}
      <circle cx="42" cy="54" r="4" fill="#ff9db8" opacity="0.5" />
      <circle cx="78" cy="54" r="4" fill="#ff9db8" opacity="0.5" />
    </svg>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// DUOLINGO-STYLE ATOMS
// ═════════════════════════════════════════════════════════════════════════════

function BigButton({ onClick, disabled, busy, children, color = "green", size = "md" }: any) {
  const palette: Record<string, { bg: string; shadow: string; text: string }> = {
    green:   { bg: C.green,   shadow: C.greenDark,   text: "white" },
    yellow:  { bg: C.yellow,  shadow: C.yellowDark,  text: C.grayText },
    red:     { bg: C.red,     shadow: C.redDark,     text: "white" },
    blue:    { bg: C.blue,    shadow: C.blueDark,    text: "white" },
    purple:  { bg: C.purple,  shadow: C.purpleDark,  text: "white" },
    white:   { bg: "white",   shadow: C.grayBorder,  text: C.grayText },
  };
  const p = palette[color];
  const sz = size === "lg"
    ? "text-lg px-8 py-4"
    : size === "sm"
    ? "text-sm px-4 py-2"
    : "text-base px-6 py-3";
  return (
    <button onClick={onClick} disabled={disabled || busy}
      className={`${sz} font-bold uppercase tracking-wide rounded-2xl transition-all
                  active:translate-y-1 active:shadow-none
                  disabled:opacity-40 disabled:cursor-not-allowed disabled:active:translate-y-0`}
      style={{ background: p.bg, color: p.text, boxShadow: `0 4px 0 ${p.shadow}`, border: `2px solid ${p.shadow}` }}>
      {busy ? "..." : children}
    </button>
  );
}

function Card({ children, color = "white", className = "" }: any) {
  const bg = { white: "white", green: C.greenLight, yellow: C.yellowLight, red: C.redLight, blue: C.blueLight, purple: C.purpleLight }[color as string] ?? "white";
  const border = { white: C.grayBorder, green: C.green, yellow: C.yellow, red: C.red, blue: C.blue, purple: C.purple }[color as string] ?? C.grayBorder;
  return (
    <div className={`rounded-3xl p-6 ${className}`}
         style={{ background: bg, border: `2px solid ${border}` }}>
      {children}
    </div>
  );
}

function Badge({ children, color = "yellow" }: any) {
  const bg = { green: C.green, yellow: C.yellow, red: C.red, blue: C.blue, purple: C.purple }[color as string] ?? C.yellow;
  return (
    <span className="inline-block px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide text-white"
          style={{ background: bg }}>
      {children}
    </span>
  );
}

// XP star icon
function StarXp({ size = 20, filled = true }: { size?: number; filled?: boolean }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size}>
      <path d="M12 2 L14.5 9 L22 9 L16 13.5 L18 21 L12 16.5 L6 21 L8 13.5 L2 9 L9.5 9 Z"
            fill={filled ? C.yellow : "#f0f0f0"} stroke={C.yellowDark} strokeWidth="1.5" strokeLinejoin="round" />
    </svg>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// LEVEL 1 — VẤN ĐỀ (interactive Anki vs DART comparison)
// ═════════════════════════════════════════════════════════════════════════════

function Level1Problem({ onComplete }: { onComplete: () => void }) {
  const [picked, setPicked] = useState<"anki" | "dart" | null>(null);
  return (
    <Card>
      <div className="flex items-start gap-6">
        <div className="flex-shrink-0"><Mascot size={100} mood="wave" /></div>
        <div className="flex-1">
          <div className="text-lg font-bold" style={{ color: C.grayText }}>
            Bạn nghĩ app nào ôn từ tốt hơn?
          </div>
          <div className="text-sm mt-1" style={{ color: C.grayText, opacity: 0.7 }}>
            Bấm chọn 1 — Voi Con sẽ giải thích.
          </div>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-4 mt-6">
        {[
          { id: "anki", name: "Anki", tag: "khoảng cách đều", color: "red" as const, dots: [10, 30, 50, 70, 90] },
          { id: "dart", name: "DART", tag: "theo độ khó bài", color: "green" as const, dots: [5, 15, 35, 65, 95] },
        ].map((opt) => (
          <button key={opt.id} onClick={() => setPicked(opt.id as any)}
            className={`text-left rounded-2xl p-5 transition-all ${picked === opt.id ? "ring-4" : ""}`}
            style={{
              background: picked === opt.id
                ? (opt.color === "green" ? C.greenLight : C.redLight)
                : "white",
              border: `2px solid ${picked === opt.id
                ? (opt.color === "green" ? C.green : C.red)
                : C.grayBorder}`,
              ...(picked === opt.id ? { boxShadow: `0 0 0 4px ${opt.color === "green" ? "#c4f19e" : "#ffb8b8"}` } : {}),
            }}>
            <div className="flex items-baseline justify-between mb-3">
              <span className="text-xl font-bold" style={{ color: C.grayText }}>{opt.name}</span>
              <Badge color={opt.color}>{opt.tag}</Badge>
            </div>
            <svg viewBox="0 0 100 30" className="w-full h-8">
              <line x1="5" y1="15" x2="95" y2="15" stroke={C.grayBorder} strokeWidth="2" />
              {opt.dots.map((cx, i) => (
                <circle key={i} cx={cx} cy="15" r="4"
                        fill={opt.color === "green" ? C.green : C.red} />
              ))}
            </svg>
            <div className="text-xs mt-2" style={{ color: C.grayText, opacity: 0.7 }}>
              {opt.id === "anki" ? "5 lần ôn, cách nhau đúng bằng nhau" : "gần lúc đầu, giãn dần khi HV giỏi"}
            </div>
          </button>
        ))}
      </div>

      {picked && (
        <div className="mt-6 rounded-2xl p-4 flex items-start gap-4"
             style={{ background: picked === "dart" ? C.greenLight : C.yellowLight,
                      border: `2px solid ${picked === "dart" ? C.green : C.yellow}` }}>
          <Mascot size={60} mood={picked === "dart" ? "cheer" : "think"} />
          <div className="flex-1 text-sm" style={{ color: C.grayText }}>
            {picked === "dart" ? (
              <>
                <b>Chính xác!</b> DART biết được bạn <b>vừa làm bài khó hay dễ</b>.
                Vượt bài khó → trí nhớ chắc hơn → ôn muộn hơn. Anki bỏ qua tín hiệu này.
              </>
            ) : (
              <>
                Anki dễ dùng, nhưng nó <b>bỏ qua độ khó của bài ôn</b>.
                Cùng 1 từ, nếu bạn viết được cả 1 đoạn dùng nó → nhớ chắc hơn nhiều so với chỉ chọn 1 trong 4 đáp án.
                DART tận dụng điều đó.
              </>
            )}
          </div>
        </div>
      )}

      {picked && (
        <div className="mt-6 text-center">
          <BigButton onClick={onComplete} color="green" size="lg">
            Sang Level 2 →
          </BigButton>
        </div>
      )}
    </Card>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// LEVEL 2 — CƠ CHẾ (3 mini cards, tap to flip)
// ═════════════════════════════════════════════════════════════════════════════

function Level2Mechanism({ onComplete }: { onComplete: () => void }) {
  const [flipped, setFlipped] = useState<Set<number>>(new Set());
  const cards = [
    { color: "blue" as const, front: "6 số", back: "về học viên và từ (trình độ, tần suất, số lần ôn, điểm câu gần nhất…)", label: "B1" },
    { color: "yellow" as const, front: "1 phép nhân", back: "gộp 6 số + độ khó bài vừa làm → ra 'nửa đời trí nhớ' (số ngày)", label: "B2" },
    { color: "purple" as const, front: "Chọn dạng bài", back: "nửa đời ngắn → cho MCQ dễ. Nửa đời dài → cho paraphrase khó", label: "B3" },
  ];
  const flip = (i: number) => {
    setFlipped((s) => {
      const n = new Set(s);
      n.has(i) ? n.delete(i) : n.add(i);
      return n;
    });
  };
  const allFlipped = flipped.size === cards.length;

  return (
    <Card>
      <div className="flex items-start gap-6 mb-4">
        <Mascot size={100} mood="think" />
        <div>
          <div className="text-lg font-bold" style={{ color: C.grayText }}>DART làm 3 việc, chỉ trong 5 mili-giây</div>
          <div className="text-sm mt-1" style={{ color: C.grayText, opacity: 0.7 }}>
            Bấm từng thẻ để lật xem chi tiết.
          </div>
        </div>
      </div>

      <div className="grid md:grid-cols-3 gap-4">
        {cards.map((c, i) => {
          const bg = { blue: C.blueLight, yellow: C.yellowLight, purple: C.purpleLight }[c.color];
          const border = { blue: C.blue, yellow: C.yellow, purple: C.purple }[c.color];
          return (
            <button key={i} onClick={() => flip(i)}
              className="text-left rounded-2xl p-5 h-40 transition-all hover:scale-105"
              style={{ background: bg, border: `2px solid ${border}` }}>
              <div className="flex items-baseline gap-2 mb-2">
                <span className="text-xs font-mono font-bold px-2 py-0.5 rounded"
                      style={{ background: border, color: "white" }}>{c.label}</span>
                {flipped.has(i) && <StarXp size={14} />}
              </div>
              {flipped.has(i) ? (
                <div className="text-sm leading-relaxed" style={{ color: C.grayText }}>{c.back}</div>
              ) : (
                <div className="text-2xl font-bold mt-4" style={{ color: C.grayText }}>{c.front}</div>
              )}
            </button>
          );
        })}
      </div>

      {allFlipped && (
        <div className="mt-6 rounded-2xl p-4 flex items-center gap-4"
             style={{ background: C.greenLight, border: `2px solid ${C.green}` }}>
          <Mascot size={60} mood="cheer" />
          <div className="flex-1 text-sm font-medium" style={{ color: C.grayText }}>
            Xong Level 2! Giờ thử với 1 học viên thật ở Level 3.
          </div>
          <BigButton onClick={onComplete} color="green">Level 3 →</BigButton>
        </div>
      )}
    </Card>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// LEVEL 3 — THỬ NGAY (persona → schedule → judge → feedback loop)
// ═════════════════════════════════════════════════════════════════════════════

interface WeightsResp {
  success: boolean;
  weights: { theta: number[]; alpha: number };
  meta: { source: string | null };
}
interface ScheduleResp {
  success: boolean;
  schedule?: { halfLife: number; intervalDays?: number; interval?: number; nextRetrievalType: RetrievalType };
  features?: { recentJudgeComposite?: number };
}

const PERSONAS = [
  { id: "new", emoji: "🌱", name: "Học viên mới", desc: "Vừa gặp từ lần đầu",
    values: { vocabularyId: "demo-word-001", userId: "learner-new", quality: 4, dPrev: 0 as RetrievalType } },
  { id: "pro", emoji: "🏆", name: "Học viên giỏi", desc: "Đã ôn nhiều lần",
    values: { vocabularyId: "demo-word-042", userId: "learner-advanced", quality: 5, dPrev: 3 as RetrievalType } },
  { id: "struggle", emoji: "💪", name: "Đang gặp khó", desc: "Cloze chỉ đúng nửa",
    values: { vocabularyId: "demo-word-017", userId: "learner-struggling", quality: 2, dPrev: 1 as RetrievalType } },
];

const RETRIEVAL_VI = ["Trắc nghiệm", "Điền chỗ trống", "Đặt câu", "Viết lại đoạn"];

function Level3TryNow({ weights, onComplete, setError }: {
  weights: WeightsResp | null;
  onComplete: () => void;
  setError: (s: string | null) => void;
}) {
  const [persona, setPersona] = useState<typeof PERSONAS[0] | null>(null);
  const [sched, setSched] = useState<ScheduleResp | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [word, setWord] = useState("resilient");
  const [sentence, setSentence] = useState("The bridge is resilient to floods.");
  const [scores, setScores] = useState<any>(null);
  const [newH, setNewH] = useState<number | null>(null);

  async function runSched() {
    if (!persona) return;
    setBusy("sched"); setError(null); setNewH(null);
    try {
      const r = await fetch("/api/dart/schedule", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          vocabularyId: persona.values.vocabularyId,
          userId: persona.values.userId,
          quality: persona.values.quality,
          lastRetrievalType: persona.values.dPrev,
        }),
      });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      setSched(await r.json());
    } catch (e: any) { setError(e.message); }
    finally { setBusy(null); }
  }

  async function runJudge() {
    setBusy("judge"); setError(null);
    try {
      const r = await fetch("/api/context-transfer/judge?sync=1", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ word, learnerSentence: sentence, userId: persona?.values.userId }),
      });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const j = await r.json();
      setScores(j.scores);
      if (weights?.weights && sched?.schedule) {
        const c = (j.scores?.composite ?? 5) / 10;
        const delta = (c - 0.5) * (weights.weights.theta[5] ?? 0);
        setNewH(sched.schedule.halfLife * Math.pow(2, delta));
      }
    } catch (e: any) { setError(e.message); }
    finally { setBusy(null); }
  }

  return (
    <div className="space-y-4">
      {/* Sub-level 3a: pick persona */}
      <Card color={persona ? "green" : "white"}>
        <div className="flex items-baseline justify-between mb-3">
          <div className="font-bold text-lg" style={{ color: C.grayText }}>Chọn 1 học viên để thử</div>
          {persona && <StarXp />}
        </div>
        <div className="grid md:grid-cols-3 gap-3">
          {PERSONAS.map((p) => (
            <button key={p.id} onClick={() => { setPersona(p); setSched(null); setScores(null); setNewH(null); }}
              className="text-left rounded-2xl p-4 transition-all hover:scale-105"
              style={{
                background: persona?.id === p.id ? C.greenLight : "white",
                border: `2px solid ${persona?.id === p.id ? C.green : C.grayBorder}`,
              }}>
              <div className="text-4xl mb-2" aria-hidden>{p.emoji}</div>
              <div className="font-bold text-base" style={{ color: C.grayText }}>{p.name}</div>
              <div className="text-xs mt-1" style={{ color: C.grayText, opacity: 0.7 }}>{p.desc}</div>
            </button>
          ))}
        </div>
      </Card>

      {/* Sub-level 3b: DART schedule */}
      {persona && (
        <Card color={sched ? "green" : "white"}>
          <div className="flex items-center justify-between">
            <div>
              <div className="font-bold text-lg" style={{ color: C.grayText }}>Hỏi DART: bao giờ ôn lại?</div>
              <div className="text-xs mt-1" style={{ color: C.grayText, opacity: 0.7 }}>1 cú bấm, kết quả tính trong 5ms</div>
            </div>
            <BigButton onClick={runSched} busy={busy === "sched"} disabled={!!busy} color="blue">
              Hỏi DART
            </BigButton>
          </div>
          {sched?.schedule && (
            <div className="grid grid-cols-3 gap-3 mt-4">
              <div className="rounded-2xl p-3 text-center" style={{ background: C.blueLight, border: `2px solid ${C.blue}` }}>
                <div className="text-xs uppercase font-bold" style={{ color: C.blueDark }}>Nửa đời</div>
                <div className="text-3xl font-black mt-1" style={{ color: C.blueDark }}>
                  {sched.schedule.halfLife.toFixed(1)}
                </div>
                <div className="text-xs" style={{ color: C.blueDark }}>ngày</div>
              </div>
              <div className="rounded-2xl p-3 text-center" style={{ background: C.greenLight, border: `2px solid ${C.green}` }}>
                <div className="text-xs uppercase font-bold" style={{ color: C.greenDark }}>Ôn sau</div>
                <div className="text-3xl font-black mt-1" style={{ color: C.greenDark }}>
                  {(sched.schedule.intervalDays ?? sched.schedule.interval ?? 0).toFixed(1)}
                </div>
                <div className="text-xs" style={{ color: C.greenDark }}>ngày</div>
              </div>
              <div className="rounded-2xl p-3 text-center" style={{ background: C.yellowLight, border: `2px solid ${C.yellow}` }}>
                <div className="text-xs uppercase font-bold" style={{ color: C.yellowDark }}>Bài kế</div>
                <div className="text-base font-black mt-1" style={{ color: C.yellowDark }}>
                  {RETRIEVAL_VI[sched.schedule.nextRetrievalType]}
                </div>
                <div className="text-xs" style={{ color: C.yellowDark }}>d = {sched.schedule.nextRetrievalType}</div>
              </div>
            </div>
          )}
        </Card>
      )}

      {/* Sub-level 3c: Judge → feedback loop */}
      {sched && (
        <Card color={scores ? "green" : "white"}>
          <div className="flex items-center justify-between mb-3">
            <div>
              <div className="font-bold text-lg" style={{ color: C.grayText }}>HV viết câu → LLM chấm</div>
              <div className="text-xs mt-1" style={{ color: C.grayText, opacity: 0.7 }}>
                Xong sẽ thấy DART <b>đổi lịch</b> theo điểm chấm ↓
              </div>
            </div>
            <BigButton onClick={runJudge} busy={busy === "judge"} disabled={!!busy} color="yellow">
              Chấm câu
            </BigButton>
          </div>
          <div className="grid md:grid-cols-2 gap-3 mt-2">
            <div>
              <label className="text-xs font-bold uppercase" style={{ color: C.grayText, opacity: 0.7 }}>Từ</label>
              <input value={word} onChange={(e) => setWord(e.target.value)}
                     className="w-full rounded-xl px-4 py-3 mt-1 text-base font-medium"
                     style={{ background: "white", border: `2px solid ${C.grayBorder}` }} />
            </div>
            <div>
              <label className="text-xs font-bold uppercase" style={{ color: C.grayText, opacity: 0.7 }}>Câu HV viết</label>
              <input value={sentence} onChange={(e) => setSentence(e.target.value)}
                     className="w-full rounded-xl px-4 py-3 mt-1 text-base"
                     style={{ background: "white", border: `2px solid ${C.grayBorder}` }} />
            </div>
          </div>

          {scores && (
            <div className="mt-4 rounded-2xl p-4" style={{ background: C.yellowLight, border: `2px solid ${C.yellow}` }}>
              <div className="flex items-baseline justify-between mb-3">
                <div className="font-bold" style={{ color: C.grayText }}>Điểm LLM chấm</div>
                <div className="text-3xl font-black" style={{ color: C.yellowDark }}>
                  {scores.composite?.toFixed(1)}<span className="text-sm">/10</span>
                </div>
              </div>
              <div className="grid grid-cols-4 gap-2">
                {[
                  { k: "accuracy",        vi: "Đúng nghĩa" },
                  { k: "fluency",         vi: "Trôi chảy" },
                  { k: "appropriateness", vi: "Hợp cảnh" },
                  { k: "creativity",      vi: "Sáng tạo" },
                ].map((d) => (
                  <div key={d.k} className="text-center rounded-xl p-2 bg-white">
                    <div className="text-[10px] font-bold uppercase" style={{ color: C.grayText, opacity: 0.6 }}>{d.vi}</div>
                    <div className="text-xl font-black" style={{ color: C.grayText }}>{scores[d.k]}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {newH !== null && sched.schedule && (
            <div className="mt-4 rounded-2xl p-5 flex items-start gap-4"
                 style={{ background: `linear-gradient(135deg, ${C.greenLight}, white)`,
                          border: `3px solid ${C.green}` }}>
              <Mascot size={70} mood="cheer" />
              <div className="flex-1">
                <div className="font-bold text-base mb-2" style={{ color: C.grayText }}>
                  Đây là chỗ DART "nằm"!
                </div>
                <div className="flex items-baseline gap-3">
                  <div>
                    <div className="text-[10px] uppercase font-bold" style={{ color: C.grayText, opacity: 0.6 }}>Trước</div>
                    <div className="text-2xl font-black line-through" style={{ color: C.grayText, opacity: 0.5 }}>
                      {sched.schedule.halfLife.toFixed(1)}d
                    </div>
                  </div>
                  <div className="text-2xl font-black" style={{ color: C.green }}>→</div>
                  <div>
                    <div className="text-[10px] uppercase font-bold" style={{ color: C.greenDark }}>Sau khi có điểm chấm</div>
                    <div className="text-3xl font-black" style={{ color: newH > sched.schedule.halfLife ? C.greenDark : C.red }}>
                      {newH.toFixed(1)}d
                      <span className="text-sm ml-2">
                        ({newH > sched.schedule.halfLife ? "+" : ""}
                        {(newH - sched.schedule.halfLife).toFixed(1)})
                      </span>
                    </div>
                  </div>
                </div>
                <div className="text-xs mt-3" style={{ color: C.grayText, opacity: 0.7 }}>
                  Điểm chấm cao → DART tin trí nhớ chắc → giãn lịch ôn dài hơn.
                </div>
              </div>
            </div>
          )}

          {scores && (
            <div className="mt-4 text-center">
              <BigButton onClick={onComplete} color="green" size="lg">Level 4 →</BigButton>
            </div>
          )}
        </Card>
      )}
    </div>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// LEVEL 4 — NGHIÊN CỨU (assign + explanation)
// ═════════════════════════════════════════════════════════════════════════════

function Level4Research({ onComplete, setError }: { onComplete: () => void; setError: (s: string | null) => void }) {
  const [uid, setUid] = useState("learner-new");
  const [group, setGroup] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function assign() {
    setBusy(true); setError(null);
    try {
      const r = await fetch(`/api/experiment/assign?userId=${encodeURIComponent(uid)}`);
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const j = await r.json();
      setGroup((j.condition ?? j.assignment?.condition ?? "").toUpperCase());
    } catch (e: any) { setError(e.message); }
    finally { setBusy(false); }
  }

  const groups = [
    { name: "SM-2", desc: "Anki (chuẩn)", color: C.grayBorder, textColor: C.grayText },
    { name: "HLR",  desc: "DART không α",  color: C.yellow, textColor: C.yellowDark },
    { name: "DART", desc: "Có α (ours)",   color: C.green,  textColor: C.greenDark },
  ];

  return (
    <div className="space-y-4">
      <Card>
        <div className="flex items-start gap-4 mb-4">
          <Mascot size={80} mood="think" />
          <div>
            <div className="font-bold text-lg" style={{ color: C.grayText }}>Chia học viên ngẫu nhiên vào 3 nhóm</div>
            <div className="text-sm mt-1" style={{ color: C.grayText, opacity: 0.7 }}>
              Để so được DART thắng hay thua, phải cho 3 nhóm chạy song song.
            </div>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-3">
          {groups.map((g) => (
            <div key={g.name} className="rounded-2xl p-4 text-center"
                 style={{ background: "white", border: `3px solid ${g.color}` }}>
              <div className="text-2xl font-black" style={{ color: g.textColor }}>{g.name}</div>
              <div className="text-xs mt-1" style={{ color: C.grayText, opacity: 0.7 }}>{g.desc}</div>
              <div className="text-sm font-bold mt-2" style={{ color: C.grayText }}>~65 HV</div>
            </div>
          ))}
        </div>
      </Card>

      <Card>
        <div className="font-bold text-lg mb-2" style={{ color: C.grayText }}>Thử gán nhóm cho 1 HV</div>
        <div className="flex gap-3 items-end">
          <div className="flex-1">
            <label className="text-xs font-bold uppercase" style={{ color: C.grayText, opacity: 0.7 }}>userId</label>
            <input value={uid} onChange={(e) => setUid(e.target.value)}
                   className="w-full rounded-xl px-4 py-3 mt-1 text-base font-mono"
                   style={{ background: "white", border: `2px solid ${C.grayBorder}` }} />
          </div>
          <BigButton onClick={assign} busy={busy} color="blue">Gán</BigButton>
        </div>
        {group && (
          <div className="mt-4 rounded-2xl p-5 text-center"
               style={{ background: C.greenLight, border: `3px solid ${C.green}` }}>
            <div className="text-xs uppercase font-bold" style={{ color: C.greenDark }}>Kết quả</div>
            <div className="text-4xl font-black mt-1" style={{ color: C.greenDark }}>
              Nhóm {group}
            </div>
            <div className="text-xs mt-2" style={{ color: C.grayText, opacity: 0.7 }}>
              Cùng userId luôn ra cùng nhóm (hash FNV-1a)
            </div>
          </div>
        )}
        {group && (
          <div className="mt-6 text-center">
            <BigButton onClick={onComplete} color="green" size="lg">
              Hoàn tất!
            </BigButton>
          </div>
        )}
      </Card>
    </div>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// MAIN PAGE
// ═════════════════════════════════════════════════════════════════════════════

export default function DartLabPage() {
  const [expert, setExpert] = useState(false);
  const [weights, setWeights] = useState<WeightsResp | null>(null);
  const [level, setLevel] = useState(1);
  const [xp, setXp] = useState(0);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/dart/weights").then((r) => r.json()).then(setWeights).catch(() => {});
  }, []);

  const totalLevels = 4;
  const progressPct = ((level - 1) / totalLevels) * 100;

  const complete = (next: number) => {
    setXp((x) => x + 10);
    setLevel(next);
    if (typeof window !== "undefined") window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <DashboardLayout>
      <div className="max-w-3xl mx-auto p-6 space-y-6">

        {/* ── Top bar: XP + progress ─────────────────────── */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1 rounded-full px-3 py-1.5"
               style={{ background: C.yellowLight, border: `2px solid ${C.yellow}` }}>
            <StarXp size={18} />
            <span className="font-bold text-sm" style={{ color: C.yellowDark }}>{xp} XP</span>
          </div>
          <div className="flex-1 h-4 rounded-full overflow-hidden"
               style={{ background: C.grayLight, border: `2px solid ${C.grayBorder}` }}>
            <div className="h-full transition-all duration-500"
                 style={{ width: `${progressPct}%`,
                          background: `linear-gradient(90deg, ${C.green}, ${C.greenDark})` }} />
          </div>
          <div className="text-sm font-bold" style={{ color: C.grayText }}>{level}/{totalLevels}</div>
          <label className="flex items-center gap-1 text-xs cursor-pointer" style={{ color: C.grayText }}>
            <input type="checkbox" checked={expert} onChange={(e) => setExpert(e.target.checked)}
                   className="w-3.5 h-3.5" />
            Chuyên gia
          </label>
        </div>

        {/* ── Hero ─────────────────────── */}
        <div className="rounded-3xl p-6 flex items-center gap-6"
             style={{ background: `linear-gradient(135deg, ${C.blueLight}, ${C.greenLight})`,
                      border: `2px solid ${C.blue}` }}>
          <Mascot size={130} mood="wave" />
          <div className="flex-1">
            <div className="text-2xl font-black" style={{ color: C.grayText }}>
              Chào! Cùng khám phá DART
            </div>
            <div className="text-sm mt-1" style={{ color: C.grayText, opacity: 0.8 }}>
              4 level ngắn. Bấm nút to bên dưới để bắt đầu.
            </div>
            {level === 1 && (
              <div className="mt-3">
                <Badge color="green">Bắt đầu ngay</Badge>
              </div>
            )}
          </div>
        </div>

        {/* ── Error toast (dismissible) ─────────────────────── */}
        {error && (
          <div className="rounded-2xl p-3 flex items-center justify-between"
               style={{ background: C.redLight, border: `2px solid ${C.red}` }}>
            <span className="text-sm font-medium" style={{ color: C.redDark }}>{error}</span>
            <button onClick={() => setError(null)}
                    className="text-xs px-3 py-1 rounded-full font-bold"
                    style={{ background: C.red, color: "white" }}>
              Đóng
            </button>
          </div>
        )}

        {/* ── Level title ─────────────────────── */}
        <div className="flex items-baseline gap-3">
          <Badge color={level === 1 ? "red" : level === 2 ? "yellow" : level === 3 ? "blue" : "green"}>
            Level {level} / {totalLevels}
          </Badge>
          <div className="font-black text-xl" style={{ color: C.grayText }}>
            {level === 1 && "Vấn đề gì?"}
            {level === 2 && "DART làm gì?"}
            {level === 3 && "Thử ngay với 1 học viên"}
            {level === 4 && "Nghiên cứu chia 3 nhóm"}
          </div>
        </div>

        {/* ── Level content ─────────────────────── */}
        {level === 1 && <Level1Problem onComplete={() => complete(2)} />}
        {level === 2 && <Level2Mechanism onComplete={() => complete(3)} />}
        {level === 3 && <Level3TryNow weights={weights} onComplete={() => complete(4)} setError={setError} />}
        {level === 4 && <Level4Research onComplete={() => complete(5)} setError={setError} />}

        {level > totalLevels && (
          <Card color="green">
            <div className="text-center py-8">
              <Mascot size={140} mood="cheer" />
              <div className="text-3xl font-black mt-4" style={{ color: C.greenDark }}>
                Hoàn tất!
              </div>
              <div className="text-base mt-2" style={{ color: C.grayText }}>
                Bạn đã hiểu toàn bộ DART/CARTS. {xp} XP kiếm được.
              </div>
              <div className="mt-6">
                <BigButton onClick={() => { setLevel(1); setXp(0); }} color="blue" size="lg">
                  Chơi lại
                </BigButton>
              </div>
            </div>
          </Card>
        )}

        {/* ── Level nav (prev only, next là CTA của level) ─────────────────────── */}
        {level > 1 && level <= totalLevels && (
          <div className="flex justify-start">
            <BigButton onClick={() => setLevel(level - 1)} color="white" size="sm">
              ← Level {level - 1}
            </BigButton>
          </div>
        )}

        {/* ── Expert-mode extras ─────────────────────── */}
        {expert && weights?.weights && (
          <Card color="purple">
            <div className="font-bold text-sm mb-2" style={{ color: C.purpleDark }}>Chế độ chuyên gia</div>
            <div className="text-xs font-mono" style={{ color: C.grayText }}>
              α = {weights.weights.alpha.toFixed(4)} · θ = [{weights.weights.theta.map((v) => v.toFixed(2)).join(", ")}]
              · nguồn: {weights.meta.source ?? "defaults"}
            </div>
            <div className="text-xs mt-2" style={{ color: C.grayText, opacity: 0.7 }}>
              Chi tiết khoa học đầy đủ: <code>docs/DECISIONS.md</code>, <code>research/PAPER_DRAFT_v1.md</code>,
              Amendment #A-002 trong <code>research/AMENDMENTS.md</code>.
            </div>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}
