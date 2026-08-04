// lib/judgeRubric.ts
// Rubric definitions and scoring for context-transfer items (Ngày 25).
//
// Based on Nation (2001) aspects of word knowledge and Read (2000) vocabulary
// assessment framework, adapted for L2 EFL learners at CEFR B1-B2.
//
// ── Rubric dimensions (each 0-2) ─────────────────────────────────────────────
//
//  form       — Is the target word morphologically/orthographically correct?
//  meaning    — Is the target word used with the intended semantic sense?
//  use        — Is the word integrated grammatically and collocationally?
//  contextFit — Does the response address the given scenario? (CT items only)
//
// Max total:  8  (all 4 dimensions)
//             6  (form + meaning + use only, for non-CT items if needed)
//
// Normalization: totalScore / maxPossible × 100 → 0-100

export interface RubricScores {
  form: 0 | 1 | 2;
  meaning: 0 | 1 | 2;
  use: 0 | 1 | 2;
  contextFit?: 0 | 1 | 2;  // required for context_transfer items
}

export interface ParsedJudgeOutput {
  rubric: RubricScores;
  totalScore: number;      // raw sum 0-8 (or 0-6)
  normalizedScore: number; // 0-100
  rationale: string;
  valid: boolean;          // false if parsing failed or scores out of range
  parseError?: string;
}

// ── Rubric criteria (used in prompts and calibration guide) ──────────────────

export const RUBRIC_CRITERIA = {
  form: {
    label: "Form",
    description: "Is the target word spelled and morphologically used correctly?",
    levels: [
      { score: 0, label: "Incorrect", desc: "Word absent, misspelled beyond recognition, or wrong part-of-speech that changes meaning entirely." },
      { score: 1, label: "Partially correct", desc: "Minor spelling/inflection error (e.g., 'contributes' where 'contribute' is needed) that does not obscure meaning." },
      { score: 2, label: "Correct", desc: "Word spelled correctly and in the appropriate form for the grammatical context." },
    ],
  },
  meaning: {
    label: "Meaning",
    description: "Does the word's use reflect the correct semantic sense?",
    levels: [
      { score: 0, label: "Incorrect", desc: "Word used with a clearly wrong meaning, or the meaning is unrecognisable from context." },
      { score: 1, label: "Partially correct", desc: "Meaning is approximately right but imprecise or the demonstration is unclear." },
      { score: 2, label: "Correct", desc: "The intended meaning is clearly demonstrated in context." },
    ],
  },
  use: {
    label: "Use",
    description: "Is the word integrated grammatically and collocationally?",
    levels: [
      { score: 0, label: "Incorrect", desc: "Ungrammatical phrase, broken collocation, or word floats unconnected to the rest of the sentence." },
      { score: 1, label: "Partially correct", desc: "Mostly grammatical but with an awkward collocation or minor syntactic error." },
      { score: 2, label: "Correct", desc: "Natural grammar and collocation; the word fits seamlessly into the sentence." },
    ],
  },
  contextFit: {
    label: "Context Fit",
    description: "Does the response engage meaningfully with the given scenario?",
    levels: [
      { score: 0, label: "No fit", desc: "Response ignores the scenario entirely; could be pasted under any other prompt." },
      { score: 1, label: "Partial fit", desc: "Response acknowledges the scenario but the connection is superficial or generic." },
      { score: 2, label: "Good fit", desc: "Response clearly and specifically addresses the described situation." },
    ],
  },
} as const;

// ── Validation ────────────────────────────────────────────────────────────────

const VALID_SCORES = new Set([0, 1, 2]);

export function isValidRubricScores(r: unknown): r is RubricScores {
  if (!r || typeof r !== "object") return false;
  const obj = r as Record<string, unknown>;
  return (
    VALID_SCORES.has(obj.form as number) &&
    VALID_SCORES.has(obj.meaning as number) &&
    VALID_SCORES.has(obj.use as number) &&
    (obj.contextFit === undefined || VALID_SCORES.has(obj.contextFit as number))
  );
}

/** Compute raw total (0-6 without contextFit, 0-8 with). */
export function sumRubric(r: RubricScores): number {
  return r.form + r.meaning + r.use + (r.contextFit ?? 0);
}

/** Max possible score for a given rubric. */
export function maxRubricScore(r: RubricScores): number {
  return r.contextFit !== undefined ? 8 : 6;
}

/** Normalize a raw rubric total to 0-100. */
export function normalizeRubricScore(total: number, max: number): number {
  if (max === 0) return 0;
  return Math.round((total / max) * 100);
}

// ── LLM output parser ─────────────────────────────────────────────────────────

/**
 * Parse the LLM judge's JSON output into a validated ParsedJudgeOutput.
 * Accepts JSON in the response text anywhere — LLMs often add preamble/postamble.
 * Returns `valid: false` rather than throwing on any parse/validation failure.
 */
export function parseLLMJudgeOutput(
  raw: string,
  expectContextFit: boolean
): ParsedJudgeOutput {
  // Extract JSON object from the response
  const jsonMatch = raw.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    return {
      rubric: { form: 0, meaning: 0, use: 0 },
      totalScore: 0, normalizedScore: 0, rationale: "",
      valid: false, parseError: "No JSON object found in LLM output",
    };
  }

  let parsed: Record<string, unknown>;
  try {
    parsed = JSON.parse(jsonMatch[0]);
  } catch (e: any) {
    return {
      rubric: { form: 0, meaning: 0, use: 0 },
      totalScore: 0, normalizedScore: 0, rationale: "",
      valid: false, parseError: `JSON parse error: ${e.message}`,
    };
  }

  // Coerce score values (LLMs sometimes return strings "2" instead of 2)
  const coerce = (v: unknown): number => {
    const n = Number(v);
    return Number.isInteger(n) ? n : -1;
  };

  const rubric: RubricScores = {
    form: coerce(parsed.form) as 0 | 1 | 2,
    meaning: coerce(parsed.meaning) as 0 | 1 | 2,
    use: coerce(parsed.use) as 0 | 1 | 2,
  };
  if (expectContextFit) {
    rubric.contextFit = coerce(parsed.contextFit) as 0 | 1 | 2;
  }

  if (!isValidRubricScores(rubric)) {
    return {
      rubric,
      totalScore: 0, normalizedScore: 0, rationale: "",
      valid: false,
      parseError: `Scores out of range: ${JSON.stringify({ form: parsed.form, meaning: parsed.meaning, use: parsed.use, contextFit: parsed.contextFit })}`,
    };
  }

  const rationale = typeof parsed.rationale === "string"
    ? parsed.rationale.slice(0, 1000)  // cap length
    : "";
  const totalScore = sumRubric(rubric);
  const normalizedScore = normalizeRubricScore(totalScore, maxRubricScore(rubric));

  return { rubric, totalScore, normalizedScore, rationale, valid: true };
}
