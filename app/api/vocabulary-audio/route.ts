import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const { text, language = 'vi-VN' } = await req.json();

    if (!text) {
      return NextResponse.json(
        { success: false, message: "Text is required" },
        { status: 400 }
      );
    }

    // For Vietnamese TTS, we'll use browser's built-in speech synthesis
    // This endpoint will return audio configuration for the frontend
    return NextResponse.json({
      success: true,
      audioConfig: {
        text,
        language,
        voice: 'vi-VN',
        rate: 0.8,
        pitch: 1.0
      }
    });
  } catch (error) {
    console.error("Audio generation error:", error);
    return NextResponse.json(
      { success: false, message: "Audio generation failed" },
      { status: 500 }
    );
  }
}

// Alternative: Use Google Cloud Text-to-Speech API
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const text = searchParams.get('text');
    const language = searchParams.get('language') || 'vi-VN';

    if (!text) {
      return NextResponse.json(
        { success: false, message: "Text parameter is required" },
        { status: 400 }
      );
    }

    // For now, return configuration for browser TTS
    // In production, you could integrate with Google Cloud TTS
    return NextResponse.json({
      success: true,
      audioUrl: null, // Browser will handle TTS
      config: {
        text,
        language,
        voice: language === 'vi-VN' ? 'Vietnamese Female' : 'English Female'
      }
    });
  } catch (error) {
    console.error("Audio fetch error:", error);
    return NextResponse.json(
      { success: false, message: "Audio fetch failed" },
      { status: 500 }
    );
  }
}