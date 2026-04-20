import { NextRequest, NextResponse } from "next/server";
import { getOpenAI } from '@/lib/openai';
import { getUserApiKeys } from "@/lib/getUserApiKey";
import { callAI, parseJsonFromAI } from "@/lib/aiProvider";
import {
  generateEnglishSLAPrompt,
  generateEnglishRecast,
  getEnglishEncouragement,
  detectVietnameseMistakes,
  EnglishLearnerProfile,
  EnglishSLAConfig,
  DEFAULT_ENGLISH_LEARNER,
  DEFAULT_ENGLISH_CONFIG
} from '@/lib/englishSLAPrompt';



interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

interface GrammarAnalysis {
  hasErrors: boolean;
  errors: Array<{
    type: string;
    original: string;
    corrected: string;
    explanation: string;
    vietnameseExplanation?: string;
  }>;
  correctedText: string;
}

/**
 * Analyze English grammar with Vietnamese learner context
 * OPTIMIZED: Uses Groq for faster response
 */
async function analyzeEnglishGrammar(text: string, level: string, userId: string): Promise<GrammarAnalysis> {
  try {
    const prompt = `You are an English grammar expert helping Vietnamese learners.

Analyze this English text for errors common among Vietnamese speakers:
"${text}"

Learner Level: ${level}

Check for:
1. Missing articles (a, an, the)
2. Subject-verb agreement (he goes, she likes)
3. Verb tense errors
4. Missing "to be" (I am, she is)
5. Word order issues
6. Preposition errors

Return ONLY valid JSON:
{
  "hasErrors": true/false,
  "errors": [
    {
      "type": "article/verb/tense/word_order/preposition",
      "original": "wrong part",
      "corrected": "correct form",
      "explanation": "brief English explanation",
      "vietnameseExplanation": "giải thích tiếng Việt"
    }
  ],
  "correctedText": "full corrected sentence"
}

If no errors, return hasErrors: false with empty errors array.`;

    // Use Groq for faster response
    const keys = await getUserApiKeys(userId);
    const result = await callAI(prompt, keys, {
      temperature: 0.1,
      maxTokens: 500,
      preferProvider: "groq" // Prioritize Groq for speed
    });

    if (result.success) {
      const parsed = parseJsonFromAI(result.content);
      if (parsed) {
        return parsed;
      }
    }

    return { hasErrors: false, errors: [], correctedText: text };
  } catch (error) {
    console.error('Grammar analysis error:', error);
    return { hasErrors: false, errors: [], correctedText: text };
  }
}

/**
 * Generate natural English response with SLA principles
 * OPTIMIZED: Uses Groq for faster response
 */
async function generateEnglishResponse(
  userMessage: string,
  grammarAnalysis: GrammarAnalysis,
  conversationHistory: ChatMessage[],
  learnerProfile: EnglishLearnerProfile,
  config: EnglishSLAConfig,
  userId: string
): Promise<{
  response: string;
  recastUsed: boolean;
  encouragement: string;
  vietnameseHint?: string;
  vocabulary?: Array<{
    word: string;
    meaning: string;
    partOfSpeech: string;
    example: string;
  }>;
}> {
  try {
    // Generate SLA system prompt
    const slaPrompt = generateEnglishSLAPrompt(learnerProfile, config);
    
    // Build context
    let contextPrompt = slaPrompt;
    
    // Add recasting instruction if errors found
    let recastUsed = false;
    if (grammarAnalysis.hasErrors && config.enableRecasting) {
      recastUsed = true;
      const mainError = grammarAnalysis.errors[0];
      const recast = generateEnglishRecast('grammar', mainError.original, mainError.corrected);
      
      contextPrompt += `

---
## CURRENT CONTEXT

**User said**: "${userMessage}"
**Corrected form**: "${grammarAnalysis.correctedText}"
**Main error**: ${mainError.type} - "${mainError.original}" → "${mainError.corrected}"

 USE RECASTING:
- Do NOT say "That's wrong" or "You made a mistake"
- Naturally include the correct form in your response
- Example recast: "${recast}"
- Then continue the conversation naturally
`;
    }

    // Add encouragement instruction
    const encouragement = getEnglishEncouragement(
      grammarAnalysis.hasErrors ? 'effort' : 'success',
      learnerProfile.level === 'A1' || learnerProfile.level === 'A2'
    );

    // Build conversation context
    const historyContext = conversationHistory.slice(-6).map(msg => 
      `${msg.role === 'user' ? 'Student' : 'Teacher'}: ${msg.content}`
    ).join('\n');

    const fullPrompt = `${contextPrompt}

---
## CONVERSATION HISTORY
${historyContext}

---
## CURRENT MESSAGE
Student: ${userMessage}

Teacher (respond naturally in 1-2 sentences):`;

    // Use Groq for faster response
    const keys = await getUserApiKeys(userId);
    const result = await callAI(fullPrompt, keys, {
      temperature: 0.7,
      maxTokens: 200, // Reduced for faster response
      preferProvider: "groq" // Prioritize Groq for speed
    });

    const aiResponse = result.success 
      ? result.content.trim()
      : "I understand! Can you tell me more?";

    // Extract vocabulary from user message and AI response
    const vocabulary = await extractVocabularyFromConversation(userMessage, aiResponse, keys);

    // Add Vietnamese hint for beginners if needed
    let vietnameseHint: string | undefined;
    if (config.enableVietnameseSupport && 
        (learnerProfile.level === 'A1' || learnerProfile.level === 'A2') &&
        grammarAnalysis.hasErrors) {
      vietnameseHint = grammarAnalysis.errors[0]?.vietnameseExplanation;
    }

    return {
      response: aiResponse,
      recastUsed,
      encouragement,
      vietnameseHint,
      vocabulary
    };

  } catch (error) {
    console.error('Response generation error:', error);
    const encouragement = getEnglishEncouragement('effort', true);
    return {
      response: `${encouragement} I understand what you mean! Can you tell me more about that?`,
      recastUsed: false,
      encouragement
    };
  }
}

/**
 * Extract vocabulary from conversation for learning
 */
async function extractVocabularyFromConversation(
  userMessage: string,
  aiResponse: string,
  keys: any
): Promise<Array<{
  word: string;
  meaning: string;
  partOfSpeech: string;
  example: string;
}>> {
  try {
    const prompt = `Extract 2-3 key vocabulary words from this English conversation for Vietnamese learners:

User: "${userMessage}"
Teacher: "${aiResponse}"

Focus on:
- Important words the user used
- New words from the teacher's response
- Words that are useful for daily conversation

Return ONLY valid JSON array:
[
  {
    "word": "practice",
    "meaning": "luyện tập",
    "partOfSpeech": "verb",
    "example": "I practice English every day."
  }
]

If no significant vocabulary, return empty array: []`;

    const result = await callAI(prompt, keys, {
      temperature: 0.3,
      maxTokens: 300,
      preferProvider: "groq"
    });

    if (result.success) {
      const parsed = parseJsonFromAI(result.content);
      if (Array.isArray(parsed)) {
        return parsed.slice(0, 3); // Limit to 3 words max
      }
    }

    return [];
  } catch (error) {
    console.error('Vocabulary extraction error:', error);
    return [];
  }
}

/**
 * Save vocabulary to user's collection
 */
async function saveVocabularyToDatabase(
  userId: string,
  vocabulary: Array<{
    word: string;
    meaning: string;
    partOfSpeech: string;
    example: string;
  }>
): Promise<{ savedCount: number; failedCount: number }> {
  if (!vocabulary || vocabulary.length === 0 || userId === 'anonymous') {
    console.log(`⏭ Skipping vocabulary save: items=${vocabulary?.length || 0}, userId=${userId}`);
    return { savedCount: 0, failedCount: 0 };
  }

  let savedCount = 0;
  let failedCount = 0;

  try {
    console.log(` Saving ${vocabulary.length} vocabulary items for user ${userId}`);

    // Use MongoDB directly instead of internal API call
    const getClientPromise = (await import("@/lib/mongodb")).default;
    const client = await getClientPromise();
    const db = client.db("viettalk");
    const collection = db.collection("vocabulary");

    for (const item of vocabulary) {
      try {
        const vocabData = {
          userId,
          word: item.word.toLowerCase(),
          meaning: item.meaning || "No meaning provided",
          type: item.partOfSpeech || "other",
          partOfSpeech: item.partOfSpeech || "other",
          example: item.example || `Example: ${item.word}`,
          exampleTranslation: item.meaning || "Không có dịch",
          source: "english_live_chat",
          level: "intermediate",
          easeFactor: 2.5,
          interval: 1,
          repetitions: 0,
          nextReviewDate: new Date(),
          isLearned: false,
          timesReviewed: 0,
          timesCorrect: 0,
          timesIncorrect: 0,
          created_at: new Date(),
          updated_at: new Date()
        };

        const result = await collection.updateOne(
          { userId, word: item.word.toLowerCase() },
          { $set: vocabData },
          { upsert: true }
        );

        savedCount++;
        console.log(` Saved vocabulary: ${item.word} (matched: ${result.matchedCount}, modified: ${result.modifiedCount}, upserted: ${result.upsertedCount})`);
      } catch (err) {
        failedCount++;
        console.error(` Error saving vocabulary: ${item.word}`, err);
      }
    }

    console.log(` Vocabulary save complete: ${savedCount} saved, ${failedCount} failed`);
    return { savedCount, failedCount };
  } catch (error) {
    console.error(' Vocabulary save error:', error);
    return { savedCount: 0, failedCount: vocabulary.length };
  }
}

/**
 * Transcribe audio using Whisper
 */
async function transcribeAudio(audioBase64: string): Promise<{
  text: string;
  confidence: number;
}> {
  try {
    // Convert base64 to buffer
    const audioBuffer = Buffer.from(audioBase64, 'base64');
    
    // Create a File-like object for OpenAI
    const audioFile = new File([audioBuffer], 'audio.webm', { type: 'audio/webm' });
    
    const transcription = await getOpenAI().audio.transcriptions.create({
      file: audioFile,
      model: 'whisper-1',
      language: 'en', // Expect English input
      response_format: 'verbose_json'
    });

    return {
      text: transcription.text,
      confidence: 0.9 // Whisper doesn't return confidence, estimate based on duration
    };
  } catch (error) {
    console.error('Transcription error:', error);
    return { text: '', confidence: 0 };
  }
}

/**
 * Generate speech from text using OpenAI TTS
 */
async function generateSpeech(
  text: string, 
  speed: 'slow' | 'normal' | 'fast'
): Promise<string> {
  try {
    const speedMap = { slow: 0.85, normal: 1.0, fast: 1.15 };
    
    const response = await getOpenAI().audio.speech.create({
      model: 'tts-1',
      voice: 'nova', // Friendly female voice
      input: text,
      speed: speedMap[speed],
      response_format: 'mp3'
    });

    // Convert to base64
    const arrayBuffer = await response.arrayBuffer();
    const base64 = Buffer.from(arrayBuffer).toString('base64');
    
    return `data:audio/mp3;base64,${base64}`;
  } catch (error) {
    console.error('TTS error:', error);
    return '';
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { 
      action, 
      message, 
      audioBase64, 
      conversationHistory = [],
      learnerProfile = DEFAULT_ENGLISH_LEARNER,
      config = DEFAULT_ENGLISH_CONFIG,
      userId = 'anonymous'
    } = body;

    // Action: Start new session
    if (action === 'start') {
      const welcomeMessage = learnerProfile.level === 'A1' || learnerProfile.level === 'A2'
        ? "Hi there!  I'm your English tutor. Let's practice English together! What would you like to talk about today? (Xin chào! Tôi là gia sư tiếng Anh của bạn. Hôm nay bạn muốn nói về chủ đề gì?)"
        : "Hello!  I'm excited to practice English with you today. What's on your mind?";

      // Generate audio for welcome message
      const audioUrl = await generateSpeech(welcomeMessage, config.speakingSpeed);

      return NextResponse.json({
        success: true,
        action: 'start',
        sessionId: `english_${Date.now()}`,
        message: welcomeMessage,
        audioUrl,
        learnerProfile,
        config
      });
    }

    // Action: Voice chat (audio input)
    if (action === 'voice') {
      if (!audioBase64) {
        return NextResponse.json(
          { success: false, message: "Audio data required" },
          { status: 400 }
        );
      }

      // Step 1: Transcribe audio
      const { text: transcription, confidence } = await transcribeAudio(audioBase64);
      
      if (!transcription) {
        return NextResponse.json({
          success: false,
          message: "Could not understand audio. Please try again.",
          vietnameseMessage: "Không nghe rõ. Vui lòng thử lại."
        });
      }

      // Step 2: Analyze grammar (using Groq for speed)
      const grammarAnalysis = await analyzeEnglishGrammar(transcription, learnerProfile.level, userId);

      // Step 3: Generate response (using Groq for speed)
      const { response, recastUsed, encouragement, vietnameseHint, vocabulary } = await generateEnglishResponse(
        transcription,
        grammarAnalysis,
        conversationHistory,
        learnerProfile,
        config,
        userId
      );

      // Step 4: Generate speech
      const audioUrl = await generateSpeech(response, config.speakingSpeed);

      // Step 5: Auto-save vocabulary (if user is logged in)
      let vocabularySaved = { savedCount: 0, failedCount: 0 };
      if (vocabulary && vocabulary.length > 0 && userId !== 'anonymous') {
        vocabularySaved = await saveVocabularyToDatabase(userId, vocabulary);
      }

      return NextResponse.json({
        success: true,
        action: 'voice',
        transcription,
        transcriptionConfidence: confidence,
        response,
        audioUrl,
        grammarAnalysis: grammarAnalysis.hasErrors ? grammarAnalysis : null,
        vocabulary: vocabulary || [],
        vocabularySaved,
        slaMetadata: {
          recastUsed,
          encouragement,
          vietnameseHint,
          level: learnerProfile.level
        }
      });
    }

    // Action: Text chat
    if (action === 'chat') {
      if (!message) {
        return NextResponse.json(
          { success: false, message: "Message required" },
          { status: 400 }
        );
      }

      // Step 1: Analyze grammar (using Groq for speed)
      const grammarAnalysis = await analyzeEnglishGrammar(message, learnerProfile.level, userId);

      // Step 2: Generate response (using Groq for speed)
      const { response, recastUsed, encouragement, vietnameseHint, vocabulary } = await generateEnglishResponse(
        message,
        grammarAnalysis,
        conversationHistory,
        learnerProfile,
        config,
        userId
      );

      // Step 3: Generate speech (optional)
      const audioUrl = await generateSpeech(response, config.speakingSpeed);

      // Step 4: Auto-save vocabulary (if user is logged in)
      let vocabularySaved = { savedCount: 0, failedCount: 0 };
      if (vocabulary && vocabulary.length > 0 && userId !== 'anonymous') {
        vocabularySaved = await saveVocabularyToDatabase(userId, vocabulary);
      }

      return NextResponse.json({
        success: true,
        action: 'chat',
        response,
        audioUrl,
        grammarAnalysis: grammarAnalysis.hasErrors ? grammarAnalysis : null,
        vocabulary: vocabulary || [],
        vocabularySaved,
        slaMetadata: {
          recastUsed,
          encouragement,
          vietnameseHint,
          level: learnerProfile.level
        }
      });
    }

    return NextResponse.json(
      { success: false, message: "Invalid action. Use 'start', 'voice', or 'chat'" },
      { status: 400 }
    );

  } catch (error) {
    console.error("English live chat error:", error);
    return NextResponse.json(
      { success: false, message: "Chat processing failed" },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    success: true,
    message: "English Live Chat API - For Vietnamese Learners",
    description: "Gemini Live-style English conversation practice with vocabulary extraction",
    features: [
      "Real-time voice chat",
      "Whisper transcription",
      "OpenAI TTS response",
      "SLA-based teaching (Krashen)",
      "Recasting error correction",
      "Vietnamese support for beginners",
      "Adaptive difficulty (A1-C2)",
      "Automatic vocabulary extraction and saving",
      "Grammar analysis with Vietnamese explanations"
    ],
    actions: {
      start: "Start new conversation session",
      voice: "Send audio, get audio response + vocabulary",
      chat: "Send text, get text + audio response + vocabulary"
    },
    levels: ["A1", "A2", "B1", "B2", "C1", "C2"]
  });
}

