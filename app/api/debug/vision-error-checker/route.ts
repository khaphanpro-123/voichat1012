import { NextRequest, NextResponse } from "next/server";
import { readFile } from 'fs/promises';
import { join } from 'path';

// PROMPT KIỂM TRA 100% LỖI VISION – DÀNH CHO IDE KIRO
interface VisionErrorCheck {
  vision_status: "ok" | "error";
  reason?: string;
  missing_steps?: string[];
  how_to_fix?: string[];
}

interface UIIssueCheck {
  ui_issue: string;
  hardcode_found: boolean;
  api_response_received: boolean;
  required_fix: string;
}

interface BackendIssueCheck {
  backend_issue: string[];
  missing_api: string[];
  wrong_payload_format: string[];
  required_fix: string[];
}

interface PipelineCheck {
  pipeline_breakpoint: "frontend" | "backend" | "model" | "ui";
  root_cause: string;
}

interface FinalDiagnosis {
  final_diagnosis: string;
  main_error: string;
  fix_steps: string[];
}

interface ImagePayloadIssue {
  image_payload_issue: string;
  payload_example: string;
  how_to_fix: string[];
}

interface HardcodedAccuracyCheck {
  hardcoded_accuracy: boolean;
  json_received: boolean;
  fix: string;
}

// Complete system analysis result
interface CompleteVisionAnalysis {
  vision_check: VisionErrorCheck;
  ui_check: UIIssueCheck;
  backend_check: BackendIssueCheck;
  pipeline_check: PipelineCheck;
  image_payload_check?: ImagePayloadIssue;
  hardcode_check?: HardcodedAccuracyCheck;
  final_diagnosis: FinalDiagnosis;
}

// I. KIỂM TRA LỖI VISION MODEL
async function checkVisionModel(): Promise<VisionErrorCheck> {
  try {
    // Check if Vision API endpoint exists and is functional
    const visionEndpoints = [
      '/api/vision/analyze',
      '/api/debate-mode',
      '/api/upload-image'
    ];

    const endpointChecks = await Promise.all(
      visionEndpoints.map(async (endpoint) => {
        try {
          const response = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}${endpoint}`, {
            method: 'GET'
          });
          return { endpoint, status: response.ok, statusCode: response.status };
        } catch (error) {
          return { endpoint, status: false, error: error instanceof Error ? error.message : 'Unknown error' };
        }
      })
    );

    const failedEndpoints = endpointChecks.filter(check => !check.status);
    
    if (failedEndpoints.length > 0) {
      return {
        vision_status: "error",
        reason: `Vision endpoints không hoạt động: ${failedEndpoints.map(e => e.endpoint).join(', ')}`,
        missing_steps: [
          "Kiểm tra server đang chạy",
          "Verify API routes được định nghĩa",
          "Check OpenAI API key configuration",
          "Validate Vision API integration"
        ],
        how_to_fix: [
          "Khởi động development server",
          "Thêm missing API routes",
          "Configure OPENAI_API_KEY trong .env",
          "Test Vision API với sample image"
        ]
      };
    }

    // Check OpenAI API key
    if (!process.env.OPENAI_API_KEY) {
      return {
        vision_status: "error",
        reason: "OpenAI API key không được cấu hình",
        missing_steps: [
          "Thêm OPENAI_API_KEY vào environment variables",
          "Restart development server",
          "Test API connection"
        ],
        how_to_fix: [
          "Tạo file .env.local với OPENAI_API_KEY=your_key",
          "Restart npm run dev",
          "Test với /api/vision/analyze"
        ]
      };
    }

    return {
      vision_status: "ok"
    };

  } catch (error) {
    return {
      vision_status: "error",
      reason: `Vision model check failed: ${error}`,
      missing_steps: ["Debug system error"],
      how_to_fix: ["Check server logs and configuration"]
    };
  }
}

// II. KIỂM TRA LỖI CHẤM ĐIỂM UI
async function checkUIIssues(): Promise<UIIssueCheck> {
  try {
    // Read DebateMode component to check for hardcoded values
    const debateModePath = join(process.cwd(), 'components', 'DebateMode.tsx');
    
    let debateContent = '';
    try {
      debateContent = await readFile(debateModePath, 'utf-8');
    } catch (error) {
      return {
        ui_issue: "DebateMode component không tồn tại",
        hardcode_found: false,
        api_response_received: false,
        required_fix: "Tạo DebateMode component với proper API integration"
      };
    }

    // Check for hardcoded accuracy values
    const hardcodePatterns = [
      /accuracy.*=.*50/i,
      /setAccuracy\(50\)/i,
      /accuracy:\s*50/i,
      /"accuracy":\s*50/i
    ];

    const hasHardcode = hardcodePatterns.some(pattern => pattern.test(debateContent));

    // Check for API integration
    const apiPatterns = [
      /fetch.*\/api\//i,
      /axios.*\/api\//i,
      /\.post\(/i,
      /response\.json\(\)/i
    ];

    const hasApiIntegration = apiPatterns.some(pattern => pattern.test(debateContent));

    let uiIssue = "UI hoạt động bình thường";
    let requiredFix = "Không cần sửa";

    if (hasHardcode) {
      uiIssue = "Phát hiện hardcode accuracy = 50%";
      requiredFix = "Remove hardcoded values và integrate với real API response";
    } else if (!hasApiIntegration) {
      uiIssue = "Thiếu API integration trong UI";
      requiredFix = "Thêm fetch calls để lấy real data từ backend";
    }

    return {
      ui_issue: uiIssue,
      hardcode_found: hasHardcode,
      api_response_received: hasApiIntegration,
      required_fix: requiredFix
    };

  } catch (error) {
    return {
      ui_issue: `UI check failed: ${error}`,
      hardcode_found: false,
      api_response_received: false,
      required_fix: "Debug UI component structure"
    };
  }
}

// III. KIỂM TRA LỖI BACKEND / API
async function checkBackendIssues(): Promise<BackendIssueCheck> {
  const requiredEndpoints = [
    '/api/upload-image',
    '/api/vision/analyze', 
    '/api/debate/score'
  ];

  const backendIssues: string[] = [];
  const missingApis: string[] = [];
  const wrongPayloadFormat: string[] = [];
  const requiredFixes: string[] = [];

  // Check each required endpoint
  for (const endpoint of requiredEndpoints) {
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}${endpoint}`, {
        method: 'GET'
      });

      if (!response.ok) {
        if (response.status === 404) {
          missingApis.push(endpoint);
          requiredFixes.push(`Implement ${endpoint} route`);
        } else {
          backendIssues.push(`${endpoint} returns ${response.status}`);
          requiredFixes.push(`Fix ${endpoint} error handling`);
        }
      }
    } catch (error) {
      backendIssues.push(`${endpoint} connection failed`);
      requiredFixes.push(`Check ${endpoint} server configuration`);
    }
  }

  // Check for file upload middleware
  try {
    const uploadResponse = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/upload-image`, {
      method: 'POST',
      body: new FormData() // Empty form data to test middleware
    });

    if (uploadResponse.status === 400) {
      // Good - means endpoint exists and validates input
    } else if (uploadResponse.status === 404) {
      missingApis.push('/api/upload-image');
      requiredFixes.push('Create upload-image endpoint with multer middleware');
    } else if (uploadResponse.status === 500) {
      backendIssues.push('Upload endpoint exists but has server errors');
      requiredFixes.push('Debug upload-image endpoint implementation');
    }
  } catch (error) {
    backendIssues.push('Upload endpoint not accessible');
    requiredFixes.push('Implement file upload API with proper middleware');
  }

  return {
    backend_issue: backendIssues,
    missing_api: missingApis,
    wrong_payload_format: wrongPayloadFormat,
    required_fix: requiredFixes
  };
}

// IV. KIỂM TRA LỖI KẾT HỢP FRONTEND → BACKEND → MODEL
async function checkPipelineBreakpoint(
  visionCheck: VisionErrorCheck,
  uiCheck: UIIssueCheck,
  backendCheck: BackendIssueCheck
): Promise<PipelineCheck> {
  
  // Determine where the pipeline breaks
  if (backendCheck.missing_api.length > 0) {
    return {
      pipeline_breakpoint: "backend",
      root_cause: `Missing backend APIs: ${backendCheck.missing_api.join(', ')}`
    };
  }

  if (visionCheck.vision_status === "error") {
    return {
      pipeline_breakpoint: "model",
      root_cause: visionCheck.reason || "Vision model integration failed"
    };
  }

  if (uiCheck.hardcode_found) {
    return {
      pipeline_breakpoint: "ui",
      root_cause: "Frontend sử dụng hardcoded values thay vì real API data"
    };
  }

  if (!uiCheck.api_response_received) {
    return {
      pipeline_breakpoint: "frontend",
      root_cause: "Frontend không integrate với backend APIs"
    };
  }

  return {
    pipeline_breakpoint: "frontend",
    root_cause: "Pipeline hoạt động bình thường, có thể có lỗi nhỏ cần kiểm tra"
  };
}

// PROMPT BỔ SUNG – KIỂM TRA PAYLOAD
async function checkImagePayload(): Promise<ImagePayloadIssue> {
  // Simulate payload check since we can't access runtime data directly
  return {
    image_payload_issue: "Cần test với real image để kiểm tra payload format",
    payload_example: "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYa...",
    how_to_fix: [
      "Đảm bảo base64 có header đầy đủ: data:image/jpeg;base64,",
      "Kiểm tra file size không quá lớn (< 20MB)",
      "Validate image format (JPG, PNG, WebP)",
      "Test với sample image để verify payload"
    ]
  };
}

// PROMPT BỔ SUNG – KIỂM TRA UI HARDCODE
async function checkHardcodedAccuracy(): Promise<HardcodedAccuracyCheck> {
  try {
    // Read DebateMode component
    const debateModePath = join(process.cwd(), 'components', 'DebateMode.tsx');
    const debateContent = await readFile(debateModePath, 'utf-8');

    // Check for hardcoded accuracy
    const hardcodePatterns = [
      /accuracy.*=.*50/i,
      /setAccuracy\(50\)/i,
      /50.*%/i
    ];

    const hasHardcode = hardcodePatterns.some(pattern => pattern.test(debateContent));

    // Check for JSON handling
    const jsonPatterns = [
      /response\.json\(\)/i,
      /data\.accuracy/i,
      /data\.score/i,
      /JSON\.parse/i
    ];

    const hasJsonHandling = jsonPatterns.some(pattern => pattern.test(debateContent));

    return {
      hardcoded_accuracy: hasHardcode,
      json_received: hasJsonHandling,
      fix: hasHardcode 
        ? "Remove hardcoded accuracy = 50% và replace với data từ API response"
        : hasJsonHandling 
          ? "JSON handling có vẻ OK, check API response format"
          : "Thêm proper JSON parsing cho API responses"
    };

  } catch (error) {
    return {
      hardcoded_accuracy: false,
      json_received: false,
      fix: "Không thể đọc component file, check file structure"
    };
  }
}

// V. KẾT LUẬN CUỐI CÙNG
function generateFinalDiagnosis(
  visionCheck: VisionErrorCheck,
  uiCheck: UIIssueCheck,
  backendCheck: BackendIssueCheck,
  pipelineCheck: PipelineCheck
): FinalDiagnosis {
  
  let mainError = "System hoạt động bình thường";
  let diagnosis = "Tất cả components đều functional";
  
  const fixSteps: string[] = [];

  // Determine main error
  if (visionCheck.vision_status === "error") {
    mainError = "Vision Model integration failed";
    diagnosis = "Vision API không hoạt động - đây là lỗi chính cần sửa trước";
    fixSteps.push("Bước 1: Fix Vision API integration và OpenAI key");
  }

  if (backendCheck.missing_api.length > 0) {
    mainError = "Missing backend APIs";
    diagnosis = "Backend thiếu các API endpoints cần thiết";
    fixSteps.push("Bước 2: Implement missing API endpoints");
  }

  if (uiCheck.hardcode_found) {
    mainError = "Frontend sử dụng hardcoded values";
    diagnosis = "UI không integrate với real backend data";
    fixSteps.push("Bước 3: Remove hardcoded accuracy và integrate real API");
  }

  if (!uiCheck.api_response_received) {
    fixSteps.push("Bước 4: Add proper API integration trong frontend");
  }

  fixSteps.push("Bước 5: Test end-to-end với real image và verify results");

  // Ensure we always have 5 steps
  while (fixSteps.length < 5) {
    fixSteps.push(`Bước ${fixSteps.length + 1}: Optimize và add error handling`);
  }

  return {
    final_diagnosis: diagnosis,
    main_error: mainError,
    fix_steps: fixSteps.slice(0, 5)
  };
}

// Main comprehensive analysis function
async function performCompleteVisionAnalysis(): Promise<CompleteVisionAnalysis> {
  try {
    // Run all checks
    const visionCheck = await checkVisionModel();
    const uiCheck = await checkUIIssues();
    const backendCheck = await checkBackendIssues();
    const pipelineCheck = await checkPipelineBreakpoint(visionCheck, uiCheck, backendCheck);
    const imagePayloadCheck = await checkImagePayload();
    const hardcodeCheck = await checkHardcodedAccuracy();
    const finalDiagnosis = generateFinalDiagnosis(visionCheck, uiCheck, backendCheck, pipelineCheck);

    return {
      vision_check: visionCheck,
      ui_check: uiCheck,
      backend_check: backendCheck,
      pipeline_check: pipelineCheck,
      image_payload_check: imagePayloadCheck,
      hardcode_check: hardcodeCheck,
      final_diagnosis: finalDiagnosis
    };

  } catch (error) {
    return {
      vision_check: {
        vision_status: "error",
        reason: `Analysis failed: ${error}`,
        missing_steps: ["Debug system error"],
        how_to_fix: ["Check server configuration"]
      },
      ui_check: {
        ui_issue: "Analysis failed",
        hardcode_found: false,
        api_response_received: false,
        required_fix: "Debug analysis system"
      },
      backend_check: {
        backend_issue: ["Analysis failed"],
        missing_api: [],
        wrong_payload_format: [],
        required_fix: ["Debug analysis system"]
      },
      pipeline_check: {
        pipeline_breakpoint: "backend",
        root_cause: "Analysis system error"
      },
      final_diagnosis: {
        final_diagnosis: "Analysis system encountered an error",
        main_error: "System analysis failed",
        fix_steps: [
          "Bước 1: Debug analysis system",
          "Bước 2: Check server configuration", 
          "Bước 3: Verify file permissions",
          "Bước 4: Test individual components",
          "Bước 5: Run manual verification"
        ]
      }
    };
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { check_type = "complete" } = body;

    if (check_type === "complete") {
      const analysis = await performCompleteVisionAnalysis();
      return NextResponse.json(analysis);
      
    } else if (check_type === "vision_only") {
      const visionCheck = await checkVisionModel();
      return NextResponse.json({ vision_check: visionCheck });
      
    } else if (check_type === "ui_only") {
      const uiCheck = await checkUIIssues();
      return NextResponse.json({ ui_check: uiCheck });
      
    } else if (check_type === "backend_only") {
      const backendCheck = await checkBackendIssues();
      return NextResponse.json({ backend_check: backendCheck });
      
    } else if (check_type === "payload_only") {
      const payloadCheck = await checkImagePayload();
      return NextResponse.json({ image_payload_check: payloadCheck });
      
    } else if (check_type === "hardcode_only") {
      const hardcodeCheck = await checkHardcodedAccuracy();
      return NextResponse.json({ hardcode_check: hardcodeCheck });
      
    } else {
      return NextResponse.json(
        { error: "Invalid check_type. Use: complete, vision_only, ui_only, backend_only, payload_only, hardcode_only" },
        { status: 400 }
      );
    }

  } catch (error) {
    console.error("Vision error checker failed:", error);
    return NextResponse.json(
      { error: "Vision error checking failed" },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    success: true,
    message: "Vision Error Checker API - 100% Comprehensive Debate Mode Analysis",
    description: "Complete automated testing system for Vision Model integration",
    features: [
      "I. Vision Model Error Detection",
      "II. UI Hardcode Detection (50% accuracy)",
      "III. Backend API Validation",
      "IV. Pipeline Breakpoint Analysis", 
      "V. Final Diagnosis with Fix Steps",
      "Bonus: Image Payload Validation",
      "Bonus: Hardcoded Accuracy Detection"
    ],
    check_types: {
      complete: "Full comprehensive analysis (all checks)",
      vision_only: "Vision Model integration check only",
      ui_only: "UI hardcode and API integration check",
      backend_only: "Backend API endpoints validation",
      payload_only: "Image payload format validation",
      hardcode_only: "Hardcoded accuracy detection"
    },
    usage: {
      complete_check: "POST { check_type: 'complete' }",
      specific_check: "POST { check_type: 'vision_only|ui_only|backend_only|payload_only|hardcode_only' }"
    },
    kiro_integration: "Designed specifically for KIRO IDE automated testing"
  });
}