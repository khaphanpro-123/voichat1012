// lib/calculatePlacementFlow.ts

export interface PlacementResult {
  level: "Newbie" | "Intermediate" | "Advanced";
  roadmapDescription: string;
  recommendedMethod: string;
  methodDescription: string;
  experienceAvg: number;
  roadmapSteps: string[];
}

const EXPERIENCE_IDS = [6, 7, 8, 9, 10];
const STYLE_IDS = [11, 12, 13, 14, 15];

const STYLE_METHODS = {
  11: {
    name: "Visual Learning",
    description: "Flashcards, Video lessons, Infographics, and Visual mnemonics work best for you.",
  },
  12: {
    name: "Auditory Learning",
    description: "Podcasts, Shadowing technique, Audio drills, and Pronunciation practice are ideal.",
  },
  13: {
    name: "Text-based Learning",
    description: "Reading texts, Writing exercises, Journaling, and Note-taking suit your style.",
  },
  14: {
    name: "Gamification",
    description: "Interactive quizzes, Language games, Mobile apps, and Challenges keep you engaged.",
  },
  15: {
    name: "Structured Learning",
    description: "Formal courses, Textbook progression, and Systematic curriculum work for you.",
  },
};

export function calculatePlacement(answers: Record<number, number>): PlacementResult {
  // Calculate experience average
  const experienceScores = EXPERIENCE_IDS.map((id) => answers[id] || 0);
  const experienceSum = experienceScores.reduce((sum, score) => sum + score, 0);
  const experienceAvg = experienceSum / EXPERIENCE_IDS.length;

  // Find highest style score
  let maxStyleScore = 0;
  let topStyleId = 11;

  STYLE_IDS.forEach((id) => {
    const score = answers[id] || 0;
    if (score > maxStyleScore) {
      maxStyleScore = score;
      topStyleId = id;
    }
  });

  const methodInfo = STYLE_METHODS[topStyleId as keyof typeof STYLE_METHODS];

  // Determine level and roadmap
  let level: "Newbie" | "Intermediate" | "Advanced";
  let roadmapDescription: string;
  let roadmapSteps: string[];

  if (experienceAvg < 2.5) {
    level = "Newbie";
    roadmapDescription = "Level 1 & 2: Master the fundamentals";
    roadmapSteps = [
      "Vietnamese Alphabet (Quốc Ngữ)",
      "6 Tones Mastery",
      "Survival Phrases",
      "Basic Greetings",
      "Numbers & Colors",
    ];
  } else if (experienceAvg >= 2.5 && experienceAvg < 4.0) {
    level = "Intermediate";
    roadmapDescription = "Level 3 & 4: Build conversation skills";
    roadmapSteps = [
      "Grammar Foundations",
      "Sentence Building",
      "Daily Dialogues",
      "Common Verbs",
      "Listening Practice",
    ];
  } else {
    level = "Advanced";
    roadmapDescription = "Level 5+: Achieve native-like fluency";
    roadmapSteps = [
      "Vietnamese Slang",
      "Business Vietnamese",
      "Literature & Poetry",
      "Native Media",
      "Professional Writing",
    ];
  }

  return {
    level,
    roadmapDescription,
    recommendedMethod: methodInfo.name,
    methodDescription: methodInfo.description,
    experienceAvg: Math.round(experienceAvg * 10) / 10,
    roadmapSteps,
  };
}
