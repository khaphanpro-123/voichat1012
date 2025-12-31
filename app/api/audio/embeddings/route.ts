import { NextRequest, NextResponse } from "next/server";
import { OpenAI } from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

interface AudioEmbeddingResult {
  embedding: number[];
  audio_id: string;
  status: "ok" | "error";
  error_message?: string;
}

interface VoiceSimilarityResult {
  cosine_similarity: number;
  similarity_percentage: number;
  voice_match_quality: "excellent" | "good" | "fair" | "poor";
  analysis: string;
  status: "ok" | "error";
  error_message?: string;
}

// Real Audio Embeddings using OpenAI (if available) or fallback
async function generateAudioEmbedding(audioBase64: string, audioId: string): Promise<AudioEmbeddingResult> {
  try {
    // Note: OpenAI doesn't currently have a public audio embedding API
    // This is a placeholder for when it becomes available
    // For now, we'll simulate embeddings based on audio features
    
    // Convert base64 to buffer
    const audioBuffer = Buffer.from(audioBase64, 'base64');
    
    // Simulate audio feature extraction (in real implementation, use actual audio processing)
    const audioFeatures = extractAudioFeatures(audioBuffer);
    
    return {
      embedding: audioFeatures,
      audio_id: audioId,
      status: "ok"
    };

  } catch (error) {
    console.error('Audio embedding error:', error);
    return {
      embedding: [],
      audio_id: audioId,
      status: "error",
      error_message: error instanceof Error ? error.message : "Embedding generation failed"
    };
  }
}

// Simulate audio feature extraction (replace with real audio processing library)
function extractAudioFeatures(audioBuffer: Buffer): number[] {
  // This is a simplified simulation - in production, use libraries like:
  // - Web Audio API for browser-based processing
  // - librosa equivalent for Node.js
  // - TensorFlow.js audio models
  
  const features: number[] = [];
  const bufferLength = Math.min(audioBuffer.length, 1000); // Limit for simulation
  
  // Simulate spectral features
  for (let i = 0; i < 128; i++) {
    const index = Math.floor((i / 128) * bufferLength);
    const value = audioBuffer[index] || 0;
    features.push((value - 128) / 128); // Normalize to [-1, 1]
  }
  
  return features;
}

// Calculate cosine similarity between two embeddings
function calculateCosineSimilarity(embedding1: number[], embedding2: number[]): number {
  if (embedding1.length !== embedding2.length) {
    throw new Error("Embeddings must have the same length");
  }
  
  let dotProduct = 0;
  let norm1 = 0;
  let norm2 = 0;
  
  for (let i = 0; i < embedding1.length; i++) {
    dotProduct += embedding1[i] * embedding2[i];
    norm1 += embedding1[i] * embedding1[i];
    norm2 += embedding2[i] * embedding2[i];
  }
  
  const magnitude = Math.sqrt(norm1) * Math.sqrt(norm2);
  return magnitude === 0 ? 0 : dotProduct / magnitude;
}

// Compare voice similarity using embeddings
function compareVoiceSimilarity(embedding1: number[], embedding2: number[]): VoiceSimilarityResult {
  try {
    const cosineSimilarity = calculateCosineSimilarity(embedding1, embedding2);
    const similarityPercentage = Math.round((cosineSimilarity + 1) * 50); // Convert [-1,1] to [0,100]
    
    let voiceMatchQuality: "excellent" | "good" | "fair" | "poor";
    let analysis: string;
    
    if (similarityPercentage >= 85) {
      voiceMatchQuality = "excellent";
      analysis = "Giọng nói rất giống mẫu, phát âm chính xác và tự nhiên";
    } else if (similarityPercentage >= 70) {
      voiceMatchQuality = "good";
      analysis = "Giọng nói khá giống mẫu, có thể cải thiện một số âm";
    } else if (similarityPercentage >= 50) {
      voiceMatchQuality = "fair";
      analysis = "Giọng nói cần luyện tập thêm để giống mẫu hơn";
    } else {
      voiceMatchQuality = "poor";
      analysis = "Giọng nói khác biệt nhiều so với mẫu, cần luyện tập cơ bản";
    }
    
    return {
      cosine_similarity: cosineSimilarity,
      similarity_percentage: similarityPercentage,
      voice_match_quality: voiceMatchQuality,
      analysis,
      status: "ok"
    };

  } catch (error) {
    return {
      cosine_similarity: 0,
      similarity_percentage: 0,
      voice_match_quality: "poor",
      analysis: "Không thể so sánh giọng nói",
      status: "error",
      error_message: error instanceof Error ? error.message : "Voice comparison failed"
    };
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action, audioBase64, audio_id, embedding1, embedding2 } = body;

    if (action === 'generate') {
      // Generate embedding for single audio
      if (!audioBase64) {
        return NextResponse.json(
          { 
            status: "error", 
            error_message: "Audio data required for embedding generation" 
          },
          { status: 400 }
        );
      }

      const embeddingResult = await generateAudioEmbedding(audioBase64, audio_id || `audio_${Date.now()}`);
      return NextResponse.json(embeddingResult);

    } else if (action === 'compare') {
      // Compare two embeddings
      if (!embedding1 || !embedding2) {
        return NextResponse.json(
          { 
            status: "error", 
            error_message: "Two embeddings required for comparison" 
          },
          { status: 400 }
        );
      }

      const similarityResult = compareVoiceSimilarity(embedding1, embedding2);
      return NextResponse.json(similarityResult);

    } else {
      return NextResponse.json(
        { 
          status: "error", 
          error_message: "Invalid action. Use 'generate' or 'compare'" 
        },
        { status: 400 }
      );
    }

  } catch (error) {
    console.error("Audio embeddings error:", error);
    return NextResponse.json(
      { 
        status: "error", 
        error_message: "Audio embeddings processing failed" 
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    success: true,
    message: "Audio Embeddings API - Voice Similarity Analysis",
    features: [
      "Audio Feature Extraction",
      "Voice Embedding Generation", 
      "Cosine Similarity Calculation",
      "Voice Match Quality Assessment",
      "Pronunciation Similarity Scoring"
    ],
    actions: {
      generate: "Create embedding vector from audio",
      compare: "Calculate similarity between two embeddings"
    },
    similarity_levels: {
      excellent: "85-100% - Giọng nói rất giống mẫu",
      good: "70-84% - Giọng nói khá giống mẫu", 
      fair: "50-69% - Giọng nói cần luyện tập thêm",
      poor: "0-49% - Giọng nói khác biệt nhiều"
    },
    schema: {
      generate: "{ action: 'generate', audioBase64: string, audio_id?: string }",
      compare: "{ action: 'compare', embedding1: number[], embedding2: number[] }",
      output: "{ cosine_similarity, similarity_percentage, voice_match_quality, analysis }"
    },
    note: "Currently using simulated audio features. In production, integrate with specialized audio processing libraries for more accurate voice analysis."
  });
}