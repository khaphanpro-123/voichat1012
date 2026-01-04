/**
 * Background Workers - Process heavy tasks asynchronously
 * Registers handlers for different task types
 */

import { taskQueue, TASK_TYPES } from "./queue";
import { connectDB } from "./db";

// ============ OCR PROCESSING WORKER ============
interface OCRTaskData {
  buffer: number[]; // Buffer as array for serialization
  fileName: string;
  fileType: string;
  fileSize: number;
  userId: string;
  taskId: string;
}

taskQueue.registerHandler(TASK_TYPES.OCR_PROCESS, async (data: OCRTaskData) => {
  const { buffer: bufferArray, fileName, fileType, fileSize, userId } = data;
  const buffer = Buffer.from(bufferArray);
  
  // Dynamic imports to avoid loading at startup
  const { createWorker } = await import("tesseract.js");
  const { v2: cloudinary } = await import("cloudinary");
  const mammoth = await import("mammoth");
  
  // Configure Cloudinary
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
  });

  // Upload to Cloudinary
  const uploadResult = await new Promise<any>((resolve, reject) => {
    cloudinary.uploader.upload_stream(
      { resource_type: "auto", folder: "documents" },
      (error, result) => {
        if (error) reject(error);
        else resolve(result);
      }
    ).end(buffer);
  });

  let extractedText = "";

  // Extract text based on file type
  if (fileType.startsWith("image/")) {
    try {
      const worker = await createWorker("vie");
      const { data: { text } } = await worker.recognize(buffer);
      extractedText = text.trim();
      await worker.terminate();
    } catch (err) {
      console.error("OCR Error:", err);
      extractedText = "Text extraction failed for this image";
    }
  } else if (fileType === "application/pdf") {
    try {
      // Use pdf-parse for better serverless compatibility
      const pdfParse = (await import("pdf-parse")).default;
      const pdfData = await pdfParse(buffer, { max: 0 });
      extractedText = pdfData.text?.trim() || "";
      if (!extractedText || extractedText.length < 10) {
        extractedText = `PDF uploaded: ${fileName}. Text extraction returned minimal content.`;
      }
    } catch (err: any) {
      console.error("PDF Error:", err?.message || err);
      extractedText = `PDF uploaded: ${fileName}. Text extraction failed: ${err?.message || 'Unknown error'}`;
    }
  } else if (fileType.includes("document") || fileType.includes("wordprocessingml")) {
    try {
      const result = await mammoth.extractRawText({ buffer });
      extractedText = result.value.trim();
    } catch (err) {
      console.error("Document Error:", err);
      extractedText = "Document text extraction failed";
    }
  }

  // Save to MongoDB
  await connectDB();
  const Document = (await import("@/app/models/Document")).default;
  
  const document = new Document({
    userId,
    fileName,
    fileType,
    fileSize,
    cloudinaryUrl: uploadResult.secure_url,
    extractedText,
    metadata: { originalName: fileName, uploadedAt: new Date() },
  });
  await document.save();

  // Process text
  const sentences = extractedText.split(/[.!?]+/).map(s => s.trim()).filter(s => s.length > 0);
  const words = extractedText.split(/\s+/).filter(w => w.length >= 3 && /[\p{L}]/u.test(w)).map(w => w.replace(/[.,;:!?]/g, ""));
  const uniqueWords = [...new Set(words)];

  return {
    fileId: document._id.toString(),
    filename: fileName,
    text: extractedText,
    chunks: sentences,
    vocabulary: uniqueWords.slice(0, 50),
    stats: {
      totalWords: words.length,
      uniqueWords: uniqueWords.length,
      sentences: sentences.length,
    },
  };
});

// ============ FLASHCARD GENERATION WORKER ============
interface FlashcardTaskData {
  words: string[];
  userId: string;
  keys: { geminiKey?: string | null; openaiKey?: string | null; groqKey?: string | null };
}

taskQueue.registerHandler(TASK_TYPES.GENERATE_FLASHCARD, async (data: FlashcardTaskData) => {
  const { words, userId, keys } = data;
  const { callAI, parseJsonFromAI } = await import("./aiProvider");
  
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

  const result = await callAI(prompt, keys, { temperature: 0.3, maxTokens: 2048 });
  if (!result.success) throw new Error(result.error || "AI API error");

  let parsed = parseJsonFromAI(result.content);
  if (!parsed || !Array.isArray(parsed)) {
    const jsonMatch = result.content?.match(/\[[\s\S]*\]/);
    if (jsonMatch) parsed = JSON.parse(jsonMatch[0]);
  }
  if (!parsed || !Array.isArray(parsed)) {
    parsed = words.map(word => ({ word, vietnamese: "", pronunciation: "", partOfSpeech: "noun", exampleEn: "", exampleVi: "", level: "intermediate" }));
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
    tags: ["vocabulary"],
  }));

  // Save to MongoDB
  await connectDB();
  const Vocabulary = (await import("@/app/models/Vocabulary")).default;
  
  for (const card of flashcards) {
    await Vocabulary.findOneAndUpdate(
      { userId, word: card.word },
      {
        userId,
        word: card.word,
        type: card.partOfSpeech,
        meaning: card.vietnamese,
        example: card.exampleEn,
        exampleTranslation: card.exampleVi,
        level: card.level,
        easeFactor: 2.5,
        interval: 1,
        repetitions: 0,
        nextReviewDate: new Date(),
        timesReviewed: 0,
        timesCorrect: 0,
        timesIncorrect: 0,
        isLearned: false,
      },
      { upsert: true, new: true }
    );
  }

  return { flashcards, count: flashcards.length, provider: result.provider, model: result.model };
});

// ============ TRACK PROGRESS WORKER (Fire-and-forget) ============
interface TrackProgressData {
  userId: string;
  activity?: string;
  mistake?: { type: string; original: string; corrected: string; explanation: string };
  studyTime?: number;
}

taskQueue.registerHandler(TASK_TYPES.TRACK_PROGRESS, async (data: TrackProgressData) => {
  const { userId, activity, mistake, studyTime = 0 } = data;
  if (!userId || userId === "anonymous") return;

  await connectDB();
  const UserProgress = (await import("@/app/models/UserProgress")).default;

  let progress = await UserProgress.findOne({ userId });
  if (!progress) progress = new UserProgress({ userId });

  // XP rewards
  const XP_REWARDS: Record<string, number> = {
    chatSession: 10, photoAnalysis: 15, debateSession: 20,
    mediaLesson: 15, documentUpload: 25, vocabularyLearned: 5, pronunciationPractice: 10,
  };

  if (activity) {
    const xpReward = XP_REWARDS[activity] || 5;
    progress.totalXp += xpReward;
    progress.xp += xpReward;
    progress.totalStudyTime += studyTime;

    const activityMap: Record<string, string> = {
      chatSession: "chatSessions", photoAnalysis: "photoAnalysis",
      debateSession: "debateSessions", mediaLesson: "mediaLessons",
      documentUpload: "documentsUploaded", vocabularyLearned: "vocabularyLearned",
      pronunciationPractice: "pronunciationPractice",
    };
    const field = activityMap[activity];
    if (field && progress.activities) (progress.activities as any)[field] += 1;

    // Update streak
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const lastStudy = progress.lastStudyDate ? new Date(progress.lastStudyDate) : null;
    if (lastStudy) lastStudy.setHours(0, 0, 0, 0);
    const yesterday = new Date(today); yesterday.setDate(yesterday.getDate() - 1);

    if (!lastStudy) progress.currentStreak = 1;
    else if (lastStudy.getTime() !== today.getTime()) {
      progress.currentStreak = lastStudy.getTime() === yesterday.getTime() ? progress.currentStreak + 1 : 1;
    }
    if (progress.currentStreak > progress.longestStreak) progress.longestStreak = progress.currentStreak;
    progress.lastStudyDate = new Date();
  }

  if (mistake) {
    if (!progress.commonMistakes) progress.commonMistakes = [];
    const existing = progress.commonMistakes.find((m: any) => m.original?.toLowerCase() === mistake.original?.toLowerCase());
    if (existing) {
      existing.count += 1;
      existing.lastOccurred = new Date();
    } else {
      progress.commonMistakes.push({ ...mistake, count: 1, lastOccurred: new Date() });
    }
    progress.commonMistakes.sort((a: any, b: any) => b.count - a.count);
    if (progress.commonMistakes.length > 50) progress.commonMistakes = progress.commonMistakes.slice(0, 50);
  }

  progress.updatedAt = new Date();
  await progress.save();
});

// ============ SAVE LEARNING SESSION WORKER ============
interface SaveSessionData {
  userId: string;
  sessionType: string;
  startTime: Date;
  endTime: Date;
  duration: number;
  overallScore: number;
  grammarScore: number;
  pronunciationScore: number;
  fluencyScore: number;
  grammarErrors: any[];
  pronunciationErrors: any[];
  messages: any[];
  totalMessages: number;
  userMessages: number;
  wordsSpoken: number;
  level: string;
  areasToImprove: string[];
  strengths: string[];
}

taskQueue.registerHandler(TASK_TYPES.SAVE_LEARNING_SESSION, async (data: SaveSessionData) => {
  await connectDB();
  const LearningSession = (await import("@/app/models/LearningSession")).default;

  // Get session number
  const lastSession = await LearningSession.findOne({ userId: data.userId }).sort({ sessionNumber: -1 });
  const sessionNumber = (lastSession?.sessionNumber || 0) + 1;

  const session = new LearningSession({ ...data, sessionNumber });
  await session.save();
  return { sessionId: session._id, sessionNumber };
});

console.log("[Workers] All task handlers registered");
