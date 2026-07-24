// lib/retrievalTaskGenerator.ts
// Prompt templates for the four retrieval types d ∈ {0,1,2,3} from x.pdf.
// Called from /api/carts/schedule after DART picks nextRetrievalType.

import { callAI } from "./aiProvider";
import { RetrievalType } from "./dart";

export interface RetrievalTask {
  type: RetrievalType;
  label: string;
  prompt: string;                 // what the learner sees
  options?: string[];             // MCQ only
  expectedAnswer: string;         // gold answer
  raw?: string;                   // raw LLM response for debugging
}

const LABELS = ["recognition MCQ", "cloze completion", "constrained generation", "open paraphrase"] as const;

const TEMPLATES: Record<RetrievalType, (word: string, context: string) => string> = {
  0: (word, ctx) => `Generate ONE recognition MCQ for the vocabulary word "${word}".
Context: "${ctx}"
Rules:
- Provide a question stem with a blank or definition.
- Provide 4 options, exactly one correct.
- Distractors must be plausible but wrong.
Return JSON: { "prompt": string, "options": string[4], "expected_answer": string }.`,

  1: (word, ctx) => `Generate ONE cloze (fill-in-the-blank) item for the word "${word}".
Context: "${ctx}"
Rules:
- Replace the target word with ____ in a single sentence drawn from or inspired by the context.
- Keep the sentence natural and unambiguous.
Return JSON: { "prompt": string, "expected_answer": string }.`,

  2: (word, ctx) => `Generate ONE constrained generation task for the word "${word}".
Context: "${ctx}"
Rules:
- Ask the learner to produce a short sentence (≤ 20 words) that uses "${word}" in the SAME sense as the context.
- Include a one-line grading rubric.
Return JSON: { "prompt": string, "expected_answer": string, "rubric": string }.`,

  3: (word, ctx) => `Generate ONE open paraphrase task for the word "${word}".
Context: "${ctx}"
Rules:
- Ask the learner to paraphrase the whole context passage in 2-3 sentences and use "${word}" naturally.
- Provide a reference paraphrase.
Return JSON: { "prompt": string, "expected_answer": string }.`,
};

function extractJSON(text: string): any {
  const m = text.match(/\{[\s\S]*\}/);
  if (!m) return {};
  try { return JSON.parse(m[0]); } catch { return {}; }
}

export async function generateRetrievalTask(
  word: string,
  context: string,
  type: RetrievalType,
): Promise<RetrievalTask> {
  const prompt = TEMPLATES[type](word, context);
  const res = await callAI(
    prompt,
    {
      openaiKey: process.env.OPENAI_API_KEY,
      groqKey: process.env.GROQ_API_KEY,
      cohereKey: process.env.COHERE_API_KEY,
    },
    { maxTokens: 400, temperature: 0.6 } as any,
  );
  const text = String((res as any)?.text || (res as any)?.content || "");
  const parsed = extractJSON(text);

  return {
    type,
    label: LABELS[type],
    prompt: parsed.prompt || `Use the word "${word}" in a sentence.`,
    options: Array.isArray(parsed.options) ? parsed.options.slice(0, 4) : undefined,
    expectedAnswer: parsed.expected_answer || word,
    raw: text,
  };
}
