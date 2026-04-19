import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/authOptions"
import { getUserApiKeys } from "@/lib/getUserApiKey"
import apiCache from "@/lib/api-cache"

const SYS = `You are an English pronunciation coach and friendly conversation partner for Vietnamese learners.

The user speaks English and you receive the transcribed text. Analyze it for common Vietnamese pronunciation mistakes.

RULES:
- If pronunciation seems correct (no obvious issues): just reply naturally to what they said, no feedback needed
- If there are pronunciation issues: briefly mention them INLINE in your reply, naturally woven in
  IMPORTANT: Always wrap mispronounced words in forward slashes like /word/ so the app can detect them
  Example: "Good question! By the way, 'are' is pronounced /are/ not 'a' — Vietnamese speakers often miss the 'r' sound. Anyway, I'm doing great, how about you?"
  Example: "Nice try! The word /today/ is pronounced /tuh-DAY/ not 'tay'. Anyway, what's your major?"
- Keep feedback SHORT (1 sentence max), then continue the conversation
- ALWAYS use /word/ format for any word you're correcting pronunciation of
- Be warm, encouraging, conversational
- Reply in English for the conversation part, Vietnamese only for pronunciation tips if needed
- Focus on: final consonants (t/d/s/n), vowel sounds (/æ/ /ɪ/ /ʊ/), th sounds, r/l distinction`

async function callAI(apiKey: string, type: string, messages: any[]) {
  if (type === "groq") {
    const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${apiKey}` },
      body: JSON.stringify({ model: "llama-3.1-8b-instant", messages, stream: true, max_tokens: 1024, temperature: 0.7 }),
    })
    if (!res.ok || !res.body) { const t = await res.text().catch(() => ""); throw new Error(`Groq ${res.status}: ${t.slice(0,100)}`) }
    return new Response(res.body, { headers: { "Content-Type": "text/event-stream", "Cache-Control": "no-cache" } })
  }
  if (type === "openai") {
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${apiKey}` },
      body: JSON.stringify({ model: "gpt-4o-mini", messages, stream: true, max_tokens: 1024, temperature: 0.7 }),
    })
    if (!res.ok || !res.body) { const t = await res.text().catch(() => ""); throw new Error(`OpenAI ${res.status}: ${t.slice(0,100)}`) }
    return new Response(res.body, { headers: { "Content-Type": "text/event-stream", "Cache-Control": "no-cache" } })
  }
  if (type === "gemini") {
    const contents = messages.filter(m => m.role !== "system").map(m => ({ role: m.role === "assistant" ? "model" : "user", parts: [{ text: m.content }] }))
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ system_instruction: { parts: [{ text: SYS }] }, contents, generationConfig: { maxOutputTokens: 1024, temperature: 0.7 } })
    })
    if (!res.ok) { const t = await res.text().catch(() => ""); throw new Error(`Gemini ${res.status}: ${t.slice(0,100)}`) }
    const data = await res.json()
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || ""
    const encoder = new TextEncoder()
    const stream = new ReadableStream({ start(c) { c.enqueue(encoder.encode(`data: ${JSON.stringify({ choices: [{ delta: { content: text } }] })}\n\n`)); c.enqueue(encoder.encode("data: [DONE]\n\n")); c.close() } })
    return new Response(stream, { headers: { "Content-Type": "text/event-stream", "Cache-Control": "no-cache" } })
  }
  throw new Error("Unknown provider")
}

export async function POST(request: NextRequest) {
  try {
    // Run session check and body parsing in parallel
    const [session, body] = await Promise.all([
      getServerSession(authOptions),
      request.json(),
    ])
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    const userId = (session.user as any).id
    const { messages } = body
    if (!messages?.length) return NextResponse.json({ error: "Missing messages" }, { status: 400 })

    const keys = await getUserApiKeys(userId)
    const providers = [
      { type: "groq", key: keys.groqKey },
      { type: "openai", key: keys.openaiKey },
      { type: "gemini", key: (keys as any).geminiKey },
    ].filter(p => p.key?.trim())

    if (!providers.length) return NextResponse.json({ error: "No API key. Add one in Settings." }, { status: 400 })

    const chatMsgs = [{ role: "system", content: SYS }, ...messages]
    for (const p of providers) {
      try { return await callAI(p.key!, p.type, chatMsgs) } catch (e: any) { console.error(p.type, e.message) }
    }
    return NextResponse.json({ error: "All providers failed." }, { status: 500 })
  } catch (e: any) { return NextResponse.json({ error: e.message }, { status: 500 }) }
}
