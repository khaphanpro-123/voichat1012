import { connectDB } from "@/lib/db";
import UserApiKeys from "@/app/models/UserApiKeys";

interface ApiKeys {
  openaiKey: string | null;
  groqKey: string | null;
  cohereKey: string | null;
  geminiKey?: string | null;
}

// In-memory cache for API keys (TTL: 5 minutes)
const keyCache = new Map<string, { keys: ApiKeys; timestamp: number }>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

// Server-side keys (loaded once)
let serverKeys: ApiKeys | null = null;

function getServerKeys(): ApiKeys {
  if (!serverKeys) {
    serverKeys = {
      openaiKey: process.env.OPENAI_API_KEY || null,
      groqKey: process.env.GROQ_API_KEY || null,
      cohereKey: process.env.COHERE_API_KEY || null,
      geminiKey: process.env.GEMINI_API_KEY || null,
    };
  }
  return serverKeys;
}

/**
 * Lấy API key của user với caching
 * Ưu tiên: Groq (nhanh nhất, miễn phí) > OpenAI > Cohere
 */
export async function getUserApiKeys(userId: string = "anonymous"): Promise<ApiKeys> {
  // Fast path: return server keys for anonymous users
  if (!userId || userId === "anonymous") {
    return getServerKeys();
  }

  // Check cache first
  const cached = keyCache.get(userId);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.keys;
  }

  try {
    await connectDB();
    const userKeys = await UserApiKeys.findOne({ userId }).lean() as any;

    const keys: ApiKeys = {
      openaiKey: userKeys?.openaiKey || getServerKeys().openaiKey,
      groqKey: userKeys?.groqKey || getServerKeys().groqKey,
      cohereKey: userKeys?.cohereKey || getServerKeys().cohereKey,
      geminiKey: userKeys?.geminiKey || getServerKeys().geminiKey,
    };

    // Cache the result
    keyCache.set(userId, { keys, timestamp: Date.now() });

    return keys;
  } catch (error) {
    console.error("Get user API keys error:", error);
    return getServerKeys();
  }
}

/**
 * Invalidate cache for a user (call when user updates their keys)
 */
export function invalidateKeyCache(userId: string): void {
  keyCache.delete(userId);
}

/**
 * Kiểm tra user có API key riêng không
 */
export async function hasUserApiKey(
  userId: string,
  keyType: "openai" | "groq" | "cohere" | "gemini"
): Promise<boolean> {
  const keys = await getUserApiKeys(userId);
  if (keyType === "openai") return !!keys.openaiKey;
  if (keyType === "groq") return !!keys.groqKey;
  if (keyType === "cohere") return !!keys.cohereKey;
  if (keyType === "gemini") return !!keys.geminiKey;
  return false;
}
