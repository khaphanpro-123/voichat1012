import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/authOptions"
import { getUserApiKeys } from "@/lib/getUserApiKey"
import apiCache from "@/lib/api-cache"

const SYS = `You are an English vocabulary expert. Given a word or phrase, generate a knowledge graph expansion.

Return ONLY valid JSON in this exact format:
{
  "collocations": ["strong power", "power of attorney", "power plant", "power struggle"],
  "phrases": ["come to power", "in power", "power up", "power down", "beyond one's power"],
  "nounPhrases": ["the power of knowledge", "political power", "purchasing power", "solar power"],
  "sentences": [
    "The power of education can transform lives.",
    "She came to power after winning the election.",
    "Nuclear power provides clean energy for millions."
  ],
  "synonyms": ["strength", "force", "authority", "influence"],
  "antonyms": ["weakness", "powerlessness", "submission"]
}

Rules:
- collocations: 4-6 common word combinations
- phrases: 4-6 common phrases/idioms using the word
- nounPhrases: 3-5 noun phrases
- sentences: 3 natural example sentences at B2-C1 level
- synonyms: 3-5 synonyms
- antonyms: 2-4 antonyms (if applicable)
- Keep all content in English
- Return ONLY the JSON, no explanation`

async function callAI(apiKey: string, type: string, word: string, meaning: string) {
  const userMsg = `Word: "${word}"${meaning ? `\nMeaning: ${meaning}` : ""}\n\nGenerate knowledge graph expansion.`
  const messages = [{ role: "system", content: SYS }, { role: "user", content: userMsg }]

  if (type === "groq") {
    const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${apiKey}` },
      body: JSON.stringify({ model: "llama-3.1-8b-instant", messages, max_tokens: 800, temperature: 0.3 }),
    })
    if (!res.ok) throw new Error(`Groq ${res.status}`)
    const data = await res.json()
    return data.choices?.[0]?.message?.content || ""
  }
  if (type === "openai") {
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${apiKey}` },
      body: JSON.stringify({ model: "gpt-4o-mini", messages, max_tokens: 800, temperature: 0.3 }),
    })
    if (!res.ok) throw new Error(`OpenAI ${res.status}`)
    const data = await res.json()
    return data.choices?.[0]?.message?.content || ""
  }
  if (type === "gemini") {
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        system_instruction: { parts: [{ text: SYS }] },
        contents: [{ role: "user", parts: [{ text: userMsg }] }],
        generationConfig: { maxOutputTokens: 800, temperature: 0.3 }
      })
    })
    if (!res.ok) throw new Error(`Gemini ${res.status}`)
    const data = await res.json()
    return data.candidates?.[0]?.content?.parts?.[0]?.text || ""
  }
  throw new Error("Unknown provider")
}

export async function POST(request: NextRequest) {
  try {
    const [session, body] = await Promise.all([getServerSession(authOptions), request.json()])
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    const userId = (session.user as any).id
    const { word, meaning } = body
    if (!word?.trim()) return NextResponse.json({ error: "Word is required" }, { status: 400 })

    // Cache per word (not per user - same word has same expansion)
    const cacheKey = `vocab_expand:${word.toLowerCase().trim()}`
    const cached = apiCache.get(cacheKey) as any | null
    if (cached) return NextResponse.json({ success: true, data: cached })

    const keys = await getUserApiKeys(userId)
    const providers = [
      { type: "groq", key: keys.groqKey },
      { type: "openai", key: keys.openaiKey },
      { type: "gemini", key: (keys as any).geminiKey },
    ].filter(p => p.key?.trim())

    if (!providers.length) return NextResponse.json({ error: "No API key configured" }, { status: 400 })

    let result = ""
    for (const p of providers) {
      try { result = await callAI(p.key!, p.type, word, meaning || ""); break } catch (e: any) { console.error(p.type, e.message) }
    }

    if (!result) return NextResponse.json({ error: "AI generation failed" }, { status: 500 })

    // Parse JSON from response
    const jsonMatch = result.match(/\{[\s\S]*\}/)
    if (!jsonMatch) return NextResponse.json({ error: "Invalid AI response" }, { status: 500 })

    const data = JSON.parse(jsonMatch[0])
    apiCache.set(cacheKey, data, 24 * 60 * 60 * 1000) // Cache 24h
    return NextResponse.json({ success: true, data })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
