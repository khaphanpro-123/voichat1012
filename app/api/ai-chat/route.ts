import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/authOptions"
import { getUserApiKeys } from "@/lib/getUserApiKey"
import getClientPromise from "@/lib/mongodb"

const BASE_SYSTEM_PROMPT = `Bạn là trợ lý AI thông minh tên EnglishPal AI, chuyên hỗ trợ học tiếng Anh cá nhân hóa.
- Trả lời bằng tiếng Việt khi người dùng hỏi bằng tiếng Việt
- Trả lời bằng tiếng Anh khi người dùng hỏi bằng tiếng Anh
- Khi giải thích từ vựng hoặc ngữ pháp, đưa ra ví dụ cụ thể
- Có thể trả lời mọi câu hỏi, không chỉ về tiếng Anh
- Định dạng câu trả lời rõ ràng, dễ đọc
- Nếu có dữ liệu học tập cá nhân của người dùng, hãy tích hợp vào câu trả lời một cách tự nhiên`

// Fetch user learning data from DB to build personal context
async function buildPersonalContext(userId: string): Promise<string> {
  try {
    const client = await getClientPromise()
    const db = client.db(process.env.MONGO_DB || "viettalk")

    // Fetch in parallel: vocabulary + grammar errors
    const [vocabulary, grammarErrors] = await Promise.all([
      db.collection("vocabulary")
        .find({ userId })
        .sort({ created_at: -1 })
        .limit(40)
        .project({ word: 1, meaning: 1, example: 1, type: 1, level: 1 })
        .toArray(),
      db.collection("grammar_errors")
        .find({ userId })
        .sort({ createdAt: -1 })
        .limit(15)
        .project({ error: 1, correction: 1, explanation: 1 })
        .toArray(),
    ])

    if (vocabulary.length === 0 && grammarErrors.length === 0) return ""

    const parts: string[] = []

    if (vocabulary.length > 0) {
      const vocabList = vocabulary
        .map((v: any) => `  - "${v.word}"${v.meaning ? `: ${v.meaning}` : ""}${v.example ? ` (vd: ${v.example})` : ""}`)
        .join("\n")
      parts.push(`TỪ VỰNG ĐÃ HỌC (${vocabulary.length} từ):\n${vocabList}`)
    }

    if (grammarErrors.length > 0) {
      const errorList = grammarErrors
        .map((e: any) => `  - Sai: "${e.error}" → Đúng: "${e.correction}"${e.explanation ? ` (${e.explanation})` : ""}`)
        .join("\n")
      parts.push(`LỖI NGỮ PHÁP THƯỜNG GẶP (${grammarErrors.length} lỗi):\n${errorList}`)
    }

    return `\n\n=== DỮ LIỆU HỌC TẬP CÁ NHÂN CỦA NGƯỜI DÙNG ===
${parts.join("\n\n")}

HƯỚNG DẪN SỬ DỤNG DỮ LIỆU TRÊN:
- Nếu câu hỏi liên quan đến từ vựng đã học → nhắc lại và củng cố
- Nếu người dùng mắc lỗi ngữ pháp đã ghi nhận → chỉ ra và giải thích
- Ưu tiên dùng ví dụ từ từ vựng đã học để minh họa
- Không cần liệt kê toàn bộ dữ liệu, chỉ dùng khi phù hợp với câu hỏi
=================================================`
  } catch (err) {
    console.error("[ai-chat] Failed to build personal context:", err)
    return ""
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    const userId = (session.user as any).id

    const { messages } = await request.json()
    if (!messages?.length) return NextResponse.json({ error: "Missing messages" }, { status: 400 })

    // Fetch user API keys + personal learning context in parallel
    const [keys, personalContext] = await Promise.all([
      getUserApiKeys(userId),
      buildPersonalContext(userId),
    ])

    // Build enriched system prompt
    const systemPrompt = BASE_SYSTEM_PROMPT + personalContext

    const chatMessages = [
      { role: "system", content: systemPrompt },
      ...messages.map((m: any) => ({ role: m.role, content: m.content }))
    ]

    // Priority: Groq (fastest) > OpenAI > Gemini
    const providers = [
      { type: "groq", key: keys.groqKey },
      { type: "openai", key: keys.openaiKey },
      { type: "gemini", key: (keys as any).geminiKey },
    ].filter(p => p.key?.trim())

    if (providers.length === 0) {
      return NextResponse.json({
        error: "no_api_key",
        message: "Bạn chưa cài đặt API key. Vui lòng vào Settings để thêm Groq, OpenAI hoặc Gemini API key."
      }, { status: 400 })
    }

    for (const p of providers) {
      let result: { ok: boolean; response?: Response; error?: string }
      if (p.type === "groq") result = await tryGroq(p.key!, chatMessages)
      else if (p.type === "openai") result = await tryOpenAI(p.key!, chatMessages)
      else result = await tryGemini(p.key!, messages, systemPrompt)

      if (result.ok) return result.response!
      console.error(`[ai-chat] ${p.type} failed:`, result.error)
    }

    return NextResponse.json({ error: "Tất cả AI providers đều thất bại. Kiểm tra lại API key trong Settings." }, { status: 500 })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// Also expose GET to check which keys are connected
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    const userId = (session.user as any).id
    const keys = await getUserApiKeys(userId)
    return NextResponse.json({
      openai: !!keys.openaiKey?.trim(),
      groq: !!keys.groqKey?.trim(),
      gemini: !!(keys as any).geminiKey?.trim(),
    })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

async function tryGroq(apiKey: string, messages: any[]) {
  try {
    const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${apiKey}` },
      body: JSON.stringify({ model: "llama-3.1-8b-instant", messages, stream: true, max_tokens: 2048, temperature: 0.7 }),
    })
    if (!res.ok || !res.body) {
      const t = await res.text().catch(() => "")
      return { ok: false, error: `Groq ${res.status}: ${t.slice(0, 100)}` }
    }
    return { ok: true, response: new Response(res.body, { headers: { "Content-Type": "text/event-stream", "Cache-Control": "no-cache" } }) }
  } catch (e: any) { return { ok: false, error: e.message } }
}

async function tryOpenAI(apiKey: string, messages: any[]) {
  try {
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${apiKey}` },
      body: JSON.stringify({ model: "gpt-4o-mini", messages, stream: true, max_tokens: 2048, temperature: 0.7 }),
    })
    if (!res.ok || !res.body) {
      const t = await res.text().catch(() => "")
      let msg = `OpenAI ${res.status}`
      if (res.status === 401) msg = "OpenAI key không hợp lệ"
      else if (res.status === 429) msg = "OpenAI quota hết"
      return { ok: false, error: msg }
    }
    return { ok: true, response: new Response(res.body, { headers: { "Content-Type": "text/event-stream", "Cache-Control": "no-cache" } }) }
  } catch (e: any) { return { ok: false, error: e.message } }
}

async function tryGemini(apiKey: string, messages: any[], systemPrompt: string) {
  try {
    const contents = messages.filter((m: any) => m.role !== "system").map((m: any) => ({
      role: m.role === "assistant" ? "model" : "user",
      parts: [{ text: m.content }]
    }))
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          system_instruction: { parts: [{ text: systemPrompt }] },
          contents,
          generationConfig: { maxOutputTokens: 2048, temperature: 0.7 },
        }),
      }
    )
    if (!res.ok) { const t = await res.text().catch(() => ""); return { ok: false, error: `Gemini ${res.status}: ${t.slice(0, 100)}` } }
    const data = await res.json()
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || ""
    if (!text) return { ok: false, error: "Gemini empty response" }
    const encoder = new TextEncoder()
    const stream = new ReadableStream({
      start(controller) {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ choices: [{ delta: { content: text } }] })}\n\n`))
        controller.enqueue(encoder.encode("data: [DONE]\n\n"))
        controller.close()
      }
    })
    return { ok: true, response: new Response(stream, { headers: { "Content-Type": "text/event-stream", "Cache-Control": "no-cache" } }) }
  } catch (e: any) { return { ok: false, error: e.message } }
}
