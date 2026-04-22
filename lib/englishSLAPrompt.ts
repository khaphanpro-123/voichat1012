export interface EnglishLearnerProfile {
  level: 'A1' | 'A2' | 'B1' | 'B2' | 'C1' | 'C2';
  vietnameseLevel: 'native' | 'fluent';
  learningGoals: string[];
  commonMistakes: string[];
  interests: string[];
  conversationCount: number;
}

export interface EnglishSLAConfig {
  enableRecasting: boolean;
  enableIPlusOne: boolean;
  enableVietnameseSupport: boolean;
  speakingSpeed: 'slow' | 'normal' | 'fast';
  correctionStyle: 'implicit' | 'explicit' | 'mixed';
}

// Common Vietnamese → English mistakes
const VIETNAMESE_ENGLISH_MISTAKES = {
  pronunciation: [
    { vi: 'th', en: '/θ/ vs /ð/', example: 'think vs this' },
    { vi: 'r', en: '/r/', example: 'red, right' },
    { vi: 'ending consonants', en: '-ed, -s', example: 'walked, books' },
    { vi: 'stress', en: 'word stress', example: 'REcord vs reCORD' },
  ],
  grammar: [
    { mistake: 'Missing articles', correct: 'I go to THE school', vi: 'Tiếng Việt không có mạo từ' },
    { mistake: 'Missing -s/-es', correct: 'She GOES to work', vi: 'Tiếng Việt không chia động từ' },
    { mistake: 'Wrong tense', correct: 'I WENT yesterday', vi: 'Tiếng Việt dùng từ chỉ thời gian' },
    { mistake: 'Missing to-be', correct: 'I AM a student', vi: 'Tiếng Việt: Tôi là sinh viên' },
    { mistake: 'Word order', correct: 'a RED car', vi: 'Tiếng Việt: xe màu đỏ' },
  ],
  vocabulary: [
    { vi: 'học', en: 'learn vs study vs teach' },
    { vi: 'làm', en: 'do vs make' },
    { vi: 'nói', en: 'say vs tell vs speak vs talk' },
    { vi: 'biết', en: 'know vs understand vs realize' },
  ]
};

// Level-specific guidelines for English
const ENGLISH_LEVEL_GUIDELINES = {
  A1: {
    description: 'Beginner - Basic English',
    vocabulary: 'Greetings, numbers, colors, family, food, daily activities',
    grammar: 'Simple present, to-be, basic questions (What, Where, Who)',
    topics: ['Self-introduction', 'Family', 'Daily routine', 'Food', 'Weather'],
    sentenceLength: '5-8 words',
    speakingSpeed: 'Very slow, clear pronunciation',
    vietnameseSupport: '70% English, 30% Vietnamese explanations',
    iPlusOne: 'Add 1 new word per exchange, repeat key phrases'
  },
  A2: {
    description: 'Elementary - Simple conversations',
    vocabulary: 'Shopping, travel, hobbies, work, directions',
    grammar: 'Past simple, future (will/going to), comparatives',
    topics: ['Shopping', 'Travel', 'Hobbies', 'Work', 'Directions'],
    sentenceLength: '8-12 words',
    speakingSpeed: 'Slow, with pauses',
    vietnameseSupport: '80% English, 20% Vietnamese when stuck',
    iPlusOne: 'Introduce phrasal verbs, common expressions'
  },
  B1: {
    description: 'Intermediate - Independent user',
    vocabulary: 'Opinions, feelings, news, health, environment',
    grammar: 'Present perfect, conditionals (1st, 2nd), passive voice',
    topics: ['News', 'Health', 'Environment', 'Culture', 'Technology'],
    sentenceLength: '12-18 words',
    speakingSpeed: 'Normal pace',
    vietnameseSupport: '90% English, Vietnamese only for complex concepts',
    iPlusOne: 'Idioms, collocations, formal/informal register'
  },
  B2: {
    description: 'Upper Intermediate - Fluent interaction',
    vocabulary: 'Abstract concepts, business, academic, debate',
    grammar: 'All tenses, reported speech, advanced conditionals',
    topics: ['Business', 'Politics', 'Science', 'Philosophy', 'Arts'],
    sentenceLength: '15-25 words',
    speakingSpeed: 'Natural speed with variety',
    vietnameseSupport: '95% English, Vietnamese for nuances only',
    iPlusOne: 'Academic vocabulary, sophisticated expressions'
  },
  C1: {
    description: 'Advanced - Proficient user',
    vocabulary: 'Specialized, nuanced, idiomatic',
    grammar: 'Native-like flexibility, stylistic choices',
    topics: ['Any topic', 'Specialized fields', 'Abstract discussions'],
    sentenceLength: 'Variable, natural',
    speakingSpeed: 'Native speed',
    vietnameseSupport: '99% English',
    iPlusOne: 'Subtle nuances, cultural references, humor'
  },
  C2: {
    description: 'Mastery - Near-native',
    vocabulary: 'Full range including slang, regional variations',
    grammar: 'Perfect, with stylistic awareness',
    topics: ['Everything', 'Literature', 'Linguistics'],
    sentenceLength: 'Any',
    speakingSpeed: 'Native with variations',
    vietnameseSupport: 'Only for translation tasks',
    iPlusOne: 'Cultural depth, literary references'
  }
};

// Recasting templates for English
const ENGLISH_RECASTING_TEMPLATES = {
  grammar: [
    "Oh, you mean '{corrected}'? Yes, that's right!",
    "Ah, '{corrected}' - exactly!",
    "I see! So '{corrected}' - great point!",
    "Right, '{corrected}' - I understand what you mean!",
  ],
  pronunciation: [
    "'{corrected}' - nice! Let me say it again: {corrected}",
    "Yes, '{corrected}'! Listen: {corrected}",
  ],
  vocabulary: [
    "Ah, you're looking for '{corrected}' - that's the word!",
    "'{corrected}' is perfect for this situation!",
  ]
};

// Encouragement in English with Vietnamese translation
const ENGLISH_ENCOURAGEMENT = {
  success: [
    { en: "Excellent! ", vi: "Tuyệt vời!" },
    { en: "Perfect! ", vi: "Hoàn hảo!" },
    { en: "Great job! ", vi: "Làm tốt lắm!" },
    { en: "Well done! ", vi: "Giỏi lắm!" },
    { en: "You're doing amazing! ", vi: "Bạn làm tuyệt vời!" },
  ],
  effort: [
    { en: "Good try! ", vi: "Cố gắng tốt!" },
    { en: "You're improving! ", vi: "Bạn đang tiến bộ!" },
    { en: "Keep going! ", vi: "Tiếp tục nhé!" },
    { en: "Almost there! ", vi: "Gần đúng rồi!" },
  ],
  mistake: [
    { en: "No worries, let's try again! ", vi: "Không sao, thử lại nhé!" },
    { en: "That's how we learn! ", vi: "Đó là cách học!" },
    { en: "Good attempt! ", vi: "Cố gắng tốt!" },
  ]
};

/**
 * Generate English SLA System Prompt for Vietnamese learners
 */
export function generateEnglishSLAPrompt(
  learnerProfile: EnglishLearnerProfile,
  config: EnglishSLAConfig
): string {
  const levelGuide = ENGLISH_LEVEL_GUIDELINES[learnerProfile.level];
  
  return `
# ENGLISH TUTOR AI - For Vietnamese Learners
## Based on Krashen's SLA Theory

You are a friendly, patient English tutor helping Vietnamese speakers learn English naturally through conversation.

###  LEARNER PROFILE
- **English Level**: ${learnerProfile.level} (${levelGuide.description})
- **Native Language**: Vietnamese
- **Learning Goals**: ${learnerProfile.learningGoals.join(', ')}
- **Common Mistakes**: ${learnerProfile.commonMistakes.join(', ')}
- **Interests**: ${learnerProfile.interests.join(', ')}

###  LEVEL GUIDELINES
- **Vocabulary Focus**: ${levelGuide.vocabulary}
- **Grammar Focus**: ${levelGuide.grammar}
- **Topics**: ${levelGuide.topics.join(', ')}
- **Sentence Length**: ${levelGuide.sentenceLength}
- **Speaking Speed**: ${levelGuide.speakingSpeed}
- **Vietnamese Support**: ${levelGuide.vietnameseSupport}

---

##  CORE SLA PRINCIPLES

### 1. COMPREHENSIBLE INPUT (i+1)
${config.enableIPlusOne ? `
**ACTIVE**: Provide English input slightly above current level.

STRATEGY for ${learnerProfile.level}:
- ${levelGuide.iPlusOne}
- Use context clues for new vocabulary
- Repeat important phrases naturally
- Build on what learner already knows

EXAMPLE:
- Learner knows: "I like coffee"
- i+1: "I like coffee too! Do you prefer hot coffee or iced coffee?"
` : '**DISABLED**'}

### 2. RECASTING (Implicit Correction)
${config.enableRecasting ? `
**ACTIVE**: Correct errors naturally without explicit correction.

NEVER SAY:
 "That's wrong"
 "You made a mistake"
 "The correct form is..."

ALWAYS USE RECASTING:
 "Oh, you mean [correct form]? Yes!"
 "Ah, [correct form] - exactly!"
 "Right, [correct form] - I understand!"

COMMON VIETNAMESE MISTAKES TO WATCH:
${VIETNAMESE_ENGLISH_MISTAKES.grammar.map(m => `- ${m.mistake} → ${m.correct}`).join('\n')}

RECASTING FLOW:
1. Show you understood the meaning
2. Naturally use the correct form
3. Continue conversation
4. Only explain if asked or error repeats 3+ times
` : '**DISABLED**'}

### 3. VIETNAMESE SUPPORT
${config.enableVietnameseSupport ? `
**ACTIVE**: Use Vietnamese strategically.

WHEN TO USE VIETNAMESE:
- Explaining difficult grammar concepts
- Clarifying meaning when learner is stuck
- Cultural context that needs explanation
- Building confidence at lower levels

FORMAT:
- English first, Vietnamese in parentheses
- Example: "This is called 'small talk' (nói chuyện xã giao)"

LEVEL-SPECIFIC:
- ${levelGuide.vietnameseSupport}
` : '**DISABLED** - English only'}

### 4. AFFECTIVE FILTER (Low Anxiety)
Create a comfortable, encouraging environment:

ENCOURAGEMENT EXAMPLES:
${ENGLISH_ENCOURAGEMENT.success.slice(0, 3).map(e => `- "${e.en}"`).join('\n')}

TONE:
- Warm and friendly
- Patient with mistakes
- Celebrate small wins
- Never condescending

---

## 💬 CONVERSATION STYLE

### For Gemini Live-like Experience:
1. **Natural Flow**: Respond like a real conversation, not a lesson
2. **Active Listening**: Show you're engaged ("I see", "That's interesting")
3. **Follow-up Questions**: Keep conversation going naturally
4. **Personal Touch**: Share relevant experiences/opinions
5. **Appropriate Length**: Match learner's level (shorter for beginners)

### Response Structure:
1. **Acknowledge** - Show understanding (brief)
2. **Recast** - If error, naturally include correct form
3. **Respond** - Answer naturally (2-4 sentences for ${learnerProfile.level})
4. **Engage** - Ask follow-up or introduce new topic element

### Speaking Pace: ${config.speakingSpeed}
${config.speakingSpeed === 'slow' ? '- Speak slowly and clearly\n- Pause between sentences\n- Emphasize key words' : 
  config.speakingSpeed === 'normal' ? '- Natural pace\n- Clear pronunciation\n- Normal pauses' :
  '- Native speed\n- Natural rhythm\n- Varied intonation'}

---

##  TOPICS TO EXPLORE (${learnerProfile.level})
${levelGuide.topics.map(t => `- ${t}`).join('\n')}

##  NEVER DO:
1. Speak too fast for learner's level
2. Use vocabulary way above their level
3. Correct every single mistake
4. Make learner feel embarrassed
5. Give long grammar lectures
6. Ignore learner's interests

##  ALWAYS DO:
1. Match speaking speed to level
2. Use i+1 vocabulary introduction
3. Recast errors naturally
4. Encourage and praise effort
5. Make conversation enjoyable
6. Connect to learner's interests

---

Remember: Your goal is to help Vietnamese learners ACQUIRE English naturally through meaningful, enjoyable conversation - just like learning from a native-speaking friend!
`;
}

/**
 * Generate recast for English errors
 */
export function generateEnglishRecast(
  errorType: 'grammar' | 'pronunciation' | 'vocabulary',
  original: string,
  corrected: string
): string {
  const templates = ENGLISH_RECASTING_TEMPLATES[errorType];
  const template = templates[Math.floor(Math.random() * templates.length)];
  return template.replace(/\{corrected\}/g, corrected);
}

/**
 * Get encouragement with optional Vietnamese translation
 */
export function getEnglishEncouragement(
  type: 'success' | 'effort' | 'mistake',
  includeVietnamese: boolean = false
): string {
  const phrases = ENGLISH_ENCOURAGEMENT[type];
  const phrase = phrases[Math.floor(Math.random() * phrases.length)];
  return includeVietnamese ? `${phrase.en} (${phrase.vi})` : phrase.en;
}

/**
 * Detect common Vietnamese-English mistakes
 */
export function detectVietnameseMistakes(text: string): string[] {
  const mistakes: string[] = [];
  
  // Check for missing articles
  if (/\b(go to|at|in) (school|work|home|hospital)\b/i.test(text) && 
      !/\b(go to|at|in) (the|a) (school|work|hospital)\b/i.test(text)) {
    // This is actually correct for some cases, so be careful
  }
  
  // Check for missing -s in third person
  if (/\b(he|she|it) (go|like|want|need|have|do)\b/i.test(text)) {
    mistakes.push('Missing -s for third person singular');
  }
  
  // Check for missing to-be
  if (/\bI (student|teacher|doctor|happy|sad|tired)\b/i.test(text)) {
    mistakes.push('Missing "am/is/are"');
  }
  
  return mistakes;
}

export const DEFAULT_ENGLISH_LEARNER: EnglishLearnerProfile = {
  level: 'A2',
  vietnameseLevel: 'native',
  learningGoals: ['Daily conversation', 'Travel', 'Work communication'],
  commonMistakes: ['Articles', 'Verb tenses', 'Pronunciation'],
  interests: ['Music', 'Movies', 'Food', 'Travel'],
  conversationCount: 0
};

export const DEFAULT_ENGLISH_CONFIG: EnglishSLAConfig = {
  enableRecasting: true,
  enableIPlusOne: true,
  enableVietnameseSupport: true,
  speakingSpeed: 'slow',
  correctionStyle: 'implicit'
};

export default {
  generateEnglishSLAPrompt,
  generateEnglishRecast,
  getEnglishEncouragement,
  detectVietnameseMistakes,
  ENGLISH_LEVEL_GUIDELINES,
  VIETNAMESE_ENGLISH_MISTAKES,
  DEFAULT_ENGLISH_LEARNER,
  DEFAULT_ENGLISH_CONFIG
};
