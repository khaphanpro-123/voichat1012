import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/authOptions"
import { getUserApiKeys } from "@/lib/getUserApiKey"

const SYS = `You are an English pronunciation coach and conversation partner.

When the user speaks, you MUST do TWO things in this exact format:

**PRONUNCIATION FEEDBACK:**
[Analyze their pronunciation. If the text looks correct, say "Good pronunciation! Keep it up." 
If there are likely issues based on common Vietnamese learner mistakes, point them out specifically.
Give IPA phonetic guide for key words. Example: "how" /haʊ/, "are" /ɑːr/
Keep this section brief - 2-3 sentences max.]

**RESPONSE:**
[Then naturally continue the conversation, answering their question or responding to what they said]

Always be encouraging and supportive. Focus on the most important pronunciation points.
Respond in Vietnamese for the feedback section, English for the conversation response.`

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
    const session = await getServerSession(authOptions)
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    const userId = (session.user as any).id
    const { messages } = await request.json()
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
