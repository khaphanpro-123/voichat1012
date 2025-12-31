import { NextRequest, NextResponse } from "next/server";
import { OpenAI } from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

interface ASRResult {
  transcript: string;
  asr_confidence: number;
  language: string;
  status: "ok" | "error";
  error_message?: string;
}

// ASR Engine using OpenAI Whisper
async function transcribeAudio(audioBase64: string): Promise<ASRResult> {
  try {
    // Convert base64 to buffer for Whisper API
    const audioBuffer = Buffer.from(audioBase64, 'base64');
    
    // Create a temporary file-like object for Whisper
    const audioFile = new File([audioBuffer], 'audio.wav', { type: 'audio/wav' });
    
    const transcription = await openai.audio.transcriptions.create({
      file: audioFile,
      model: 'whisper-1',
      language: 'vi', // Vietnamese
      response_format: 'verbose_json'
    });

    // Calculate confidence based on Whisper response
    // Note: Whisper doesn't provide confidence directly, so we estimate
    const estimatedConfidence = transcription.text.length > 5 ? 0.85 : 0.6;
    
    return {
      transcript: transcription.text,
      asr_confidence: estimatedConfidence,
      language: "vi",
      status: "ok"
    };

  } catch (error) {
    console.error('ASR transcription error:', error);
    return {
      transcript: "",
      asr_confidence: 0.0,
      language: "vi",
      status: "error",
      error_message: error instanceof Error ? error.message : "Transcription failed"
    };
  }
}

// Fallback ASR using text analysis (for development/testing)
async function simulateASR(text: string): Promise<ASRResult> {
  try {
    // Simulate ASR confidence based on text quality
    const hasVietnameseChars = /[àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ]/i.test(text);
    const hasProperLength = text.length >= 10 && text.length <= 200;
    const hasProperStructure = text.includes(' ') && !text.includes('???');
    
    let confidence = 0.5;
    if (hasVietnameseChars) confidence += 0.2;
    if (hasProperLength) confidence += 0.2;
    if (hasProperStructure) confidence += 0.1;
    
    return {
      transcript: text,
      asr_confidence: Math.min(confidence, 0.95),
      language: "vi",
      status: "ok"
    };

  } catch (error) {
    return {
      transcript: text,
      asr_confidence: 0.3,
      language: "vi", 
      status: "error",
      error_message: "Simulated ASR error"
    };
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { audioBase64, text, mode = "audio" } = body;

    let asrResult: ASRResult;

    if (mode === "text" && text) {
      // Development mode: simulate ASR from text input
      asrResult = await simulateASR(text);
    } else if (mode === "audio" && audioBase64) {
      // Production mode: real ASR from audio
      asrResult = await transcribeAudio(audioBase64);
    } else {
      return NextResponse.json(
        { 
          status: "error", 
          error_message: "Either audioBase64 or text required" 
        },
        { status: 400 }
      );
    }
    
    return NextResponse.json(asrResult);

  } catch (error) {
    console.error("Speech transcribe error:", error);
    return NextResponse.json(
      { 
        status: "error", 
        error_message: "Speech transcription failed" 
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    success: true,
    message: "Speech Transcription API - Whisper ASR",
    features: [
      "OpenAI Whisper Integration",
      "Vietnamese Language Support",
      "Confidence Score Estimation",
      "Audio + Text Mode Support",
      "Error Handling & Fallbacks"
    ],
    modes: {
      audio: "Real ASR from audio base64",
      text: "Simulated ASR for development/testing"
    },
    schema: {
      input: "{ audioBase64?: string, text?: string, mode: 'audio'|'text' }",
      output: "{ transcript, asr_confidence, language, status }"
    }
  });
}