import { NextRequest, NextResponse } from "next/server";
import { getUserApiKeys } from "@/lib/getUserApiKey";
import { callAI, parseJsonFromAI } from "@/lib/aiProvider";

// PROMPT 1: Phân tích ý nghĩa ảnh
const ANALYZE_IMAGE_SYSTEM = `You are an expert Vietnamese language teacher and visual content analyst.
Your task is to analyze an image based on:
1. Detected objects (from computer vision)
2. Text extracted from the image (OCR)

You must:
- Infer the main topic of the image
- Identify the educational context
- Determine what vocabulary a Vietnamese learner should know

IMPORTANT RULES:
- Focus on MEANING, not just objects
- Combine visual + textual clues
- Do not hallucinate objects not provided
- Output must be suitable for language learning

Return JSON format:
{
  "topic": "Main topic in Vietnamese",
  "context": "1-2 sentence description in Vietnamese",
  "keywords": ["keyword1", "keyword2", ...]
}`;

// PROMPT 2: Sinh từ vựng học tập
const GENERATE_VOCAB_SYSTEM = `You are a Vietnamese language teacher specializing in vocabulary development.
Given an image topic and context, generate a list of Vietnamese vocabulary that:
- Is relevant to the topic
- Includes both basic and intermediate level words
- Helps a learner understand the image fully

Rules:
- Avoid rare or academic-only terms
- Prefer commonly used Vietnamese words
- Return 8-15 words
- Do not include explanations, only words

Return JSON: { "vocabulary": ["word1", "word2", ...] }`;

// PROMPT 3: So sánh từ vựng
const COMPARE_VOCAB_SYSTEM = `You are a Vietnamese language tutor evaluating a learner's vocabulary recognition skill.
Compare the reference vocabulary list with user-submitted vocabulary.

Your task:
- Identify correct words (exact or semantic match)
- Identify missing important words
- Identify incorrect or unrelated words
- Provide constructive feedback in Vietnamese

Rules:
- Be encouraging
- Explain mistakes briefly
- Do not shame the learner

Return JSON:
{
  "correct": ["word1", "word2"],
  "missing": ["word3", "word4"],
  "incorrect": ["word5"],
  "score": 0.0 to 1.0,
  "feedback": "Feedback in Vietnamese"
}`;

// PROMPT 4: Gợi ý học tiếp theo
const SUGGEST_NEXT_SYSTEM = `You are an AI learning coach for Vietnamese language learners.
Based on the learner's performance, suggest:
- Vocabulary topics to improve
- Learning focus areas
- One concrete next lesson recommendation

Keep it short and practical. Return in Vietnamese.

Return JSON:
{
  "focus_topics": ["topic1", "topic2"],
  "learning_suggestions": ["suggestion1", "suggestion2"],
  "next_lesson": "Next lesson title"
}`;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action, userId = "anonymous" } = body;

    const keys = await getUserApiKeys(userId);
    if (!keys.geminiKey && !keys.openaiKey && !keys.groqKey && !keys.cohereKey) {
      return NextResponse.json({ success: false, message: "Chưa có API key" }, { status: 400 });
    }

    // ACTION 1: Analyze image meaning
    if (action === "analyzeImage") {
      const { detectedObjects = [], ocrText = "", language = "vi" } = body;

      const prompt = `${ANALYZE_IMAGE_SYSTEM}

Analyze the image using the following data:

Detected objects: ${detectedObjects.join(", ") || "none"}

OCR text: "${ocrText || "none"}"

Language: ${language}

Tasks:
1. Identify the main topic of the image
2. Describe the context in 1-2 sentences
3. Suggest key vocabulary related to this topic for Vietnamese learners`;

      const result = await callAI(prompt, keys, { temperature: 0.7, maxTokens: 500 });
      if (!result.success) {
        return NextResponse.json({ success: false, message: result.error }, { status: 500 });
      }

      const parsed = parseJsonFromAI(result.content);
      return NextResponse.json({
        success: true,
        data: parsed || { topic: "", context: "", keywords: [] },
        provider: result.provider,
        model: result.model
      });
    }

    // ACTION 2: Generate vocabulary list
    if (action === "generateVocabulary") {
      const { topic, context } = body;

      const prompt = `${GENERATE_VOCAB_SYSTEM}

Topic: ${topic}

Context: ${context}

Generate a Vietnamese vocabulary list for learners.`;

      const result = await callAI(prompt, keys, { temperature: 0.7, maxTokens: 300 });
      if (!result.success) {
        return NextResponse.json({ success: false, message: result.error }, { status: 500 });
      }

      const parsed = parseJsonFromAI(result.content);
      return NextResponse.json({
        success: true,
        data: parsed || { vocabulary: [] },
        provider: result.provider
      });
    }

    // ACTION 3: Compare user vocabulary with system
    if (action === "compareVocabulary") {
      const { systemVocabulary, userVocabulary } = body;

      const prompt = `${COMPARE_VOCAB_SYSTEM}

System vocabulary:
${systemVocabulary.map((w: string) => `- ${w}`).join("\n")}

User vocabulary:
${userVocabulary.map((w: string) => `- ${w}`).join("\n")}

Evaluate the user's vocabulary recognition.`;

      const result = await callAI(prompt, keys, { temperature: 0.5, maxTokens: 400 });
      if (!result.success) {
        return NextResponse.json({ success: false, message: result.error }, { status: 500 });
      }

      const parsed = parseJsonFromAI(result.content);
      return NextResponse.json({
        success: true,
        data: parsed || { correct: [], missing: [], incorrect: [], score: 0, feedback: "" },
        provider: result.provider
      });
    }

    // ACTION 4: Suggest next learning
    if (action === "suggestNext") {
      const { score, weakVocabulary, context = "Image-based vocabulary recognition" } = body;

      const prompt = `${SUGGEST_NEXT_SYSTEM}

User score: ${score}

Weak vocabulary:
${weakVocabulary.map((w: string) => `- ${w}`).join("\n")}

Learning context: ${context}`;

      const result = await callAI(prompt, keys, { temperature: 0.7, maxTokens: 300 });
      if (!result.success) {
        return NextResponse.json({ success: false, message: result.error }, { status: 500 });
      }

      const parsed = parseJsonFromAI(result.content);
      return NextResponse.json({
        success: true,
        data: parsed || { focus_topics: [], learning_suggestions: [], next_lesson: "" },
        provider: result.provider
      });
    }

    return NextResponse.json({ success: false, message: "Invalid action" }, { status: 400 });

  } catch (error) {
    console.error("Image vocabulary game error:", error);
    return NextResponse.json({ success: false, message: "Server error" }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({
    success: true,
    message: "Image Vocabulary Game API",
    actions: [
      "analyzeImage - Phân tích ý nghĩa ảnh từ YOLO + OCR",
      "generateVocabulary - Sinh từ vựng học tập",
      "compareVocabulary - So sánh từ vựng user vs hệ thống",
      "suggestNext - Gợi ý học tiếp theo"
    ]
  });
}
