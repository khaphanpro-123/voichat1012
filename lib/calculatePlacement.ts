// lib/calculatePlacement.ts

export interface Answer {
  questionId: number;
  value: number;
}

export interface PlacementResult {
  level: string;
  levelRange: string;
  focus: string[];
  recommendedMethod: string;
  methodDescription: string;
  experienceAvg: number;
  topStyle: string;
}

const EXPERIENCE_IDS = [6, 7, 8, 9, 10];
const STYLE_IDS = [11, 12, 13, 14, 15];

const STYLE_LABELS = {
  11: "Visual",
  12: "Audio",
  13: "Read/Write",
  14: "Interactive",
  15: "Structured",
};

const METHOD_RECOMMENDATIONS = {
  Visual: {
    name: "Visual Learning Path",
    description: "Flashcards, Video lessons, Infographics, YouTube channels, Visual mnemonics",
  },
  Audio: {
    name: "Audio-Based Learning",
    description: "Podcasts, Shadowing technique, Pimsleur method, Audio drills, Pronunciation apps",
  },
  "Read/Write": {
    name: "Text-Based Learning",
    description: "Textbooks, Journaling in Vietnamese, Reading news articles, Writing exercises",
  },
  Interactive: {
    name: "Gamified Learning",
    description: "Duolingo, Memrise, Interactive quizzes, Language games, Mobile apps",
  },
  Structured: {
    name: "Syllabus-Based Course",
    description: "Formal courses, Private tutor, Structured curriculum, Textbook progression",
  },
};

export function calculatePlacement(answers: Answer[]): PlacementResult {
  // Calculate experience average
  const experienceAnswers = answers.filter((a) =>
    EXPERIENCE_IDS.includes(a.questionId)
  );
  const experienceSum = experienceAnswers.reduce((sum, a) => sum + a.value, 0);
  const experienceAvg = experienceSum / experienceAnswers.length;

  // Find highest style score
  const styleAnswers = answers.filter((a) => STYLE_IDS.includes(a.questionId));
  let maxStyleScore = 0;
  let topStyleId = 11;

  styleAnswers.forEach((answer) => {
    if (answer.value > maxStyleScore) {
      maxStyleScore = answer.value;
      topStyleId = answer.questionId;
    }
  });

  const topStyle = STYLE_LABELS[topStyleId as keyof typeof STYLE_LABELS];
  const methodRec = METHOD_RECOMMENDATIONS[topStyle as keyof typeof METHOD_RECOMMENDATIONS];

  // Determine level based on experience
  let level: string;
  let levelRange: string;
  let focus: string[];

  if (experienceAvg < 2.5) {
    level = "Newbie";
    levelRange = "Level 1 & Level 2";
    focus = [
      "Vietnamese Alphabet (Quốc Ngữ)",
      "6 Tones Mastery",
      "Basic Survival Phrases",
      "Numbers and Greetings",
      "Simple Pronunciation Drills",
    ];
  } else if (experienceAvg >= 2.5 && experienceAvg < 4.0) {
    level = "Basic / Intermediate";
    levelRange = "Level 3 & Level 4";
    focus = [
      "Sentence Structure (SVO)",
      "Daily Conversation Topics",
      "Basic Grammar Rules",
      "Common Verbs and Adjectives",
      "Listening Comprehension",
    ];
  } else {
    level = "Advanced";
    levelRange = "Level 5+";
    focus = [
      "Vietnamese Slang and Idioms",
      "Complex Grammar Structures",
      "Professional Vocabulary",
      "Native Media Consumption",
      "Advanced Writing Skills",
    ];
  }

  return {
    level,
    levelRange,
    focus,
    recommendedMethod: methodRec.name,
    methodDescription: methodRec.description,
    experienceAvg: Math.round(experienceAvg * 10) / 10,
    topStyle,
  };
}
