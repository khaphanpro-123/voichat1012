import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/authOptions"
import { getUserApiKeys } from "@/lib/getUserApiKey"

// VSTEP & IELTS scoring criteria
const VSTEP_CRITERIA = `
VSTEP WRITING SCORING CRITERIA (Total: 10 points):
- Task Fulfillment (50%): Does the essay fully address the prompt? Correct format (letter/essay)? Appropriate tone? Clear viewpoint with supporting arguments?
- Grammar (25%): Variety and accuracy of grammatical structures. Complex sentences, passive voice, conditionals, etc.
- Vocabulary (15%): Range and appropriateness of vocabulary. Academic words, collocations, avoid repetition.
- Organization (10%): Clear structure (intro/body/conclusion), logical flow, effective use of cohesive devices.

SCORING SCALE:
- 9-10: Excellent - fully meets all criteria, near-perfect
- 7-8: Good - meets most criteria with minor issues
- 5-6: Satisfactory - meets basic requirements with noticeable weaknesses
- 3-4: Below average - significant issues in multiple areas
- 1-2: Poor - fails to meet basic requirements
`

const IELTS_CRITERIA = `
IELTS WRITING SCORING CRITERIA (Band 0-9):
Task 1:
- Task Achievement (25%): Covers key features, accurate data description, appropriate overview
- Coherence & Cohesion (25%): Logical organization, paragraphing, cohesive devices
- Lexical Resource (25%): Vocabulary range, accuracy, less common words
- Grammatical Range & Accuracy (25%): Sentence variety, error-free sentences

Task 2:
- Task Response (25%): Addresses all parts, clear position, well-developed ideas
- Coherence & Cohesion (25%): Logical progression, paragraphing, referencing
- Lexical Resource (25%): Wide vocabulary, idiomatic language, spelling
- Grammatical Range & Accuracy (25%): Complex structures, error frequency

BAND DESCRIPTORS:
- Band 9: Expert user - fully operational, appropriate, accurate
- Band 7-8: Good user - occasional inaccuracies, handles complex language well
- Band 5-6: Modest user - partial command, copes with overall meaning
- Band 3-4: Limited user - basic competence, frequent problems
`

async function callAI(apiKey: string, type: string, messages: any[]) {
  if (type === "groq") {
    const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${apiKey}` },
      body: JSON.stringify({ model: "llama-3.1-8b-instant", messages, stream: true, max_tokens: 2048, temperature: 0.3 }),
    })
    if (!res.ok || !res.body) { const t = await res.text().catch(() => ""); throw new Error(`Groq ${res.status}: ${t.slice(0,100)}`) }
    return new Response(res.body, { headers: { "Content-Type": "text/event-stream", "Cache-Control": "no-cache" } })
  }
  if (type === "openai") {
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${apiKey}` },
      body: JSON.stringify({ model: "gpt-4o-mini", messages, stream: true, max_tokens: 2048, temperature: 0.3 }),
    })
    if (!res.ok || !res.body) { const t = await res.text().catch(() => ""); throw new Error(`OpenAI ${res.status}: ${t.slice(0,100)}`) }
    return new Response(res.body, { headers: { "Content-Type": "text/event-stream", "Cache-Control": "no-cache" } })
  }
  if (type === "gemini") {
    const contents = messages.filter(m => m.role !== "system").map(m => ({ role: m.role === "assistant" ? "model" : "user", parts: [{ text: m.content }] }))
    const sysMsg = messages.find(m => m.role === "system")?.content || ""
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ system_instruction: { parts: [{ text: sysMsg }] }, contents, generationConfig: { maxOutputTokens: 2048, temperature: 0.3 } })
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
    const { essay, prompt, taskType, examType } = await request.json()
    if (!essay?.trim()) return NextResponse.json({ error: "Essay is required" }, { status: 400 })

    const keys = await getUserApiKeys(userId)
    const providers = [
      { type: "groq", key: keys.groqKey },
      { type: "openai", key: keys.openaiKey },
      { type: "gemini", key: (keys as any).geminiKey },
    ].filter(p => p.key?.trim())
    if (!providers.length) return NextResponse.json({ error: "No API key configured. Add one in Settings." }, { status: 400 })

    const criteria = examType === "IELTS" ? IELTS_CRITERIA : VSTEP_CRITERIA
    const scoreScale = examType === "IELTS" ? "Band 0-9" : "0-10 points"

    const systemPrompt = `You are an expert English writing examiner for ${examType} certification.
${criteria}

Your task: Grade the student's essay and provide detailed, constructive feedback.

FORMAT YOUR RESPONSE EXACTLY AS:
## Overall Score: [X/10 or Band X]

## Task Fulfillment: [X/10 or Band X]
[2-3 sentences of specific feedback]

## Organization: [X/10 or Band X]  
[2-3 sentences of specific feedback]

## Vocabulary: [X/10 or Band X]
[2-3 sentences with examples from the essay]

## Grammar: [X/10 or Band X]
[2-3 sentences with specific error examples and corrections]

## Strengths
- [specific strength 1]
- [specific strength 2]

## Areas for Improvement
- [specific suggestion 1 with example]
- [specific suggestion 2 with example]

## Sample Improved Sentence
Original: "[quote a weak sentence from the essay]"
Improved: "[your improved version]"

Be specific, cite actual sentences from the essay, and be encouraging but honest.`

    const userMessage = `Exam type: ${examType} - ${taskType}
Prompt: ${prompt || "General writing task"}

Student's essay:
${essay}`

    const messages = [{ role: "system", content: systemPrompt }, { role: "user", content: userMessage }]

    for (const p of providers) {
      try { return await callAI(p.key!, p.type, messages) } catch (e: any) { console.error(p.type, e.message) }
    }
    return NextResponse.json({ error: "All providers failed." }, { status: 500 })
  } catch (e: any) { return NextResponse.json({ error: e.message }, { status: 500 }) }
}

// Generate topic suggestions
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    const userId = (session.user as any).id
    const { searchParams } = new URL(request.url)
    const keyword = searchParams.get("keyword") || ""
    const taskType = searchParams.get("taskType") || "IELTS Task 2"

    const keys = await getUserApiKeys(userId)
    const providers = [
      { type: "groq", key: keys.groqKey },
      { type: "openai", key: keys.openaiKey },
      { type: "gemini", key: (keys as any).geminiKey },
    ].filter(p => p.key?.trim())
    if (!providers.length) return NextResponse.json({ topics: [] })

    const messages = [
      { role: "system", content: "You are an IELTS/VSTEP writing examiner. Generate realistic exam prompts." },
      { role: "user", content: `Generate 5 realistic ${taskType} writing prompts related to the topic: "${keyword}". 
Return ONLY a JSON array of strings, no explanation. Example: ["prompt 1", "prompt 2", ...]` }
    ]

    for (const p of providers) {
      try {
        let result = ""
        if (p.type === "groq") {
          const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
            method: "POST", headers: { "Content-Type": "application/json", "Authorization": `Bearer ${p.key}` },
            body: JSON.stringify({ model: "llama-3.1-8b-instant", messages, max_tokens: 512, temperature: 0.7 }),
          })
          const data = await res.json(); result = data.choices?.[0]?.message?.content || ""
        } else if (p.type === "openai") {
          const res = await fetch("https://api.openai.com/v1/chat/completions", {
            method: "POST", headers: { "Content-Type": "application/json", "Authorization": `Bearer ${p.key}` },
            body: JSON.stringify({ model: "gpt-4o-mini", messages, max_tokens: 512, temperature: 0.7 }),
          })
          const data = await res.json(); result = data.choices?.[0]?.message?.content || ""
        } else {
          const contents = [{ role: "user", parts: [{ text: messages[1].content }] }]
          const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${p.key}`, {
            method: "POST", headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ contents, generationConfig: { maxOutputTokens: 512 } })
          })
          const data = await res.json(); result = data.candidates?.[0]?.content?.parts?.[0]?.text || ""
        }
        const match = result.match(/\[.*\]/s)
        if (match) { const topics = JSON.parse(match[0]); return NextResponse.json({ topics }) }
      } catch {}
    }
    return NextResponse.json({ topics: [] })
  } catch (e: any) { return NextResponse.json({ error: e.message }, { status: 500 }) }
}
