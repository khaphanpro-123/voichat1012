import { NextRequest, NextResponse } from "next/server";
import { getOpenAI } from '@/lib/openai';
import { connectToDatabase } from '@/lib/mongodb';



// Enhanced Media Learning with Real Whisper Audio Matching System

interface MediaSession {
  sessionId: string;
  originalContent: {
    transcript: string;
    vocabulary: string[];
    summary: string;
    audioAnalysis: any; // Real Whisper analysis data
    audioEmbedding?: number[]; // Voice embedding for comparison
  };
  processedContent: {
    simplifiedText: string;
    vocabulary: Array<{
      word: string;
      definition: string;
      example: string;
      difficulty: number;
    }>;
    exercises: Array<{
      id: string;
      type: 'pronunciation' | 'listening' | 'comprehension';
      content: any;
    }>;
    audioSegments: Array<{
      text: string;
      start: number;
      end: number;
      audio_id: string;
      embedding?: number[];
    }>;
  };
  userLevel: number;
  progress: {
    completedExercises: string[];
    scores: { [key: string]: number };
    weakAreas: string[];
    pronunciationScores: { [key: string]: number };
    audioMatchingScores: { [key: string]: number };
  };
}

// Step 1: Process uploaded media with real Whisper
async function processMediaWithWhisper(
  audioBase64: string,
  videoBase64?: string,
  userLevel: number = 1
): Promise<{
  audioAnalysis: any;
  audioEmbedding: number[];
  processedContent: any;
  sessionId: string;
}> {
  try {
    const sessionId = `media_${Date.now()}`;
    
    // Step 1: Real Whisper Analysis
    const audioAnalysisResponse = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/audio/analyze`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        audioBase64, 
        audio_type: 'sample' 
      })
    });

    const audioAnalysis = await audioAnalysisResponse.json();
    
    if (audioAnalysis.status !== 'ok') {
      throw new Error(`Audio analysis failed: ${audioAnalysis.error_message}`);
    }

    // Step 2: Generate Audio Embedding
    const embeddingResponse = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/audio/embeddings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        action: 'generate',
        audioBase64,
        audio_id: `sample_${sessionId}`
      })
    });

    const embeddingResult = await embeddingResponse.json();
    const audioEmbedding = embeddingResult.embedding || [];

    // Step 3: Process content based on user level
    const processedContent = await generateLearningContent(audioAnalysis, userLevel);

    return {
      audioAnalysis,
      audioEmbedding,
      processedContent,
      sessionId
    };

  } catch (error) {
    console.error('Media processing error:', error);
    throw error;
  }
}

// Generate learning content from Whisper analysis
async function generateLearningContent(audioAnalysis: any, userLevel: number): Promise<any> {
  try {
    const contentPrompt = `
Bạn là Media Learning Content Generator. Dựa trên phân tích Whisper thật sau đây, tạo nội dung học tập cho người học tiếng Việt.

WHISPER ANALYSIS DATA:
${JSON.stringify(audioAnalysis, null, 2)}

USER LEVEL: ${userLevel} (0=A1, 1=A2, 2=B1, 3=B2)

Tạo nội dung học tập bao gồm:

1. SIMPLIFIED TEXT: Đơn giản hóa transcript phù hợp với level
2. VOCABULARY: Trích xuất 8-15 từ vựng quan trọng với định nghĩa
3. PRONUNCIATION EXERCISES: Tạo bài tập phát âm dựa trên word-level timestamps
4. LISTENING EXERCISES: Tạo bài tập nghe hiểu
5. AUDIO SEGMENTS: Chia nhỏ audio thành các đoạn luyện tập

Trả về JSON:
{
  "simplifiedText": "văn bản đã đơn giản hóa",
  "vocabulary": [
    {
      "word": "từ vựng",
      "definition": "định nghĩa",
      "example": "ví dụ",
      "difficulty": 1-3,
      "timestamp": thời_gian_xuất_hiện
    }
  ],
  "exercises": [
    {
      "id": "pronunciation_1",
      "type": "pronunciation",
      "content": {
        "target_text": "câu cần phát âm",
        "start_time": 0.0,
        "end_time": 2.5,
        "difficulty": 1-3
      }
    },
    {
      "id": "listening_1", 
      "type": "listening",
      "content": {
        "question": "câu hỏi nghe hiểu",
        "audio_segment": "đoạn audio tương ứng",
        "options": ["A", "B", "C", "D"],
        "correct_answer": 0
      }
    }
  ],
  "audioSegments": [
    {
      "text": "đoạn văn bản",
      "start": 0.0,
      "end": 5.0,
      "difficulty": 1-3
    }
  ]
}`;

    const response = await getOpenAI().chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "user",
          content: contentPrompt
        }
      ],
      temperature: 0.3,
      max_tokens: 1500,
    });

    const content = response.choices[0]?.message?.content;
    if (content) {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        try {
          return JSON.parse(jsonMatch[0]);
        } catch (parseError) {
          console.error('Content JSON parse error:', parseError);
        }
      }
    }

    // Fallback content generation
    return generateFallbackContent(audioAnalysis, userLevel);

  } catch (error) {
    console.error('Content generation error:', error);
    return generateFallbackContent(audioAnalysis, userLevel);
  }
}

// Fallback content generation
function generateFallbackContent(audioAnalysis: any, userLevel: number): any {
  const transcript = audioAnalysis.transcript || "Nội dung audio";
  const words = audioAnalysis.words || [];
  
  // Extract vocabulary from high-confidence words
  const vocabulary = words
    .filter((word: any) => word.confidence > 0.7)
    .slice(0, 10)
    .map((word: any, index: number) => ({
      word: word.word,
      definition: `Định nghĩa của ${word.word}`,
      example: `Ví dụ: ${word.word} trong câu`,
      difficulty: Math.min(userLevel + 1, 3),
      timestamp: word.start
    }));

  // Create pronunciation exercises
  const pronunciationExercises = words
    .filter((word: any) => word.confidence > 0.6)
    .slice(0, 5)
    .map((word: any, index: number) => ({
      id: `pronunciation_${index + 1}`,
      type: "pronunciation",
      content: {
        target_text: word.word,
        start_time: word.start,
        end_time: word.end,
        difficulty: userLevel + 1
      }
    }));

  // Create audio segments
  const segmentDuration = 10; // 10 seconds per segment
  const totalDuration = audioAnalysis.duration || 30;
  const audioSegments = [];
  
  for (let i = 0; i < totalDuration; i += segmentDuration) {
    const segmentWords = words.filter((word: any) => 
      word.start >= i && word.start < i + segmentDuration
    );
    
    if (segmentWords.length > 0) {
      audioSegments.push({
        text: segmentWords.map((w: any) => w.word).join(' '),
        start: i,
        end: Math.min(i + segmentDuration, totalDuration),
        difficulty: userLevel + 1
      });
    }
  }

  return {
    simplifiedText: transcript,
    vocabulary,
    exercises: pronunciationExercises,
    audioSegments
  };
}

// Step 2: Process user pronunciation attempt
async function processUserPronunciation(
  userAudioBase64: string,
  targetSegment: any,
  sampleAudioData: any
): Promise<{
  pronunciationScore: number;
  matchingScore: number;
  feedback: string;
  suggestions: string[];
}> {
  try {
    // Step 1: Analyze user audio with Whisper
    const userAnalysisResponse = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/audio/analyze`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        audioBase64: userAudioBase64, 
        audio_type: 'user' 
      })
    });

    const userAudioAnalysis = await userAnalysisResponse.json();
    
    if (userAudioAnalysis.status !== 'ok') {
      throw new Error(`User audio analysis failed: ${userAudioAnalysis.error_message}`);
    }

    // Step 2: Compare with sample using real Whisper data
    const comparisonResponse = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/audio/compare`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sample_audio_data: sampleAudioData,
        user_audio_data: userAudioAnalysis
      })
    });

    const comparisonResult = await comparisonResponse.json();
    
    if (comparisonResult.status !== 'ok') {
      throw new Error(`Audio comparison failed: ${comparisonResult.error_message}`);
    }

    // Step 3: Generate embeddings and calculate voice similarity
    const userEmbeddingResponse = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/audio/embeddings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        action: 'generate',
        audioBase64: userAudioBase64,
        audio_id: `user_${Date.now()}`
      })
    });

    const userEmbedding = await userEmbeddingResponse.json();
    
    // Compare embeddings if sample embedding exists
    let voiceSimilarity = 0.5;
    if (targetSegment.embedding && userEmbedding.embedding) {
      const similarityResponse = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/audio/embeddings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          action: 'compare',
          embedding1: targetSegment.embedding,
          embedding2: userEmbedding.embedding
        })
      });

      const similarityResult = await similarityResponse.json();
      voiceSimilarity = similarityResult.similarity_percentage / 100;
    }

    // Calculate final scores
    const pronunciationScore = Math.round(
      (comparisonResult.text_similarity * 0.4) +
      (comparisonResult.overall_score * 0.4) +
      (voiceSimilarity * 100 * 0.2)
    );

    const matchingScore = Math.round(voiceSimilarity * 100);

    // Generate feedback
    const feedback = generatePronunciationFeedback(comparisonResult, voiceSimilarity);

    return {
      pronunciationScore,
      matchingScore,
      feedback,
      suggestions: comparisonResult.suggestions || []
    };

  } catch (error) {
    console.error('User pronunciation processing error:', error);
    return {
      pronunciationScore: 50,
      matchingScore: 50,
      feedback: "Có lỗi xử lý âm thanh. Hãy thử lại.",
      suggestions: ["Thử ghi âm lại với chất lượng tốt hơn"]
    };
  }
}

// Generate pronunciation feedback
function generatePronunciationFeedback(comparisonResult: any, voiceSimilarity: number): string {
  let feedback = `Điểm phát âm: ${comparisonResult.overall_score}/100\n`;
  feedback += `Độ giống giọng mẫu: ${Math.round(voiceSimilarity * 100)}%\n\n`;
  
  if (comparisonResult.text_similarity >= 90) {
    feedback += "Tuyệt vời! Bạn đã phát âm rất chính xác.\n";
  } else if (comparisonResult.text_similarity >= 70) {
    feedback += "Khá tốt! Một số từ cần cải thiện.\n";
  } else {
    feedback += "Cần luyện tập thêm để phát âm chính xác hơn.\n";
  }

  if (comparisonResult.pronunciation_errors.length > 0) {
    feedback += `\nLỗi phát âm: ${comparisonResult.pronunciation_errors.length} từ\n`;
  }

  if (comparisonResult.timing_comparison.pace_analysis === "too_fast") {
    feedback += "Hãy nói chậm lại để rõ ràng hơn.\n";
  } else if (comparisonResult.timing_comparison.pace_analysis === "too_slow") {
    feedback += "Có thể nói nhanh hơn một chút.\n";
  }

  return feedback;
}

// Save user progress with pronunciation scores
async function saveUserProgress(userId: string, sessionData: MediaSession, pronunciationResults: any) {
  try {
    const { db } = await connectToDatabase();
    
    // Update user progress
    await db.collection('mediaLearningProgress').updateOne(
      { userId },
      {
        $set: {
          userId,
          lastActivity: new Date(),
          currentLevel: sessionData.userLevel
        },
        $addToSet: {
          completedSessions: sessionData.sessionId,
          weakAreas: { $each: pronunciationResults.suggestions || [] }
        },
        $push: {
          pronunciationScores: {
            sessionId: sessionData.sessionId,
            score: pronunciationResults.pronunciationScore,
            matchingScore: pronunciationResults.matchingScore,
            timestamp: new Date()
          }
        } as any
      },
      { upsert: true }
    );

    // Save session data
    await db.collection('mediaLearningSessions').updateOne(
      { sessionId: sessionData.sessionId },
      { $set: sessionData },
      { upsert: true }
    );

  } catch (error) {
    console.error('Progress save error:', error);
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action, audioBase64, videoBase64, userLevel = 1, sessionData, userAudioBase64, targetSegment, userId = 'anonymous' } = body;

    if (action === 'process') {
      // Process uploaded media with real Whisper
      if (!audioBase64) {
        return NextResponse.json(
          { success: false, message: "Audio data is required" },
          { status: 400 }
        );
      }

      const result = await processMediaWithWhisper(audioBase64, videoBase64, userLevel);
      
      const newSession: MediaSession = {
        sessionId: result.sessionId,
        originalContent: {
          transcript: result.audioAnalysis.transcript,
          vocabulary: result.processedContent.vocabulary?.map((v: any) => v.word) || [],
          summary: result.audioAnalysis.transcript.substring(0, 200) + "...",
          audioAnalysis: result.audioAnalysis,
          audioEmbedding: result.audioEmbedding
        },
        processedContent: {
          ...result.processedContent,
          audioSegments: result.processedContent.audioSegments?.map((segment: any) => ({
            ...segment,
            audio_id: `segment_${result.sessionId}_${segment.start}`,
            embedding: result.audioEmbedding // Use same embedding for segments
          })) || []
        },
        userLevel,
        progress: {
          completedExercises: [],
          scores: {},
          weakAreas: [],
          pronunciationScores: {},
          audioMatchingScores: {}
        }
      };

      return NextResponse.json({
        success: true,
        action: 'process',
        sessionData: newSession,
        audioAnalysis: result.audioAnalysis
      });

    } else if (action === 'practice_pronunciation') {
      // Process user pronunciation attempt
      if (!userAudioBase64 || !targetSegment || !sessionData) {
        return NextResponse.json(
          { success: false, message: "User audio, target segment, and session data required" },
          { status: 400 }
        );
      }

      const pronunciationResult = await processUserPronunciation(
        userAudioBase64,
        targetSegment,
        sessionData.originalContent.audioAnalysis
      );

      // Save progress
      await saveUserProgress(userId, sessionData, pronunciationResult);

      return NextResponse.json({
        success: true,
        action: 'practice_pronunciation',
        ...pronunciationResult
      });

    } else {
      return NextResponse.json(
        { success: false, message: "Invalid action. Use 'process' or 'practice_pronunciation'" },
        { status: 400 }
      );
    }

  } catch (error) {
    console.error("Enhanced media learning error:", error);
    return NextResponse.json(
      { success: false, message: "Media learning processing failed" },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    success: true,
    message: "Enhanced Media Learning API with Real Whisper Audio Matching",
    features: [
      "Real Whisper Audio Analysis",
      "Word-level Pronunciation Scoring",
      "Audio Embedding Voice Similarity",
      "Personalized Learning Content",
      "Progressive Difficulty Levels",
      "Real-time Pronunciation Feedback"
    ],
    pipeline: {
      "1_upload": "User uploads audio/video → Real Whisper analysis",
      "2_process": "Generate learning content from Whisper data",
      "3_practice": "User records pronunciation → Compare with Whisper",
      "4_feedback": "Real-time scoring and improvement suggestions"
    },
    actions: {
      process: "Analyze media and generate learning content",
      practice_pronunciation: "Compare user pronunciation with sample audio"
    },
    real_ai_features: {
      whisper_analysis: "OpenAI Whisper-1 for accurate transcription",
      word_timestamps: "Precise word-level timing for pronunciation practice",
      confidence_scoring: "Real confidence scores for pronunciation assessment",
      audio_embeddings: "Voice similarity matching using audio features"
    },
    schema: {
      process: "{ action: 'process', audioBase64: string, userLevel: 0-3 }",
      practice: "{ action: 'practice_pronunciation', userAudioBase64: string, targetSegment: object, sessionData: object }"
    }
  });
}

