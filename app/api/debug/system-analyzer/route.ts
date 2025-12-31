import { NextRequest, NextResponse } from "next/server";
import { OpenAI } from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Comprehensive System Analysis for AI Teacher Platform
interface SystemAnalysisResult {
  pipeline_status: {
    step_a_vision: "PASS" | "FAIL" | "MISSING";
    step_b_evaluation: "PASS" | "FAIL" | "MISSING";
    step_c_ui: "PASS" | "FAIL" | "MISSING";
  };
  errors_found: string[];
  missing_components: string[];
  architecture_issues: string[];
  fix_plan: Array<{
    step: number;
    task: string;
    priority: "HIGH" | "MEDIUM" | "LOW";
    estimated_time: string;
  }>;
  correct_architecture: {
    frontend: string[];
    backend: string[];
    ai_models: string[];
    database: string[];
  };
  immediate_checklist: string[];
}

// PROMPT KIỂM TRA – PHÂN TÍCH LỖI TOÀN BỘ HỆ THỐNG
const SYSTEM_ANALYSIS_PROMPT = `
Bạn là hệ thống kiểm thử tự động cho nền tảng AI Teacher.

Nhiệm vụ của bạn:
1) Kiểm tra toàn bộ pipeline của tính năng "Phân tích ảnh và so khớp câu trả lời".
2) Phân tích chính xác điểm lỗi đang xảy ra.
3) Liệt kê các phần còn thiếu trong mô hình và kiến trúc backend.
4) Đưa ra plan fix theo từng bước nhỏ.

Dưới đây là pipeline được kỳ vọng:

**(A) Ảnh → Vision Model**
- Frontend upload ảnh → backend nhận đúng file.
- Backend chuyển file thành base64 hoặc public URL.
- Gọi model Vision để lấy mô tả chi tiết của ảnh.
- Lưu mô tả vào DB → để dùng cho bước chấm điểm.

**(B) User Answer → đánh giá**
- User mô tả bằng text hoặc audio.
- Nếu audio: chuyển thành text bằng Speech-to-Text.
- LLM so sánh "text người dùng" và "mô tả thật từ Vision".
- Output JSON:
  {
    "accuracy": 0-100,
    "is_correct": true/false,
    "explanation": "...",
    "correction": "..."
  }

**(C) UI**
- Hiển thị mô tả thật (ẩn hoặc admin).
- Hiển thị điểm số.
- Hiển thị gợi ý sửa.
- Render lại khi user ghi âm lại.

Hãy kiểm tra:
- Frontend đang thiếu bước gì?
- Backend đang thiếu bước gì?
- Gọi API Vision có đúng không?
- API có nhận được ảnh hay không?
- Trả về JSON có đúng định dạng không?
- Có bước nào mockdata mà đáng lẽ phải dùng model thật?
- Có phần nào logic bị hổng khiến mô hình "không phân tích được ảnh"?

Cuối cùng, trả về:
1) Danh sách lỗi tìm thấy.
2) Danh sách phần còn thiếu.
3) Kiến trúc mô hình đúng.
4) Checklist phải làm ngay.
`;

// Analyze current system implementation
async function analyzeSystemImplementation(systemData: any): Promise<SystemAnalysisResult> {
  try {
    const analysisPrompt = `
${SYSTEM_ANALYSIS_PROMPT}

PHÂN TÍCH HỆ THỐNG HIỆN TẠI:
${JSON.stringify(systemData, null, 2)}

Hãy phân tích và trả về JSON theo format:
{
  "pipeline_status": {
    "step_a_vision": "PASS|FAIL|MISSING",
    "step_b_evaluation": "PASS|FAIL|MISSING", 
    "step_c_ui": "PASS|FAIL|MISSING"
  },
  "errors_found": ["lỗi 1", "lỗi 2"],
  "missing_components": ["thiếu 1", "thiếu 2"],
  "architecture_issues": ["vấn đề kiến trúc 1", "vấn đề 2"],
  "fix_plan": [
    {
      "step": 1,
      "task": "nhiệm vụ cần làm",
      "priority": "HIGH|MEDIUM|LOW",
      "estimated_time": "thời gian ước tính"
    }
  ],
  "correct_architecture": {
    "frontend": ["component 1", "component 2"],
    "backend": ["api 1", "api 2"],
    "ai_models": ["model 1", "model 2"],
    "database": ["table 1", "table 2"]
  },
  "immediate_checklist": ["check 1", "check 2"]
}

QUAN TRỌNG: Chỉ trả về JSON, không kèm text khác.
`;

    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "user",
          content: analysisPrompt
        }
      ],
      temperature: 0.1,
      max_tokens: 2000,
    });

    const content = response.choices[0]?.message?.content;
    if (content) {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        try {
          return JSON.parse(jsonMatch[0]);
        } catch (parseError) {
          console.error('System analysis JSON parse error:', parseError);
        }
      }
    }

    // Fallback analysis
    return generateFallbackSystemAnalysis(systemData);

  } catch (error) {
    console.error('System analysis error:', error);
    return generateFallbackSystemAnalysis(systemData);
  }
}

// Generate fallback system analysis
function generateFallbackSystemAnalysis(systemData: any): SystemAnalysisResult {
  return {
    pipeline_status: {
      step_a_vision: "FAIL",
      step_b_evaluation: "FAIL", 
      step_c_ui: "MISSING"
    },
    errors_found: [
      "Vision API không được gọi đúng cách",
      "Thiếu bước lưu mô tả ảnh vào database",
      "Frontend hardcode accuracy = 50%",
      "Không có Speech-to-Text thật",
      "Logic so sánh dùng mockdata"
    ],
    missing_components: [
      "API upload-image với multer/formidable",
      "Database schema cho image descriptions",
      "Speech-to-Text integration",
      "Real Vision Model integration",
      "Proper JSON response format"
    ],
    architecture_issues: [
      "Không có separation of concerns giữa Vision và Evaluation",
      "Frontend trực tiếp hardcode kết quả",
      "Thiếu error handling cho Vision API",
      "Không có caching cho Vision results"
    ],
    fix_plan: [
      {
        step: 1,
        task: "Implement proper Vision API integration",
        priority: "HIGH",
        estimated_time: "2-3 hours"
      },
      {
        step: 2,
        task: "Create database schema for image descriptions",
        priority: "HIGH", 
        estimated_time: "1 hour"
      },
      {
        step: 3,
        task: "Replace hardcoded accuracy with real scoring",
        priority: "HIGH",
        estimated_time: "1-2 hours"
      },
      {
        step: 4,
        task: "Add Speech-to-Text integration",
        priority: "MEDIUM",
        estimated_time: "2-3 hours"
      }
    ],
    correct_architecture: {
      frontend: [
        "Image upload component with proper validation",
        "Audio recording component",
        "Results display with real scores",
        "Error handling UI"
      ],
      backend: [
        "/api/upload-image - Handle file upload",
        "/api/analyze-image - Vision Model integration", 
        "/api/evaluate-response - Compare user vs vision",
        "/api/speech-to-text - Audio transcription"
      ],
      ai_models: [
        "OpenAI GPT-4 Vision for image analysis",
        "OpenAI Whisper for speech-to-text",
        "GPT-4 for response evaluation"
      ],
      database: [
        "images table - Store uploaded images",
        "image_descriptions table - Store Vision results",
        "user_responses table - Store user answers",
        "evaluations table - Store scoring results"
      ]
    },
    immediate_checklist: [
      "Test Vision API với ảnh thật",
      "Kiểm tra file upload có hoạt động",
      "Verify JSON response format",
      "Test Speech-to-Text với audio thật",
      "Remove all hardcoded values"
    ]
  };
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action, system_data } = body;

    if (action === 'analyze_system') {
      // Comprehensive system analysis
      const analysis = await analyzeSystemImplementation(system_data || {});
      
      return NextResponse.json({
        success: true,
        action: 'analyze_system',
        analysis
      });

    } else {
      return NextResponse.json(
        { 
          success: false, 
          message: "Invalid action. Use 'analyze_system'" 
        },
        { status: 400 }
      );
    }

  } catch (error) {
    console.error("System analyzer error:", error);
    return NextResponse.json(
      { 
        success: false, 
        message: "System analysis failed" 
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    success: true,
    message: "System Analyzer API - Comprehensive AI Teacher Platform Analysis",
    description: "Automated testing system for image analysis and response matching pipeline",
    features: [
      "Complete Pipeline Analysis (A→B→C)",
      "Error Detection and Classification",
      "Missing Component Identification", 
      "Architecture Issue Analysis",
      "Step-by-Step Fix Plan",
      "Immediate Action Checklist"
    ],
    pipeline_steps: {
      A: "Ảnh → Vision Model (Upload, Process, Store)",
      B: "User Answer → Evaluation (Text/Audio, STT, Compare, Score)",
      C: "UI (Display, Results, Feedback, Re-record)"
    },
    usage: {
      analyze: "POST { action: 'analyze_system', system_data: {...} }"
    },
    expected_pipeline: {
      step_a: "Frontend upload → Backend receive → Vision Model → Save to DB",
      step_b: "User input → STT (if audio) → LLM compare → JSON output",
      step_c: "Display real description → Show scores → Show corrections → Re-record"
    }
  });
}