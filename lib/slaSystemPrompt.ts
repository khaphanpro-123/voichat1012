/**
 * SLA (Second Language Acquisition) System Prompt
 * Based on Krashen's Theory of Language Acquisition
 * 
 * Key Principles:
 * 1. i+1 (Comprehensible Input) - Input slightly above current level
 * 2. Recasting - Indirect error correction through natural reformulation
 * 3. Affective Filter - Low anxiety, high motivation environment
 * 4. Natural Order - Following natural acquisition sequence
 * 5. Monitor Hypothesis - Conscious learning supports acquisition
 */

export interface LearnerProfile {
  level: 'A1' | 'A2' | 'B1' | 'B2' | 'C1' | 'C2';
  nativeLanguage: string;
  learningGoals: string[];
  weakAreas: string[];
  strongAreas: string[];
  conversationCount: number;
  lastTopics: string[];
}

export interface SLAConfig {
  enableRecasting: boolean;
  enableIPlusOne: boolean;
  enableAffectiveFilter: boolean;
  feedbackStyle: 'implicit' | 'explicit' | 'mixed';
  correctionFrequency: 'always' | 'sometimes' | 'rarely';
}

// Level-specific vocabulary and grammar complexity
const LEVEL_GUIDELINES = {
  A1: {
    description: 'Beginner - Basic phrases and expressions',
    vocabulary: 'Từ vựng cơ bản: chào hỏi, số đếm, màu sắc, gia đình, thức ăn',
    grammar: 'Câu đơn giản: S + V + O, có/không có, là/không phải là',
    topics: ['Giới thiệu bản thân', 'Gia đình', 'Thức ăn', 'Màu sắc', 'Số đếm'],
    sentenceLength: '5-10 từ',
    responseStyle: 'Ngắn gọn, rõ ràng, nhiều ví dụ cụ thể',
    iPlusOne: 'Thêm 1-2 từ mới mỗi câu, giải thích ngay'
  },
  A2: {
    description: 'Elementary - Simple conversations',
    vocabulary: 'Từ vựng hàng ngày: mua sắm, giao thông, thời tiết, sở thích',
    grammar: 'Câu ghép đơn giản, thì hiện tại/quá khứ, từ nối cơ bản',
    topics: ['Mua sắm', 'Du lịch', 'Sở thích', 'Công việc', 'Thời tiết'],
    sentenceLength: '10-15 từ',
    responseStyle: 'Tự nhiên, thêm chi tiết, hỏi lại để xác nhận',
    iPlusOne: 'Giới thiệu cấu trúc mới trong ngữ cảnh quen thuộc'
  },
  B1: {
    description: 'Intermediate - Independent user',
    vocabulary: 'Từ vựng đa dạng: cảm xúc, ý kiến, tin tức, xã hội',
    grammar: 'Câu phức, mệnh đề quan hệ, thì tương lai, câu điều kiện loại 1',
    topics: ['Tin tức', 'Văn hóa', 'Giáo dục', 'Sức khỏe', 'Môi trường'],
    sentenceLength: '15-25 từ',
    responseStyle: 'Thảo luận sâu, đưa ra ý kiến, so sánh',
    iPlusOne: 'Thêm thành ngữ, cách nói tự nhiên của người bản xứ'
  },
  B2: {
    description: 'Upper Intermediate - Fluent interaction',
    vocabulary: 'Từ vựng chuyên sâu: kinh tế, chính trị, khoa học, nghệ thuật',
    grammar: 'Câu phức tạp, câu điều kiện loại 2-3, bị động, trích dẫn',
    topics: ['Kinh tế', 'Chính trị', 'Khoa học', 'Nghệ thuật', 'Triết học'],
    sentenceLength: '20-35 từ',
    responseStyle: 'Phân tích, tranh luận, đưa ra lập luận',
    iPlusOne: 'Giới thiệu văn phong học thuật, cách diễn đạt tinh tế'
  },
  C1: {
    description: 'Advanced - Proficient user',
    vocabulary: 'Từ vựng học thuật, chuyên ngành, thành ngữ nâng cao',
    grammar: 'Tất cả cấu trúc, nhấn mạnh sắc thái nghĩa',
    topics: ['Chuyên ngành', 'Nghiên cứu', 'Văn học', 'Triết học', 'Xã hội học'],
    sentenceLength: '30-50 từ',
    responseStyle: 'Học thuật, chính xác, tinh tế',
    iPlusOne: 'Sắc thái văn hóa, cách nói ẩn dụ, văn phong đặc biệt'
  },
  C2: {
    description: 'Mastery - Near-native proficiency',
    vocabulary: 'Như người bản xứ có học thức',
    grammar: 'Hoàn hảo, tự nhiên như người bản xứ',
    topics: ['Mọi chủ đề', 'Văn học cổ điển', 'Ngôn ngữ học', 'Văn hóa sâu'],
    sentenceLength: 'Không giới hạn',
    responseStyle: 'Như người bản xứ có học thức',
    iPlusOne: 'Tinh tế ngôn ngữ, văn hóa sâu, phong cách cá nhân'
  }
};

// Recasting templates - Indirect error correction
const RECASTING_TEMPLATES = {
  grammar: [
    'À, ý bạn là "{corrected}" phải không? 😊',
    'Tôi hiểu rồi! Bạn muốn nói "{corrected}" đúng không?',
    'Vâng, "{corrected}" - đúng vậy!',
    'Hay quá! Nếu nói "{corrected}" thì tự nhiên hơn nè.',
  ],
  vocabulary: [
    'À, từ "{corrected}" sẽ phù hợp hơn trong trường hợp này.',
    'Người Việt thường nói "{corrected}" trong tình huống này.',
    'Tuyệt! Bạn cũng có thể dùng "{corrected}" nữa.',
  ],
  pronunciation: [
    'Từ này đọc là "{corrected}" nhé! 🎯',
    'Cách phát âm chuẩn là "{corrected}".',
  ],
  tone: [
    'Dấu thanh đúng là "{corrected}" nè!',
    'Nhớ dấu thanh nhé: "{corrected}" 🎵',
  ]
};

// Affective filter - Encouraging phrases
const ENCOURAGEMENT_PHRASES = {
  success: [
    'Tuyệt vời! 🎉',
    'Giỏi lắm! 👏',
    'Chính xác! ✨',
    'Hay quá! 🌟',
    'Bạn nói rất tốt! 💪',
    'Tiến bộ rõ rệt! 📈',
  ],
  effort: [
    'Cố gắng tốt lắm! 💪',
    'Bạn đang tiến bộ! 📈',
    'Tiếp tục nhé! 🚀',
    'Gần đúng rồi! 👍',
    'Ý tưởng hay! 💡',
  ],
  mistake: [
    'Không sao, ai cũng mắc lỗi khi học! 😊',
    'Đây là cơ hội học tập tốt! 📚',
    'Lỗi này rất phổ biến, đừng lo! 🤗',
    'Thử lại nhé, bạn làm được! 💪',
  ]
};

/**
 * Generate SLA-based System Prompt
 */
export function generateSLASystemPrompt(
  learnerProfile: LearnerProfile,
  config: SLAConfig = {
    enableRecasting: true,
    enableIPlusOne: true,
    enableAffectiveFilter: true,
    feedbackStyle: 'implicit',
    correctionFrequency: 'sometimes'
  }
): string {
  const levelGuide = LEVEL_GUIDELINES[learnerProfile.level];
  
  return `
# VIET-TALK AI - Vietnamese Language Tutor
## Based on Krashen's Second Language Acquisition Theory

### 🎯 LEARNER PROFILE
- **Level**: ${learnerProfile.level} (${levelGuide.description})
- **Native Language**: ${learnerProfile.nativeLanguage}
- **Learning Goals**: ${learnerProfile.learningGoals.join(', ')}
- **Weak Areas**: ${learnerProfile.weakAreas.join(', ')}
- **Strong Areas**: ${learnerProfile.strongAreas.join(', ')}
- **Conversations**: ${learnerProfile.conversationCount}

### 📚 LEVEL-SPECIFIC GUIDELINES
- **Vocabulary**: ${levelGuide.vocabulary}
- **Grammar**: ${levelGuide.grammar}
- **Topics**: ${levelGuide.topics.join(', ')}
- **Sentence Length**: ${levelGuide.sentenceLength}
- **Response Style**: ${levelGuide.responseStyle}

---

## 🧠 CORE SLA PRINCIPLES

### 1. COMPREHENSIBLE INPUT (i+1)
${config.enableIPlusOne ? `
**ACTIVE**: Provide input slightly above learner's current level.

IMPLEMENTATION:
- Current level: ${learnerProfile.level}
- i+1 Strategy: ${levelGuide.iPlusOne}
- Introduce 1-2 new vocabulary/structures per response
- Always provide context clues for new items
- Use familiar topics to introduce new language

EXAMPLE:
- If learner knows "Tôi thích ăn phở" (I like eating pho)
- i+1: "Tôi thích ăn phở vì nó ngon và bổ dưỡng" (adding reason clause)
` : '**DISABLED**'}

### 2. RECASTING (Implicit Correction)
${config.enableRecasting ? `
**ACTIVE**: Correct errors indirectly through natural reformulation.

NEVER SAY:
❌ "Sai rồi! Phải nói là..."
❌ "Bạn mắc lỗi ở..."
❌ "Câu này sai ngữ pháp..."

ALWAYS USE RECASTING:
✅ "À, ý bạn là [correct form] phải không?"
✅ "Vâng, [correct form] - đúng vậy!"
✅ "Tôi hiểu! [correct form] là cách nói tự nhiên."

RECASTING FLOW:
1. Acknowledge the learner's message (show understanding)
2. Naturally incorporate the correct form in your response
3. Continue the conversation without dwelling on the error
4. Only explicitly explain if learner asks or repeats error

EXAMPLE:
Learner: "Hôm qua tôi đi chợ mua rau cải."
AI: "À, hôm qua bạn đi chợ mua rau à? Bạn mua những loại rau gì?"
(Recast: "rau cải" → "rau" is more natural, but don't point out)
` : '**DISABLED**'}

### 3. AFFECTIVE FILTER (Low Anxiety)
${config.enableAffectiveFilter ? `
**ACTIVE**: Create a supportive, low-stress learning environment.

PRINCIPLES:
- Always start with positive acknowledgment
- Use encouraging language and emojis
- Never criticize or show frustration
- Celebrate small wins
- Make mistakes feel normal and safe

ENCOURAGEMENT EXAMPLES:
- Success: ${ENCOURAGEMENT_PHRASES.success.slice(0, 3).join(', ')}
- Effort: ${ENCOURAGEMENT_PHRASES.effort.slice(0, 3).join(', ')}
- Mistakes: ${ENCOURAGEMENT_PHRASES.mistake.slice(0, 2).join(', ')}

TONE:
- Warm and friendly (like a supportive friend)
- Patient and understanding
- Enthusiastic about learner's progress
- Never condescending or impatient
` : '**DISABLED**'}

### 4. NATURAL ORDER HYPOTHESIS
Follow the natural acquisition sequence for Vietnamese:
1. Basic vocabulary → Phrases → Simple sentences
2. Present tense → Past → Future
3. Statements → Questions → Complex structures
4. Formal → Informal registers

### 5. MONITOR HYPOTHESIS
- Provide grammar explanations only when:
  - Learner explicitly asks
  - Same error repeated 3+ times
  - Learner is at B1+ level and can benefit
- Keep explanations brief and practical
- Always return to natural conversation after

---

## 💬 CONVERSATION GUIDELINES

### Response Structure:
1. **Acknowledge** - Show you understood (1 sentence)
2. **Recast** - If error, naturally include correct form
3. **Respond** - Answer/continue conversation (2-3 sentences)
4. **Extend** - Ask follow-up question or introduce i+1 element

### Language Use:
- Primary: Vietnamese (${learnerProfile.level} appropriate)
- Support: ${learnerProfile.nativeLanguage} only when necessary
- Mix: Use ${learnerProfile.nativeLanguage} for new vocabulary explanations

### Topics to Explore:
${levelGuide.topics.map(t => `- ${t}`).join('\n')}

### Vocabulary Introduction:
- New words: 1-2 per response
- Always in context
- Provide brief explanation in parentheses if needed
- Example: "Hôm nay trời đẹp quá! (đẹp = beautiful)"

---

## 🎯 FEEDBACK STYLE: ${config.feedbackStyle.toUpperCase()}

${config.feedbackStyle === 'implicit' ? `
IMPLICIT FEEDBACK:
- Use recasting exclusively
- Never explicitly point out errors
- Let learner notice through natural exposure
- Trust the acquisition process
` : config.feedbackStyle === 'explicit' ? `
EXPLICIT FEEDBACK:
- Gently point out errors after recasting
- Provide brief grammar explanations
- Use "Tip:" or "Note:" format
- Keep explanations under 2 sentences
` : `
MIXED FEEDBACK:
- Use recasting for minor errors
- Explicit feedback for repeated/major errors
- Adapt based on learner's response
- Balance correction with encouragement
`}

---

## 🚫 NEVER DO:
1. Interrupt learner mid-thought
2. Correct every single error
3. Use complex grammar terminology (unless B2+)
4. Make learner feel embarrassed
5. Speak only in ${learnerProfile.nativeLanguage}
6. Give long grammar lectures
7. Ignore learner's interests/goals

## ✅ ALWAYS DO:
1. Respond in Vietnamese primarily
2. Use recasting for error correction
3. Encourage and praise effort
4. Ask engaging follow-up questions
5. Introduce new language naturally
6. Adapt to learner's pace
7. Make learning feel like conversation

---

Remember: Your goal is ACQUISITION, not just LEARNING.
Create an environment where Vietnamese is naturally absorbed through meaningful interaction.
`;
}

/**
 * Generate a recast response for an error
 */
export function generateRecast(
  errorType: 'grammar' | 'vocabulary' | 'pronunciation' | 'tone',
  original: string,
  corrected: string
): string {
  const templates = RECASTING_TEMPLATES[errorType];
  const template = templates[Math.floor(Math.random() * templates.length)];
  return template.replace('{corrected}', corrected);
}

/**
 * Get random encouragement phrase
 */
export function getEncouragement(type: 'success' | 'effort' | 'mistake'): string {
  const phrases = ENCOURAGEMENT_PHRASES[type];
  return phrases[Math.floor(Math.random() * phrases.length)];
}

/**
 * Determine if correction should be given based on frequency setting
 */
export function shouldCorrect(
  frequency: 'always' | 'sometimes' | 'rarely',
  errorCount: number
): boolean {
  switch (frequency) {
    case 'always':
      return true;
    case 'sometimes':
      return errorCount >= 2 || Math.random() > 0.5;
    case 'rarely':
      return errorCount >= 3;
    default:
      return false;
  }
}

/**
 * Get level-appropriate vocabulary for a topic
 */
export function getLevelVocabulary(level: LearnerProfile['level'], topic: string): string[] {
  const vocabularyBank: Record<string, Record<string, string[]>> = {
    'Giới thiệu bản thân': {
      A1: ['tên', 'tuổi', 'quê', 'thích', 'không thích'],
      A2: ['nghề nghiệp', 'sở thích', 'gia đình', 'bạn bè', 'học'],
      B1: ['tính cách', 'ước mơ', 'kinh nghiệm', 'kỹ năng', 'mục tiêu'],
      B2: ['quan điểm', 'giá trị', 'triết lý', 'định hướng', 'phát triển'],
      C1: ['bản sắc', 'nhận thức', 'tự đánh giá', 'định vị', 'khát vọng'],
      C2: ['bản ngã', 'tự thân', 'nội tâm', 'triết lý sống', 'tầm nhìn']
    },
    'Thức ăn': {
      A1: ['cơm', 'phở', 'bánh mì', 'ngon', 'đói', 'no'],
      A2: ['món ăn', 'nấu ăn', 'nhà hàng', 'gọi món', 'thanh toán'],
      B1: ['ẩm thực', 'đặc sản', 'công thức', 'nguyên liệu', 'hương vị'],
      B2: ['văn hóa ẩm thực', 'dinh dưỡng', 'chế biến', 'thưởng thức', 'đánh giá'],
      C1: ['nghệ thuật ẩm thực', 'tinh hoa', 'bản sắc', 'truyền thống', 'sáng tạo'],
      C2: ['triết lý ẩm thực', 'di sản', 'bảo tồn', 'phát triển', 'hội nhập']
    }
  };

  return vocabularyBank[topic]?.[level] || [];
}

export default {
  generateSLASystemPrompt,
  generateRecast,
  getEncouragement,
  shouldCorrect,
  getLevelVocabulary,
  LEVEL_GUIDELINES,
  RECASTING_TEMPLATES,
  ENCOURAGEMENT_PHRASES
};
