import { NextRequest, NextResponse } from "next/server";
import { OpenAI } from 'openai';
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

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

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
 */
async function analyzeEnglishGrammar(text: string, level: string): Promise<GrammarAnalysis> {
  try {
    const prompt = `
You are an English grammar expert helping Vietnamese learners.

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

Return JSON:
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

    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: "You are an English grammar analyzer. Return valid JSON only." },
        { role: "user", content: prompt }
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

    return { hasErrors: false, errors: [], correctedText: text };
  } catch (error) {
    console.error('Grammar analysis error:', error);
    return { hasErrors: false, errors: [], correctedText: text };
  }
}

/**
 * Generate natural English response with SLA principles
 */
async function generateEnglishResponse(
  userMessage: string,
  grammarAnalysis: GrammarAnalysis,
  conversationHistory: ChatMessage[],
  learnerProfile: EnglishLearnerProfile,
  config: EnglishSLAConfig
): Promise<{
  response: string;
  recastUsed: boolean;
  encouragement: string;
  vietnameseHint?: string;
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

⚠️ USE RECASTING:
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

    const messages: ChatMessage[] = [
      { role: 'system', content: contextPrompt },
      ...conversationHistory.slice(-8),
      { role: 'user', content: userMessage }
    ];

    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages,
      temperature: 0.7,
      max_tokens: 300,
    });

    const aiResponse = response.choices[0]?.message?.content || "I understand! Can you tell me more?";

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
      vietnameseHint
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
    
    const transcription = await openai.audio.transcriptions.create({
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
    
    const response = await openai.audio.speech.create({
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
      config = DEFAULT_ENGLISH_CONFIG
    } = body;

    // Action: Start new session
    if (action === 'start') {
      const welcomeMessage = learnerProfile.level === 'A1' || learnerProfile.level === 'A2'
        ? "Hi there! 👋 I'm your English tutor. Let's practice English together! What would you like to talk about today? (Xin chào! Tôi là gia sư tiếng Anh của bạn. Hôm nay bạn muốn nói về chủ đề gì?)"
        : "Hello! 👋 I'm excited to practice English with you today. What's on your mind?";

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

      // Step 2: Analyze grammar
      const grammarAnalysis = await analyzeEnglishGrammar(transcription, learnerProfile.level);

      // Step 3: Generate response
      const { response, recastUsed, encouragement, vietnameseHint } = await generateEnglishResponse(
        transcription,
        grammarAnalysis,
        conversationHistory,
        learnerProfile,
        config
      );

      // Step 4: Generate speech
      const audioUrl = await generateSpeech(response, config.speakingSpeed);

      return NextResponse.json({
        success: true,
        action: 'voice',
        transcription,
        transcriptionConfidence: confidence,
        response,
        audioUrl,
        grammarAnalysis: grammarAnalysis.hasErrors ? grammarAnalysis : null,
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

      // Step 1: Analyze grammar
      const grammarAnalysis = await analyzeEnglishGrammar(message, learnerProfile.level);

      // Step 2: Generate response
      const { response, recastUsed, encouragement, vietnameseHint } = await generateEnglishResponse(
        message,
        grammarAnalysis,
        conversationHistory,
        learnerProfile,
        config
      );

      // Step 3: Generate speech (optional)
      const audioUrl = await generateSpeech(response, config.speakingSpeed);

      return NextResponse.json({
        success: true,
        action: 'chat',
        response,
        audioUrl,
        grammarAnalysis: grammarAnalysis.hasErrors ? grammarAnalysis : null,
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
    description: "Gemini Live-style English conversation practice",
    features: [
      "Real-time voice chat",
      "Whisper transcription",
      "OpenAI TTS response",
      "SLA-based teaching (Krashen)",
      "Recasting error correction",
      "Vietnamese support for beginners",
      "Adaptive difficulty (A1-C2)"
    ],
    actions: {
      start: "Start new conversation session",
      voice: "Send audio, get audio response",
      chat: "Send text, get text + audio response"
    },
    levels: ["A1", "A2", "B1", "B2", "C1", "C2"]
  });
}
