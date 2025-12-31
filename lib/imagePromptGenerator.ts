// lib/imagePromptGenerator.ts
import { OpenAI } from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export interface ImagePromptResult {
  prompt: string;
  searchTerms: string[];
  visualConcept: string;
  style: string;
}

export async function generateImagePrompt(
  word: string,
  meaning: string,
  type: string,
  example: string
): Promise<ImagePromptResult> {
  try {
    const prompt = `
Bạn là chuyên gia tạo prompt hình ảnh cho từ vựng tiếng Việt. Hãy tạo prompt hình ảnh chính xác 100% cho từ vựng sau:

TỪ VỰNG: "${word}"
NGHĨA: "${meaning}"
LOẠI TỪ: "${type}"
VÍ DỤ: "${example}"

YÊU CẦU:
1. Tạo prompt hình ảnh cụ thể, rõ ràng, không mơ hồ
2. Hình ảnh phải thể hiện chính xác nghĩa của từ
3. Phong cách: realistic, educational, clean background
4. Không có text/chữ trong hình
5. Phù hợp cho việc học từ vựng

NGUYÊN TẮC:
- Danh từ → Vật thể/đối tượng cụ thể
- Động từ → Hành động/chuyển động rõ ràng  
- Tính từ → Cảnh/tình huống thể hiện tính chất
- Trạng từ → Cách thức/phương thức thực hiện

ĐỊNH DẠNG OUTPUT (JSON):
{
  "prompt": "detailed image prompt for DALL-E",
  "searchTerms": ["term1", "term2", "term3"],
  "visualConcept": "mô tả ngắn gọn khái niệm hình ảnh",
  "style": "realistic/illustration/photo"
}

Hãy trả về JSON hợp lệ:`;

    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: "Bạn là chuyên gia tạo prompt hình ảnh. Luôn trả về JSON hợp lệ."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      temperature: 0.3,
      max_tokens: 500,
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error('No response from OpenAI');
    }

    // Parse JSON response
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('No JSON found in response');
    }

    const result = JSON.parse(jsonMatch[0]);
    return result;

  } catch (error) {
    console.error('Error generating image prompt:', error);
    
    // Fallback prompt generation
    return generateFallbackPrompt(word, meaning, type);
  }
}

function generateFallbackPrompt(word: string, meaning: string, type: string): ImagePromptResult {
  let prompt = "";
  let visualConcept = "";
  let searchTerms = [word, meaning];

  switch (type.toLowerCase()) {
    case 'danh từ':
      prompt = `A clear, realistic photo of ${meaning}, professional photography, clean white background, high quality, educational style`;
      visualConcept = `Hình ảnh rõ nét của ${word}`;
      searchTerms.push('object', 'thing', 'noun');
      break;
      
    case 'động từ':
      prompt = `A person performing the action of ${meaning}, clear action pose, realistic style, clean background, educational illustration`;
      visualConcept = `Hành động ${word}`;
      searchTerms.push('action', 'verb', 'activity');
      break;
      
    case 'tính từ':
      prompt = `A scene that clearly shows the quality of being ${meaning}, realistic photography, clear visual representation, educational style`;
      visualConcept = `Tính chất ${word}`;
      searchTerms.push('quality', 'adjective', 'characteristic');
      break;
      
    default:
      prompt = `An educational illustration representing ${meaning}, clear and simple, realistic style, clean background`;
      visualConcept = `Khái niệm ${word}`;
      searchTerms.push('concept', 'idea');
  }

  return {
    prompt,
    searchTerms,
    visualConcept,
    style: 'realistic'
  };
}

// Vietnamese to English concept mapping for better image search
export const conceptMapping: { [key: string]: string[] } = {
  // Technology
  'lập trình': ['programming', 'coding', 'developer', 'computer code'],
  'máy tính': ['computer', 'laptop', 'desktop', 'PC'],
  'phần mềm': ['software', 'application', 'program', 'app'],
  'internet': ['internet', 'web', 'online', 'network'],
  'website': ['website', 'webpage', 'web page', 'site'],
  
  // Education
  'học tập': ['studying', 'learning', 'education', 'student'],
  'giáo dục': ['education', 'teaching', 'school', 'classroom'],
  'kiến thức': ['knowledge', 'information', 'learning', 'wisdom'],
  
  // Business
  'kinh doanh': ['business', 'commerce', 'trade', 'company'],
  'công ty': ['company', 'corporation', 'business', 'office'],
  'quản lý': ['management', 'manager', 'administration', 'leadership'],
  
  // Daily life
  'gia đình': ['family', 'parents', 'children', 'home'],
  'bạn bè': ['friends', 'friendship', 'social', 'people'],
  'yêu thương': ['love', 'affection', 'care', 'heart'],
  
  // Actions
  'chạy': ['running', 'run', 'jogging', 'sprint'],
  'đi': ['walking', 'going', 'travel', 'move'],
  'nói': ['speaking', 'talking', 'conversation', 'communication'],
  'viết': ['writing', 'write', 'pen', 'paper'],
  
  // Qualities
  'đẹp': ['beautiful', 'beauty', 'attractive', 'pretty'],
  'tốt': ['good', 'excellent', 'positive', 'quality'],
  'nhanh': ['fast', 'quick', 'speed', 'rapid'],
  'chậm': ['slow', 'gradual', 'steady', 'calm'],
};

export function getSearchTermsForWord(word: string, meaning: string): string[] {
  const mapped = conceptMapping[word.toLowerCase()];
  if (mapped) {
    return [...mapped, meaning, word];
  }
  
  return [meaning, word, word.replace(/\s+/g, '-')];
}