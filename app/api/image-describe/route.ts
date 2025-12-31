import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";

// Initialize Gemini
const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GEMINI_API_KEY || '');

interface ImageAnalysis {
  description: string;
  objects: string[];
  suggestedVocabulary: string[];
  questions: string[];
  scene: string;
}

/**
 * Analyze image using Gemini Vision
 */
async function analyzeImageWithGemini(imageBase64: string, level: string): Promise<ImageAnalysis> {
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

    const prompt = `
You are an English teacher helping Vietnamese students practice describing images.

Analyze this image and provide:
1. A simple description (appropriate for ${level} level English learner)
2. List of objects/things visible in the image
3. Suggested vocabulary words for describing this image
4. 3 questions to ask the student about this image

Return ONLY valid JSON (no markdown):
{
  "description": "A brief description of the image",
  "objects": ["object1", "object2", "object3"],
  "suggestedVocabulary": ["word1", "word2", "word3", "word4", "word5"],
  "questions": [
    "What do you see in this picture?",
    "Can you describe the colors?",
    "What is happening in this image?"
  ],
  "scene": "indoor/outdoor/nature/city/etc"
}

Keep vocabulary and questions appropriate for ${level} level.`;

    const result = await model.generateContent([
      prompt,
      {
        inlineData: {
          mimeType: "image/jpeg",
          data: imageBase64
        }
      }
    ]);

    const response = await result.response;
    const content = response.text();

    // Parse JSON
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }

    throw new Error("Failed to parse response");
  } catch (error) {
    console.error('Gemini vision error:', error);
    return {
      description: "An interesting image",
      objects: ["object"],
      suggestedVocabulary: ["describe", "see", "look", "picture", "image"],
      questions: [
        "What do you see in this picture?",
        "Can you describe what's happening?",
        "What colors do you notice?"
      ],
      scene: "general"
    };
  }
}

/**
 * Check user's description against image
 */
async function checkDescription(
  imageBase64: string,
  userDescription: string,
  imageAnalysis: ImageAnalysis,
  level: string
): Promise<{
  score: number;
  feedback: string;
  corrections: Array<{ original: string; corrected: string; explanation: string }>;
  suggestions: string[];
  encouragement: string;
}> {
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

    const prompt = `
You are a friendly English teacher helping a Vietnamese student (${level} level) practice describing images.

IMAGE ANALYSIS:
${JSON.stringify(imageAnalysis, null, 2)}

STUDENT'S DESCRIPTION:
"${userDescription}"

Evaluate the student's description:
1. Is it accurate to the image? (content score 0-50)
2. Is the English correct? (language score 0-50)
3. What grammar/vocabulary errors are there?
4. What could they add to improve?

Be encouraging and use RECASTING (don't say "wrong", naturally show correct form).

Return ONLY valid JSON:
{
  "score": 75,
  "feedback": "Great job! You mentioned [correct things]. I noticed you said [image content] - that's right!",
  "corrections": [
    {
      "original": "wrong phrase",
      "corrected": "correct phrase",
      "explanation": "Brief explanation"
    }
  ],
  "suggestions": [
    "You could also mention...",
    "Try adding more details about..."
  ],
  "encouragement": "Well done! Keep practicing!"
}`;

    const result = await model.generateContent([
      prompt,
      {
        inlineData: {
          mimeType: "image/jpeg",
          data: imageBase64
        }
      }
    ]);

    const response = await result.response;
    const content = response.text();

    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }

    throw new Error("Failed to parse response");
  } catch (error) {
    console.error('Check description error:', error);
    return {
      score: 70,
      feedback: "Good effort! Your description captures some elements of the image.",
      corrections: [],
      suggestions: ["Try to add more details about what you see."],
      encouragement: "Keep practicing! You're doing great! 💪"
    };
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action, imageBase64, userDescription, imageAnalysis, level = 'A2' } = body;

    // Check API key
    if (!process.env.GOOGLE_GEMINI_API_KEY || process.env.GOOGLE_GEMINI_API_KEY === 'your-gemini-api-key-here') {
      return NextResponse.json({
        success: false,
        message: "Google Gemini API key not configured",
        setupGuide: "Get your API key from: https://aistudio.google.com/app/apikey"
      }, { status: 400 });
    }

    // Action: Analyze image
    if (action === 'analyze') {
      if (!imageBase64) {
        return NextResponse.json(
          { success: false, message: "Image required" },
          { status: 400 }
        );
      }

      const analysis = await analyzeImageWithGemini(imageBase64, level);

      return NextResponse.json({
        success: true,
        action: 'analyze',
        analysis,
        firstQuestion: analysis.questions[0]
      });
    }

    // Action: Check description
    if (action === 'check') {
      if (!imageBase64 || !userDescription) {
        return NextResponse.json(
          { success: false, message: "Image and description required" },
          { status: 400 }
        );
      }

      const result = await checkDescription(
        imageBase64,
        userDescription,
        imageAnalysis || {},
        level
      );

      return NextResponse.json({
        success: true,
        action: 'check',
        ...result
      });
    }

    return NextResponse.json(
      { success: false, message: "Invalid action. Use 'analyze' or 'check'" },
      { status: 400 }
    );

  } catch (error) {
    console.error("Image describe error:", error);
    return NextResponse.json(
      { success: false, message: "Processing failed" },
      { status: 500 }
    );
  }
}

export async function GET() {
  const hasApiKey = process.env.GOOGLE_GEMINI_API_KEY &&
    process.env.GOOGLE_GEMINI_API_KEY !== 'your-gemini-api-key-here';

  return NextResponse.json({
    success: true,
    message: "Image Describe API - Practice describing images in English",
    status: hasApiKey ? "✅ Ready" : "❌ API Key Missing",
    actions: {
      analyze: "Upload image, get description suggestions",
      check: "Submit your description, get feedback"
    }
  });
}
