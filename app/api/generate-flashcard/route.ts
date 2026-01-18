import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import Vocabulary from "@/app/models/Vocabulary";
import { getUserApiKeys } from "@/lib/getUserApiKey";
import { callAI, parseJsonFromAI } from "@/lib/aiProvider";
import { taskQueue, TASK_TYPES } from "@/lib/queue";
import "@/lib/workers";

interface Flashcard {
  id: string;
  word: string;
  vietnamese: string;
  pronunciation: string;
  partOfSpeech: string;
  exampleEn: string;
  exampleVi: string;
  level: "beginner" | "intermediate" | "advanced";
  tags: string[];
}

// Generate flashcards using AI (Gemini, OpenAI, or Groq with fallback)
async function generateFlashcards(
  words: string[], 
  keys: { geminiKey?: string | null; openaiKey?: string | null; groqKey?: string | null }
): Promise<{ flashcards: Flashcard[]; provider: string; model: string }> {
  
  const prompt = `You are an English-Vietnamese dictionary and language teacher.
For each English word below, provide:
1. Vietnamese translation (accurate, common usage)
2. IPA pronunciation
3. Part of speech (noun/verb/adjective/adverb)
4. Example sentence in English (simple, A2-B1 level)
5. Vietnamese translation of the example
6. Difficulty level (beginner/intermediate/advanced)

Words: ${words.join(", ")}

Return ONLY valid JSON array (no markdown, no code blocks):
[
  {
    "word": "english word",
    "vietnamese": "nghĩa tiếng Việt",
    "pronunciation": "/IPA/",
    "partOfSpeech": "noun",
    "exampleEn": "Simple example sentence.",
    "exampleVi": "Câu ví dụ tiếng Việt.",
    "level": "intermediate"
  }
]`;

  const result = await callAI(prompt, keys, {
    temperature: 0.3,
    maxTokens: 2048
  });

  if (!result.success) {
    throw new Error(result.error || "AI API error");
  }

  let parsed = parseJsonFromAI(result.content);
  
  // Fallback: try to extract JSON array manually if parseJsonFromAI fails
  if (!parsed || !Array.isArray(parsed)) {
    try {
      const content = result.content || "";
      const jsonMatch = content.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        parsed = JSON.parse(jsonMatch[0]);
      }
    } catch (e) {
      console.error("Manual JSON extraction failed:", e);
    }
  }
  
  // If still not an array, create basic flashcards from words
  if (!parsed || !Array.isArray(parsed)) {
    parsed = words.map(word => ({
      word, vietnamese: "", pronunciation: "", partOfSpeech: "noun",
      exampleEn: "", exampleVi: "", level: "intermediate"
    }));
  }

  const flashcards = parsed.map((item: any, index: number) => ({
    id: `fc_${Date.now()}_${index}`,
    word: item.word || words[index],
    vietnamese: item.vietnamese || "",
    pronunciation: item.pronunciation || "",
    partOfSpeech: item.partOfSpeech || "noun",
    exampleEn: item.exampleEn || "",
    exampleVi: item.exampleVi || "",
    level: item.level || "intermediate",
    tags: ["vocabulary"]
  }));

  return { flashcards, provider: result.provider, model: result.model };
}

export async function POST(req: NextRequest) {
  try {
    const { words, userId = "anonymous", mode } = await req.json();

    if (!words || !Array.isArray(words) || words.length === 0) {
      return NextResponse.json(
        { success: false, message: "Words array required" },
        { status: 400 }
      );
    }

    // Get user's API keys
    const keys = await getUserApiKeys(userId);

    if (!keys.geminiKey && !keys.openaiKey && !keys.groqKey) {
      return NextResponse.json(
        { success: false, message: "Chưa có API key nào. Vui lòng thêm Gemini, OpenAI hoặc Groq key trong Settings." },
        { status: 400 }
      );
    }

    // ASYNC MODE: Return immediately, process in background
    if (mode === "async") {
      const taskId = taskQueue.enqueue(TASK_TYPES.GENERATE_FLASHCARD, {
        words,
        userId,
        keys: { geminiKey: keys.geminiKey, openaiKey: keys.openaiKey, groqKey: keys.groqKey },
      });

      return NextResponse.json({
        success: true,
        accepted: true,
        taskId,
        message: "Flashcard generation started",
        pollUrl: `/api/task-status?taskId=${taskId}`,
      }, { status: 202 });
    }

    // SYNC MODE (default): Generate immediately
    const { flashcards, provider, model } = await generateFlashcards(words, keys);

    // Save to MongoDB in background (fire-and-forget)
    setImmediate(async () => {
      try {
        await connectDB();
        for (const card of flashcards) {
          await Vocabulary.findOneAndUpdate(
            { userId, word: card.word },
            {
              userId, word: card.word, type: card.partOfSpeech,
              meaning: card.vietnamese, example: card.exampleEn,
              exampleTranslation: card.exampleVi, level: card.level,
              ipa: card.pronunciation, // Save IPA pronunciation
              easeFactor: 2.5, interval: 1, repetitions: 0,
              nextReviewDate: new Date(), timesReviewed: 0,
              timesCorrect: 0, timesIncorrect: 0, isLearned: false
            },
            { upsert: true, new: true }
          );
        }
      } catch (err) {
        console.error("Background DB save error:", err);
      }
    });

    return NextResponse.json({
      success: true,
      flashcards,
      count: flashcards.length,
      provider,
      model
    });

  } catch (error) {
    console.error("Flashcard generation error:", error);
    const message = error instanceof Error ? error.message : "Failed";
    return NextResponse.json({ success: false, message }, { status: 500 });
  }
}

// Get user's saved vocabulary
export async function GET(req: NextRequest) {
  try {
    const userId = req.nextUrl.searchParams.get("userId") || "anonymous";
    const format = req.nextUrl.searchParams.get("format") || "json";

    await connectDB();
    const vocabulary = await Vocabulary.find({ userId })
      .sort({ createdAt: -1 })
      .limit(500);

    if (format === "csv") {
      const csv = [
        "Word,Vietnamese,Pronunciation,Example,Level",
        ...vocabulary.map((v) =>
          [
            `"${v.word}"`,
            `"${v.meaning}"`,
            `"${v.pronunciation || ""}"`,
            `"${v.example}"`,
            v.level
          ].join(",")
        )
      ].join("\n");

      return new NextResponse(csv, {
        headers: {
          "Content-Type": "text/csv",
          "Content-Disposition": "attachment; filename=vocabulary.csv"
        }
      });
    }

    return NextResponse.json({
      success: true,
      vocabulary,
      count: vocabulary.length
    });
  } catch (error) {
    console.error("Get vocabulary error:", error);
    return NextResponse.json(
      { success: false, message: "Failed to get vocabulary" },
      { status: 500 }
    );
  }
}

// Delete vocabulary word
export async function DELETE(req: NextRequest) {
  try {
    const { wordId, userId } = await req.json();

    if (!wordId || !userId) {
      return NextResponse.json(
        { success: false, message: "wordId and userId required" },
        { status: 400 }
      );
    }

    await connectDB();
    const result = await Vocabulary.findOneAndDelete({ _id: wordId, userId });

    if (!result) {
      return NextResponse.json(
        { success: false, message: "Word not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Đã xóa từ vựng"
    });
  } catch (error) {
    console.error("Delete vocabulary error:", error);
    return NextResponse.json(
      { success: false, message: "Failed to delete vocabulary" },
      { status: 500 }
    );
  }
}
