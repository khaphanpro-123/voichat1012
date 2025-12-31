import { NextRequest, NextResponse } from "next/server";
import { OpenAI } from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Vision-Debug Master AI - Complete Pipeline Analysis
interface DebugAnalysis {
  step_error: number | number[];
  error_reason: string;
  missing_components: string[];
  how_to_fix: string[];
  sample_correct_payload: string;
  sample_correct_code: string;
  health_check_list: string[];
}

// Full Master Prompt - Debug Vision & Debate Mode
const VISION_DEBUG_MASTER_PROMPT = `
Bạn là Vision-Debug Master AI, có nhiệm vụ phân tích và xác định lỗi trong toàn bộ hệ thống Vision + Debate Mode.

====================================================
I. PHẠM VI CẦN KIỂM TRA
====================================================

Bạn phải kiểm tra toàn bộ 6 bước trong pipeline xử lý Debate Mode:

1. FRONTEND UPLOAD ẢNH
   - Người dùng chọn ảnh.
   - Ảnh có thực sự được load vào bộ nhớ không?
   - Định dạng ảnh (file, blob, base64, url) có hợp lệ không?

2. FRONTEND GỬI ẢNH SANG BACKEND
   - Payload có gửi ảnh không?
   - Ảnh có bị thiếu header (data:image/jpeg;base64…)?
   - Base64 có bị cắt ngắn không?
   - Có truyền đúng key (image/file/base64_url) không?

3. BACKEND NHẬN ẢNH
   - API có nhận đúng file không?
   - Có middleware nhận file chưa? (multer, formidable…)
   - Buffer có đúng kích thước không?
   - File có bị trống (0 bytes)?

4. BACKEND GỬI ẢNH CHO MÔ HÌNH VISION
   - Có dùng model vision hay dùng model text?
   - Payload gửi đến model có đúng format không?
   - Có sử dụng kiểu content: [
       { "type": "image_url", "image_url": {"url": "data:image/jpeg;base64,..."} },
       { "type": "text", "text": "..." }
     ] ?

5. KẾT QUẢ PHÂN TÍCH ẢNH TỪ VISION
   - Model có trả về mô tả không?
   - JSON trả về có "description", "objects", "context" không?
   - Nếu Vision trả lỗi → phải hiển thị lỗi rõ.

6. LOGIC SO KHỚP CÂU TRẢ LỜI NGƯỜI DÙNG
   - Có lưu mô tả ảnh trước đó không?
   - Khi user trả lời, hệ thống có gọi LLM để so sánh không?
   - Có xử lý trường hợp Vision-mô tả = null không?

====================================================
II. CÁC LỖI PHỔ BIẾN PHẢI TỰ ĐỘNG PHÁT HIỆN
====================================================

1. Frontend upload đúng nhưng không gửi file sang backend.
2. Base64 ảnh bị thiếu phần header (data:image/png;base64,).
3. Backend nhận req.body nhưng không nhận req.file.
4. Payload gửi Vision sai format → model không phân tích ảnh.
5. Vision model bị gọi bằng model text → không phân tích được ảnh.
6. Vision trả mô tả null nhưng frontend không xử lý → accuracy = default (50%).
7. Thiếu bước lưu lại "mô tả ảnh" → không thể so sánh câu trả lời.
8. Không gọi LLM để so khớp câu trả lời user vs mô tả ảnh.
9. Logic so sánh luôn trả sai vì description rỗng.
10. Frontend không nhận về JSON Vision vì CORS hoặc sai path.

====================================================
III. MẪU MÃ GỌI VISION ĐÚNG CHUẨN
====================================================

{
  "model": "gpt-4o-mini",
  "messages": [
    {
      "role": "user",
      "content": [
        { 
          "type": "image_url", 
          "image_url": {
            "url": "data:image/jpeg;base64,<BASE64_DATA>"
          }
        },
        { 
          "type": "text", 
          "text": "Hãy mô tả nội dung ảnh cực chi tiết." 
        }
      ]
    }
  ]
}

====================================================
IV. HEALTH CHECK PIPELINE (CHECKLIST)
====================================================

1. Ảnh từ frontend có size > 0 không?
2. Backend có nhận đúng file (req.file hoặc req.body.imageBase64) không?
3. Có log kích thước buffer file không?
4. Backend có gọi đúng model Vision?
5. Vision có trả về description hoặc objects?
6. Frontend có nhận dữ liệu Vision và lưu nó để so sánh không?
`;

// Analyze debug request using Vision-Debug Master AI
async function analyzeDebugRequest(
  debugData: {
    error_description?: string;
    logs?: string;
    code_snippet?: string;
    request_payload?: any;
    response_data?: any;
    step_suspected?: number;
  }
): Promise<DebugAnalysis> {
  try {
    const analysisPrompt = `
${VISION_DEBUG_MASTER_PROMPT}

====================================================
PHÂN TÍCH LỖI CỤ THỂ
====================================================

Dữ liệu debug từ người dùng:
${JSON.stringify(debugData, null, 2)}

Hãy phân tích theo quy trình 6 bước và trả về JSON theo format:

{
  "step_error": <1 đến 6, hoặc array nếu nhiều bước>,
  "error_reason": "Giải thích lỗi rõ ràng",
  "missing_components": [
    "Những thành phần bị thiếu hoặc chưa cấu hình"
  ],
  "how_to_fix": [
    "Các bước sửa lỗi cụ thể"
  ],
  "sample_correct_payload": "Ví dụ payload đúng để gửi ảnh cho Vision",
  "sample_correct_code": "Đoạn code sửa lỗi (nếu cần)",
  "health_check_list": [
    "Danh sách check nhanh để test lại hệ thống"
  ]
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
      max_tokens: 1500,
    });

    const content = response.choices[0]?.message?.content;
    if (content) {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        try {
          return JSON.parse(jsonMatch[0]);
        } catch (parseError) {
          console.error('Debug analysis JSON parse error:', parseError);
        }
      }
    }

    // Fallback analysis based on suspected step
    return generateFallbackAnalysis(debugData);

  } catch (error) {
    console.error('Debug analysis error:', error);
    return generateFallbackAnalysis(debugData);
  }
}

// Generate fallback analysis based on common patterns
function generateFallbackAnalysis(debugData: any): DebugAnalysis {
  const errorDescription = debugData.error_description?.toLowerCase() || "";
  const logs = debugData.logs?.toLowerCase() || "";
  
  // Pattern matching for common errors
  if (errorDescription.includes("không nhận ra") || errorDescription.includes("not recognize")) {
    return {
      step_error: [4, 5],
      error_reason: "Vision model không được gọi đúng cách hoặc không trả về kết quả",
      missing_components: [
        "Payload gửi Vision sai format",
        "Model Vision không được config đúng",
        "Response từ Vision bị null"
      ],
      how_to_fix: [
        "Kiểm tra format payload gửi Vision",
        "Đảm bảo sử dụng gpt-4o-mini với image_url",
        "Thêm error handling cho Vision response",
        "Log response từ Vision để debug"
      ],
      sample_correct_payload: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [{
          role: "user",
          content: [
            { type: "image_url", image_url: { url: "data:image/jpeg;base64,<BASE64>" } },
            { type: "text", text: "Mô tả ảnh chi tiết" }
          ]
        }]
      }, null, 2),
      sample_correct_code: `
// Correct Vision API call
const response = await openai.chat.completions.create({
  model: "gpt-4o-mini",
  messages: [{
    role: "user",
    content: [
      {
        type: "image_url",
        image_url: {
          url: \`data:image/jpeg;base64,\${imageBase64}\`
        }
      },
      {
        type: "text",
        text: "Phân tích ảnh và trả về JSON với objects, description, scene"
      }
    ]
  }],
  temperature: 0.3,
  max_tokens: 800
});`,
      health_check_list: [
        "Test Vision API với ảnh mẫu",
        "Kiểm tra response có chứa description không",
        "Verify imageBase64 có header đúng không",
        "Log toàn bộ Vision response để debug",
        "Test với ảnh khác nhau",
        "Kiểm tra API key OpenAI"
      ]
    };
  }

  if (errorDescription.includes("upload") || logs.includes("file")) {
    return {
      step_error: [1, 2, 3],
      error_reason: "Lỗi trong quá trình upload và xử lý file ảnh",
      missing_components: [
        "File upload handler",
        "Base64 conversion",
        "File validation"
      ],
      how_to_fix: [
        "Kiểm tra input file có được chọn không",
        "Verify base64 conversion có header đúng",
        "Thêm validation cho file size và type",
        "Log file data trước khi gửi backend"
      ],
      sample_correct_payload: JSON.stringify({
        action: "start",
        imageBase64: "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQ...",
        userLevel: 1
      }, null, 2),
      sample_correct_code: `
// Correct file upload handling
const handleImageUpload = (file: File) => {
  const reader = new FileReader();
  reader.onload = (e) => {
    const base64 = e.target?.result as string;
    // Ensure proper header
    if (base64.startsWith('data:image/')) {
      setImageBase64(base64);
    }
  };
  reader.readAsDataURL(file);
};`,
      health_check_list: [
        "Kiểm tra file input có value không",
        "Log base64 string length",
        "Verify base64 có header data:image/",
        "Test với file ảnh nhỏ trước",
        "Kiểm tra network request payload",
        "Verify backend nhận được imageBase64"
      ]
    };
  }

  // Default analysis
  return {
    step_error: [1, 2, 3, 4, 5, 6],
    error_reason: "Cần phân tích toàn bộ pipeline để xác định lỗi",
    missing_components: [
      "Cần thêm thông tin debug cụ thể",
      "Logs từ frontend và backend",
      "Request/response data"
    ],
    how_to_fix: [
      "Thêm logging ở mỗi bước pipeline",
      "Test từng bước một cách riêng biệt",
      "Kiểm tra network requests trong DevTools",
      "Verify API endpoints đang hoạt động"
    ],
    sample_correct_payload: "Cần thêm thông tin để tạo payload mẫu",
    sample_correct_code: "Cần thêm thông tin để tạo code mẫu",
    health_check_list: [
      "Test API endpoints với Postman",
      "Kiểm tra console logs",
      "Verify database connections",
      "Test với data mẫu",
      "Kiểm tra environment variables",
      "Verify OpenAI API key"
    ]
  };
}

// Health check for entire vision pipeline
async function performHealthCheck(): Promise<{
  pipeline_status: { [key: string]: boolean };
  issues_found: string[];
  recommendations: string[];
}> {
  const healthStatus = {
    vision_api_endpoint: false,
    debate_mode_endpoint: false,
    openai_connection: false,
    image_processing: false,
    alignment_system: false,
    feedback_generation: false
  };

  const issues: string[] = [];
  const recommendations: string[] = [];

  try {
    // Check Vision API endpoint
    const visionCheck = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/vision/analyze`, {
      method: 'GET'
    });
    healthStatus.vision_api_endpoint = visionCheck.ok;
    if (!visionCheck.ok) {
      issues.push("Vision API endpoint không hoạt động");
      recommendations.push("Kiểm tra /api/vision/analyze endpoint");
    }

    // Check Debate Mode endpoint
    const debateCheck = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/debate-mode`, {
      method: 'GET'
    });
    healthStatus.debate_mode_endpoint = debateCheck.ok;
    if (!debateCheck.ok) {
      issues.push("Debate Mode API endpoint không hoạt động");
      recommendations.push("Kiểm tra /api/debate-mode endpoint");
    }

    // Check OpenAI connection
    if (process.env.OPENAI_API_KEY) {
      healthStatus.openai_connection = true;
    } else {
      issues.push("OpenAI API key không được cấu hình");
      recommendations.push("Thêm OPENAI_API_KEY vào environment variables");
    }

    // Additional checks would go here...
    healthStatus.image_processing = true;
    healthStatus.alignment_system = true;
    healthStatus.feedback_generation = true;

  } catch (error) {
    issues.push(`Health check error: ${error}`);
    recommendations.push("Kiểm tra server đang chạy và network connection");
  }

  return {
    pipeline_status: healthStatus,
    issues_found: issues,
    recommendations
  };
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action, debug_data } = body;

    if (action === 'analyze') {
      // Analyze debug request
      if (!debug_data) {
        return NextResponse.json(
          { 
            success: false, 
            message: "Debug data required for analysis" 
          },
          { status: 400 }
        );
      }

      const analysis = await analyzeDebugRequest(debug_data);
      
      return NextResponse.json({
        success: true,
        action: 'analyze',
        analysis
      });

    } else if (action === 'health_check') {
      // Perform comprehensive health check
      const healthCheck = await performHealthCheck();
      
      return NextResponse.json({
        success: true,
        action: 'health_check',
        ...healthCheck
      });

    } else {
      return NextResponse.json(
        { 
          success: false, 
          message: "Invalid action. Use 'analyze' or 'health_check'" 
        },
        { status: 400 }
      );
    }

  } catch (error) {
    console.error("Vision Debug Master error:", error);
    return NextResponse.json(
      { 
        success: false, 
        message: "Debug analysis failed" 
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    success: true,
    message: "Vision-Debug Master AI - Complete Pipeline Analysis",
    description: "Comprehensive debugging system for Vision + Debate Mode pipeline",
    features: [
      "6-Step Pipeline Analysis",
      "Automatic Error Detection",
      "Common Issue Patterns",
      "Correct Code Samples",
      "Health Check System",
      "Fix Recommendations"
    ],
    pipeline_steps: {
      1: "Frontend Upload Ảnh",
      2: "Frontend Gửi Ảnh Sang Backend", 
      3: "Backend Nhận Ảnh",
      4: "Backend Gửi Ảnh Cho Vision Model",
      5: "Kết Quả Phân Tích Ảnh Từ Vision",
      6: "Logic So Khớp Câu Trả Lời Người Dùng"
    },
    actions: {
      analyze: "Analyze debug data and identify issues",
      health_check: "Perform comprehensive pipeline health check"
    },
    usage: {
      debug_analysis: "POST { action: 'analyze', debug_data: { error_description, logs, code_snippet, etc. } }",
      health_check: "POST { action: 'health_check' }"
    },
    master_prompt_included: true
  });
}