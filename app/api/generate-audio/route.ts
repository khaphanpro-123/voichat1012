import { NextRequest, NextResponse } from "next/server";

// Vietnamese TTS using FPT.AI or similar service
export async function POST(req: NextRequest) {
  try {
    const { text, voice = 'banmai', speed = 0 } = await req.json();

    if (!text) {
      return NextResponse.json(
        { success: false, message: "Text is required" },
        { status: 400 }
      );
    }

    // For now, return configuration for browser-based TTS
    // In production, integrate with FPT.AI TTS API
    const audioConfig = {
      text,
      voice,
      speed,
      language: 'vi-VN',
      // FPT.AI voices: banmai (female), leminh (male), thuminh (male)
      voiceOptions: [
        { id: 'banmai', name: 'Ban Mai (Nữ - Miền Bắc)', gender: 'female', region: 'north' },
        { id: 'leminh', name: 'Lê Minh (Nam - Miền Bắc)', gender: 'male', region: 'north' },
        { id: 'thuminh', name: 'Thu Minh (Nữ - Miền Nam)', gender: 'female', region: 'south' }
      ]
    };

    // TODO: Integrate with FPT.AI TTS API
    /*
    const fptResponse = await fetch('https://api.fpt.ai/hmi/tts/v5', {
      method: 'POST',
      headers: {
        'api-key': process.env.FPT_API_KEY,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        text,
        voice,
        speed,
        format: 'mp3'
      })
    });

    const fptData = await fptResponse.json();
    
    if (fptData.error === 0) {
      return NextResponse.json({
        success: true,
        audioUrl: fptData.async,
        message: 'Audio generated successfully'
      });
    }
    */

    return NextResponse.json({
      success: true,
      audioConfig,
      useBrowserTTS: true,
      message: 'Using browser TTS (FPT.AI integration pending)'
    });

  } catch (error) {
    console.error("Audio generation error:", error);
    return NextResponse.json(
      { success: false, message: "Audio generation failed" },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const text = searchParams.get('text');
    const voice = searchParams.get('voice') || 'banmai';

    if (!text) {
      return NextResponse.json(
        { success: false, message: "Text parameter is required" },
        { status: 400 }
      );
    }

    // Return browser TTS configuration
    return NextResponse.json({
      success: true,
      config: {
        text,
        voice,
        language: 'vi-VN',
        rate: 0.8,
        pitch: 1.0
      },
      useBrowserTTS: true
    });

  } catch (error) {
    console.error("Audio config error:", error);
    return NextResponse.json(
      { success: false, message: "Audio config failed" },
      { status: 500 }
    );
  }
}