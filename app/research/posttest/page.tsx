"use client";
// app/research/posttest/page.tsx
// Posttest UI — Sections 1 (Recall MCQ), 2 (Cloze), 3 (Context Transfer).
//
// Auth: requires `participantToken` in localStorage (set after enrol).
// Form is fixed & pre-registered (see lib/posttestBuilder.ts). Do NOT display
// the arm/condition name — the page must stay condition-blind.
//
// Query: ?form=delayed to fetch the week-10 delayed set (Section 3 excluded).
//
// Flow:
//   1. GET /api/research/posttest/items?form=<immediate|delayed>
//   2. Render Section 1 → 2 → 3 (skip Section 3 for delayed form)
//   3. POST /api/research/posttest/submit with { testType, answers, administeredAt }
//   4. Show completion screen (server returns auto scores; CT score pending judge)
//
// Ngày 24 (posttest UI) — closes the gap identified in the Ngày 6 audit.

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

// ── Types mirror the public shape from /api/research/posttest/items ─────────
interface RecallItem {
  itemId: string;
  section: "recall";
  wordId: string;
  word: string;
  options: string[];
}
interface ClozeItem {
  itemId: string;
  section: "cloze";
  wordId: string;
  word: string;
  context: string;
}
interface ContextTransferItem {
  itemId: string;
  wordId: string;
  word: string;
  scenario: string;
  prompt: string;
  minWords: number;
  maxWords: number;
}

interface ItemsResponse {
  success: boolean;
  form: "immediate" | "delayed";
  formVersion: string;
  sections: {
    recall: RecallItem[];
    cloze: ClozeItem[];
    contextTransfer?: ContextTransferItem[];
  };
  counts: { recall: number; cloze: number; contextTransfer?: number };
  instructions?: {
    recall: string;
    cloze: string;
    contextTransfer: string;
  };
}

interface SubmitResponse {
  success: boolean;
  message?: string;
  alreadySubmitted?: boolean;
  auto?: {
    recallRaw: number;
    clozeRaw: number;
    ctTentativeRaw: number;
    recallScore: number;
    clozeScore: number;
    totalScore: number;
  };
}

type Phase = "loading" | "recall" | "cloze" | "contextTransfer" | "review" | "submitting" | "done" | "error";

// Palette matches D-011 Duolingo scheme used across research pages
const COLOR = {
  bg: "#F7F7F7",
  primary: "#58CC02",
  primaryDark: "#58A700",
  text: "#3C3C3C",
  muted: "#777777",
  border: "#E5E5E5",
  card: "#FFFFFF",
  danger: "#E74C3C",
};

export default function PosttestPage() {
  const router = useRouter();
  const search = useSearchParams();
  const formParam = (search?.get("form") === "delayed" ? "delayed" : "immediate") as
    | "immediate"
    | "delayed";

  const [phase, setPhase] = useState<Phase>("loading");
  const [errorMsg, setErrorMsg] = useState<string>("");
  const [items, setItems] = useState<ItemsResponse | null>(null);

  const [recallAns, setRecallAns] = useState<Record<string, string>>({});
  const [clozeAns, setClozeAns] = useState<Record<string, string>>({});
  const [ctAns, setCtAns] = useState<Record<string, string>>({});

  const [result, setResult] = useState<SubmitResponse["auto"] | null>(null);
  const [alreadySubmitted, setAlreadySubmitted] = useState(false);

  // ── Load items on mount ────────────────────────────────────────────────────
  useEffect(() => {
    const token =
      typeof window !== "undefined" ? localStorage.getItem("participantToken") : null;
    if (!token) {
      setErrorMsg(
        "Bạn cần enrol vào nghiên cứu trước khi làm posttest. Hãy vào /research/consent."
      );
      setPhase("error");
      return;
    }
    fetch(`/api/research/posttest/items?form=${formParam}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(async (r) => {
        if (r.status === 401) throw new Error("Token participant không hợp lệ hoặc đã hết hạn.");
        if (!r.ok) throw new Error(`Server trả về ${r.status}`);
        return (await r.json()) as ItemsResponse;
      })
      .then((data) => {
        if (!data.success) throw new Error("API trả về success:false");
        setItems(data);
        setPhase("recall");
      })
      .catch((e) => {
        setErrorMsg(String(e.message ?? e));
        setPhase("error");
      });
  }, [formParam]);

  // ── Progress helpers ───────────────────────────────────────────────────────
  const recallDone = useMemo(
    () => (items ? items.sections.recall.every((it) => recallAns[it.itemId]) : false),
    [items, recallAns]
  );
  const clozeDone = useMemo(
    () => (items ? items.sections.cloze.every((it) => (clozeAns[it.itemId] ?? "").trim()) : false),
    [items, clozeAns]
  );
  const ctDone = useMemo(() => {
    if (!items?.sections.contextTransfer) return true;
    return items.sections.contextTransfer.every((it) => {
      const txt = (ctAns[it.itemId] ?? "").trim();
      const wc = txt.split(/\s+/).filter(Boolean).length;
      return wc >= it.minWords;
    });
  }, [items, ctAns]);

  // ── Submit ─────────────────────────────────────────────────────────────────
  async function submit() {
    if (!items) return;
    const token = localStorage.getItem("participantToken");
    if (!token) {
      setErrorMsg("Mất token participant giữa chừng — hãy đăng nhập lại.");
      setPhase("error");
      return;
    }
    setPhase("submitting");
    try {
      const res = await fetch("/api/research/posttest/submit", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          testType:
            formParam === "delayed" ? "posttest_delayed" : "posttest_immediate",
          answers: {
            recall: recallAns,
            cloze: clozeAns,
            contextTransfer: ctAns,
          },
          administeredAt: new Date().toISOString(),
        }),
      });
      const data = (await res.json()) as SubmitResponse;
      if (res.status === 409 && data.alreadySubmitted) {
        setAlreadySubmitted(true);
        setPhase("done");
        return;
      }
      if (!res.ok || !data.success) {
        throw new Error(data.message ?? `HTTP ${res.status}`);
      }
      setResult(data.auto ?? null);
      setPhase("done");
    } catch (e: any) {
      setErrorMsg(String(e?.message ?? e));
      setPhase("error");
    }
  }

  // ── Render ─────────────────────────────────────────────────────────────────
  if (phase === "loading") {
    return <Center>Đang tải bộ đề posttest…</Center>;
  }
  if (phase === "error") {
    return (
      <Center>
        <div style={{ color: COLOR.danger, marginBottom: 12 }}>Lỗi: {errorMsg}</div>
        <button onClick={() => router.push("/research/consent")} style={btnStyle}>
          Về trang consent
        </button>
      </Center>
    );
  }
  if (!items) return null;

  if (phase === "done") {
    return (
      <Center>
        <h2 style={{ color: COLOR.primaryDark }}>
          {alreadySubmitted ? "Bạn đã nộp posttest này trước đó" : "Đã nộp posttest ✅"}
        </h2>
        {result && (
          <div style={{ marginTop: 16, color: COLOR.text, textAlign: "left" }}>
            <div>Số câu Recall đúng: <b>{result.recallRaw}</b></div>
            <div>Số câu Cloze đúng: <b>{result.clozeRaw}</b></div>
            <div style={{ color: COLOR.muted, marginTop: 8, fontSize: 13 }}>
              Section 3 (Context Transfer) sẽ được chấm bởi rubric — điểm cuối cùng
              cập nhật sau khi có kết quả judge.
            </div>
          </div>
        )}
        <button onClick={() => router.push("/dashboard-new")} style={{ ...btnStyle, marginTop: 20 }}>
          Về dashboard
        </button>
      </Center>
    );
  }

  const totalSections = items.sections.contextTransfer ? 3 : 2;
  const stepNum =
    phase === "recall" ? 1 : phase === "cloze" ? 2 : phase === "contextTransfer" ? 3 : totalSections;

  return (
    <div style={{ background: COLOR.bg, minHeight: "100vh", padding: "24px 16px" }}>
      <div style={{ maxWidth: 720, margin: "0 auto" }}>
        <header style={{ marginBottom: 20 }}>
          <div style={{ color: COLOR.muted, fontSize: 13 }}>
            Posttest ({formParam === "delayed" ? "Delayed – Tuần 10" : "Immediate – Tuần 8"}) ·
            {" "}Bước {stepNum}/{totalSections} · Form {items.formVersion}
          </div>
          <ProgressBar value={stepNum} max={totalSections} />
        </header>

        {phase === "recall" && (
          <SectionCard
            title="Phần 1 — Chọn định nghĩa đúng"
            instructions={items.instructions?.recall}
          >
            {items.sections.recall.map((it, idx) => (
              <div key={it.itemId} style={itemStyle}>
                <div style={{ fontWeight: 600 }}>
                  {idx + 1}. {it.word}
                </div>
                {it.options.map((opt, i) => (
                  <label key={i} style={optionStyle}>
                    <input
                      type="radio"
                      name={it.itemId}
                      value={String(i)}
                      checked={recallAns[it.itemId] === String(i)}
                      onChange={() =>
                        setRecallAns((prev) => ({ ...prev, [it.itemId]: String(i) }))
                      }
                    />
                    <span style={{ marginLeft: 8 }}>{opt}</span>
                  </label>
                ))}
              </div>
            ))}
            <NavRow
              onNext={() => setPhase("cloze")}
              disabled={!recallDone}
              nextLabel="Tiếp: Phần 2 →"
            />
          </SectionCard>
        )}

        {phase === "cloze" && (
          <SectionCard
            title="Phần 2 — Điền vào chỗ trống"
            instructions={items.instructions?.cloze}
          >
            {items.sections.cloze.map((it, idx) => (
              <div key={it.itemId} style={itemStyle}>
                <div style={{ marginBottom: 6 }}>
                  <b>{idx + 1}.</b> {it.context}
                </div>
                <input
                  type="text"
                  value={clozeAns[it.itemId] ?? ""}
                  onChange={(e) =>
                    setClozeAns((prev) => ({ ...prev, [it.itemId]: e.target.value }))
                  }
                  placeholder="Gõ từ vào đây…"
                  style={inputStyle}
                />
              </div>
            ))}
            <NavRow
              onBack={() => setPhase("recall")}
              onNext={() =>
                setPhase(items.sections.contextTransfer ? "contextTransfer" : "review")
              }
              disabled={!clozeDone}
              nextLabel={items.sections.contextTransfer ? "Tiếp: Phần 3 →" : "Xem lại →"}
            />
          </SectionCard>
        )}

        {phase === "contextTransfer" && items.sections.contextTransfer && (
          <SectionCard
            title="Phần 3 — Viết câu theo tình huống"
            instructions={items.instructions?.contextTransfer}
          >
            {items.sections.contextTransfer.map((it, idx) => {
              const txt = ctAns[it.itemId] ?? "";
              const wc = txt.trim().split(/\s+/).filter(Boolean).length;
              const wcOk = wc >= it.minWords && wc <= it.maxWords;
              return (
                <div key={it.itemId} style={itemStyle}>
                  <div style={{ fontWeight: 600, marginBottom: 4 }}>
                    {idx + 1}. Từ mục tiêu: <span style={{ color: COLOR.primaryDark }}>{it.word}</span>
                  </div>
                  <div style={{ color: COLOR.muted, fontSize: 13, marginBottom: 6 }}>
                    Tình huống: {it.scenario}
                  </div>
                  <div style={{ marginBottom: 6 }}>{it.prompt}</div>
                  <textarea
                    rows={4}
                    value={txt}
                    onChange={(e) =>
                      setCtAns((prev) => ({ ...prev, [it.itemId]: e.target.value }))
                    }
                    placeholder={`Viết ${it.minWords}-${it.maxWords} từ…`}
                    style={{ ...inputStyle, resize: "vertical", fontFamily: "inherit" }}
                  />
                  <div
                    style={{
                      fontSize: 12,
                      color: wcOk ? COLOR.primaryDark : COLOR.muted,
                      marginTop: 4,
                    }}
                  >
                    {wc}/{it.minWords}–{it.maxWords} từ
                  </div>
                </div>
              );
            })}
            <NavRow
              onBack={() => setPhase("cloze")}
              onNext={() => setPhase("review")}
              disabled={!ctDone}
              nextLabel="Xem lại →"
            />
          </SectionCard>
        )}

        {phase === "review" && (
          <SectionCard title="Xem lại và nộp">
            <div style={{ color: COLOR.text }}>
              <p>Bạn đã trả lời:</p>
              <ul>
                <li>Phần 1 (Recall): {Object.keys(recallAns).length}/{items.counts.recall} câu</li>
                <li>Phần 2 (Cloze): {Object.keys(clozeAns).length}/{items.counts.cloze} câu</li>
                {items.sections.contextTransfer && (
                  <li>
                    Phần 3 (Context Transfer): {Object.keys(ctAns).length}/
                    {items.counts.contextTransfer ?? 0} câu
                  </li>
                )}
              </ul>
              <p style={{ color: COLOR.danger, fontSize: 13 }}>
                Sau khi nộp bạn <b>không thể làm lại</b> (bản ghi được khoá theo pre-registration).
              </p>
            </div>
            <NavRow
              onBack={() =>
                setPhase(items.sections.contextTransfer ? "contextTransfer" : "cloze")
              }
              onNext={submit}
              nextLabel="Nộp posttest"
              nextPrimary
            />
          </SectionCard>
        )}

        {phase === "submitting" && <Center>Đang nộp… giữ tab mở.</Center>}
      </div>
    </div>
  );
}

// ── Small subcomponents ──────────────────────────────────────────────────────
function SectionCard({
  title,
  instructions,
  children,
}: {
  title: string;
  instructions?: string;
  children: React.ReactNode;
}) {
  return (
    <section
      style={{
        background: COLOR.card,
        borderRadius: 12,
        border: `1px solid ${COLOR.border}`,
        padding: 20,
      }}
    >
      <h2 style={{ margin: "0 0 4px 0", color: COLOR.text }}>{title}</h2>
      {instructions && (
        <div style={{ color: COLOR.muted, fontSize: 14, marginBottom: 12 }}>{instructions}</div>
      )}
      {children}
    </section>
  );
}

function NavRow({
  onBack,
  onNext,
  disabled,
  nextLabel,
  nextPrimary,
}: {
  onBack?: () => void;
  onNext: () => void;
  disabled?: boolean;
  nextLabel: string;
  nextPrimary?: boolean;
}) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", marginTop: 20 }}>
      {onBack ? (
        <button onClick={onBack} style={btnGhost}>
          ← Quay lại
        </button>
      ) : (
        <span />
      )}
      <button
        onClick={onNext}
        disabled={disabled}
        style={{
          ...btnStyle,
          opacity: disabled ? 0.5 : 1,
          cursor: disabled ? "not-allowed" : "pointer",
          background: nextPrimary ? COLOR.primaryDark : COLOR.primary,
        }}
      >
        {nextLabel}
      </button>
    </div>
  );
}

function ProgressBar({ value, max }: { value: number; max: number }) {
  const pct = Math.round((value / max) * 100);
  return (
    <div
      style={{
        height: 8,
        background: COLOR.border,
        borderRadius: 4,
        overflow: "hidden",
        marginTop: 6,
      }}
    >
      <div style={{ width: `${pct}%`, height: "100%", background: COLOR.primary }} />
    </div>
  );
}

function Center({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        background: COLOR.bg,
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: 24,
        textAlign: "center",
        color: COLOR.text,
      }}
    >
      {children}
    </div>
  );
}

// ── Styles ───────────────────────────────────────────────────────────────────
const btnStyle: React.CSSProperties = {
  background: COLOR.primary,
  color: "#fff",
  border: "none",
  borderRadius: 8,
  padding: "10px 18px",
  fontWeight: 600,
  cursor: "pointer",
  fontSize: 15,
};
const btnGhost: React.CSSProperties = {
  background: "transparent",
  color: COLOR.muted,
  border: `1px solid ${COLOR.border}`,
  borderRadius: 8,
  padding: "10px 18px",
  cursor: "pointer",
  fontSize: 15,
};
const itemStyle: React.CSSProperties = {
  padding: "12px 0",
  borderBottom: `1px solid ${COLOR.border}`,
};
const optionStyle: React.CSSProperties = {
  display: "block",
  padding: "6px 0",
  cursor: "pointer",
  color: COLOR.text,
};
const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "8px 10px",
  border: `1px solid ${COLOR.border}`,
  borderRadius: 6,
  fontSize: 15,
  color: COLOR.text,
  background: "#fff",
};
