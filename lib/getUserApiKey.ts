import { connectDB } from "@/lib/db";
import UserApiKeys from "@/app/models/UserApiKeys";

interface ApiKeys {
  openaiKey: string | null;
  groqKey: string | null;
  cohereKey: string | null;
}

/**
 * Lấy API key của user, fallback về server key nếu user chưa setup
 * Ưu tiên: Groq (nhanh nhất, miễn phí) > OpenAI > Cohere
 */
export async function getUserApiKeys(userId: string = 'anonymous'): Promise<ApiKeys> {
  console.log('=== getUserApiKeys ===');
  console.log('Looking up keys for userId:', userId);
  
  try {
    await connectDB();
    const userKeys = await UserApiKeys.findOne({ userId });

    // Chỉ dùng user key nếu nó có giá trị thực (không phải empty string)
    const userOpenaiKey = userKeys?.openaiKey && userKeys.openaiKey.length > 0 ? userKeys.openaiKey : null;
    const userGroqKey = userKeys?.groqKey && userKeys.groqKey.length > 0 ? userKeys.groqKey : null;
    const userCohereKey = userKeys?.cohereKey && userKeys.cohereKey.length > 0 ? userKeys.cohereKey : null;

    return {
      openaiKey: userOpenaiKey || process.env.OPENAI_API_KEY || null,
      groqKey: userGroqKey || process.env.GROQ_API_KEY || null,
      cohereKey: userCohereKey || process.env.COHERE_API_KEY || null,
    };
  } catch (error) {
    console.error('Get user API keys error:', error);
    return {
      openaiKey: process.env.OPENAI_API_KEY || null,
      groqKey: process.env.GROQ_API_KEY || null,
      cohereKey: process.env.COHERE_API_KEY || null,
    };
  }
}

/**
 * Kiểm tra user có API key riêng không
 */
export async function hasUserApiKey(userId: string, keyType: 'openai' | 'groq' | 'cohere'): Promise<boolean> {
  try {
    await connectDB();
    const userKeys = await UserApiKeys.findOne({ userId });
    
    if (keyType === 'openai') return !!userKeys?.openaiKey;
    if (keyType === 'groq') return !!userKeys?.groqKey;
    if (keyType === 'cohere') return !!userKeys?.cohereKey;
    return false;
  } catch {
    return false;
  }
}
