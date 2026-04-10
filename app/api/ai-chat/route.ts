import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/authOptions"
import { getUserApiKeys } from "@/lib/getUserApiKey"
import getClientPromise from "@/lib/mongodb"

const SYS = `You are EnglishPal AI, a smart assistant specializing in personalized English learning.
- Reply in Vietnamese when the user writes in Vietnamese
- Reply in English when the user writes in English
- Give concrete examples when explaining vocabulary or grammar
- Answer any question, not just English-related ones
- Format answers clearly and readably
- When the user shares an image: carefully analyze ALL content in the image (text, questions, diagrams, etc.), then provide a detailed answer combining the image content with the user's question. If it's an exercise or test, solve it step by step.
- If personal learning data is available, integrate it naturally into your response`

async function buildPersonalContext(userId: string): Promise<string> {
  try {
    const client = await getClientPromise()
    const db = client.db(process.env.MONGO_DB || "viettalk")
    const [vocabulary, grammarErrors] = await Promise.all([
      db.collection("vocabulary").find({ userId }).sort({ created_at: -1 }).limit(40)
        .project({ word: 1, meaning: 1, example: 1 }).toArray(),
      db.collection("grammar_errors").find({ userId }).sort({ createdAt: -1 }).limit(15)
        .project({ error: 1, correction: 1, explanation: 1 }).toArray(),
    ])
    if (vocabulary.length === 0 && grammarErrors.length === 0) return ""
    const parts: string[] = []
    if (vocabulary.length > 0) {
      parts.push(`LEARNED VOCABULARY (${vocabulary.length} words):\n` +
        vocabulary.map((v: any) => `  - "${v.word}"${v.meaning ? ": " + v.meaning : ""}`).join("\n"))
    }
    if (grammarErrors.length > 0) {
      parts.push(`COMMON GRAMMAR ERRORS (${grammarErrors.length}):\n` +
        grammarErrors.map((e: any) => `  - Wrong: "${e.error}" → Correct: "${e.correction}"`).join("\n"))
    }
    return `\n\n=== USER PERSONAL LEARNING DATA ===\n${parts.join("\n\n")}\n===================================`
  } catch { return "" }
}

// Build messages with vision support (base64 images)
function buildMessages(messages: any[], systemPrompt: string) {
  return [
    { role: "system", content: systemPrompt },
    ...messages.map((m: any) => {
      if (!m.image) return { role: m.role, content: m.content }
      // Vision message: content is array with text + image
      return {
        role: m.role,
        content: [
          ...(m.content ? [{ type: "text", text: m.content }] : []),
          { type: "image_url", image_url: { url: m.image, detail: "auto" } }
        ]
      }
    })
  ]
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    const userId = (session.user as any).id
    const { messages } = await request.json()
    if (!messages?.length) return NextResponse.json({ error: "Missing messages" }, { status: 400 })

    // Debug: log image presence
    const lastUserMsg = [...messages].reverse().find((m: any) => m.role === "user")
    const hasImage = !!(lastUserMsg?.image)
    console.log(`[ai-chat] messages=${messages.length}, hasImage=${hasImage}, imageLen=${lastUserMsg?.image?.length || 0}`)

    const [keys, personalContext] = await Promise.all([getUserApiKeys(userId), buildPersonalContext(userId)])
    const systemPrompt = SYS + personalContext

    const providers = [
      { type: "groq", key: keys.groqKey },
      { type: "openai", key: keys.openaiKey },
      { type: "gemini", key: (keys as any).geminiKey },
    ].filter(p => p.key?.trim())

    if (providers.length === 0) {
      return NextResponse.json({ error: "no_api_key", message: "No API key configured. Go to Settings to add Groq, OpenAI or Gemini key." }, { status: 400 })
    }

    // If image present, skip Groq entirely (no vision support), use OpenAI or Gemini
    const ordered = hasImage
      ? providers.filter(p => p.type !== "groq")
      : providers

    if (ordered.length === 0 && hasImage) {
      return NextResponse.json({ 
        error: "vision_not_supported",
        message: "Image analysis requires OpenAI or Gemini API key. Groq does not support vision. Please add an OpenAI or Gemini key in Settings." 
      }, { status: 400 })
    }

    for (const p of ordered) {
      const chatMsgs = buildMessages(messages, systemPrompt)
      let result: { ok: boolean; response?: Response; error?: string }
      if (p.type === "groq") result = await tryGroq(p.key!, chatMsgs.map(m => ({ ...m, content: typeof m.content === "string" ? m.content : (m.content as any[]).find((c: any) => c.type === "text")?.text || "" })))
      else if (p.type === "openai") result = await tryOpenAI(p.key!, chatMsgs)
      else result = await tryGemini(p.key!, messages, systemPrompt)
      if (result.ok) return result.response!
      console.error(`[ai-chat] ${p.type} failed:`, result.error)
    }
    return NextResponse.json({ error: "All AI providers failed. Check your API keys in Settings." }, { status: 500 })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    const userId = (session.user as any).id
    const keys = await getUserApiKeys(userId)
    return NextResponse.json({ openai: !!keys.openaiKey?.trim(), groq: !!keys.groqKey?.trim(), gemini: !!(keys as any).geminiKey?.trim() })
  } catch (error: any) { return NextResponse.json({ error: error.message }, { status: 500 }) }
}

async function tryGroq(apiKey: string, messages: any[]) {
  try {
    const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${apiKey}` },
      body: JSON.stringify({ model: "llama-3.1-8b-instant", messages, stream: true, max_tokens: 2048, temperature: 0.7 }),
    })
    if (!res.ok || !res.body) { const t = await res.text().catch(() => ""); return { ok: false, error: `Groq ${res.status}: ${t.slice(0, 100)}` } }
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
      if (res.status === 401) msg = "OpenAI key invalid"
      else if (res.status === 429) msg = "OpenAI quota exceeded"
      return { ok: false, error: msg }
    }
    return { ok: true, response: new Response(res.body, { headers: { "Content-Type": "text/event-stream", "Cache-Control": "no-cache" } }) }
  } catch (e: any) { return { ok: false, error: e.message } }
}

async function tryGemini(apiKey: string, messages: any[], systemPrompt: string) {
  try {
    const contents = messages.filter((m: any) => m.role !== "system").map((m: any) => {
      const parts: any[] = []
      if (m.content) parts.push({ text: m.content })
      if (m.image) {
        const match = m.image.match(/^data:([^;]+);base64,(.+)$/)
        if (match) parts.push({ inline_data: { mime_type: match[1], data: match[2] } })
      }
      return { role: m.role === "assistant" ? "model" : "user", parts }
    })
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
      { method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ system_instruction: { parts: [{ text: systemPrompt }] }, contents, generationConfig: { maxOutputTokens: 2048, temperature: 0.7 } }) }
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
