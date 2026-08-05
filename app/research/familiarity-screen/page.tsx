"use client";
// app/research/familiarity-screen/page.tsx
//
// H5 Word Familiarity Screening Form.
// External screeners (N=20, outside research sample) rate which words they already know.
// No account required. screenerId is self-reported.
// Results feed into analyze_familiarity.py → words ≥70% already known flagged for removal.

import { useState, useEffect, useRef } from "react";

interface WordItem {
  id: string;
  word: string;
  definition: string;
  cefrBand: string;
  partOfSpeech: string;
}

type Responses = Record<string, boolean>;

const INSTRUCTIONS = `
For each word below, mark whether you already know it well enough to use it naturally in a sentence —
without needing to look it up. This is not a test of how to spell it or how smart you are;
it helps us check whether our vocabulary list is appropriate for the study.

"Know well" means: you could explain its meaning in Vietnamese AND write a correct English sentence with it right now.
`.trim();

export default function FamiliarityScreenPage() {
  const [screenerId, setScreenerId] = useState("");
  const [words, setWords] = useState<WordItem[]>([]);
  const [responses, setResponses] = useState<Responses>({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<{ knownCount: number; unknownCount: number } | null>(null);
  const startTime = useRef<number>(Date.now());

  useEffect(() => {
    fetch("/api/research/familiarity-screen")
      .then((r) => r.json())
      .then((data) => {
        if (data.success) {
          setWords(data.words);
          const initial: Responses = {};
          for (const w of data.words) initial[w.id] = false;
          setResponses(initial);
        } else {
          setError("Failed to load words. Please refresh.");
        }
      })
      .catch(() => setError("Network error. Please refresh."))
      .finally(() => setLoading(false));
  }, []);

  function toggle(wordId: string) {
    setResponses((prev) => ({ ...prev, [wordId]: !prev[wordId] }));
  }

  const knownCount = Object.values(responses).filter(Boolean).length;
  const totalWords = words.length;

  async function submit() {
    setError("");
    if (!screenerId.trim()) {
      setError("Please enter your Screener ID before submitting.");
      return;
    }
    if (screenerId.trim().length > 20) {
      setError("Screener ID must be 20 characters or fewer.");
      return;
    }

    const durationSecs = Math.round((Date.now() - startTime.current) / 1000);
    setSubmitting(true);

    try {
      const res = await fetch("/api/research/familiarity-screen", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ screenerId: screenerId.trim(), responses, durationSecs }),
      });
      const data = await res.json();
      if (res.status === 409) {
        setError(`You have already submitted (Screener ID: ${screenerId.trim()}). Each screener submits once.`);
        return;
      }
      if (!data.success) {
        setError(data.message ?? "Submission failed.");
        return;
      }
      setResult({ knownCount: data.knownCount, unknownCount: data.unknownCount });
      setDone(true);
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  // ── Done screen ────────────────────────────────────────────────────────────
  if (done && result) {
    return (
      <div style={styles.container}>
        <div style={styles.doneBox}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>✅</div>
          <h2 style={{ color: "#1F497D", marginBottom: 12 }}>Thank you!</h2>
          <p>Your responses have been saved.</p>
          <div style={styles.statRow}>
            <span style={styles.stat}>{result.knownCount}</span>
            <span style={styles.statLabel}>words you already know</span>
          </div>
          <div style={styles.statRow}>
            <span style={styles.stat}>{result.unknownCount}</span>
            <span style={styles.statLabel}>words unfamiliar to you</span>
          </div>
          <p style={{ color: "#595959", fontSize: 14, marginTop: 24 }}>
            You may now close this page. Your responses help ensure the word list is
            appropriate for learners in the study.
          </p>
        </div>
      </div>
    );
  }

  // ── Loading / error ────────────────────────────────────────────────────────
  if (loading) {
    return <div style={styles.container}><p>Loading word list…</p></div>;
  }
  if (!loading && words.length === 0 && !error) {
    return <div style={styles.container}><p>No words available.</p></div>;
  }

  // Group words by CEFR band for display
  const b1Words = words.filter((w) => w.cefrBand === "B1");
  const b2Words = words.filter((w) => w.cefrBand === "B2");

  return (
    <div style={styles.container}>
      <header style={styles.header}>
        <h1 style={styles.title}>Vocabulary Familiarity Survey</h1>
        <p style={styles.subtitle}>EnglishPal Research — Word Bank Screening (H5)</p>
      </header>

      <section style={styles.instructions}>
        <h3 style={{ marginTop: 0, color: "#1F497D" }}>Instructions</h3>
        <p style={{ whiteSpace: "pre-line", lineHeight: 1.7, color: "#333" }}>{INSTRUCTIONS}</p>
      </section>

      {/* Screener ID */}
      <div style={styles.idBox}>
        <label style={styles.idLabel}>
          Your Screener ID (provided by the researcher, e.g. S001):
        </label>
        <input
          style={styles.idInput}
          value={screenerId}
          onChange={(e) => setScreenerId(e.target.value)}
          placeholder="e.g. S001"
          maxLength={20}
          disabled={submitting}
        />
      </div>

      {/* Progress bar */}
      <div style={styles.progressBar}>
        <div style={{ ...styles.progressFill, width: `${(knownCount / totalWords) * 100}%` }} />
      </div>
      <p style={styles.progressLabel}>
        You know <strong>{knownCount}</strong> out of <strong>{totalWords}</strong> words ({Math.round(knownCount / totalWords * 100)}%)
      </p>

      {/* B1 words */}
      <WordGroup
        title="B1-Level Words (30 words)"
        words={b1Words}
        responses={responses}
        onToggle={toggle}
        disabled={submitting}
      />

      {/* B2 words */}
      <WordGroup
        title="B2-Level Words (30 words)"
        words={b2Words}
        responses={responses}
        onToggle={toggle}
        disabled={submitting}
      />

      {/* Error */}
      {error && <div style={styles.errorBox}>{error}</div>}

      {/* Submit */}
      <div style={styles.submitArea}>
        <p style={{ color: "#595959", marginBottom: 12 }}>
          Please review your selections before submitting. You can only submit once.
        </p>
        <button
          style={submitting ? styles.buttonDisabled : styles.button}
          onClick={submit}
          disabled={submitting}
        >
          {submitting ? "Submitting…" : "Submit Responses"}
        </button>
      </div>
    </div>
  );
}

function WordGroup({
  title, words, responses, onToggle, disabled,
}: {
  title: string;
  words: WordItem[];
  responses: Responses;
  onToggle: (id: string) => void;
  disabled: boolean;
}) {
  return (
    <section style={styles.wordGroup}>
      <h2 style={styles.groupTitle}>{title}</h2>
      <div style={styles.wordGrid}>
        {words.map((w) => {
          const known = responses[w.id] ?? false;
          return (
            <button
              key={w.id}
              style={known ? styles.wordCardKnown : styles.wordCard}
              onClick={() => !disabled && onToggle(w.id)}
              disabled={disabled}
              title={w.definition}
            >
              <span style={styles.wordText}>{w.word}</span>
              <span style={styles.wordPos}>{w.partOfSpeech}</span>
              <span style={styles.wordDef}>{w.definition.slice(0, 60)}{w.definition.length > 60 ? "…" : ""}</span>
              <span style={known ? styles.knownBadge : styles.unknownBadge}>
                {known ? "✓ I know this" : "Don't know yet"}
              </span>
            </button>
          );
        })}
      </div>
    </section>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    maxWidth: 900, margin: "0 auto", padding: "24px 16px",
    fontFamily: "'Segoe UI', Arial, sans-serif",
  },
  header: { textAlign: "center", marginBottom: 24 },
  title: { color: "#1F497D", fontSize: 28, margin: 0 },
  subtitle: { color: "#595959", fontSize: 15, marginTop: 8 },
  instructions: {
    background: "#EBF0FA", borderRadius: 8, padding: 20, marginBottom: 24,
    border: "1px solid #BDD0F0",
  },
  idBox: { marginBottom: 20 },
  idLabel: { display: "block", fontWeight: 600, color: "#1F497D", marginBottom: 6 },
  idInput: {
    border: "1.5px solid #BDD0F0", borderRadius: 6, padding: "8px 12px",
    fontSize: 16, width: 160,
  },
  progressBar: { height: 10, background: "#E0E0E0", borderRadius: 5, marginBottom: 6 },
  progressFill: { height: "100%", background: "#2E75B6", borderRadius: 5, transition: "width 0.2s" },
  progressLabel: { color: "#595959", fontSize: 14, marginBottom: 20 },
  wordGroup: { marginBottom: 32 },
  groupTitle: { color: "#1F497D", borderBottom: "2px solid #BDD0F0", paddingBottom: 8 },
  wordGrid: {
    display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: 12,
  },
  wordCard: {
    display: "flex", flexDirection: "column", alignItems: "flex-start",
    padding: 14, background: "#FFF", border: "1.5px solid #D0D0D0",
    borderRadius: 8, cursor: "pointer", textAlign: "left", gap: 4,
    transition: "border-color 0.15s",
  },
  wordCardKnown: {
    display: "flex", flexDirection: "column", alignItems: "flex-start",
    padding: 14, background: "#E8F4EA", border: "2px solid #4CAF50",
    borderRadius: 8, cursor: "pointer", textAlign: "left", gap: 4,
  },
  wordText: { fontWeight: 700, fontSize: 18, color: "#1A1A1A" },
  wordPos: { fontSize: 12, color: "#888", fontStyle: "italic" },
  wordDef: { fontSize: 13, color: "#555", lineHeight: 1.4 },
  knownBadge: {
    marginTop: 6, background: "#4CAF50", color: "#FFF",
    borderRadius: 4, padding: "2px 8px", fontSize: 12, fontWeight: 600,
  },
  unknownBadge: {
    marginTop: 6, background: "#F0F0F0", color: "#888",
    borderRadius: 4, padding: "2px 8px", fontSize: 12,
  },
  errorBox: {
    background: "#FFF0F0", border: "1px solid #E57373", borderRadius: 6,
    padding: "12px 16px", color: "#C0392B", marginBottom: 16,
  },
  submitArea: { textAlign: "center", marginTop: 32, marginBottom: 48 },
  button: {
    background: "#1F497D", color: "#FFF", border: "none",
    borderRadius: 8, padding: "14px 36px", fontSize: 16, fontWeight: 700,
    cursor: "pointer",
  },
  buttonDisabled: {
    background: "#A0A0A0", color: "#FFF", border: "none",
    borderRadius: 8, padding: "14px 36px", fontSize: 16, fontWeight: 700,
    cursor: "not-allowed",
  },
  doneBox: {
    maxWidth: 480, margin: "80px auto", textAlign: "center",
    background: "#F0FFF4", border: "2px solid #4CAF50",
    borderRadius: 12, padding: 40,
  },
  statRow: { display: "flex", alignItems: "baseline", justifyContent: "center", gap: 8, marginTop: 12 },
  stat: { fontSize: 40, fontWeight: 700, color: "#1F497D" },
  statLabel: { fontSize: 16, color: "#555" },
};
