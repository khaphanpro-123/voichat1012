// lib/assessmentData.ts

export interface Question {
  id: number;
  category: "motivation" | "experience" | "style" | "goals" | "time" | "challenges";
  text: string;
}

export const surveyQuestions: Question[] = [
  // --- MOTIVATION ---
  { id: 1, category: "motivation", text: "I want to learn Vietnamese for travel purposes." },
  { id: 2, category: "motivation", text: "Learning Vietnamese will help my career or business." },
  { id: 3, category: "motivation", text: "I have Vietnamese family members or friends." },
  { id: 4, category: "motivation", text: "I'm interested in Vietnamese culture and history." },
  { id: 5, category: "motivation", text: "I enjoy learning new languages as a hobby." },
  
  // --- EXPERIENCE (Crucial for Leveling) ---
  { id: 6, category: "experience", text: "I have experience learning other Asian languages (tonal languages)." },
  { id: 7, category: "experience", text: "I can recognize and distinguish Vietnamese tones when listening." },
  { id: 8, category: "experience", text: "I already know basic Vietnamese greetings and numbers." },
  { id: 9, category: "experience", text: "I have taken Vietnamese classes before." },
  { id: 10, category: "experience", text: "I am familiar with the Vietnamese alphabet and pronunciation rules." },
  
  // --- STYLE (For Method Recommendation) ---
  { id: 11, category: "style", text: "I learn best through visual content (images, videos)." },
  { id: 12, category: "style", text: "I prefer learning through audio and repeating out loud." },
  { id: 13, category: "style", text: "I like to read texts and write down notes." },
  { id: 14, category: "style", text: "I learn better with interactive quizzes and gamified apps." },
  { id: 15, category: "style", text: "I prefer structured textbook lessons over free exploration." },
  
  // --- GOALS ---
  { id: 16, category: "goals", text: "My goal is conversational fluency for daily life." },
  { id: 17, category: "goals", text: "Reading Vietnamese literature/news is important to me." },
  { id: 18, category: "goals", text: "I want to consume Vietnamese media (movies, music) without subtitles." },
  { id: 19, category: "goals", text: "I need to learn how to write emails or texts in Vietnamese." },
  { id: 20, category: "goals", text: "I plan to take a Vietnamese proficiency test (VSL/IVPT)." },
  
  // --- TIME ---
  { id: 21, category: "time", text: "I can dedicate at least 30 minutes daily to learning." },
  { id: 22, category: "time", text: "I prefer short, micro-learning sessions (5-10 mins)." },
  { id: 23, category: "time", text: "I have time for intensive study sessions on weekends." },
  { id: 24, category: "time", text: "I can listen to podcasts during my commute." },
  { id: 25, category: "time", text: "I am willing to commit for at least 6 months." },
  
  // --- CHALLENGES ---
  { id: 26, category: "challenges", text: "Pronunciation and tones are my biggest fear." },
  { id: 27, category: "challenges", text: "I struggle with memorizing vocabulary." },
  { id: 28, category: "challenges", text: "Grammar structures confuse me." },
  { id: 29, category: "challenges", text: "I find it hard to stay motivated alone." },
  { id: 30, category: "challenges", text: "I don't have anyone to practice speaking with." },
];

export const likertOptions = [
  { value: 1, label: "Strongly Disagree", emoji: "😟" },
  { value: 2, label: "Disagree", emoji: "🙁" },
  { value: 3, label: "Neutral", emoji: "😐" },
  { value: 4, label: "Agree", emoji: "🙂" },
  { value: 5, label: "Strongly Agree", emoji: "😊" },
];
