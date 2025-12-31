import { NextRequest, NextResponse } from "next/server";
import { getUserApiKeys } from "@/lib/getUserApiKey";

const SYSTEM_PROMPT = `You are a Visual Language Tutor for Vietnamese A2-B1 English learners.

Analyze the image and extract vocabulary:
1. Identify visible objects, people, actions
2. Extract 5-8 useful English vocabulary words
3. For each word: English, IPA pronunciation, Vietnamese meaning, part of speech
4. Generate 1-2 simple example sentences per word
5. Keep sentences simple (A2 level)

Vietnamese is ONLY for word meanings. Everything else in English.`;

interface VocabularyItem {
  word: string;
  pronunciation: string;
  partOfSpeech: string;
  vietnamese: string;
  sentences: string[];
}

interface DetectedObject {
  name: string;
  vietnamese: string;
  confidence: number;
}

interface AnalysisResult {
  sceneDescription: string;
  objects: DetectedObject[];
  vocabulary: VocabularyItem[];
}

async function analyzeWithGemini(imageBase64: string, apiKey: string): Promise<AnalysisResult> {
  if (!apiKey) throw new Error("Gemini API key not configured");

  const prompt = `${SYSTEM_PROMPT}

Analyze this image. Return ONLY valid JSON (no markdown, no code blocks):
{
  "sceneDescription": "Brief description of the image",
  "objects": [
    {"name": "object name", "vietnamese": "tên tiếng Việt", "confidence": 0.95}
  ],
  "vocabulary": [
    {
      "word": "word",
      "pronunciation": "/IPA/",
      "partOfSpeech": "noun/verb/adjective",
      "vietnamese": "nghĩa tiếng Việt",
      "sentences": ["Example sentence 1.", "Example sentence 2."]
    }
  ]
}

Requirements:
- Detect 3-6 objects visible in image
- Extract 5-8 vocabulary words (A2-B1 level)
- Vietnamese translations must be accurate
- Sentences must relate to the image`;

  // Use REST API v1beta with gemini-2.0-flash for vision
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{
          parts: [
            { text: prompt },
            { inlineData: { mimeType: "image/jpeg", data: imageBase64 } }
          ]
        }],
        generationConfig: {
          temperature: 0.3,
          maxOutputTokens: 2048
        }
      })
    }
  );

  if (!response.ok) {
    const error = await response.text();
    console.error("Gemini API error:", error);
    throw new Error(`Gemini API error: ${response.status}`);
  }

  const data = await response.json();
  const content = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
  console.log("Gemini response:", content.substring(0, 200));

  // Parse JSON from response
  const jsonMatch = content.match(/\{[\s\S]*\}/);
  if (jsonMatch) {
    const parsed = JSON.parse(jsonMatch[0]);
    return {
      sceneDescription: parsed.sceneDescription || "Image analyzed",
      objects: parsed.objects || [],
      vocabulary: parsed.vocabulary || []
    };
  }
  throw new Error("Invalid JSON response");
}

export async function POST(req: NextRequest) {
  try {
    const { imageBase64, userId = 'anonymous' } = await req.json();

    if (!imageBase64) {
      return NextResponse.json({ success: false, message: "Image required" }, { status: 400 });
    }

    // Get user's API key (fallback to server key)
    const { geminiKey } = await getUserApiKeys(userId);

    if (!geminiKey) {
      return NextResponse.json({ 
        success: false, 
        message: "Gemini API key chưa được cấu hình. Vui lòng thêm key trong Settings." 
      }, { status: 400 });
    }

    console.log("Analyzing image with Gemini (user key:", userId !== 'anonymous' ? 'yes' : 'server', ")...");
    const result = await analyzeWithGemini(imageBase64, geminiKey);

    return NextResponse.json({
      success: true,
      model: "Gemini 1.5 Flash",
      ...result
    });

  } catch (error) {
    console.error("API error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ success: false, message }, { status: 500 });
  }
}

export async function GET() {
  const hasKey = !!process.env.GOOGLE_GEMINI_API_KEY;
  return NextResponse.json({
    success: true,
    message: "Visual Language Tutor API",
    status: hasKey ? "✅ Ready (Gemini)" : "❌ API Key Missing",
    model: "Gemini 1.5 Flash"
  });
}
