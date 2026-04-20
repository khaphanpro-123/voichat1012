import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from '@/lib/mongodb';

// Enhanced Debate Mode with YOLO/ML Architecture
// Uses modular vision pipeline: Vision → ASR → Alignment → Feedback

interface DebateSession {
  sessionId: string;
  visionData: any; // Complete vision JSON from /vision/analyze
  vocabulary: string[];
  speakingTopic: string;
  conversation: Array<{
    role: 'ai' | 'user';
    message: string;
    alignmentData?: any;
    feedbackData?: any;
  }>;
  currentLevel: number;
  nextQuestion: string;
}

// B. VQA / Extractive details (nếu cần trả lời câu hỏi trực tiếp về ảnh)
async function answerImageQuestion(
  question: string,
  visionOutput: any,
  imageId: string
): Promise<{
  answer: string;
  certainty: number;
  explanation: string;
}> {
  try {
    // Simple VQA logic based on vision data
    const objects = visionOutput.objects || [];
    const summary = visionOutput.summary || "";
    const scene = visionOutput.scene || "";
    
    // Check for common questions
    const questionLower = question.toLowerCase();
    
    if (questionLower.includes('xe lửa') || questionLower.includes('tàu')) {
      const hasTrainObject = objects.some((obj: any) => 
        obj.name.includes('train') && obj.confidence > 0.4
      );
      const hasTrainNote = visionOutput.notes?.includes('no_train_detected');
      
      return {
        answer: hasTrainObject ? "Có" : "Không",
        certainty: hasTrainNote ? 0.95 : 0.8,
        explanation: hasTrainObject 
          ? "Vision module phát hiện xe lửa trong ảnh"
          : "Vision module không phát hiện xe lửa; có " + objects.map((o: any) => o.name).join(', ')
      };
    }
    
    if (questionLower.includes('người') || questionLower.includes('person')) {
      const hasPerson = objects.some((obj: any) => 
        obj.name === 'person' && obj.confidence > 0.4
      );
      
      return {
        answer: hasPerson ? "Có người trong ảnh" : "Không thấy người",
        certainty: 0.85,
        explanation: hasPerson 
          ? "Phát hiện người với độ tin cậy cao"
          : "Không phát hiện người trong ảnh"
      };
    }

    // General answer based on summary
    return {
      answer: summary || "Không thể xác định từ ảnh",
      certainty: 0.6,
      explanation: "Dựa trên phân tích tổng quan của ảnh"
    };

  } catch (error) {
    console.error('VQA error:', error);
    return {
      answer: "Cannot determine from image.",
      certainty: 0.0,
      explanation: "Error processing image question."
    };
  }
}

// Helper function to generate debate content from vision data
function generateDebateContentFromVision(visionData: any, userLevel: number): {
  visionData: any;
  vocabulary: string[];
  speakingTopic: string;
  firstQuestion: string;
} {
  const levelPrompts = {
    0: "A1 - Miêu tả đơn giản",
    1: "A2 - Hội thoại cơ bản", 
    2: "B1 - Thảo luận ngắn",
    3: "B2 - Phân tích/tranh luận"
  };

  // Generate vocabulary and questions based on detected objects and scene
  const detectedObjects = visionData.objects?.map((obj: any) => obj.name) || [];
  const scene = visionData.scene || 'general';
  
  // Level-appropriate vocabulary generation
  const vocabularyMap = {
    0: ['có', 'không có', 'thấy', 'màu', 'to', 'nhỏ', 'đẹp'],
    1: ['đang', 'ở đây', 'bên cạnh', 'phía trước', 'phía sau', 'giữa'],
    2: ['có vẻ như', 'dường như', 'có thể', 'nên', 'vì vậy'],
    3: ['phản ánh', 'thể hiện', 'ảnh hưởng', 'quan điểm', 'kết luận']
  };

  const baseVocabulary = vocabularyMap[userLevel as keyof typeof vocabularyMap] || vocabularyMap[0];
  
  // Add object-specific vocabulary
  const objectVocabulary = detectedObjects.slice(0, 5).map((obj: string) => {
    const translations: { [key: string]: string } = {
      'person': 'người',
      'car': 'xe hơi',
      'train': 'xe lửa',
      'christmas_tree': 'cây thông',
      'table': 'bàn',
      'chair': 'ghế',
      'object': 'vật thể'
    };
    return translations[obj] || obj;
  });

  const vocabulary = [...baseVocabulary, ...objectVocabulary];

  // Generate speaking topic and first question
  const topicTemplates = {
    0: `Miêu tả những gì bạn thấy trong ảnh này`,
    1: `Nói về hoạt động và vật thể trong ảnh`,
    2: `Thảo luận về tình huống và cảm xúc trong ảnh`,
    3: `Phân tích ý nghĩa và thông điệp của ảnh`
  };

  const questionTemplates = {
    0: "Bạn thấy gì trong hình này?",
    1: "Theo bạn, người trong hình đang làm gì?",
    2: "Bạn nghĩ gì về tình huống trong hình này?",
    3: "Hình ảnh này phản ánh điều gì về xã hội hiện đại?"
  };

  return {
    visionData,
    vocabulary,
    speakingTopic: topicTemplates[userLevel as keyof typeof topicTemplates] || topicTemplates[0],
    firstQuestion: questionTemplates[userLevel as keyof typeof questionTemplates] || questionTemplates[0]
  };
}

// Call Vision Analysis API
async function analyzeImageForDebate(imageBase64: string, userLevel: number): Promise<{
  visionData: any;
  vocabulary: string[];
  speakingTopic: string;
  firstQuestion: string;
}> {
  try {
    // Step 1: Call Vision Analysis API
    const visionResponse = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/vision/analyze`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ imageBase64 })
    });

    const visionData = await visionResponse.json();
    
    if (visionData.status !== 'ok') {
      // Check if it's a rate limit error - use fallback
      if (visionData.error_message?.includes('Rate limit') || visionData.error_message?.includes('429')) {
        console.warn(' OpenAI Rate Limit on Vision - Using fallback analysis');
        
        // Use fallback vision data
        const fallbackVisionData = {
          image_id: `img_${Date.now()}`,
          summary: "Hình ảnh đang được phân tích",
          objects: [
            { name: "object", confidence: 0.7, bbox: null }
          ],
          actions: [],
          scene: "general",
          notes: "fallback_due_to_rate_limit",
          status: "ok"
        };
        
        // Continue with fallback instead of throwing
        return generateDebateContentFromVision(fallbackVisionData, userLevel);
      }
      
      throw new Error(`Vision analysis failed: ${visionData.error_message}`);
    }

    // Step 2: Generate debate content based on vision data
    return generateDebateContentFromVision(visionData, userLevel);

  } catch (error) {
    console.error('Debate image analysis error:', error);
    
    // Fallback response
    return {
      visionData: {
        image_id: `img_${Date.now()}`,
        summary: "Phân tích ảnh cơ bản",
        objects: [{ name: "unknown", confidence: 0.5 }],
        actions: [],
        scene: "general",
        notes: "fallback_analysis",
        status: "ok"
      },
      vocabulary: ["thấy", "có", "không", "đẹp", "to", "nhỏ"],
      speakingTopic: "Miêu tả những gì bạn thấy",
      firstQuestion: "Bạn thấy gì trong hình này?"
    };
  }
}

// Fallback response processor when API rate limit is hit
async function processFallbackResponse(
  transcript: string,
  sessionData: DebateSession,
  alignmentData: any,
  asrConfidence: number
): Promise<{
  corrections: any;
  improvedVersion: string;
  explanation: string;
  nextQuestion: string;
  encouragement: string;
  accuracyAssessment: any;
  alignmentData?: any;
  feedbackData?: any;
}> {
  // Simple rule-based corrections
  const corrections = {
    grammar: [],
    pronunciation: asrConfidence < 0.6 ? ['Phát âm cần rõ ràng hơn'] : [],
    vocabulary: []
  };

  // Generate simple next question based on level
  const nextQuestions = [
    "Bạn có thể mô tả thêm chi tiết không?",
    "Còn gì khác trong hình không?",
    "Bạn nghĩ gì về điều đó?",
    "Hãy nói thêm về cảm nhận của bạn."
  ];
  
  const nextQuestion = nextQuestions[Math.floor(Math.random() * nextQuestions.length)];

  return {
    corrections,
    improvedVersion: transcript,
    explanation: "Câu trả lời của bạn đã được ghi nhận. (Hệ thống đang sử dụng chế độ fallback do giới hạn API)",
    nextQuestion,
    encouragement: "Tốt lắm! Hãy tiếp tục!",
    accuracyAssessment: {
      isAccurate: alignmentData.match === "MATCH",
      score: alignmentData.total_score || 70,
      feedback: `Content: ${alignmentData.match} (${alignmentData.content_score}/60) - Language: ${alignmentData.language_score}/40`
    },
    alignmentData,
    feedbackData: {
      feedback_text: "Câu trả lời tốt! Hãy tiếp tục luyện tập.",
      next_question: nextQuestion,
      status: "ok"
    }
  };
}

// Process user response using modular pipeline: ASR → Alignment → Feedback
async function processUserResponse(
  userResponse: string,
  sessionData: DebateSession,
  userLevel: number,
  audioBase64?: string
): Promise<{
  corrections: {
    grammar: string[];
    pronunciation: string[];
    vocabulary: string[];
  };
  improvedVersion: string;
  explanation: string;
  nextQuestion: string;
  encouragement: string;
  accuracyAssessment: {
    isAccurate: boolean;
    score: number;
    feedback: string;
  };
  alignmentData?: any;
  feedbackData?: any;
}> {
  try {
    let transcript = userResponse;
    let asrConfidence = 1.0;

    // Step 1: ASR (if audio provided)
    if (audioBase64) {
      try {
        const asrResponse = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/speech/transcribe`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ audioBase64, mode: 'audio' })
        });

        const asrResult = await asrResponse.json();
        if (asrResult.status === 'ok') {
          transcript = asrResult.transcript;
          asrConfidence = asrResult.asr_confidence;
        }
      } catch (asrError) {
        console.error('ASR processing error:', asrError);
        // Continue with text input as fallback
      }
    } else {
      // Simulate ASR for text input
      try {
        const asrResponse = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/speech/transcribe`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text: userResponse, mode: 'text' })
        });

        const asrResult = await asrResponse.json();
        if (asrResult.status === 'ok') {
          asrConfidence = asrResult.asr_confidence;
        }
      } catch (asrError) {
        console.error('ASR simulation error:', asrError);
      }
    }

    // Step 2: Alignment - Compare transcript with vision data
    console.log(' Alignment Request:', {
      hasVisionData: !!sessionData.visionData,
      transcript,
      asrConfidence
    });

    const alignmentResponse = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/vision/align`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        vision_json: sessionData.visionData,
        transcript,
        asr_confidence: asrConfidence
      })
    });

    const alignmentData = await alignmentResponse.json();
    console.log(' Alignment Response:', alignmentData);
    
    // Handle rate limit or API errors with graceful fallback
    if (alignmentData.status !== 'ok') {
      // Check if it's a rate limit error
      if (alignmentData.error_message?.includes('Rate limit') || alignmentData.error_message?.includes('429')) {
        console.warn(' OpenAI Rate Limit - Using fallback alignment');
        
        // Use simple fallback alignment logic
        const fallbackAlignment = {
          image_id: sessionData.visionData?.image_id || `img_${Date.now()}`,
          user_text: transcript,
          match: "PARTIAL",
          content_score: 40,
          language_score: 30,
          total_score: 70,
          errors: [],
          suggest: transcript,
          status: "ok"
        };
        
        // Continue with fallback data instead of throwing error
        return await processFallbackResponse(transcript, sessionData, fallbackAlignment, asrConfidence);
      }
      
      throw new Error(`Alignment failed: ${alignmentData.error_message}`);
    }

    // Step 3: Teacher Feedback Generation
    const feedbackResponse = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/vision/feedback`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        alignment_json: alignmentData,
        asr_confidence: asrConfidence
      })
    });

    const feedbackData = await feedbackResponse.json();
    
    if (feedbackData.status !== 'ok') {
      // Check if it's a rate limit error
      if (feedbackData.error_message?.includes('Rate limit') || feedbackData.error_message?.includes('429')) {
        console.warn(' OpenAI Rate Limit on Feedback - Using fallback');
        
        // Use fallback feedback
        return await processFallbackResponse(transcript, sessionData, alignmentData, asrConfidence);
      }
      
      throw new Error(`Feedback generation failed: ${feedbackData.error_message}`);
    }

    // Extract corrections from alignment errors
    const corrections = {
      grammar: alignmentData.errors?.filter((e: string) => e.includes('grammar')) || [],
      pronunciation: asrConfidence < 0.6 ? ['Phát âm cần rõ ràng hơn'] : [],
      vocabulary: alignmentData.errors?.filter((e: string) => e.includes('vocabulary')) || []
    };

    return {
      corrections,
      improvedVersion: alignmentData.suggest || transcript,
      explanation: feedbackData.feedback_text || "Câu trả lời của bạn rất tốt!",
      nextQuestion: feedbackData.next_question || "Bạn có thể nói thêm về điều đó không?",
      encouragement: "Tuyệt vời! Hãy tiếp tục!",
      accuracyAssessment: {
        isAccurate: alignmentData.match === "MATCH",
        score: alignmentData.total_score || 80,
        feedback: `Content: ${alignmentData.match} (${alignmentData.content_score}/60) - Language: ${alignmentData.language_score}/40`
      },
      alignmentData,
      feedbackData
    };

  } catch (error) {
    console.error('User response processing error:', error);
    
    // Fallback response
    return {
      corrections: { grammar: [], pronunciation: [], vocabulary: [] },
      improvedVersion: userResponse,
      explanation: "Có lỗi xử lý phản hồi. Câu trả lời của bạn đã được ghi nhận.",
      nextQuestion: "Bạn có thể thử nói lại không?",
      encouragement: "Đừng lo lắng, hãy thử lại nhé!",
      accuracyAssessment: {
        isAccurate: false,
        score: 50,
        feedback: "Không thể đánh giá do lỗi hệ thống"
      }
    };
  }
}

// Save user progress
async function saveUserProgress(userId: string, sessionData: DebateSession, corrections: any) {
  try {
    const { db } = await connectToDatabase();
    
    // Update user progress
    await db.collection('userProgress').updateOne(
      { userId },
      {
        $set: {
          userId,
          lastActivity: new Date(),
          currentLevel: sessionData.currentLevel
        },
        $addToSet: {
          weakVocabulary: { $each: corrections.vocabulary },
          pronunciationErrors: { $each: corrections.pronunciation },
          completedLessons: sessionData.sessionId
        }
      },
      { upsert: true }
    );

    // Save session data
    await db.collection('debateSessions').updateOne(
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
    const { action, imageBase64, userResponse, sessionId, userId = 'anonymous', userLevel = 0 } = body;

    if (action === 'start') {
      // Start new debate session from image
      if (!imageBase64) {
        return NextResponse.json(
          { success: false, message: "Image is required to start debate" },
          { status: 400 }
        );
      }

      const analysis = await analyzeImageForDebate(imageBase64, userLevel);
      
      const newSessionId = `debate_${Date.now()}`;
      const sessionData: DebateSession = {
        sessionId: newSessionId,
        visionData: analysis.visionData,
        vocabulary: analysis.vocabulary,
        speakingTopic: analysis.speakingTopic,
        conversation: [{
          role: 'ai',
          message: analysis.firstQuestion
        }],
        currentLevel: userLevel,
        nextQuestion: analysis.firstQuestion
      };

      return NextResponse.json({
        success: true,
        action: 'start',
        sessionId: newSessionId,
        visionData: analysis.visionData,
        firstQuestion: analysis.firstQuestion,
        vocabulary: analysis.vocabulary,
        speakingTopic: analysis.speakingTopic,
        sessionData
      });

    } else if (action === 'respond') {
      // Process user response
      if (!userResponse || !sessionId) {
        return NextResponse.json(
          { success: false, message: "User response and session ID required" },
          { status: 400 }
        );
      }

      // Get session data and audio for ASR
      const { sessionData, audioBase64 } = body;
      if (!sessionData) {
        return NextResponse.json(
          { success: false, message: "Session data not found" },
          { status: 400 }
        );
      }

      // Ensure visionData exists - critical for alignment
      if (!sessionData.visionData) {
        return NextResponse.json(
          { success: false, message: "Vision data missing from session. Please restart the debate session." },
          { status: 400 }
        );
      }

      const result = await processUserResponse(userResponse, sessionData, userLevel, audioBase64);
      
      // Update conversation with alignment and feedback data
      sessionData.conversation.push(
        {
          role: 'user',
          message: userResponse,
          alignmentData: result.alignmentData,
          feedbackData: result.feedbackData
        },
        {
          role: 'ai',
          message: result.nextQuestion
        }
      );

      // Save progress
      await saveUserProgress(userId, sessionData, result.corrections);

      return NextResponse.json({
        success: true,
        action: 'respond',
        corrections: result.corrections,
        improvedVersion: result.improvedVersion,
        explanation: result.explanation,
        nextQuestion: result.nextQuestion,
        encouragement: result.encouragement,
        accuracyAssessment: result.accuracyAssessment,
        sessionData
      });

    } else if (action === 'vqa') {
      // B. VQA - Answer direct questions about image
      const { question, sessionData } = body;
      if (!question || !sessionData?.visionData) {
        return NextResponse.json(
          { success: false, message: "Question and session data with vision data required" },
          { status: 400 }
        );
      }

      const vqaResult = await answerImageQuestion(
        question,
        sessionData.visionData,
        sessionData.sessionId
      );

      return NextResponse.json({
        success: true,
        action: 'vqa',
        ...vqaResult
      });

    } else {
      return NextResponse.json(
        { success: false, message: "Invalid action. Use 'start', 'respond', or 'vqa'" },
        { status: 400 }
      );
    }

  } catch (error) {
    console.error("Debate mode error:", error);
    return NextResponse.json(
      { success: false, message: "Debate mode processing failed" },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    success: true,
    message: "Enhanced Debate Mode API with YOLO/ML Modular Architecture",
    architecture: "Client → Vision API → ASR API → Alignment API → Feedback API",
    features: [
      "Modular Vision Pipeline (YOLO + BLIP simulation)",
      "ASR Integration (Whisper API)",
      "Content Alignment Scoring",
      "Friendly Teacher Feedback",
      "Personalized Learning Levels (0-3)",
      "Real-time Error Detection",
      "Pronunciation Assessment",
      "Progressive Conversation Flow"
    ],
    pipeline: {
      "1_vision": "/api/vision/analyze - YOLO + BLIP object detection & captioning",
      "2_asr": "/api/speech/transcribe - Whisper speech recognition",
      "3_alignment": "/api/vision/align - Content vs image accuracy scoring",
      "4_feedback": "/api/vision/feedback - Friendly Vietnamese teacher response"
    },
    actions: {
      start: "Initialize debate session with modular vision analysis",
      respond: "Process user response through full pipeline (ASR → Alignment → Feedback)",
      vqa: "Answer direct questions about image content using vision data"
    },
    json_schemas: {
      vision_json: "{ image_id, summary, objects[], actions[], scene, notes, status }",
      alignment_json: "{ match, content_score, language_score, total_score, errors[], suggest }",
      feedback_text: "Plain Vietnamese string for UI display"
    },
    levels: {
      0: "A1 - Làm quen: Miêu tả đơn giản",
      1: "A2 - Hội thoại: Mua đồ, gọi món, hỏi đường",
      2: "B1 - Thảo luận: Ý kiến, so sánh, kể lại",
      3: "B2 - Phân tích: Tranh luận, lý do, cảm xúc"
    }
  });
}