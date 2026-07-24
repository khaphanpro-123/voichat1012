// lib/contextTransferJudge.ts
// LLM-as-a-Judge scorer for context transfer (paper Sec 2.5, RQ3).
// Four 0-10 dimensions: Accuracy, Fluency, Appropriateness, Creativity.
// Validated in the paper against human raters (ICC > 0.80, Pearson > 0.70).

import { callAI } from "./aiProvider";

export interface JudgeInput {
  word: string;                   // target vocabulary
  learnerSentence: string;        // sentence produced by the learner
  targetContext?: string;         // the passage the sentence should transfer into
  reference?: string;             // optional gold example
}

export interface JudgeScores {
  accuracy: number;               // ∈ [0, 10]
  fluency: number;
  appropriateness: number;
  creativity: number;
  composite: number;              // simple mean, 0..10
  rationale?: string;
}

const RUBRIC = `You are an expert L2 English assessor. Rate the learner's use of the target word.
Return STRICT JSON with keys: accuracy, fluency, appropriateness, creativity, rationale.
Each score is an INTEGER 0-10 (0 = terrible, 10 = expert). Use these definitions:
- accuracy: does the sentence use the target word with its correct meaning?
- fluency: is the sentence grammatical and natural for a native reader?
- appropriateness: does the usage fit the target context / register?
- creativity: is the phrasing non-trivial (not a copy of the reference example)?`;

function buildPrompt(input: JudgeInput): string {
  return `${RUBRIC}

Target word: ${input.word}
Learner sentence: ${input.learnerSentence}
${input.targetContext ? `Target context: ${input.targetContext}` : ""}
${input.reference ? `Reference example: ${input.reference}` : ""}

Respond with JSON only, no prose.`;
}

function extractJSON(text: string): any | null {
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) return null;
  try { return JSON.parse(match[0]); } catch { return null; }
}

function clamp10(v: unknown): number {
  const n = typeof v === "number" ? v : Number(v);
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(10, Math.round(n)));
}

export async function judgeContextTransfer(input: JudgeInput): Promise<JudgeScores> {
  const prompt = buildPrompt(input);
  const res = await callAI(
    prompt,
    {
      openaiKey: process.env.OPENAI_API_KEY,
      groqKey: process.env.GROQ_API_KEY,
      cohereKey: process.env.COHERE_API_KEY,
    },
    { maxTokens: 300, temperature: 0 } as any,
  );

  const text = (res as any)?.text || (res as any)?.content || "";
  const parsed = extractJSON(String(text)) ?? {};

  const accuracy = clamp10(parsed.accuracy);
  const fluency = clamp10(parsed.fluency);
  const appropriateness = clamp10(parsed.appropriateness);
  const creativity = clamp10(parsed.creativity);
  const composite = (accuracy + fluency + appropriateness + creativity) / 4;

  return {
    accuracy,
    fluency,
    appropriateness,
    creativity,
    composite,
    rationale: typeof parsed.rationale === "string" ? parsed.rationale : undefined,
  };
}
