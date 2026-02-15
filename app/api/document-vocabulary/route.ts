import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { getUserApiKeys } from "@/lib/getUserApiKey";

interface VocabularyWord {
  english: string;
  vietnamese: string;
  pronunciation: string;
  partOfSpeech: string;
  definition: string;
  example: string;
  exampleVi: string;
  difficulty: 'easy' | 'medium' | 'hard';
  imagePrompt: string;
}

// Extract vocabulary from text using Gemini REST API v1
async function extractVocabulary(text: string, count: number, geminiKey: string): Promise<VocabularyWord[]> {
  const prompt = `You are an English vocabulary teacher for Vietnamese students.
Extract ${count} important English vocabulary words from this text.
Choose words that are useful for Vietnamese learners (A2-B1 level).

TEXT:
${text.substring(0, 4000)}

Return ONLY valid JSON array (no markdown, no code blocks):
[
  {
    "english": "word",
    "vietnamese": "nghĩa tiếng Việt chính xác",
    "pronunciation": "/IPA/",
    "partOfSpeech": "noun/verb/adjective/adverb",
    "definition": "Clear English definition",
    "example": "Example sentence using the word",
    "exampleVi": "Bản dịch câu ví dụ",
    "difficulty": "easy/medium/hard",
    "imagePrompt": "Simple visual description for image generation"
  }
]`;

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${geminiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.3, maxOutputTokens: 2048 }
        })
      }
    );

    if (!response.ok) {
      const error = await response.text();
      console.error("Gemini API error:", error);
      return [];
    }

    const data = await response.json();
    const content = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
    console.log("Gemini vocabulary response:", content.substring(0, 200));
    
    const jsonMatch = content.match(/\[[\s\S]*\]/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
    return [];
  } catch (error) {
    console.error('Extract vocabulary error:', error);
    return [];
  }
}

// Generate image for vocabulary word using DALL-E
async function generateVocabularyImage(word: string, imagePrompt: string, apiKey: string): Promise<string | null> {
  const openai = new OpenAI({ apiKey });

  try {
    const response = await openai.images.generate({
      model: "dall-e-3",
      prompt: `Educational illustration: "${word}". ${imagePrompt}. Style: Clean, simple, colorful, educational. No text in image.`,
      n: 1,
      size: "1024x1024",
      quality: "standard"
    });

    return response.data?.[0]?.url || null;
  } catch (error) {
    console.error('Image generation error:', error);
    return null;
  }
}

export async function POST(req: NextRequest) {
  try {
    const { action, text, word, imagePrompt, count = 10, userId = 'anonymous' } = await req.json();

    // Get user's API keys
    const { openaiKey, geminiKey } = await getUserApiKeys(userId);

    // Action: Extract vocabulary from text (uses Gemini - free)
    if (action === 'extract') {
      if (!text) {
        return NextResponse.json({ success: false, message: "Text required" }, { status: 400 });
      }
      
      if (!geminiKey) {
        return NextResponse.json({ 
          success: false, 
          message: "Gemini API key không có. Kiểm tra .env file.",
          needApiKey: true 
        }, { status: 400 });
      }
      
      console.log("Extracting vocabulary with Gemini...");
      const vocabulary = await extractVocabulary(text, count, geminiKey);
      return NextResponse.json({ 
        success: true, 
        vocabulary, 
        count: vocabulary.length,
        model: "Gemini 1.5 Flash"
      });
    }

    // Action: Generate image for a word (uses DALL-E)
    if (action === 'generate-image') {
      if (!word || !imagePrompt) {
        return NextResponse.json({ success: false, message: "Word and imagePrompt required" }, { status: 400 });
      }

      if (!openaiKey) {
        return NextResponse.json({ 
          success: false, 
          message: "OpenAI API key không có hoặc hết quota. Vui lòng cấu hình trong Settings.",
          needApiKey: true 
        }, { status: 400 });
      }

      const imageUrl = await generateVocabularyImage(word, imagePrompt, openaiKey);
      if (imageUrl) {
        return NextResponse.json({ success: true, imageUrl });
      }
      return NextResponse.json({ success: false, message: "Image generation failed (có thể hết quota)" }, { status: 500 });
    }

    return NextResponse.json({ success: false, message: "Invalid action" }, { status: 400 });
  } catch (error) {
    console.error("API error:", error);
    const message = error instanceof Error ? error.message : "Failed";
    return NextResponse.json({ success: false, message }, { status: 500 });
  }
}

export async function GET() {
  const hasGemini = !!process.env.GOOGLE_GEMINI_API_KEY;
  const hasOpenAI = !!process.env.OPENAI_API_KEY;
  
  return NextResponse.json({
    success: true,
    message: "Document Vocabulary API",
    status: {
      gemini: hasGemini ? "✅ Ready" : "❌ Missing",
      openai: hasOpenAI ? "✅ Ready (DALL-E)" : "❌ Missing"
    },
    actions: { 
      extract: "Extract vocabulary from text (Gemini)", 
      "generate-image": "Generate DALL-E image (OpenAI)" 
    }
  });
}
