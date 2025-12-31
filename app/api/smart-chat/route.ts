import { NextRequest, NextResponse } from "next/server";
import { OpenAI } from 'openai';
import { connectToDatabase } from '@/lib/mongodb';
import { 
  generateSLASystemPrompt, 
  generateRecast, 
  getEncouragement,
  shouldCorrect,
  LearnerProfile,
  SLAConfig 
} from '@/lib/slaSystemPrompt';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Default learner profile (can be customized per user)
const DEFAULT_LEARNER_PROFILE: LearnerProfile = {
  level: 'A2',
  nativeLanguage: 'English',
  learningGoals: ['Giao tiếp hàng ngày', 'Du lịch Việt Nam'],
  weakAreas: ['Dấu thanh', 'Ngữ pháp'],
  strongAreas: ['Từ vựng cơ bản'],
  conversationCount: 0,
  lastTopics: []
};

// SLA Configuration
const SLA_CONFIG: SLAConfig = {
  enableRecasting: true,
  enableIPlusOne: true,
  enableAffectiveFilter: true,
  feedbackStyle: 'implicit',
  correctionFrequency: 'sometimes'
};

// Intent classification system
const INTENT_CATEGORIES = {
  GRAMMAR_CHECK: 'grammar_check',
  VOCABULARY_HELP: 'vocabulary_help',
  TRANSLATION: 'translation',
  CONVERSATION: 'conversation',
  LEARNING_GUIDANCE: 'learning_guidance',
  DOCUMENT_SEARCH: 'document_search',
  PRONUNCIATION: 'pronunciation',
  CULTURAL_INFO: 'cultural_info'
};

interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

interface IntentAnalysis {
  intent: string;
  confidence: number;
  entities: string[];
  needsDocumentSearch: boolean;
  needsGrammarCheck: boolean;
}

interface GrammarCorrection {
  hasErrors: boolean;
  original: string;
  corrected: string;
  errors: Array<{
    type: string;
    position: number;
    original: string;
    corrected: string;
    explanation: string;
  }>;
  explanation: string;
}

interface DataSourceAnalysis {
  userDocumentPercentage: number;
  externalSourcePercentage: number;
  totalDocumentsFound: number;
  totalVocabularyFound: number;
  sourceBreakdown: {
    userDocuments: number;
    userVocabulary: number;
    aiKnowledge: number;
  };
}

interface BilingualResponse {
  vietnamese: string;
  english: string;
  isTranslated: boolean;
}

// Analyze user intent using AI
async function analyzeIntent(userMessage: string): Promise<IntentAnalysis> {
  try {
    const prompt = `
Phân tích ý định của người dùng trong tin nhắn tiếng Việt sau:

TIN NHẮN: "${userMessage}"

Hãy xác định:
1. Ý định chính (intent)
2. Độ tin cậy (0-100)
3. Các thực thể quan trọng (entities)
4. Có cần tìm kiếm tài liệu không?
5. Có cần kiểm tra ngữ pháp không?

CÁC LOẠI Ý ĐỊNH:
- grammar_check: Kiểm tra/sửa lỗi ngữ pháp
- vocabulary_help: Hỏi về từ vựng, nghĩa từ
- translation: Dịch thuật
- conversation: Trò chuyện thông thường
- learning_guidance: Hướng dẫn học tập
- document_search: Tìm kiếm thông tin trong tài liệu
- pronunciation: Phát âm
- cultural_info: Thông tin văn hóa

ĐỊNH DẠNG JSON:
{
  "intent": "intent_name",
  "confidence": 85,
  "entities": ["entity1", "entity2"],
  "needsDocumentSearch": true/false,
  "needsGrammarCheck": true/false
}`;

    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: "Bạn là chuyên gia phân tích ý định người dùng. Luôn trả về JSON hợp lệ."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      temperature: 0.3,
      max_tokens: 300,
    });

    const content = response.choices[0]?.message?.content;
    if (content) {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
    }

    // Fallback intent analysis
    return {
      intent: INTENT_CATEGORIES.CONVERSATION,
      confidence: 50,
      entities: [],
      needsDocumentSearch: false,
      needsGrammarCheck: true
    };

  } catch (error) {
    console.error('Intent analysis error:', error);
    return {
      intent: INTENT_CATEGORIES.CONVERSATION,
      confidence: 30,
      entities: [],
      needsDocumentSearch: false,
      needsGrammarCheck: true
    };
  }
}

// Advanced grammar checking with detailed explanations
async function checkGrammarAdvanced(text: string): Promise<GrammarCorrection> {
  try {
    const prompt = `
Bạn là chuyên gia ngữ pháp tiếng Việt. Hãy kiểm tra và sửa lỗi trong câu sau:

CÂU GỐC: "${text}"

Hãy phân tích:
1. Có lỗi ngữ pháp không?
2. Lỗi gì? (dấu thanh, chính tả, ngữ pháp, từ vựng)
3. Vị trí lỗi ở đâu?
4. Sửa như thế nào?
5. Giải thích tại sao?

ĐỊNH DẠNG JSON:
{
  "hasErrors": true/false,
  "original": "câu gốc",
  "corrected": "câu đã sửa",
  "errors": [
    {
      "type": "tone_mark/spelling/grammar/vocabulary",
      "position": 5,
      "original": "từ sai",
      "corrected": "từ đúng", 
      "explanation": "giải thích chi tiết"
    }
  ],
  "explanation": "tổng quan về các lỗi"
}

Nếu không có lỗi, trả về hasErrors: false.`;

    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: "Bạn là chuyên gia ngữ pháp tiếng Việt. Luôn trả về JSON hợp lệ."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      temperature: 0.1,
      max_tokens: 500,
    });

    const content = response.choices[0]?.message?.content;
    if (content) {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
    }

    return {
      hasErrors: false,
      original: text,
      corrected: text,
      errors: [],
      explanation: "Không phát hiện lỗi ngữ pháp."
    };

  } catch (error) {
    console.error('Grammar check error:', error);
    return {
      hasErrors: false,
      original: text,
      corrected: text,
      errors: [],
      explanation: "Không thể kiểm tra ngữ pháp lúc này."
    };
  }
}

// Enhanced search with data source analysis
async function searchDocumentsWithAnalysis(query: string, entities: string[]): Promise<{
  results: string[];
  sourceAnalysis: DataSourceAnalysis;
}> {
  try {
    const { db } = await connectToDatabase();
    
    // Search in documents collection
    const searchTerms = [query, ...entities].filter(Boolean);
    const searchRegex = new RegExp(searchTerms.join('|'), 'i');
    
    const documents = await db.collection('documents')
      .find({
        $or: [
          { fileName: searchRegex },
          { extractedText: searchRegex }
        ]
      })
      .limit(5)
      .toArray();

    // Search in vocabulary collection
    const vocabularies = await db.collection('vocabularies')
      .find({
        $or: [
          { word: searchRegex },
          { meaning: searchRegex },
          { example: searchRegex }
        ]
      })
      .limit(10)
      .toArray();

    const results = [];
    
    // Add document excerpts
    for (const doc of documents) {
      if (doc.extractedText) {
        const excerpt = doc.extractedText.substring(0, 200) + '...';
        results.push(`📄 Từ tài liệu "${doc.fileName}": ${excerpt}`);
      }
    }

    // Add vocabulary entries
    for (const vocab of vocabularies) {
      results.push(`📚 Từ vựng: ${vocab.word} - ${vocab.meaning}\nVí dụ: ${vocab.example}`);
    }

    // Calculate data source percentages
    const totalUserData = documents.length + vocabularies.length;
    const userDocumentPercentage = totalUserData > 0 ? Math.round((totalUserData / (totalUserData + 1)) * 100) : 0;
    const externalSourcePercentage = 100 - userDocumentPercentage;

    const sourceAnalysis: DataSourceAnalysis = {
      userDocumentPercentage,
      externalSourcePercentage,
      totalDocumentsFound: documents.length,
      totalVocabularyFound: vocabularies.length,
      sourceBreakdown: {
        userDocuments: documents.length,
        userVocabulary: vocabularies.length,
        aiKnowledge: userDocumentPercentage < 50 ? 1 : 0
      }
    };

    return { results, sourceAnalysis };

  } catch (error) {
    console.error('Document search error:', error);
    return {
      results: [],
      sourceAnalysis: {
        userDocumentPercentage: 0,
        externalSourcePercentage: 100,
        totalDocumentsFound: 0,
        totalVocabularyFound: 0,
        sourceBreakdown: {
          userDocuments: 0,
          userVocabulary: 0,
          aiKnowledge: 1
        }
      }
    };
  }
}

// Generate bilingual translation
async function generateBilingualResponse(vietnameseText: string): Promise<BilingualResponse> {
  try {
    const prompt = `
Dịch câu tiếng Việt sau sang tiếng Anh một cách tự nhiên và chính xác:

TIẾNG VIỆT: "${vietnameseText}"

Yêu cầu:
1. Dịch tự nhiên, không máy móc
2. Giữ nguyên ý nghĩa và ngữ cảnh
3. Sử dụng từ vựng phù hợp

ĐỊNH DẠNG JSON:
{
  "vietnamese": "câu tiếng Việt gốc",
  "english": "câu tiếng Anh đã dịch",
  "isTranslated": true
}`;

    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: "Bạn là chuyên gia dịch thuật Việt-Anh. Luôn trả về JSON hợp lệ."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      temperature: 0.3,
      max_tokens: 400,
    });

    const content = response.choices[0]?.message?.content;
    if (content) {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
    }

    return {
      vietnamese: vietnameseText,
      english: "Translation not available",
      isTranslated: false
    };

  } catch (error) {
    console.error('Translation error:', error);
    return {
      vietnamese: vietnameseText,
      english: "Translation not available",
      isTranslated: false
    };
  }
}

// Generate intelligent response based on intent with SLA principles
async function generateSmartResponse(
  userMessage: string,
  intent: IntentAnalysis,
  grammarCheck: GrammarCorrection,
  documentResults: string[],
  sourceAnalysis: DataSourceAnalysis,
  conversationHistory: ChatMessage[],
  learnerProfile: LearnerProfile = DEFAULT_LEARNER_PROFILE
): Promise<{ response: string; recastUsed: boolean; encouragement: string }> {
  try {
    // Generate SLA-based system prompt
    const slaSystemPrompt = generateSLASystemPrompt(learnerProfile, SLA_CONFIG);
    
    // Build context-aware prompt
    let contextPrompt = `
${slaSystemPrompt}

---
## CURRENT CONVERSATION CONTEXT

**User Intent**: ${intent.intent} (${intent.confidence}% confidence)
**Entities**: ${intent.entities.join(', ') || 'None detected'}
`;

    // Handle grammar errors with RECASTING (not direct correction)
    let recastUsed = false;
    if (grammarCheck.hasErrors && SLA_CONFIG.enableRecasting) {
      const shouldRecast = shouldCorrect(SLA_CONFIG.correctionFrequency, grammarCheck.errors.length);
      
      if (shouldRecast) {
        recastUsed = true;
        contextPrompt += `
**RECASTING REQUIRED**:
- Original: "${grammarCheck.original}"
- Correct form: "${grammarCheck.corrected}"
- Error types: ${grammarCheck.errors.map(e => e.type).join(', ')}

⚠️ IMPORTANT: Use RECASTING technique!
- Do NOT say "Bạn nói sai" or "Lỗi ngữ pháp"
- Instead, naturally include the correct form in your response
- Example recast: "${generateRecast('grammar', grammarCheck.original, grammarCheck.corrected)}"
`;
      }
    }

    // Add document context if available
    if (documentResults.length > 0) {
      contextPrompt += `
**RELEVANT DOCUMENTS** (${sourceAnalysis.totalDocumentsFound} found):
${documentResults.slice(0, 3).join('\n')}

Use this information to provide personalized responses.
`;
    }

    // Add i+1 instruction
    if (SLA_CONFIG.enableIPlusOne) {
      contextPrompt += `
**i+1 INSTRUCTION**:
- Current level: ${learnerProfile.level}
- Introduce 1-2 new vocabulary/structures
- Keep within comprehensible range
- Provide context clues for new items
`;
    }

    // Add affective filter instruction
    const encouragement = getEncouragement(grammarCheck.hasErrors ? 'effort' : 'success');
    if (SLA_CONFIG.enableAffectiveFilter) {
      contextPrompt += `
**AFFECTIVE FILTER**:
- Start with encouragement: "${encouragement}"
- Keep tone warm and supportive
- Make learner feel comfortable making mistakes
`;
    }

    const messages: ChatMessage[] = [
      { role: 'system', content: contextPrompt },
      ...conversationHistory.slice(-6), // Keep last 6 messages for context
      { role: 'user', content: userMessage }
    ];

    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: messages,
      temperature: 0.7,
      max_tokens: 800,
    });

    const aiResponse = response.choices[0]?.message?.content;
    if (!aiResponse) {
      throw new Error("No response from OpenAI");
    }
    return { response: aiResponse, recastUsed, encouragement };

  } catch (error) {
    console.error('Response generation error:', error);
    
    // SLA-based fallback with recasting
    const encouragement = getEncouragement('effort');
    let fallbackResponse = '';
    
    switch (intent.intent) {
      case INTENT_CATEGORIES.GRAMMAR_CHECK:
        if (grammarCheck.hasErrors) {
          // Use recasting instead of direct correction
          const recast = generateRecast('grammar', grammarCheck.original, grammarCheck.corrected);
          fallbackResponse = `${encouragement} ${recast} Bạn muốn nói thêm gì không?`;
        } else {
          fallbackResponse = `${encouragement} Câu của bạn rất tốt! Hãy tiếp tục nhé! 💪`;
        }
        break;
        
      case INTENT_CATEGORIES.VOCABULARY_HELP:
        fallbackResponse = `${encouragement} Tôi hiểu bạn muốn học từ vựng! Bạn muốn học về chủ đề gì? Tôi có thể giúp bạn với:\n\n🍜 Thức ăn\n👨‍👩‍👧 Gia đình\n🏠 Nhà cửa\n🚗 Giao thông`;
        break;
        
      case INTENT_CATEGORIES.TRANSLATION:
        fallbackResponse = `${encouragement} Tôi sẵn sàng giúp bạn dịch! Hãy viết câu cần dịch nhé. 🌐`;
        break;
        
      case INTENT_CATEGORIES.DOCUMENT_SEARCH:
        if (documentResults.length > 0) {
          fallbackResponse = `${encouragement} Tôi tìm thấy ${documentResults.length} tài liệu liên quan! Bạn muốn xem không?`;
        } else {
          fallbackResponse = `${encouragement} Tôi chưa tìm thấy tài liệu phù hợp. Bạn có thể thử từ khóa khác không?`;
        }
        break;
        
      default:
        fallbackResponse = `${encouragement} Xin chào! Tôi là Viet-Talk AI - trợ lý học tiếng Việt của bạn! 🇻🇳\n\nHôm nay bạn muốn:\n💬 Trò chuyện tiếng Việt\n📚 Học từ vựng mới\n🎯 Luyện phát âm\n\nBạn chọn gì?`;
    }
    
    return { response: fallbackResponse, recastUsed: false, encouragement };
  }
}

export async function POST(req: NextRequest) {
  try {
    const { message, conversationHistory = [] } = await req.json();

    if (!message || typeof message !== 'string') {
      return NextResponse.json(
        { success: false, message: "Message is required" },
        { status: 400 }
      );
    }

    // Step 1: Analyze user intent
    const intentAnalysis = await analyzeIntent(message);

    // Step 2: Check grammar if needed
    let grammarCheck: GrammarCorrection = {
      hasErrors: false,
      original: message,
      corrected: message,
      errors: [],
      explanation: ""
    };

    if (intentAnalysis.needsGrammarCheck) {
      grammarCheck = await checkGrammarAdvanced(message);
    }

    // Step 3: Search documents if needed
    let documentResults: string[] = [];
    let sourceAnalysis: DataSourceAnalysis = {
      userDocumentPercentage: 0,
      externalSourcePercentage: 100,
      totalDocumentsFound: 0,
      totalVocabularyFound: 0,
      sourceBreakdown: {
        userDocuments: 0,
        userVocabulary: 0,
        aiKnowledge: 1
      }
    };

    if (intentAnalysis.needsDocumentSearch) {
      const searchResult = await searchDocumentsWithAnalysis(message, intentAnalysis.entities);
      documentResults = searchResult.results;
      sourceAnalysis = searchResult.sourceAnalysis;
    }

    // Step 4: Generate intelligent response with SLA principles
    const { response: aiResponse, recastUsed, encouragement } = await generateSmartResponse(
      message,
      intentAnalysis,
      grammarCheck,
      documentResults,
      sourceAnalysis,
      conversationHistory
    );

    // Step 5: Generate bilingual translation
    const bilingualResponse = await generateBilingualResponse(aiResponse);

    return NextResponse.json({
      success: true,
      response: aiResponse,
      bilingualResponse,
      sourceAnalysis,
      intent: intentAnalysis,
      grammarCheck: grammarCheck.hasErrors ? grammarCheck : null,
      documentResults: documentResults.length > 0 ? documentResults : null,
      // SLA-specific metadata
      slaMetadata: {
        recastUsed,
        encouragement,
        learnerLevel: DEFAULT_LEARNER_PROFILE.level,
        feedbackStyle: SLA_CONFIG.feedbackStyle,
        iPlusOneEnabled: SLA_CONFIG.enableIPlusOne
      },
      metadata: {
        hasGrammarErrors: grammarCheck.hasErrors,
        foundDocuments: documentResults.length,
        confidence: intentAnalysis.confidence,
        userDataPercentage: sourceAnalysis.userDocumentPercentage,
        aiDataPercentage: sourceAnalysis.externalSourcePercentage
      }
    });

  } catch (error) {
    console.error("Smart chat error:", error);
    return NextResponse.json(
      { success: false, message: "Chat processing failed" },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  return NextResponse.json({
    success: true,
    message: "Smart Chat API is running",
    features: [
      "Intent Analysis",
      "Advanced Grammar Checking", 
      "Document Search",
      "Context-Aware Responses",
      "Multi-language Support"
    ]
  });
}