// lib/llmJudge.ts
// LLM judge for context-transfer posttest items (Ngày 25).
//
// Scientific integrity constraints:
//   1. BLIND: condition names are stripped from all inputs before the LLM sees them.
//      Use sanitiseJudgePrompt() on any free-text from participants.
//   2. DETERMINISTIC (near): temperature=0 for reproducibility. Same input → same scores.
//   3. AUDITABLE: every call records judgeId = model slug, so we can group by LLM version.
//   4. FALLIBLE: LLM output is validated; invalid parses are flagged, not silently zeroed.
//
// Prefer OpenAI for structured JSON output (more reliable than Groq/Cohere at low temp).
// Falls back to Groq if OpenAI key is absent.

import { callAI } from "@/lib/aiProvider";
import { sanitiseJudgePrompt } from "@/lib/experimentBlinding";
import { parseLLMJudgeOutput, RUBRIC_CRITERIA, ParsedJudgeOutput } from "@/lib/judgeRubric";
import { getWordById } from "@/lib/wordBank";

// ── Prompt builder ────────────────────────────────────────────────────────────

export interface JudgeInput {
  itemId: string;
  wordId: string;
  scenario: string;      // from ContextTransferItem
  prompt: string;        // full task prompt shown to participant
  userAnswer: string;    // participant's written response
}

function buildJudgePrompt(input: JudgeInput, wordDef: string): string {
  const safeAnswer = sanitiseJudgePrompt(input.userAnswer);

  return `You are a trained EFL vocabulary assessment judge scoring a learner's use of a target word in a context-transfer task. Score objectively using only the rubric — do not reward length or creativity, only accuracy of word knowledge.

## Task the learner received
${input.prompt}

## Target word
"${input.wordId.split("_")[1] ? "" : ""}"  ← (the word to judge is embedded in the task above)
Definition: ${wordDef}

## Learner's response
${safeAnswer}

## Rubric (score each dimension 0, 1, or 2)

**form** — Is the target word spelled and morphologically correct?
  0 = absent, misspelled beyond recognition, or wrong part-of-speech that changes meaning
  1 = minor spelling/inflection error that does not obscure meaning
  2 = correct spelling and form

**meaning** — Does the word's usage reflect its correct sense?
  0 = clearly wrong meaning or meaning unrecognisable
  1 = approximately right but imprecise
  2 = correct meaning clearly demonstrated

**use** — Is the word grammatically and collocationally integrated?
  0 = ungrammatical phrase or broken collocation
  1 = mostly grammatical but awkward
  2 = natural grammar and collocation

**contextFit** — Does the response engage meaningfully with the given scenario?
  0 = ignores the scenario; generic response
  1 = superficial or partial connection to scenario
  2 = clearly and specifically addresses the described situation

## Output format
Respond ONLY with valid JSON — no preamble, no markdown fencing:
{
  "form": <0|1|2>,
  "meaning": <0|1|2>,
  "use": <0|1|2>,
  "contextFit": <0|1|2>,
  "rationale": "<1-3 sentences explaining your scores>"
}`;
}

// ── Judge call ────────────────────────────────────────────────────────────────

export interface LLMJudgeResult {
  judgeId: string;            // e.g. "llm:gpt-4o-mini"
  parsed: ParsedJudgeOutput;
  rawOutput: string;
  durationMs: number;
  callSucceeded: boolean;     // false if callAI itself failed
}

/**
 * Run the LLM judge for one context-transfer item.
 * Returns a LLMJudgeResult regardless of success/failure — check parsed.valid.
 */
export async function runLLMJudge(input: JudgeInput): Promise<LLMJudgeResult> {
  const t0 = Date.now();

  const wordEntry = getWordById(input.wordId);
  const wordDef = wordEntry?.definition ?? "(definition not available)";

  const prompt = buildJudgePrompt(input, wordDef);

  const openaiKey = process.env.OPENAI_API_KEY ?? null;
  const groqKey = process.env.GROQ_API_KEY ?? null;

  let response: { success: boolean; content: string; provider: string; model: string };
  try {
    response = await callAI(
      prompt,
      { openaiKey, groqKey },
      {
        temperature: 0,         // deterministic
        maxTokens: 400,
        preferProvider: openaiKey ? "openai" : "groq",
      }
    );
  } catch (err: any) {
    const durationMs = Date.now() - t0;
    return {
      judgeId: "llm:unavailable",
      parsed: {
        rubric: { form: 0, meaning: 0, use: 0, contextFit: 0 },
        totalScore: 0, normalizedScore: 0, rationale: "",
        valid: false, parseError: `callAI threw: ${err?.message ?? String(err)}`,
      },
      rawOutput: "",
      durationMs,
      callSucceeded: false,
    };
  }

  const durationMs = Date.now() - t0;
  const rawOutput = response.content ?? "";
  const judgeId = `llm:${response.model ?? response.provider}`;

  if (!response.success) {
    return {
      judgeId,
      parsed: {
        rubric: { form: 0, meaning: 0, use: 0, contextFit: 0 },
        totalScore: 0, normalizedScore: 0, rationale: "",
        valid: false, parseError: `callAI returned success=false: ${rawOutput}`,
      },
      rawOutput,
      durationMs,
      callSucceeded: false,
    };
  }

  const parsed = parseLLMJudgeOutput(rawOutput, true);  // context transfer always has contextFit
  return { judgeId, parsed, rawOutput, durationMs, callSucceeded: true };
}
