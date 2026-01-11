/**
 * AI Provider - Unified interface for OpenAI, Groq, and Cohere with automatic fallback
 * Groq is prioritized first (fastest, free)
 * If one provider fails, automatically tries the next
 */

// OpenAI models (priority order)
const OPENAI_MODELS = [
  "gpt-4o-mini",
  "gpt-4o",
  "gpt-3.5-turbo",
];

// Groq models (FREE and FASTEST!)
const GROQ_MODELS = [
  "llama-3.3-70b-versatile",
  "llama-3.1-8b-instant",
  "mixtral-8x7b-32768",
];

// Cohere models (FREE tier available) - Updated model names
const COHERE_MODELS = [
  "command-r-plus-08-2024",
  "command-r-08-2024", 
  "command-light",
];

interface AIConfig {
  temperature?: number;
  maxTokens?: number;
  preferProvider?: "openai" | "groq" | "cohere" | "auto";
}

interface AIResponse {
  success: boolean;
  content: string;
  provider: "openai" | "groq" | "cohere";
  model: string;
  error?: string;
}

interface AIKeys {
  openaiKey?: string | null;
  groqKey?: string | null;
  cohereKey?: string | null;
}

/**
 * Call OpenAI API
 */
async function callOpenAI(
  prompt: string,
  apiKey: string,
  model: string,
  config: AIConfig
): Promise<AIResponse> {
  const { temperature = 0.7, maxTokens = 1024 } = config;

  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: [{ role: "user", content: prompt }],
        temperature,
        max_tokens: maxTokens,
      }),
    });

    if (response.status === 429) {
      return { success: false, content: "", provider: "openai", model, error: "QUOTA_EXCEEDED" };
    }
    if (response.status === 401 || response.status === 403) {
      return { success: false, content: "", provider: "openai", model, error: "INVALID_KEY" };
    }
    if (!response.ok) {
      return { success: false, content: "", provider: "openai", model, error: `HTTP_${response.status}` };
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || "";
    
    if (!content) {
      return { success: false, content: "", provider: "openai", model, error: "EMPTY_RESPONSE" };
    }

    return { success: true, content, provider: "openai", model };
  } catch (err) {
    return { success: false, content: "", provider: "openai", model, error: String(err) };
  }
}

/**
 * Call Groq API (FREE tier - fast inference)
 * https://console.groq.com/keys
 */
async function callGroq(
  prompt: string,
  apiKey: string,
  model: string,
  config: AIConfig
): Promise<AIResponse> {
  const { temperature = 0.7, maxTokens = 1024 } = config;

  try {
    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: [{ role: "user", content: prompt }],
        temperature,
        max_tokens: maxTokens,
      }),
    });

    if (response.status === 429) {
      return { success: false, content: "", provider: "groq", model, error: "QUOTA_EXCEEDED" };
    }
    if (response.status === 401 || response.status === 403) {
      return { success: false, content: "", provider: "groq", model, error: "INVALID_KEY" };
    }
    if (!response.ok) {
      return { success: false, content: "", provider: "groq", model, error: `HTTP_${response.status}` };
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || "";
    
    if (!content) {
      return { success: false, content: "", provider: "groq", model, error: "EMPTY_RESPONSE" };
    }

    return { success: true, content, provider: "groq", model };
  } catch (err) {
    return { success: false, content: "", provider: "groq", model, error: String(err) };
  }
}

/**
 * Call Cohere API (FREE tier available)
 * https://dashboard.cohere.com/api-keys
 * Using v2 API endpoint
 */
async function callCohere(
  prompt: string,
  apiKey: string,
  model: string,
  config: AIConfig
): Promise<AIResponse> {
  const { temperature = 0.7, maxTokens = 1024 } = config;

  try {
    // Try v2 API first (newer)
    const response = await fetch("https://api.cohere.com/v2/chat", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: [{ role: "user", content: prompt }],
        temperature,
        max_tokens: maxTokens,
      }),
    });

    if (response.status === 429) {
      return { success: false, content: "", provider: "cohere", model, error: "QUOTA_EXCEEDED" };
    }
    if (response.status === 401 || response.status === 403) {
      return { success: false, content: "", provider: "cohere", model, error: "INVALID_KEY" };
    }
    if (!response.ok) {
      // Try v1 API as fallback
      const v1Response = await fetch("https://api.cohere.ai/v1/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: model.replace("-08-2024", "").replace("-light", ""), // Try base model name
          message: prompt,
          temperature,
          max_tokens: maxTokens,
        }),
      });
      
      if (v1Response.ok) {
        const v1Data = await v1Response.json();
        const content = v1Data.text || "";
        if (content) {
          return { success: true, content, provider: "cohere", model };
        }
      }
      return { success: false, content: "", provider: "cohere", model, error: `HTTP_${response.status}` };
    }

    const data = await response.json();
    // v2 API returns content in message.content array
    const content = data.message?.content?.[0]?.text || data.text || "";
    
    if (!content) {
      return { success: false, content: "", provider: "cohere", model, error: "EMPTY_RESPONSE" };
    }

    return { success: true, content, provider: "cohere", model };
  } catch (err) {
    return { success: false, content: "", provider: "cohere", model, error: String(err) };
  }
}

/**
 * Main function: Call AI with automatic fallback between providers
 * Tries Groq first (fastest), then OpenAI, then Cohere
 */
export async function callAI(
  prompt: string,
  keys: AIKeys,
  config: AIConfig = {}
): Promise<AIResponse> {
  const { preferProvider = "auto" } = config;
  const { openaiKey, groqKey, cohereKey } = keys;

  // Determine order based on preference - Groq first by default (fastest)
  type ProviderType = "openai" | "groq" | "cohere";
  let providers: Array<{ type: ProviderType; key: string | null | undefined; models: string[] }> = [];
  
  if (preferProvider === "auto") {
    // Auto mode: Groq first (fastest), then OpenAI, then Cohere
    providers.push({ type: "groq", key: groqKey, models: GROQ_MODELS });
    providers.push({ type: "openai", key: openaiKey, models: OPENAI_MODELS });
    providers.push({ type: "cohere", key: cohereKey, models: COHERE_MODELS });
  } else if (preferProvider === "openai") {
    providers.push({ type: "openai", key: openaiKey, models: OPENAI_MODELS });
    providers.push({ type: "groq", key: groqKey, models: GROQ_MODELS });
    providers.push({ type: "cohere", key: cohereKey, models: COHERE_MODELS });
  } else if (preferProvider === "groq") {
    providers.push({ type: "groq", key: groqKey, models: GROQ_MODELS });
    providers.push({ type: "openai", key: openaiKey, models: OPENAI_MODELS });
    providers.push({ type: "cohere", key: cohereKey, models: COHERE_MODELS });
  } else if (preferProvider === "cohere") {
    providers.push({ type: "cohere", key: cohereKey, models: COHERE_MODELS });
    providers.push({ type: "openai", key: openaiKey, models: OPENAI_MODELS });
    providers.push({ type: "groq", key: groqKey, models: GROQ_MODELS });
  }

  let lastError = "No API keys available";

  for (const provider of providers) {
    if (!provider.key) continue;

    for (const model of provider.models) {
      console.log(`[AI] Trying ${provider.type}/${model}...`);
      
      let result: AIResponse;
      if (provider.type === "openai") {
        result = await callOpenAI(prompt, provider.key, model, config);
      } else if (provider.type === "groq") {
        result = await callGroq(prompt, provider.key, model, config);
      } else {
        result = await callCohere(prompt, provider.key, model, config);
      }

      if (result.success) {
        console.log(`[AI] Success with ${provider.type}/${model}`);
        return result;
      }

      lastError = `${provider.type}/${model}: ${result.error}`;
      console.log(`[AI] Failed: ${lastError}`);

      // If invalid key, skip all models of this provider
      if (result.error === "INVALID_KEY") {
        break;
      }
    }
  }

  return {
    success: false,
    content: "",
    provider: "groq",
    model: "none",
    error: `Tất cả API đều không khả dụng. ${lastError}`,
  };
}

/**
 * Parse JSON from AI response (handles markdown code blocks)
 */
export function parseJsonFromAI(content: string): any {
  if (!content) {
    console.error("[parseJsonFromAI] Empty content");
    return null;
  }
  
  // Remove markdown code blocks
  let cleaned = content.replace(/```json\s*/gi, "").replace(/```\s*/g, "");
  
  // Remove any leading/trailing whitespace
  cleaned = cleaned.trim();
  
  // Try to extract JSON object first (most common case)
  const objectMatch = cleaned.match(/\{[\s\S]*\}/);
  if (objectMatch) {
    try {
      const parsed = JSON.parse(objectMatch[0]);
      return parsed;
    } catch (e) {
      console.error("[parseJsonFromAI] Failed to parse object:", (e as Error).message);
      // Try to fix common JSON issues
      try {
        // Replace single quotes with double quotes
        const fixed = objectMatch[0]
          .replace(/'/g, '"')
          .replace(/,\s*}/g, '}')  // Remove trailing commas
          .replace(/,\s*]/g, ']'); // Remove trailing commas in arrays
        return JSON.parse(fixed);
      } catch {}
    }
  }

  // Try to extract JSON array
  const arrayMatch = cleaned.match(/\[[\s\S]*\]/);
  if (arrayMatch) {
    try {
      return JSON.parse(arrayMatch[0]);
    } catch (e) {
      console.error("[parseJsonFromAI] Failed to parse array:", (e as Error).message);
    }
  }

  // Try parsing the whole content
  try {
    return JSON.parse(cleaned);
  } catch (e) {
    console.error("[parseJsonFromAI] Failed to parse whole content:", (e as Error).message);
    console.error("[parseJsonFromAI] Content preview:", cleaned.substring(0, 200));
  }

  return null;
}

/**
 * Quick helper to get keys and call AI
 */
export async function callAIWithUserKeys(
  prompt: string,
  userId: string,
  config: AIConfig = {}
): Promise<AIResponse> {
  // Import dynamically to avoid circular dependency
  const { getUserApiKeys } = await import("@/lib/getUserApiKey");
  const keys = await getUserApiKeys(userId);
  return callAI(prompt, keys, config);
}
