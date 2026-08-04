"use client";
// app/research/consent/page.tsx
// Participant consent form — step 1 of the enrolment flow.
//
// Flow: consent → pretest (/research/pretest) → enrol (POST /api/research/enrol)
//       → study app (stores participantToken in localStorage)
//
// The consent document is hashed client-side (SHA-256 of the visible text) and
// the hash is sent to the enrol endpoint for audit. The actual hash pre-registered
// in the IRB must match — do NOT change the consent text after pre-registration.
//
// NEVER embed the real condition name here — the page must be condition-blind.

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

// ── Consent document ─────────────────────────────────────────────────────────
// This exact text is hashed and stored in the Participant record.
// Change it only with IRB amendment. Version stamp it if you do.
export const CONSENT_TEXT = `
INFORMED CONSENT — EnglishPal Vocabulary Study (DART-RCT v1.0)

Principal Investigator: [PI name, institution, contact — fill before IRB submission]
Study Duration: 8 weeks + follow-up
IRB Protocol: [Number pending]

PURPOSE
You are invited to participate in a study examining how different spaced-repetition
scheduling algorithms affect English vocabulary learning. Your review sessions will
be recorded and analysed to compare learning outcomes across scheduling conditions.

WHAT YOU WILL DO
• Complete a short vocabulary placement test (≈10 minutes).
• Use the EnglishPal app to study vocabulary for at least 10 minutes per day,
  5 days per week, for 8 weeks.
• Complete a vocabulary posttest at weeks 8 and 10.

DATA COLLECTED
• Vocabulary review events: the word shown, your answer, response time, and the
  scheduling algorithm's decision. No personally identifiable information is
  stored alongside your responses — you are identified only by an anonymous code.
• Pretest and posttest scores.

RISKS & BENEFITS
Risk is minimal. You will invest approximately 10 min/day. Potential benefits
include improved English vocabulary. You will receive access to the full study
results upon completion.

CONFIDENTIALITY
Your data are stored on secured servers and identified only by a participant code.
Your name is never recorded. Data are retained for 5 years per institutional policy.

VOLUNTARY PARTICIPATION
Participation is voluntary. You may withdraw at any time by contacting the PI.
Withdrawal will not affect your relationship with the institution.

CONSENT
By clicking "I Agree" below, you confirm that you have read this form, understand
the study, and voluntarily agree to participate.

Version: DART-RCT-CONSENT-v1.0 | Date: 2026-08-04
`.trim();

// ── SHA-256 hash (browser SubtleCrypto) ──────────────────────────────────────
async function sha256Hex(text: string): Promise<string> {
  const buf = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(text)
  );
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

// ── Component ─────────────────────────────────────────────────────────────────
export default function ConsentPage() {
  const router = useRouter();
  const [participantCode, setParticipantCode] = useState("");
  const [agreed, setAgreed] = useState(false);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Warn if already enrolled
  useEffect(() => {
    if (typeof window !== "undefined" && localStorage.getItem("participantToken")) {
      router.replace("/research/pretest");
    }
  }, [router]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    const code = participantCode.trim().toUpperCase();
    if (!/^P\d{4}$/.test(code)) {
      setError("Participant code must be in the format P0001–P9999.");
      return;
    }
    if (!agreed) {
      setError("You must agree to the consent form to continue.");
      return;
    }

    setSubmitting(true);
    try {
      const hash = await sha256Hex(CONSENT_TEXT);
      // Store code + hash for the pretest page
      localStorage.setItem("pendingParticipantCode", code);
      localStorage.setItem("pendingConsentHash", hash);
      localStorage.setItem("pendingConsentSignedAt", new Date().toISOString());
      router.push("/research/pretest");
    } catch (err) {
      setError("Something went wrong. Please try again.");
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-start justify-center py-12 px-4">
      <div className="max-w-2xl w-full bg-white rounded-lg shadow p-8 space-y-6">
        <h1 className="text-2xl font-semibold text-gray-900">
          Research Participation — Consent Form
        </h1>

        {/* Consent text */}
        <div className="border rounded bg-gray-50 p-4 h-72 overflow-y-auto text-sm text-gray-700 whitespace-pre-wrap font-mono leading-relaxed">
          {CONSENT_TEXT}
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Participant code */}
          <div>
            <label
              htmlFor="pcode"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Your participant code
            </label>
            <input
              id="pcode"
              type="text"
              value={participantCode}
              onChange={(e) => setParticipantCode(e.target.value)}
              placeholder="e.g. P0042"
              className="w-full border rounded px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
              maxLength={5}
              autoComplete="off"
              spellCheck={false}
            />
            <p className="text-xs text-gray-500 mt-1">
              Provided by the researcher. Format: P followed by 4 digits.
            </p>
          </div>

          {/* Agree checkbox */}
          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={agreed}
              onChange={(e) => setAgreed(e.target.checked)}
              className="mt-0.5 h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <span className="text-sm text-gray-700">
              I have read and understand the consent form above and voluntarily
              agree to participate in this study.
            </span>
          </label>

          {error && (
            <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded px-3 py-2">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={submitting || !agreed}
            className="w-full py-2.5 px-4 bg-blue-600 text-white rounded font-medium text-sm
                       hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
          >
            {submitting ? "Processing…" : "I Agree — Continue to Placement Test"}
          </button>
        </form>

        <p className="text-xs text-gray-400 text-center">
          DART-RCT v1.0 · Consent hash will be recorded for audit purposes.
        </p>
      </div>
    </div>
  );
}
