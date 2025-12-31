import { NextRequest, NextResponse } from "next/server";
import { OpenAI } from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Standard JSON schemas for consistent frontend handling
interface VisionJSON {
  image_id: string;
  summary: string;
  objects: Array<{
    name: string;
    confidence: number;
    bbox?: [number, number, number, number]; // [x, y, w, h]
  }>;
  actions: Array<{
    subject: string;
    action: string;
  }>;
  scene: string;
  notes: string;
  status: "ok" | "error";
  error_message?: string;
}

// Vision Engine - YOLO + BLIP simulation using GPT-4 Vision
async function analyzeImageWithVision(imageBase64: string): Promise<VisionJSON> {
  try {
    const imageId = `img_${Date.now()}`;
    
    // Enhanced vision prompt for YOLO-like object detection + BLIP-like captioning
    const visionPrompt = `
You are a Vision Engine combining YOLO object detection + BLIP image captioning.

TASK: Analyze this image and return structured JSON with:
1. OBJECT DETECTION (YOLO-style): Detect all objects with confidence scores
2. IMAGE CAPTIONING (BLIP-style): Generate one concise summary sentence
3. ACTION DETECTION: Identify what people/objects are doing
4. SCENE CLASSIFICATION: Categorize the environment
5. NOTES: Mention explicitly what common objects are NOT present

IMPORTANT RULES:
- Confidence scores must be realistic (0.0-1.0)
- Only include objects you can clearly see
- If no train/vehicle detected, explicitly note it
- Summary should be 1 natural sentence (6-20 words)
- Actions should specify subject and verb

OUTPUT JSON SCHEMA (NO OTHER TEXT):
{
  "image_id": "${imageId}",
  "summary": "A young man standing on an indoor walkway near a decorated Christmas tree",
  "objects": [
    {"name": "person", "confidence": 0.98, "bbox": [120, 30, 80, 200]},
    {"name": "christmas_tree", "confidence": 0.92, "bbox": [20, 10, 100, 240]},
    {"name": "railing", "confidence": 0.87, "bbox": [0, 150, 300, 50]}
  ],
  "actions": [
    {"subject": "person", "action": "standing"}
  ],
  "scene": "shopping_mall_indoor",
  "notes": "no_train_detected, no_vehicle_present",
  "status": "ok"
}

Analyze the image now:`;

    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: visionPrompt
            },
            {
              type: "image_url",
              image_url: {
                url: `data:image/jpeg;base64,${imageBase64}`
              }
            }
          ]
        }
      ],
      temperature: 0.2,
      max_tokens: 800,
    });

    const content = response.choices[0]?.message?.content;
    if (content) {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        try {
          const visionResult = JSON.parse(jsonMatch[0]);
          return {
            ...visionResult,
            status: "ok"
          };
        } catch (parseError) {
          console.error('Vision JSON parse error:', parseError);
        }
      }
    }

    // Fallback with proper structure
    return {
      image_id: imageId,
      summary: "Image analysis completed with basic detection",
      objects: [
        {"name": "unknown_object", "confidence": 0.5}
      ],
      actions: [],
      scene: "general_indoor",
      notes: "analysis_completed_with_fallback",
      status: "ok"
    };

  } catch (error) {
    console.error('Vision analysis error:', error);
    return {
      image_id: `img_${Date.now()}`,
      summary: "Error analyzing image",
      objects: [],
      actions: [],
      scene: "unknown",
      notes: "vision_analysis_failed",
      status: "error",
      error_message: error instanceof Error ? error.message : "Unknown error"
    };
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { imageBase64 } = body;

    if (!imageBase64) {
      return NextResponse.json(
        { 
          status: "error", 
          error_message: "Image data required" 
        },
        { status: 400 }
      );
    }

    const visionResult = await analyzeImageWithVision(imageBase64);
    
    return NextResponse.json(visionResult);

  } catch (error) {
    console.error("Vision analyze error:", error);
    return NextResponse.json(
      { 
        status: "error", 
        error_message: "Vision analysis failed" 
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    success: true,
    message: "Vision Analysis API - YOLO + BLIP Architecture",
    features: [
      "Object Detection (YOLO-style)",
      "Image Captioning (BLIP-style)", 
      "Action Recognition",
      "Scene Classification",
      "Confidence Scoring",
      "Structured JSON Output"
    ],
    schema: {
      input: "{ imageBase64: string }",
      output: "VisionJSON with objects, summary, actions, scene"
    }
  });
}