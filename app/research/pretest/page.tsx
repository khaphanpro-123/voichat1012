"use client";
// app/research/pretest/page.tsx
// CEFR vocabulary placement test — step 2 of the enrolment flow.
//
// Flow: /research/consent → HERE → POST /api/research/pretest/score
//       → POST /api/research/enrol → stores token → /research/enrol-complete
//
// The page fetches items from /api/research/pretest/items (no correctIndex),
// collects answers, scores server-side, then enrols the participant.

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

interface PretestItem {
  id: string;
  band: string;
  word: string;
  options: string[];
}

type Phase = "loading" | "testing" | "submitting" | "done" | "error";

export default function PretestPage() {
  const router = useRouter();
  const [items, setItems] = useState<PretestItem[]>([]);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [phase, setPhase] = useState<Phase>("loading");
  const [errorMsg, setErrorMsg] = useState("");
  const [result, setResult] = useState<{ score: number; cefrLevel: string } | null>(null);

  useEffect(() => {
    // Guard: must have completed consent
    if (typeof window === "undefined") return;
    const code = localStorage.getItem("pendingParticipantCode");
    const hash = localStorage.getItem("pendingConsentHash");
    if (!code || !hash) {
      router.replace("/research/consent");
      return;
    }

    fetch("/api/research/pretest/items")
      .then((r) => r.json())
      .then((data) => {
        if (data.success) {
          setItems(data.items);
          setPhase("testing");
        } else {
          setErrorMsg("Could not load test items. Please try again.");
          setPhase("error");
        }
      })
      .catch(() => {
        setErrorMsg("Network error loading items.");
        setPhase("error");
      });
  }, [router]);

  function pick(itemId: string, idx: number) {
    setAnswers((prev) => ({ ...prev, [itemId]: idx }));
  }

  async function submit() {
    if (Object.keys(answers).length < items.length) {
      setErrorMsg(`Please answer all ${items.length} questions before submitting.`);
      return;
    }
    setPhase("submitting");
    setErrorMsg("");

    try {
      // 1. Score the pretest
      const scoreRes = await fetch("/api/research/pretest/score", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ answers, completedAt: new Date().toISOString() }),
      });
      const scoreData = await scoreRes.json();
      if (!scoreData.success) throw new Error(scoreData.message ?? "Score error");
      // D-016: pretest/score mints a server-side submissionId that enrol must verify.
      // Without it the enrol route will 400 ("pretestSubmissionId required").
      if (!scoreData.submissionId) {
        throw new Error("Pretest submission not persisted — please retry.");
      }

      setResult({ score: scoreData.score, cefrLevel: scoreData.cefrLevel });

      // 2. Enrol with the scored result
      const code = localStorage.getItem("pendingParticipantCode")!;
      const hash = localStorage.getItem("pendingConsentHash")!;
      const signedAt = localStorage.getItem("pendingConsentSignedAt") ?? new Date().toISOString();

      const enrolRes = await fetch("/api/research/enrol", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          participantCode: code,
          cefrLevel: scoreData.cefrLevel,
          consentSignedAt: signedAt,
          consentDocHash: hash,
          // D-016: server verifies score from submissionId, not client-supplied pretestScore.
          pretestSubmissionId: scoreData.submissionId,
          pretestCompletedAt: new Date().toISOString(),
        }),
      });
      const enrolData = await enrolRes.json();
      if (!enrolData.success && !enrolData.deduplicated) {
        throw new Error(enrolData.message ?? "Enrolment failed");
      }

      // 3. Store token and clean up pending state
      localStorage.setItem("participantToken", enrolData.participantToken);
      localStorage.setItem("armLabel", enrolData.armLabel);
      localStorage.removeItem("pendingParticipantCode");
      localStorage.removeItem("pendingConsentHash");
      localStorage.removeItem("pendingConsentSignedAt");

      setPhase("done");
    } catch (err: any) {
      setErrorMsg(err.message ?? "Something went wrong. Please try again.");
      setPhase("testing");
    }
  }

  // ── Render ──────────────────────────────────────────────────────────────────
  if (phase === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center text-gray-500 text-sm">
        Loading placement test…
      </div>
    );
  }

  if (phase === "done" && result) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="max-w-md w-full bg-white rounded-lg shadow p-8 text-center space-y-4">
          <div className="text-5xl">✅</div>
          <h1 className="text-xl font-semibold">Enrolment complete!</h1>
          <p className="text-gray-600 text-sm">
            Placement test score:{" "}
            <span className="font-semibold">{result.score}/100</span> (CEFR{" "}
            <span className="font-semibold">{result.cefrLevel}</span>)
          </p>
          <p className="text-gray-500 text-xs">
            You have been assigned to a study arm. The condition is not revealed
            to you — this keeps the study results fair and unbiased.
          </p>
          <button
            onClick={() => router.push("/dashboard-new")}
            className="mt-4 w-full py-2.5 px-4 bg-blue-600 text-white rounded font-medium text-sm hover:bg-blue-700 transition"
          >
            Go to Study App →
          </button>
        </div>
      </div>
    );
  }

  if (phase === "error") {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="max-w-md text-center space-y-3">
          <p className="text-red-600">{errorMsg}</p>
          <button onClick={() => router.push("/research/consent")} className="text-blue-600 underline text-sm">
            Back to consent
          </button>
        </div>
      </div>
    );
  }

  // ── Testing phase ─────────────────────────────────────────────────────────
  const answered = Object.keys(answers).length;

  return (
    <div className="min-h-screen bg-gray-50 py-10 px-4">
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="bg-white rounded-lg shadow px-6 py-4 flex items-center justify-between">
          <h1 className="text-lg font-semibold text-gray-900">Vocabulary Placement Test</h1>
          <span className="text-sm text-gray-500">
            {answered} / {items.length} answered
          </span>
        </div>

        <p className="text-sm text-gray-500 px-1">
          Choose the best definition for each word. There are no tricks — pick
          what feels most natural. This helps place you in the right difficulty level.
        </p>

        {items.map((item, i) => (
          <div key={item.id} className="bg-white rounded-lg shadow p-5 space-y-3">
            <div className="flex items-baseline gap-3">
              <span className="text-xs text-gray-400 w-6 shrink-0">{i + 1}.</span>
              <span className="font-semibold text-gray-900">{item.word}</span>
            </div>
            <div className="grid grid-cols-1 gap-2 pl-9">
              {item.options.map((opt, idx) => (
                <label
                  key={idx}
                  className={`flex items-start gap-2.5 cursor-pointer rounded border px-3 py-2 text-sm transition
                    ${answers[item.id] === idx
                      ? "border-blue-500 bg-blue-50 text-blue-900"
                      : "border-gray-200 text-gray-700 hover:bg-gray-50"
                    }`}
                >
                  <input
                    type="radio"
                    name={item.id}
                    value={idx}
                    checked={answers[item.id] === idx}
                    onChange={() => pick(item.id, idx)}
                    className="mt-0.5 h-3.5 w-3.5 shrink-0"
                  />
                  {opt}
                </label>
              ))}
            </div>
          </div>
        ))}

        {errorMsg && (
          <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded px-3 py-2">
            {errorMsg}
          </p>
        )}

        <div className="flex justify-end pb-6">
          <button
            onClick={submit}
            disabled={phase === "submitting"}
            className="py-2.5 px-6 bg-blue-600 text-white rounded font-medium text-sm
                       hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
          >
            {phase === "submitting" ? "Submitting…" : "Submit Answers"}
          </button>
        </div>
      </div>
    </div>
  );
}
