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
IELTS WRITING BAND DESCRIPTORS (Official Public Version, Band 0-9)

=== TASK 1 ===
4 criteria, equal weight (25% each):

1. TASK ACHIEVEMENT (TA):
- Band 9: Fully satisfies all requirements; clearly presents a fully developed response
- Band 8: Covers all requirements sufficiently; presents/highlights/illustrates key features clearly
- Band 7: Covers requirements; presents clear overview of main trends/differences; highlights key features
- Band 6: Addresses requirements; presents overview with info appropriately selected; highlights key features but details may be irrelevant/inappropriate/inaccurate
- Band 5: Generally addresses task; recounts detail mechanically; no clear overview; inadequately covers key features
- Band 4: Attempts to address task but does not cover all key features; format may be inappropriate
- Band 3: Fails to address task; presents limited ideas which may be largely irrelevant

2. COHERENCE & COHESION (CC):
- Band 9: Uses cohesion so naturally it attracts no attention; skillfully manages paragraphing
- Band 8: Sequences information logically; manages all aspects of cohesion well; uses paragraphing sufficiently and appropriately
- Band 7: Logically organises information; clear progression throughout; uses cohesive devices appropriately (some under/over-use)
- Band 6: Arranges information coherently; clear overall progression; uses cohesive devices effectively but cohesion within/between sentences may be faulty or mechanical
- Band 5: Presents information with some organisation but may lack overall progression; makes inadequate/inaccurate/over-use of cohesive devices
- Band 4: Presents information incoherently; no clear progression; uses some basic cohesive devices but may be inaccurate or repetitive

3. LEXICAL RESOURCE (LR):
- Band 9: Wide range of vocabulary with very natural and sophisticated control; rare minor errors only as 'slips'
- Band 8: Wide range of vocabulary fluently and flexibly; skillfully uses uncommon lexical items; occasional inaccuracies in word choice/collocation; rare errors in spelling/word formation
- Band 7: Sufficient range to allow flexibility and precision; uses less common lexical items with awareness of style/collocation; may produce occasional errors in word choice/spelling/word formation
- Band 6: Adequate range for task; attempts to use less common vocabulary but with some inaccuracy; makes some errors in spelling/word formation but they do not impede communication
- Band 5: Limited range, minimally adequate; may make noticeable errors in spelling/word formation that cause difficulty for reader
- Band 4: Only basic vocabulary, may be used repetitively or inappropriately; limited control of word formation/spelling; errors may cause strain for reader

4. GRAMMATICAL RANGE & ACCURACY (GRA):
- Band 9: Wide range of structures with full flexibility and accuracy; rare minor errors only as 'slips'
- Band 8: Wide range of structures; majority of sentences are error-free; makes only very occasional errors or inappropriacies
- Band 7: Variety of complex structures; produces frequent error-free sentences; good control of grammar/punctuation but may make a few errors
- Band 6: Mix of simple and complex sentence forms; makes some errors in grammar/punctuation but they rarely reduce communication
- Band 5: Only limited range of structures; attempts complex sentences but tend to be less accurate than simple sentences; may make frequent grammatical errors/punctuation; errors can cause difficulty for reader
- Band 4: Very limited range of structures with only rare use of subordinate clauses; some structures are accurate but errors predominate; punctuation is often faulty

=== TASK 2 ===
4 criteria, equal weight (25% each):

1. TASK RESPONSE (TR):
- Band 9: Fully addresses all parts; presents fully developed position with relevant, fully extended and well supported ideas
- Band 8: Sufficiently addresses all parts; well-developed response with relevant, extended and supported ideas
- Band 7: Addresses all parts; presents clear position throughout; extends and supports main ideas but may tend to over-generalise; supporting ideas may lack focus
- Band 6: Addresses all parts although some may be more fully covered; presents relevant position although conclusions may become unclear or repetitive; presents relevant main ideas but some may be inadequately developed/unclear
- Band 5: Addresses task only partially; format may be inappropriate; expresses position but development is not always clear; presents some main ideas but limited and not sufficiently developed; may be irrelevant detail
- Band 4: Responds to task only in minimal way or answer is tangential; position is unclear; presents some main ideas but difficult to identify; may be repetitive, irrelevant or not well supported
- Band 3: Does not adequately address any part of task; does not express a clear position; presents few ideas, largely undeveloped or irrelevant

2. COHERENCE & COHESION (CC): [Same descriptors as Task 1]
- Band 9: Uses cohesion naturally; skillfully manages paragraphing
- Band 8: Sequences logically; manages all aspects of cohesion well; uses paragraphing sufficiently and appropriately
- Band 7: Logically organises; clear progression; uses cohesive devices appropriately; presents clear central topic in each paragraph
- Band 6: Arranges coherently; clear overall progression; cohesion within/between sentences may be faulty or mechanical; may not always use referencing clearly; uses paragraphing but not always logically
- Band 5: Some organisation but may lack overall progression; inadequate/inaccurate/over-use of cohesive devices; may not write in paragraphs or paragraphing may be inadequate
- Band 4: Information and ideas not arranged coherently; no clear progression; uses some basic cohesive devices but may be inaccurate or repetitive; may not write in paragraphs or use may be confusing

3. LEXICAL RESOURCE (LR): [Same as Task 1]
4. GRAMMATICAL RANGE & ACCURACY (GRA): [Same as Task 1]

OVERALL BAND SCORE = Average of 4 criteria (rounded to nearest 0.5)
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

    const isIELTS = examType === "IELTS"
    const criterion1 = isIELTS ? (taskType === "IELTS Task 1" ? "Task Achievement" : "Task Response") : "Task Fulfillment"
    const criterion2 = isIELTS ? "Coherence & Cohesion" : "Organization"
    const criterion3 = isIELTS ? "Lexical Resource" : "Vocabulary"
    const criterion4 = isIELTS ? "Grammatical Range & Accuracy" : "Grammar"
    const scoreUnit = isIELTS ? "Band" : "/10"

    const systemPrompt = `You are an expert IELTS/VSTEP examiner. Grade this essay strictly according to official band descriptors.

${criteria}

INSTRUCTIONS:
- Score each criterion separately using the band descriptors above
- Be specific: quote actual sentences from the essay as evidence
- For IELTS: each criterion is Band 0-9, overall = average of 4 criteria
- Be honest but constructive

FORMAT YOUR RESPONSE EXACTLY AS:

## Overall Score: [Band X.X or X/10]

## ${criterion1}: [Band X or X/10]
[2-3 sentences citing specific evidence from the essay]

## ${criterion2}: [Band X or X/10]
[2-3 sentences citing specific evidence]

## ${criterion3}: [Band X or X/10]
[2-3 sentences with vocabulary examples from the essay]

## ${criterion4}: [Band X or X/10]
[2-3 sentences with grammar examples and corrections]

## Strengths
- [specific strength with quote from essay]
- [specific strength with quote from essay]

## Key Improvements Needed
- [specific issue with example and correction]
- [specific issue with example and correction]

## Improved Version of One Weak Sentence
Original: "[exact quote from essay]"
Improved: "[your rewritten version]"
Why: [brief explanation]`

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
