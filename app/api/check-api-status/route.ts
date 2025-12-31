import { NextRequest, NextResponse } from "next/server";
import { getUserApiKeys } from "@/lib/getUserApiKey";

// Gemini models to check
const GEMINI_MODELS = ["gemini-2.0-flash", "gemini-1.5-flash"];

// OpenAI models to check
const OPENAI_MODELS = ["gpt-4o-mini", "gpt-3.5-turbo"];

// Groq models to check (FREE tier!)
const GROQ_MODELS = ["llama-3.3-70b-versatile", "llama-3.1-8b-instant"];

// Cohere models to check (FREE tier!) - Updated model names
const COHERE_MODELS = ["command-r-08-2024", "command-light"];

interface ModelStatus {
  model: string;
  provider: "gemini" | "openai" | "groq" | "cohere";
  available: boolean;
  error?: string;
  responseTime?: number;
}

async function checkGeminiModel(model: string, apiKey: string): Promise<ModelStatus> {
  const start = Date.now();
  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: "Hi" }] }],
          generationConfig: { maxOutputTokens: 5 }
        })
      }
    );
    const responseTime = Date.now() - start;
    if (response.ok) return { model, provider: "gemini", available: true, responseTime };
    if (response.status === 429) return { model, provider: "gemini", available: false, error: "Quota exceeded", responseTime };
    if (response.status === 404) return { model, provider: "gemini", available: false, error: "Not found" };
    if (response.status === 403 || response.status === 401) return { model, provider: "gemini", available: false, error: "Invalid key" };
    return { model, provider: "gemini", available: false, error: `HTTP ${response.status}` };
  } catch (err) {
    return { model, provider: "gemini", available: false, error: "Error" };
  }
}

async function checkOpenAIModel(model: string, apiKey: string): Promise<ModelStatus> {
  const start = Date.now();
  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${apiKey}` },
      body: JSON.stringify({ model, messages: [{ role: "user", content: "Hi" }], max_tokens: 5 })
    });
    const responseTime = Date.now() - start;
    if (response.ok) return { model, provider: "openai", available: true, responseTime };
    if (response.status === 429) return { model, provider: "openai", available: false, error: "Quota exceeded", responseTime };
    if (response.status === 401 || response.status === 403) return { model, provider: "openai", available: false, error: "Invalid key" };
    return { model, provider: "openai", available: false, error: `HTTP ${response.status}` };
  } catch (err) {
    return { model, provider: "openai", available: false, error: "Error" };
  }
}

async function checkGroqModel(model: string, apiKey: string): Promise<ModelStatus> {
  const start = Date.now();
  try {
    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${apiKey}` },
      body: JSON.stringify({ model, messages: [{ role: "user", content: "Hi" }], max_tokens: 5 })
    });
    const responseTime = Date.now() - start;
    if (response.ok) return { model, provider: "groq", available: true, responseTime };
    if (response.status === 429) return { model, provider: "groq", available: false, error: "Quota exceeded", responseTime };
    if (response.status === 401 || response.status === 403) return { model, provider: "groq", available: false, error: "Invalid key" };
    return { model, provider: "groq", available: false, error: `HTTP ${response.status}` };
  } catch (err) {
    return { model, provider: "groq", available: false, error: "Error" };
  }
}

async function checkCohereModel(model: string, apiKey: string): Promise<ModelStatus> {
  const start = Date.now();
  try {
    // Try v2 API first
    const response = await fetch("https://api.cohere.com/v2/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${apiKey}` },
      body: JSON.stringify({ 
        model, 
        messages: [{ role: "user", content: "Hi" }], 
        max_tokens: 5 
      })
    });
    const responseTime = Date.now() - start;
    if (response.ok) return { model, provider: "cohere", available: true, responseTime };
    if (response.status === 429) return { model, provider: "cohere", available: false, error: "Quota exceeded", responseTime };
    if (response.status === 401 || response.status === 403) return { model, provider: "cohere", available: false, error: "Invalid key" };
    
    // Try v1 API as fallback
    const v1Response = await fetch("https://api.cohere.ai/v1/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${apiKey}` },
      body: JSON.stringify({ 
        model: model.replace("-08-2024", "").replace("-light", ""), 
        message: "Hi", 
        max_tokens: 5 
      })
    });
    if (v1Response.ok) return { model, provider: "cohere", available: true, responseTime: Date.now() - start };
    
    return { model, provider: "cohere", available: false, error: `HTTP ${response.status}` };
  } catch (err) {
    return { model, provider: "cohere", available: false, error: "Error" };
  }
}

export async function GET(req: NextRequest) {
  const userId = req.nextUrl.searchParams.get("userId") || "anonymous";

  try {
    const { geminiKey, openaiKey, groqKey, cohereKey } = await getUserApiKeys(userId);

    const serverGeminiKey = process.env.GOOGLE_GEMINI_API_KEY;
    const serverOpenaiKey = process.env.OPENAI_API_KEY;
    const serverGroqKey = process.env.GROQ_API_KEY;
    const serverCohereKey = process.env.COHERE_API_KEY;
    
    const geminiSource = !geminiKey ? "NONE" : (geminiKey !== serverGeminiKey ? "USER" : "SERVER");
    const openaiSource = !openaiKey ? "NONE" : (openaiKey !== serverOpenaiKey ? "USER" : "SERVER");
    const groqSource = !groqKey ? "NONE" : (groqKey !== serverGroqKey ? "USER" : "SERVER");
    const cohereSource = !cohereKey ? "NONE" : (cohereKey !== serverCohereKey ? "USER" : "SERVER");

    // Check all models in parallel
    const [geminiModels, openaiModels, groqModels, cohereModels] = await Promise.all([
      geminiKey ? Promise.all(GEMINI_MODELS.map(m => checkGeminiModel(m, geminiKey))) : Promise.resolve([]),
      openaiKey ? Promise.all(OPENAI_MODELS.map(m => checkOpenAIModel(m, openaiKey))) : Promise.resolve([]),
      groqKey ? Promise.all(GROQ_MODELS.map(m => checkGroqModel(m, groqKey))) : Promise.resolve([]),
      cohereKey ? Promise.all(COHERE_MODELS.map(m => checkCohereModel(m, cohereKey))) : Promise.resolve([]),
    ]);

    const geminiAvailable = geminiModels.filter(m => m.available).length;
    const openaiAvailable = openaiModels.filter(m => m.available).length;
    const groqAvailable = groqModels.filter(m => m.available).length;
    const cohereAvailable = cohereModels.filter(m => m.available).length;
    const totalAvailable = geminiAvailable + openaiAvailable + groqAvailable + cohereAvailable;
    const totalModels = GEMINI_MODELS.length + OPENAI_MODELS.length + GROQ_MODELS.length + COHERE_MODELS.length;

    let recommendation = "";
    if (totalAvailable === 0) {
      recommendation = "Tất cả API đều không khả dụng. Hãy thêm Groq key (miễn phí): https://console.groq.com/keys";
    } else {
      const parts = [];
      if (geminiModels.find(m => m.available)) parts.push("Gemini ✓");
      if (openaiModels.find(m => m.available)) parts.push("OpenAI ✓");
      if (groqModels.find(m => m.available)) parts.push("Groq ✓");
      if (cohereModels.find(m => m.available)) parts.push("Cohere ✓");
      recommendation = `Sẵn sàng: ${parts.join(", ")}`;
    }

    return NextResponse.json({
      success: true,
      userId,
      summary: { totalModels, availableModels: totalAvailable, geminiAvailable, openaiAvailable, groqAvailable, cohereAvailable },
      gemini: {
        keySource: geminiSource,
        keyPreview: geminiKey ? `${geminiKey.slice(0, 8)}...${geminiKey.slice(-4)}` : null,
        hasKey: !!geminiKey,
        workingModel: geminiModels.find(s => s.available)?.model || null,
        allQuotaExceeded: geminiModels.length > 0 && geminiModels.every(s => !s.available),
        models: geminiModels
      },
      openai: {
        keySource: openaiSource,
        keyPreview: openaiKey ? `${openaiKey.slice(0, 8)}...${openaiKey.slice(-4)}` : null,
        hasKey: !!openaiKey,
        workingModel: openaiModels.find(s => s.available)?.model || null,
        allQuotaExceeded: openaiModels.length > 0 && openaiModels.every(s => !s.available),
        models: openaiModels
      },
      groq: {
        keySource: groqSource,
        keyPreview: groqKey ? `${groqKey.slice(0, 8)}...${groqKey.slice(-4)}` : null,
        hasKey: !!groqKey,
        workingModel: groqModels.find(s => s.available)?.model || null,
        allQuotaExceeded: groqModels.length > 0 && groqModels.every(s => !s.available),
        models: groqModels
      },
      cohere: {
        keySource: cohereSource,
        keyPreview: cohereKey ? `${cohereKey.slice(0, 8)}...${cohereKey.slice(-4)}` : null,
        hasKey: !!cohereKey,
        workingModel: cohereModels.find(s => s.available)?.model || null,
        allQuotaExceeded: cohereModels.length > 0 && cohereModels.every(s => !s.available),
        models: cohereModels
      },
      recommendation
    });
  } catch (error) {
    console.error("Check API status error:", error);
    return NextResponse.json({ success: false, message: "Failed to check" }, { status: 500 });
  }
}
