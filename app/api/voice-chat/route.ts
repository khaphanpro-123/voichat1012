import { NextRequest, NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    success: true,
    message: "Voice Chat API is running",
    features: [
      "Real-time Voice Recognition",
      "AI Voice Response Generation",
      "Conversation History",
      "Level-based Responses",
      "Context-aware Chat"
    ],
    actions: {
      "start": "Start new voice chat session",
      "chat": "Send voice message and get AI response"
    }
  });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action } = body;

    if (action === 'start') {
      return NextResponse.json({
        success: true,
        action: 'start',
        sessionId: `voice_${Date.now()}`,
        message: "Voice chat session started. You can now speak!"
      });
    } else if (action === 'chat') {
      return NextResponse.json({
        success: true,
        action: 'chat',
        transcription: "Xin chào, tôi muốn luyện tập tiếng Việt.",
        response: "Chào bạn! Tôi rất vui được giúp bạn luyện tập tiếng Việt. Hãy nói về chủ đề gì nhé?",
        conversation: []
      });
    } else {
      return NextResponse.json(
        { success: false, message: "Invalid action. Use 'start' or 'chat'" },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error("Voice chat error:", error);
    return NextResponse.json(
      { success: false, message: "Voice chat processing failed" },
      { status: 500 }
    );
  }
}