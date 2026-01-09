// lib/contextAnalyzer.ts
// Bước 1: Phân tích ngữ cảnh văn bản

import { OpenAI } from 'openai';

let openaiClient: OpenAI | null = null;

function getOpenAI(): OpenAI {
  if (!openaiClient) {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) throw new Error('Missing OPENAI_API_KEY');
    openaiClient = new OpenAI({ apiKey });
  }
  return openaiClient;
}

export interface ContextAnalysis {
  summary: string;
  domains: string[];
  themes: string[];
  sectionsLabeling: Array<{
    section: string;
    label: 'theory' | 'method' | 'tool' | 'application' | 'limitation';
    reason: string;
  }>;
  keyTheories: Array<{
    term: string;
    definition: string;
  }>;
  highDensitySegments: string[];
  excludePatterns: string[];
}

export async function analyzeDocumentContext(text: string): Promise<ContextAnalysis> {
  const prompt = `Nhiệm vụ: Phân tích ngữ cảnh học thuật của văn bản sau để phục vụ trích lọc từ vựng có ý nghĩa.

Yêu cầu:
1) Tóm tắt 5–8 câu, nêu rõ mục tiêu, phạm vi, đối tượng, kết luận chính.
2) Liệt kê các chủ đề (themes) ở mức khái quát, tối đa 8 themes.
3) Gắn nhãn các phân đoạn nội dung: lý thuyết nền tảng, phương pháp, công cụ, kết quả/ứng dụng, hạn chế/khuyến nghị.
4) Trích các thuật ngữ/học thuyết chính, kèm 1 dòng định nghĩa ngắn theo ngữ cảnh văn bản.
5) Xác định ngành/lĩnh vực và các tiểu miền.
6) Chỉ ra các phần có mật độ thông tin cao (đoạn nền tảng lý thuyết, mô hình, quy trình).
7) Nêu danh sách các thực thể/cụm không nên lấy vào từ vựng học tập (metadata, mã định danh, phiên bản).

Định dạng đầu ra (JSON):
{
  "summary": "tóm tắt văn bản...",
  "domains": ["lĩnh vực 1", "lĩnh vực 2"],
  "themes": ["chủ đề 1", "chủ đề 2"],
  "sectionsLabeling": [
    {"section": "tên phần", "label": "theory|method|tool|application|limitation", "reason": "lý do"}
  ],
  "keyTheories": [
    {"term": "thuật ngữ", "definition": "định nghĩa ngắn"}
  ],
  "highDensitySegments": ["mô tả đoạn có mật độ cao 1", "đoạn 2"],
  "excludePatterns": ["xmp", "rdf", "adobe", "metadata", "id", "version", "pdf producer", "namespace", "uuid"]
}

Văn bản cần phân tích:
${text.slice(0, 8000)}

Trả về JSON hợp lệ:`;

  try {
    const response = await getOpenAI().chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: "Bạn là chuyên gia phân tích văn bản học thuật. Luôn trả về JSON hợp lệ." },
        { role: "user", content: prompt }
      ],
      temperature: 0.3,
      max_tokens: 2000,
    });

    const content = response.choices[0]?.message?.content || '';
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('No JSON in response');
    
    return JSON.parse(jsonMatch[0]);
  } catch (error) {
    console.error('Context analysis error:', error);
    // Fallback
    return {
      summary: "Văn bản chứa nội dung học thuật cần được phân tích.",
      domains: ["general"],
      themes: ["education", "learning"],
      sectionsLabeling: [],
      keyTheories: [],
      highDensitySegments: ["Toàn bộ văn bản"],
      excludePatterns: ["xmp", "rdf", "adobe", "metadata", "id", "version", "uuid", "xmlns", "producer"]
    };
  }
}

// Regex patterns để lọc nhiễu metadata/kỹ thuật
export const EXCLUDE_REGEX_PATTERNS = [
  /^[a-z]{2,}:/i,                    // namespace prefixes like "xmp:", "rdf:"
  /^[a-f0-9-]{8,}$/i,                // UUIDs
  /^[0-9]+\.[0-9]+\.[0-9]+/,         // version numbers
  /(xmp|rdf|xmlns|namespace|producer|adobe|version|uid|pdf|itext|springer|crossmark)/i,
  /^https?:\/\//,                     // URLs
  /^[A-Z]{2,}\d+/,                   // codes like "ISBN123"
  /^\d{4}-\d{2}-\d{2}/,              // dates
];

export function shouldExcludeTerm(term: string, excludePatterns: string[]): boolean {
  // Check against regex patterns
  for (const regex of EXCLUDE_REGEX_PATTERNS) {
    if (regex.test(term)) return true;
  }
  
  // Check against custom exclude patterns
  const lowerTerm = term.toLowerCase();
  for (const pattern of excludePatterns) {
    if (lowerTerm.includes(pattern.toLowerCase())) return true;
  }
  
  // Exclude very short terms or pure numbers
  if (term.length < 2 || /^\d+$/.test(term)) return true;
  
  return false;
}
