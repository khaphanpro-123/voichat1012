// lib/pretestItems.ts
// CEFR vocabulary placement test — 20 MCQ items for A2 / B1 / B2 classification.
//
// Items are public-facing (no auth). The ANSWER KEY is server-only — never send
// correctIndex to the client. Use toPublicPretestItems() for the client payload.
//
// Scoring (server-side in /api/research/pretest/score):
//   A2 band (items 0-7):  "A2 words" — very common, everyday vocabulary
//   B1 band (items 8-13): "B1 words" — upper-intermediate, academic-adjacent
//   B2 band (items 14-19): "B2 words" — advanced, low-frequency
//
//   cefrLevel:
//     ≥ 6 B2 items correct              → "B2"
//     ≥ 4 B1 items correct              → "B1"
//     otherwise                          → "A2"
//   score (0-100) = (correct / 20) * 100

export interface PretestItem {
  id: string;           // "pt_01" … "pt_20"
  band: "A2" | "B1" | "B2";
  word: string;
  options: string[];    // 4 options, index 0-3
  correctIndex: number; // server-only — stripped in toPublicPretestItems()
}

export const PRETEST_ITEMS: PretestItem[] = [
  // ── A2 band (items 0-7) ────────────────────────────────────────────────────
  {
    id: "pt_01", band: "A2", word: "angry",
    options: ["very happy", "feeling strong displeasure", "tired and sleepy", "confused about something"],
    correctIndex: 1,
  },
  {
    id: "pt_02", band: "A2", word: "friendly",
    options: ["rude and cold", "very hungry", "kind and pleasant to others", "slow and careful"],
    correctIndex: 2,
  },
  {
    id: "pt_03", band: "A2", word: "expensive",
    options: ["very old", "costing a lot of money", "too small in size", "far from the city"],
    correctIndex: 1,
  },
  {
    id: "pt_04", band: "A2", word: "silent",
    options: ["making no sound", "very colourful", "moving quickly", "full of people"],
    correctIndex: 0,
  },
  {
    id: "pt_05", band: "A2", word: "gather",
    options: ["to fall down suddenly", "to come together in a group", "to forget something important", "to clean a surface"],
    correctIndex: 1,
  },
  {
    id: "pt_06", band: "A2", word: "reach",
    options: ["to arrive at a place or level", "to make something smaller", "to repeat an action many times", "to rest during the day"],
    correctIndex: 0,
  },
  {
    id: "pt_07", band: "A2", word: "ordinary",
    options: ["extremely large", "normal and not special", "broken and damaged", "happening very fast"],
    correctIndex: 1,
  },
  {
    id: "pt_08", band: "A2", word: "surface",
    options: ["the outside layer or top of something", "a very long journey", "a type of food", "a building for sleeping"],
    correctIndex: 0,
  },
  // ── B1 band (items 8-13) ──────────────────────────────────────────────────
  {
    id: "pt_09", band: "B1", word: "significant",
    options: ["very small and unimportant", "important and worth noticing", "completely wrong", "slow to develop"],
    correctIndex: 1,
  },
  {
    id: "pt_10", band: "B1", word: "apparent",
    options: ["clearly seen or understood", "hidden underground", "expensive to maintain", "lacking emotion"],
    correctIndex: 0,
  },
  {
    id: "pt_11", band: "B1", word: "sufficient",
    options: ["very difficult", "enough for the purpose", "sudden and unexpected", "relating to the past"],
    correctIndex: 1,
  },
  {
    id: "pt_12", band: "B1", word: "accurate",
    options: ["correct and without errors", "too slow to be useful", "full of emotion", "likely to happen soon"],
    correctIndex: 0,
  },
  {
    id: "pt_13", band: "B1", word: "consequence",
    options: ["the time before an event", "a type of scientific tool", "a result or effect of an action", "a strong personal opinion"],
    correctIndex: 2,
  },
  {
    id: "pt_14", band: "B1", word: "maintain",
    options: ["to keep something in good condition or at the same level", "to reduce in size over time", "to list items in order", "to build something new from scratch"],
    correctIndex: 0,
  },
  // ── B2 band (items 14-19) ─────────────────────────────────────────────────
  {
    id: "pt_15", band: "B2", word: "ambiguous",
    options: ["extremely confident", "having more than one possible meaning", "carefully organized", "related to numbers"],
    correctIndex: 1,
  },
  {
    id: "pt_16", band: "B2", word: "scrutinize",
    options: ["to examine very carefully and critically", "to move in a random direction", "to produce a large amount quickly", "to ignore something deliberately"],
    correctIndex: 0,
  },
  {
    id: "pt_17", band: "B2", word: "alleviate",
    options: ["to make a problem or pain less severe", "to increase the speed of", "to describe in exact detail", "to separate into equal parts"],
    correctIndex: 0,
  },
  {
    id: "pt_18", band: "B2", word: "coherent",
    options: ["lacking any pattern", "logically consistent and easy to understand", "relating to very high temperature", "present only in small quantities"],
    correctIndex: 1,
  },
  {
    id: "pt_19", band: "B2", word: "impede",
    options: ["to help something develop faster", "to copy exactly", "to delay or prevent progress", "to change the order of items"],
    correctIndex: 2,
  },
  {
    id: "pt_20", band: "B2", word: "prolific",
    options: ["producing a great quantity of something", "very formal in manner", "difficult to access", "sensitive to light"],
    correctIndex: 0,
  },
];

/** Strip correctIndex for client-safe payload. */
export function toPublicPretestItems(): Omit<PretestItem, "correctIndex">[] {
  return PRETEST_ITEMS.map(({ correctIndex: _c, ...rest }) => rest);
}

/** Score answers (answers: Record<itemId, pickedIndex>). Returns score 0–100 and cefrLevel. */
export function scorePretestAnswers(
  answers: Record<string, number>
): { score: number; cefrLevel: "A2" | "B1" | "B2"; correct: number; total: number } {
  let correct = 0;
  let b1Correct = 0;
  let b2Correct = 0;

  for (const item of PRETEST_ITEMS) {
    const picked = answers[item.id];
    if (picked === item.correctIndex) {
      correct++;
      if (item.band === "B1") b1Correct++;
      if (item.band === "B2") b2Correct++;
    }
  }

  const total = PRETEST_ITEMS.length;
  const score = Math.round((correct / total) * 100);

  let cefrLevel: "A2" | "B1" | "B2";
  if (b2Correct >= 4) {
    cefrLevel = "B2";
  } else if (b1Correct >= 4) {
    cefrLevel = "B1";
  } else {
    cefrLevel = "A2";
  }

  return { score, cefrLevel, correct, total };
}
