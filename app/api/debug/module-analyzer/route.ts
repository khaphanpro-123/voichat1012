import { NextRequest, NextResponse } from "next/server";
import { getOpenAI } from '@/lib/openai';



// Module-specific debug analysis
interface ModuleAnalysisResult {
  module_name: string;
  issues_found: string[];
  likely_root_cause: string;
  steps_to_fix: string[];
  sample_correct_code?: string;
  test_cases?: string[];
}

// (A) Debug Vision Model – vì sao không phân tích được ảnh?
const VISION_DEBUG_PROMPT = `
Kiểm tra module Vision Model.

Hãy đánh giá:
- Payload gửi lên đã đúng kiểu "image_url" chưa?
- Ảnh có bị thiếu prefix dataURL (data:image/png;base64,...)?
- Kích thước base64 có đạt tối thiểu 1KB?
- Backend có log đúng req.file?
- Model dùng có hỗ trợ phân tích ảnh hay không?

Hãy trả lời dưới dạng:
{
 "vision_issue": [...],
 "likely_root_cause": "...",
 "steps_to_fix": [...]
}
`;

// (B) Debug Audio – so khớp phát âm
const AUDIO_DEBUG_PROMPT = `
Kiểm tra module Audio:

- File audio có được nhận?
- Speech-to-Text có bị lỗi?
- Có dùng mockdata thay STT thật không?
- Đã chuẩn hóa sampling rate chưa?
- Đã so khớp embedding giữa audio mẫu và audio người dùng chưa?

Trả về JSON phân tích lỗi.
`;

// (C) Debug Compare Model – chấm điểm mô tả ảnh
const COMPARE_DEBUG_PROMPT = `
Kiểm tra logic so sánh:

- Prompt grading có đúng không?
- Có đưa mô tả thật từ Vision vào chưa?
- Câu trả lời người dùng có được gửi đầy đủ không?
- Mô hình có bị trả về text thường thay vì JSON không?

Hãy sửa prompt grading để model trả JSON sạch 100%.
`;

// (D) Debug Backend API
const BACKEND_DEBUG_PROMPT = `
Kiểm tra API backend:

- Route upload-image có handler không?
- Có multer/formidable để nhận file chưa?
- Có chuyển buffer sang base64?
- Có gọi đúng endpoint model vision?
- Có log lỗi đúng chỗ?

Cuối cùng hãy show những API cần có trong backend.
`;

// (E) Debug Frontend
const FRONTEND_DEBUG_PROMPT = `
Kiểm tra UI:

- Nút Upload đã gọi đúng API chưa?
- Chưa hiển thị kết quả khi Vision trả về?
- Đang hardcode 50% accuracy? (Có)
- Cần thay bằng kết quả JSON từ model thật.

Hãy liệt kê chính xác dòng cần sửa.
`;

// Analyze specific module
async function analyzeModule(
  moduleName: string, 
  moduleData: any
): Promise<ModuleAnalysisResult> {
  try {
    let debugPrompt = "";
    
    switch (moduleName) {
      case 'vision':
        debugPrompt = VISION_DEBUG_PROMPT;
        break;
      case 'audio':
        debugPrompt = AUDIO_DEBUG_PROMPT;
        break;
      case 'compare':
        debugPrompt = COMPARE_DEBUG_PROMPT;
        break;
      case 'backend':
        debugPrompt = BACKEND_DEBUG_PROMPT;
        break;
      case 'frontend':
        debugPrompt = FRONTEND_DEBUG_PROMPT;
        break;
      default:
        throw new Error(`Unknown module: ${moduleName}`);
    }

    const analysisPrompt = `
${debugPrompt}

MODULE DATA TO ANALYZE:
${JSON.stringify(moduleData, null, 2)}

Trả về JSON theo format:
{
  "module_name": "${moduleName}",
  "issues_found": ["issue 1", "issue 2"],
  "likely_root_cause": "root cause explanation",
  "steps_to_fix": ["step 1", "step 2"],
  "sample_correct_code": "code example if needed",
  "test_cases": ["test case 1", "test case 2"]
}

QUAN TRỌNG: Chỉ trả về JSON, không kèm text khác.
`;

    const response = await getOpenAI().chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "user",
          content: analysisPrompt
        }
      ],
      temperature: 0.1,
      max_tokens: 1000,
    });

    const content = response.choices[0]?.message?.content;
    if (content) {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        try {
          return JSON.parse(jsonMatch[0]);
        } catch (parseError) {
          console.error('Module analysis JSON parse error:', parseError);
        }
      }
    }

    // Fallback analysis based on module
    return generateFallbackModuleAnalysis(moduleName, moduleData);

  } catch (error) {
    console.error('Module analysis error:', error);
    return generateFallbackModuleAnalysis(moduleName, moduleData);
  }
}

// Generate fallback analysis for specific modules
function generateFallbackModuleAnalysis(moduleName: string, moduleData: any): ModuleAnalysisResult {
  const moduleAnalyses = {
    vision: {
      module_name: "vision",
      issues_found: [
        "Payload không đúng format image_url",
        "Base64 thiếu header data:image/",
        "Không gọi đúng OpenAI Vision API",
        "Response không được parse đúng"
      ],
      likely_root_cause: "Vision API không được integrate đúng cách với OpenAI GPT-4 Vision",
      steps_to_fix: [
        "Sửa payload format: { type: 'image_url', image_url: { url: 'data:image/jpeg;base64,...' } }",
        "Đảm bảo base64 có header đầy đủ",
        "Sử dụng model gpt-4o-mini với vision capability",
        "Thêm error handling cho Vision response"
      ],
      sample_correct_code: `
const response = await getOpenAI().chat.completions.create({
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
        text: "Mô tả chi tiết nội dung ảnh này"
      }
    ]
  }]
});`,
      test_cases: [
        "Test với ảnh nhỏ (< 1MB)",
        "Test với format JPG và PNG",
        "Test response parsing",
        "Test error handling"
      ]
    },
    
    audio: {
      module_name: "audio",
      issues_found: [
        "Không có Speech-to-Text thật",
        "Dùng mockdata thay vì Whisper API",
        "Không chuẩn hóa audio format",
        "Thiếu audio embedding comparison"
      ],
      likely_root_cause: "Audio processing chưa được implement với model thật",
      steps_to_fix: [
        "Integrate OpenAI Whisper API",
        "Thêm audio format validation",
        "Implement audio embedding comparison",
        "Remove mockdata và dùng real STT"
      ],
      sample_correct_code: `
const transcription = await getOpenAI().audio.transcriptions.create({
  file: audioFile,
  model: 'whisper-1',
  language: 'vi'
});`,
      test_cases: [
        "Test Whisper với audio tiếng Việt",
        "Test audio format conversion",
        "Test embedding similarity",
        "Test error handling cho audio lỗi"
      ]
    },

    compare: {
      module_name: "compare",
      issues_found: [
        "Prompt grading không chuẩn",
        "Không đưa vision description vào comparison",
        "Model trả text thay vì JSON",
        "Hardcode accuracy thay vì tính thật"
      ],
      likely_root_cause: "Logic comparison không sử dụng real AI model để so sánh",
      steps_to_fix: [
        "Sửa prompt để model trả JSON sạch",
        "Đưa vision description vào prompt",
        "Remove hardcoded values",
        "Thêm JSON validation"
      ],
      sample_correct_code: `
const prompt = \`
Mô tả thật từ Vision: \${visionDescription}
Câu trả lời user: \${userResponse}
Trả về JSON: {"accuracy": 0-100, "is_correct": true/false, "explanation": "..."}
\`;`,
      test_cases: [
        "Test với câu trả lời đúng 100%",
        "Test với câu trả lời sai hoàn toàn",
        "Test JSON parsing",
        "Test edge cases"
      ]
    },

    backend: {
      module_name: "backend",
      issues_found: [
        "Thiếu route /api/upload-image",
        "Không có multer để handle file upload",
        "Thiếu conversion buffer to base64",
        "Không có proper error logging"
      ],
      likely_root_cause: "Backend API chưa được implement đầy đủ cho image processing",
      steps_to_fix: [
        "Thêm multer middleware",
        "Tạo route upload-image",
        "Implement file to base64 conversion",
        "Thêm comprehensive error handling"
      ],
      sample_correct_code: `
import multer from 'multer';
const upload = multer({ storage: multer.memoryStorage() });

app.post('/api/upload-image', upload.single('image'), async (req, res) => {
  const base64 = req.file.buffer.toString('base64');
  // Process with Vision API
});`,
      test_cases: [
        "Test file upload với different formats",
        "Test base64 conversion",
        "Test error handling",
        "Test API response format"
      ]
    },

    frontend: {
      module_name: "frontend",
      issues_found: [
        "Upload button không gọi đúng API",
        "Hardcode accuracy = 50%",
        "Không hiển thị vision results",
        "Thiếu error handling UI"
      ],
      likely_root_cause: "Frontend không integrate với backend APIs và dùng hardcoded values",
      steps_to_fix: [
        "Connect upload button với /api/upload-image",
        "Replace hardcoded accuracy với real API response",
        "Thêm UI để hiển thị vision description",
        "Implement proper error states"
      ],
      sample_correct_code: `
const handleImageUpload = async (file) => {
  const formData = new FormData();
  formData.append('image', file);
  
  const response = await fetch('/api/upload-image', {
    method: 'POST',
    body: formData
  });
  
  const result = await response.json();
  setAccuracy(result.accuracy); // Remove hardcoded 50%
};`,
      test_cases: [
        "Test image upload flow",
        "Test API integration",
        "Test error handling",
        "Test UI state management"
      ]
    }
  };

  return moduleAnalyses[moduleName as keyof typeof moduleAnalyses] || {
    module_name: moduleName,
    issues_found: ["Unknown module"],
    likely_root_cause: "Module not recognized",
    steps_to_fix: ["Define module analysis"],
    test_cases: ["Add test cases"]
  };
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { module_name, module_data } = body;

    if (!module_name) {
      return NextResponse.json(
        { 
          success: false, 
          message: "module_name required. Use: vision, audio, compare, backend, frontend" 
        },
        { status: 400 }
      );
    }

    const analysis = await analyzeModule(module_name, module_data || {});
    
    return NextResponse.json({
      success: true,
      module_name,
      analysis
    });

  } catch (error) {
    console.error("Module analyzer error:", error);
    return NextResponse.json(
      { 
        success: false, 
        message: "Module analysis failed" 
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    success: true,
    message: "Module Analyzer API - Individual Component Debug System",
    description: "Debug specific modules of the AI Teacher platform",
    available_modules: {
      vision: "Debug Vision Model - image analysis issues",
      audio: "Debug Audio - speech-to-text and audio matching",
      compare: "Debug Compare Model - response scoring logic",
      backend: "Debug Backend API - server-side issues",
      frontend: "Debug Frontend - UI and integration issues"
    },
    usage: {
      analyze_module: "POST { module_name: 'vision|audio|compare|backend|frontend', module_data: {...} }"
    },
    debug_focus: {
      vision: "Payload format, base64 encoding, OpenAI Vision API integration",
      audio: "Speech-to-Text, audio processing, embedding comparison",
      compare: "Prompt engineering, JSON output, accuracy calculation",
      backend: "File upload, API routes, error handling, logging",
      frontend: "API integration, UI state, hardcoded values, error display"
    }
  });
}
