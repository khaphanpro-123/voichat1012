import { NextRequest, NextResponse } from "next/server";
import { getUserApiKeys } from "@/lib/getUserApiKey";
import { callAI, parseJsonFromAI } from "@/lib/aiProvider";
import { connectDB } from "@/lib/db";

/**
 * Enhanced Voice Chat API
 * 
 * Features:
 * 1. Bilingual responses (English + Vietnamese translation)
 * 2. Grammar structure analysis
 * 3. Save vocabulary & structures to database
 * 4. Dual audio playback support
 */

// System prompt for enhanced chat
const ENHANCED_SYSTEM_PROMPT = `You are Emma, a friendly English tutor for Vietnamese learners.

For EVERY response, you MUST provide:
1. English response (natural, conversational)
2. Vietnamese translation
3. Grammar structure analysis (if applicable)
4. Key vocabulary to learn

ALWAYS respond in this EXACT JSON format:
{
  "english": "Your English response here",
  "vietnamese": "Bản dịch tiếng Việt ở đây",
  "grammarStructure": {
    "pattern": "Can + I + V + O",
    "explanation": "Used to offer help or ask permission",
    "explanationVi": "Dùng để đề nghị giúp đỡ hoặc xin phép"
  },
  "vocabulary": [
    {
      "word": "help",
      "meaning": "giúp đỡ",
      "partOfSpeech": "verb",
      "example": "Can I help you?"
    }
  ],
  "structures": [
    {
      "pattern": "Can I + V?",
      "meaning": "Tôi có thể... được không?",
      "example": "Can I help you?"
    }
  ]
}

Rules:
- Keep responses SHORT (1-3 sentences) for voice chat
- Be natural and friendly
- If user makes grammar mistakes, gently correct using recasting
- Extract 1-3 key vocabulary words
- Identify 1-2 grammar structures used`;

interface Message {
  role: "user" | "assistant";
  content: string;
}

interface VocabularyItem {
  word: string;
  meaning: string;
  partOfSpeech: string;
  example: string;
}

interface StructureItem {
  pattern: string;
  meaning: string;
  example: string;
}

interface EnhancedResponse {
  english: string;
  vietnamese: string;
  grammarStructure?: {
    pattern: string;
    explanation: string;
    explanationVi: string;
  };
  vocabulary: VocabularyItem[];
  structures: StructureItem[];
}

async function chatWithEnhancedAI(
  userMessage: string,
  conversationHistory: Message[],
  level: string,
  keys: any
): Promise<{ response: EnhancedResponse; provider: string; model: string }> {
  const historyText = conversationHistory
    .slice(-6)
    .map(m => `${m.role === "user" ? "User" : "Emma"}: ${m.content}`)
    .join("\n");

  const prompt = `${ENHANCED_SYSTEM_PROMPT}

User Level: ${level}
${historyText ? `Conversation:\n${historyText}\n` : ""}
User: "${userMessage}"

Respond with ONLY valid JSON:`;

  const result = await callAI(prompt, keys, {
    temperature: 0.7,
    maxTokens: 500
  });

  if (!result.success) {
    throw new Error(result.error || "AI API error");
  }

  const parsed = parseJsonFromAI(result.content);
  
  console.log("🤖 AI Response:", result.content.substring(0, 200));
  console.log("📊 Parsed JSON:", parsed ? "Success" : "Failed");
  
  if (!parsed || !parsed.english) {
    console.warn("⚠️ JSON parsing failed, using fallback");
    // Fallback if JSON parsing fails
    return {
      response: {
        english: result.content.replace(/^(Emma:|Assistant:)\s*/i, "").trim(),
        vietnamese: "",
        vocabulary: [],
        structures: []
      },
      provider: result.provider,
      model: result.model
    };
  }

  console.log("✅ Parsed vocabulary:", parsed.vocabulary?.length || 0, "items");
  console.log("✅ Parsed structures:", parsed.structures?.length || 0, "items");

  // Ensure vocabulary and structures are always arrays
  const enhancedResponse: EnhancedResponse = {
    english: parsed.english,
    vietnamese: parsed.vietnamese || "",
    grammarStructure: parsed.grammarStructure,
    vocabulary: Array.isArray(parsed.vocabulary) ? parsed.vocabulary : [],
    structures: Array.isArray(parsed.structures) ? parsed.structures : []
  };

  return {
    response: enhancedResponse,
    provider: result.provider,
    model: result.model
  };
}

// Save vocabulary to user's collection
async function saveVocabulary(userId: string, items: VocabularyItem[]) {
  if (!items || items.length === 0 || userId === "anonymous") {
    console.log(`⏭️ Skipping vocabulary save: items=${items?.length || 0}, userId=${userId}`);
    return;
  }
  
  try {
    // Use MongoDB native client instead of Mongoose to avoid conflicts
    const getClientPromise = (await import("@/lib/mongodb")).default;
    const client = await getClientPromise();
    const db = client.db("viettalk");
    const collection = db.collection("vocabulary");
    
    console.log(`💾 Saving ${items.length} vocabulary items for user ${userId}`);
    
    for (const item of items) {
      // Ensure we have a valid example
      const example = item.example || `Example: ${item.word}`;
      
      const vocabData = {
        userId,
        word: item.word.toLowerCase(),
        meaning: item.meaning || "No meaning provided",
        type: item.partOfSpeech || "other",
        partOfSpeech: item.partOfSpeech || "other", // Keep both for compatibility
        example: example,
        exampleTranslation: item.meaning || "Không có dịch",
        source: "voice_chat",
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
      
      console.log(`  💾 Saving word: ${item.word}`, vocabData);
      
      // Use updateOne with upsert
      const result = await collection.updateOne(
        { userId, word: item.word.toLowerCase() },
        { $set: vocabData },
        { upsert: true }
      );
      
      console.log(`  ✅ Saved: ${item.word} (matched: ${result.matchedCount}, modified: ${result.modifiedCount}, upserted: ${result.upsertedCount})`);
    }
    
    console.log(`✅ Successfully saved ${items.length} vocabulary items`);
  } catch (err) {
    console.error("❌ Save vocabulary error:", err);
    console.error("Error details:", err instanceof Error ? err.message : err);
    throw err; // Re-throw to see in catch handler
  }
}


// Save grammar structures to user's collection
async function saveStructures(userId: string, items: StructureItem[]) {
  if (!items || items.length === 0 || userId === "anonymous") {
    console.log(`⏭️ Skipping structures save: items=${items?.length || 0}, userId=${userId}`);
    return;
  }
  
  try {
    // Use MongoDB native client instead of Mongoose
    const getClientPromise = (await import("@/lib/mongodb")).default;
    const client = await getClientPromise();
    const db = client.db("viettalk");
    const collection = db.collection("vocabulary");
    
    console.log(`💾 Saving ${items.length} grammar structures for user ${userId}`);
    
    for (const item of items) {
      // Ensure we have a valid example
      const example = item.example || `Example: ${item.pattern}`;
      
      const structureData = {
        userId,
        word: item.pattern,
        meaning: item.meaning || "No meaning provided",
        type: "structure",
        partOfSpeech: "structure",
        example: example,
        exampleTranslation: item.meaning || "Không có dịch",
        source: "voice_chat",
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
      
      console.log(`  💾 Saving structure: ${item.pattern}`, structureData);
      
      const result = await collection.updateOne(
        { userId, word: item.pattern, type: "structure" },
        { $set: structureData },
        { upsert: true }
      );
      
      console.log(`  ✅ Saved: ${item.pattern} (matched: ${result.matchedCount}, modified: ${result.modifiedCount}, upserted: ${result.upsertedCount})`);
    }
    
    console.log(`✅ Successfully saved ${items.length} grammar structures`);
  } catch (err) {
    console.error("❌ Save structures error:", err);
    console.error("Error details:", err instanceof Error ? err.message : err);
    throw err; // Re-throw to see in catch handler
  }
}

// Analyze sentence structure
async function analyzeStructure(sentence: string, keys: any): Promise<{
  pattern: string;
  explanation: string;
  explanationVi: string;
  components: Array<{ part: string; role: string; roleVi: string }>;
}> {
  const prompt = `Analyze the grammar structure of this English sentence: "${sentence}"

Return ONLY valid JSON:
{
  "pattern": "S + V + O",
  "explanation": "Simple present tense with subject-verb-object structure",
  "explanationVi": "Thì hiện tại đơn với cấu trúc chủ ngữ-động từ-tân ngữ",
  "components": [
    { "part": "I", "role": "Subject", "roleVi": "Chủ ngữ" },
    { "part": "can help", "role": "Modal + Verb", "roleVi": "Động từ khuyết thiếu + Động từ" },
    { "part": "you", "role": "Object", "roleVi": "Tân ngữ" }
  ]
}`;

  const result = await callAI(prompt, keys, { temperature: 0.2, maxTokens: 300 });
  
  if (result.success) {
    const parsed = parseJsonFromAI(result.content);
    if (parsed) return parsed;
  }
  
  return {
    pattern: "N/A",
    explanation: "Could not analyze",
    explanationVi: "Không thể phân tích",
    components: []
  };
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { 
      action, 
      message, 
      conversationHistory = [], 
      level = "A2", 
      userId = "anonymous",
      sentence,
      autoSave = true
    } = body;

    // Start session
    if (action === "start") {
      const greetings = [
        {
          english: "Hey! What's on your mind today?",
          vietnamese: "Chào bạn! Hôm nay bạn muốn nói về gì?",
          vocabulary: [{ word: "mind", meaning: "tâm trí, suy nghĩ", partOfSpeech: "noun", example: "What's on your mind?" }],
          structures: [{ pattern: "What's on your mind?", meaning: "Bạn đang nghĩ gì?", example: "What's on your mind today?" }]
        },
        {
          english: "Hi! Ready to practice English? Tell me about your day!",
          vietnamese: "Xin chào! Sẵn sàng luyện tiếng Anh chưa? Kể cho tôi nghe về ngày của bạn!",
          vocabulary: [{ word: "practice", meaning: "luyện tập", partOfSpeech: "verb", example: "I practice English every day." }],
          structures: [{ pattern: "Tell me about...", meaning: "Kể cho tôi nghe về...", example: "Tell me about your day!" }]
        },
        {
          english: "Hello! What would you like to talk about?",
          vietnamese: "Xin chào! Bạn muốn nói về chủ đề gì?",
          vocabulary: [{ word: "talk about", meaning: "nói về", partOfSpeech: "phrasal verb", example: "Let's talk about your hobbies." }],
          structures: [{ pattern: "What would you like to...?", meaning: "Bạn muốn... gì?", example: "What would you like to eat?" }]
        }
      ];
      
      const greeting = greetings[Math.floor(Math.random() * greetings.length)];
      
      return NextResponse.json({
        success: true,
        response: greeting,
        sessionId: `enhanced_${Date.now()}`,
      });
    }

    // Analyze structure only
    if (action === "analyzeStructure") {
      if (!sentence?.trim()) {
        return NextResponse.json({ success: false, message: "sentence required" }, { status: 400 });
      }

      const keys = await getUserApiKeys(userId);
      if (!keys.openaiKey && !keys.groqKey && !keys.cohereKey) {
        return NextResponse.json({
          success: false,
          message: "Chưa có API key. Vui lòng thêm Groq key (miễn phí) trong Settings.",
          needApiKey: true,
        }, { status: 400 });
      }

      const analysis = await analyzeStructure(sentence, keys);
      
      return NextResponse.json({
        success: true,
        analysis
      });
    }

    // Get saved vocabulary and structures
    if (action === "getSaved") {
      if (userId === "anonymous") {
        return NextResponse.json({ success: true, vocabulary: [], structures: [] });
      }

      // Use MongoDB native client
      const getClientPromise = (await import("@/lib/mongodb")).default;
      const client = await getClientPromise();
      const db = client.db("viettalk");
      const collection = db.collection("vocabulary");
      
      const vocabulary = await collection.find({ 
        userId, 
        source: "voice_chat",
        type: { $ne: "structure" }
      }).sort({ created_at: -1 }).limit(50).toArray();
      
      const structures = await collection.find({ 
        userId, 
        source: "voice_chat",
        type: "structure"
      }).sort({ created_at: -1 }).limit(30).toArray();

      return NextResponse.json({
        success: true,
        vocabulary,
        structures
      });
    }

    // Main chat
    if (action === "chat") {
      if (!message?.trim()) {
        return NextResponse.json({ success: false, message: "Message required" }, { status: 400 });
      }

      const keys = await getUserApiKeys(userId);
      if (!keys.openaiKey && !keys.groqKey && !keys.cohereKey) {
        return NextResponse.json({
          success: false,
          message: "Chưa có API key. Vui lòng thêm Groq key (miễn phí) trong Settings.",
          needApiKey: true,
        }, { status: 400 });
      }

      const { response, provider, model } = await chatWithEnhancedAI(
        message, conversationHistory, level, keys
      );

      // Auto-save vocabulary and structures
      if (autoSave && userId !== "anonymous") {
        console.log(`🔄 Auto-saving vocabulary for user ${userId}...`);
        console.log(`📝 Vocabulary items to save:`, response.vocabulary?.length || 0);
        console.log(`📝 Structure items to save:`, response.structures?.length || 0);
        
        saveVocabulary(userId, response.vocabulary).catch((err) => {
          console.error("❌ Failed to save vocabulary:", err);
        });
        saveStructures(userId, response.structures).catch((err) => {
          console.error("❌ Failed to save structures:", err);
        });
      } else {
        console.log(`⚠️ Auto-save skipped: autoSave=${autoSave}, userId=${userId}`);
      }

      return NextResponse.json({
        success: true,
        response,
        userMessage: message,
        provider,
        model
      });
    }

    return NextResponse.json({ success: false, message: "Invalid action" }, { status: 400 });

  } catch (error) {
    console.error("Enhanced voice chat error:", error);
    return NextResponse.json({
      success: false,
      message: error instanceof Error ? error.message : "Chat failed",
    }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({
    success: true,
    message: "Enhanced Voice Chat API",
    features: [
      "Bilingual responses (English + Vietnamese)",
      "Grammar structure analysis",
      "Auto-save vocabulary & structures",
      "Dual audio playback support"
    ],
    actions: {
      start: "Start new session with greeting",
      chat: "Send message and get enhanced response",
      analyzeStructure: "Analyze grammar structure of a sentence",
      getSaved: "Get saved vocabulary and structures"
    }
  });
}
