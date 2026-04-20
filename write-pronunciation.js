const fs = require('fs')

// ── API route for pronunciation ──────────────────────────────────────────
const apiRoute = `import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/authOptions"
import { getUserApiKeys } from "@/lib/getUserApiKey"

const SYS = \`You are an English pronunciation coach and conversation partner.

When the user speaks, you MUST do TWO things in this exact format:

**PRONUNCIATION FEEDBACK:**
[Analyze their pronunciation. If the text looks correct, say "Good pronunciation! Keep it up." 
If there are likely issues based on common Vietnamese learner mistakes, point them out specifically.
Give IPA phonetic guide for key words. Example: "how" /haʊ/, "are" /ɑːr/
Keep this section brief - 2-3 sentences max.]

**RESPONSE:**
[Then naturally continue the conversation, answering their question or responding to what they said]

Always be encouraging and supportive. Focus on the most important pronunciation points.
Respond in Vietnamese for the feedback section, English for the conversation response.\`

async function callAI(apiKey: string, type: string, messages: any[]) {
  if (type === "groq") {
    const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": \`Bearer \${apiKey}\` },
      body: JSON.stringify({ model: "llama-3.1-8b-instant", messages, stream: true, max_tokens: 1024, temperature: 0.7 }),
    })
    if (!res.ok || !res.body) { const t = await res.text().catch(() => ""); throw new Error(\`Groq \${res.status}: \${t.slice(0,100)}\`) }
    return new Response(res.body, { headers: { "Content-Type": "text/event-stream", "Cache-Control": "no-cache" } })
  }
  if (type === "openai") {
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": \`Bearer \${apiKey}\` },
      body: JSON.stringify({ model: "gpt-4o-mini", messages, stream: true, max_tokens: 1024, temperature: 0.7 }),
    })
    if (!res.ok || !res.body) { const t = await res.text().catch(() => ""); throw new Error(\`OpenAI \${res.status}: \${t.slice(0,100)}\`) }
    return new Response(res.body, { headers: { "Content-Type": "text/event-stream", "Cache-Control": "no-cache" } })
  }
  if (type === "gemini") {
    const contents = messages.filter(m => m.role !== "system").map(m => ({ role: m.role === "assistant" ? "model" : "user", parts: [{ text: m.content }] }))
    const res = await fetch(\`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=\${apiKey}\`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ system_instruction: { parts: [{ text: SYS }] }, contents, generationConfig: { maxOutputTokens: 1024, temperature: 0.7 } })
    })
    if (!res.ok) { const t = await res.text().catch(() => ""); throw new Error(\`Gemini \${res.status}: \${t.slice(0,100)}\`) }
    const data = await res.json()
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || ""
    const encoder = new TextEncoder()
    const stream = new ReadableStream({ start(c) { c.enqueue(encoder.encode(\`data: \${JSON.stringify({ choices: [{ delta: { content: text } }] })}\\n\\n\`)); c.enqueue(encoder.encode("data: [DONE]\\n\\n")); c.close() } })
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
`

// ── Frontend page ────────────────────────────────────────────────────────
const page = `"use client"

import { useState, useRef, useEffect, useCallback } from "react"
import { useSession } from "next-auth/react"
import DashboardLayout from "@/components/DashboardLayout"

interface Msg { role: "user" | "assistant"; content: string; confidence?: number }

export default function PronunciationPage() {
  const { data: session } = useSession()
  const [messages, setMessages] = useState<Msg[]>([])
  const [listening, setListening] = useState(false)
  const [processing, setProcessing] = useState(false)
  const [speaking, setSpeaking] = useState(false)
  const [transcript, setTranscript] = useState("")
  const [confidence, setConfidence] = useState<number | null>(null)
  const [autoSpeak, setAutoSpeak] = useState(true)
  const [supported, setSupported] = useState(true)
  const recRef = useRef<any>(null)
  const endRef = useRef<HTMLDivElement>(null)
  const historyRef = useRef<Msg[]>([])

  useEffect(() => { historyRef.current = messages }, [messages])
  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }) }, [messages, processing])
  useEffect(() => {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    if (!SR) setSupported(false)
  }, [])

  const speak = useCallback((text: string) => {
    if (!autoSpeak) return
    window.speechSynthesis?.cancel()
    // Extract only the RESPONSE part for TTS
    const match = text.match(/\\*\\*RESPONSE:\\*\\*([\\s\\S]*)/)
    const toSpeak = match ? match[1].trim() : text
    const utt = new SpeechSynthesisUtterance(toSpeak)
    utt.lang = "en-US"; utt.rate = 0.9
    const voices = window.speechSynthesis.getVoices()
    const enVoice = voices.find(v => v.lang.startsWith("en") && v.name.includes("Female")) || voices.find(v => v.lang.startsWith("en"))
    if (enVoice) utt.voice = enVoice
    utt.onstart = () => setSpeaking(true)
    utt.onend = () => setSpeaking(false)
    window.speechSynthesis.speak(utt)
  }, [autoSpeak])

  const sendToAI = useCallback(async (userText: string, conf: number | null) => {
    setProcessing(true)
    const history = historyRef.current
    const msgs = [...history.map(m => ({ role: m.role, content: m.content })), { role: "user", content: userText }]

    try {
      const res = await fetch("/api/pronunciation", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: msgs }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        setMessages(prev => [...prev, { role: "assistant", content: "Error: " + (err.error || "Failed") }])
        return
      }
      const reader = res.body!.getReader(); const dec = new TextDecoder(); let out = ""
      setMessages(prev => [...prev, { role: "assistant", content: "" }])
      while (true) {
        const { done, value } = await reader.read(); if (done) break
        for (const line of dec.decode(value, { stream: true }).split("\\n")) {
          if (!line.startsWith("data: ")) continue
          const d = line.slice(6).trim(); if (d === "[DONE]") break
          try { out += JSON.parse(d).choices?.[0]?.delta?.content ?? ""; setMessages(prev => [...prev.slice(0, -1), { role: "assistant", content: out }]) } catch {}
        }
      }
      if (out) speak(out)
    } catch { setMessages(prev => [...prev, { role: "assistant", content: "Connection error." }]) }
    finally { setProcessing(false) }
  }, [speak])

  const startListening = () => {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    if (!SR) return
    window.speechSynthesis?.cancel()
    const rec = new SR()
    rec.continuous = false; rec.interimResults = true; rec.lang = "en-US"
    let finalText = ""; let finalConf: number | null = null
    rec.onstart = () => { setListening(true); setTranscript(""); setConfidence(null) }
    rec.onresult = (e: any) => {
      let interim = ""
      for (let i = 0; i < e.results.length; i++) {
        if (e.results[i].isFinal) { finalText += e.results[i][0].transcript; finalConf = e.results[i][0].confidence }
        else interim += e.results[i][0].transcript
      }
      setTranscript(finalText || interim)
      if (finalConf !== null) setConfidence(finalConf)
    }
    rec.onend = () => {
      setListening(false); recRef.current = null
      if (finalText.trim()) {
        setMessages(prev => [...prev, { role: "user", content: finalText.trim(), confidence: finalConf ?? undefined }])
        setTranscript("")
        sendToAI(finalText.trim(), finalConf)
      } else { setTranscript("") }
    }
    rec.onerror = () => { setListening(false); recRef.current = null; setTranscript("") }
    recRef.current = rec; rec.start()
  }

  const stopListening = () => { recRef.current?.stop() }

  const confidenceColor = (c: number) => c > 0.85 ? "text-green-600" : c > 0.65 ? "text-yellow-600" : "text-red-500"
  const confidenceLabel = (c: number) => c > 0.85 ? "Excellent" : c > 0.65 ? "Good" : "Needs practice"

  return (
    <DashboardLayout>
      <div className="flex flex-col h-screen bg-gradient-to-br from-violet-50 via-white to-indigo-50">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 bg-white/80 backdrop-blur-sm border-b border-violet-100 flex-shrink-0">
          <div>
            <h1 className="text-base font-bold text-gray-900">Pronunciation Coach</h1>
            <p className="text-xs text-gray-500">Speak English — get feedback + conversation</p>
          </div>
          <div className="flex items-center gap-3">
            <label className="flex items-center gap-1.5 text-xs text-gray-600 cursor-pointer">
              <input type="checkbox" checked={autoSpeak} onChange={e => setAutoSpeak(e.target.checked)} className="rounded" />
              Auto-speak
            </label>
            {speaking && (
              <button onClick={() => window.speechSynthesis?.cancel()} className="text-xs text-violet-600 hover:underline">Stop</button>
            )}
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
          {messages.length === 0 && (
            <div className="flex flex-col items-center justify-center h-full text-center py-12">
              <div className="w-20 h-20 rounded-full bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center mb-4 shadow-lg">
                <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                </svg>
              </div>
              <h2 className="text-xl font-bold text-gray-800 mb-2">Start Speaking!</h2>
              <p className="text-gray-500 text-sm max-w-xs mb-6">Press the mic button and speak in English. I'll evaluate your pronunciation and continue the conversation.</p>
              <div className="grid grid-cols-2 gap-2 text-xs text-left max-w-xs">
                {["How are you today?", "What's the weather like?", "Tell me about yourself", "I want to learn English"].map(s => (
                  <div key={s} className="bg-white rounded-xl px-3 py-2 shadow-sm border border-violet-100 text-gray-600 italic">"{s}"</div>
                ))}
              </div>
            </div>
          )}

          {messages.map((m, i) => (
            <div key={i} className={\`flex \${m.role === "user" ? "justify-end" : "justify-start"}\`}>
              {m.role === "user" ? (
                <div className="max-w-[80%]">
                  <div className="bg-gradient-to-r from-violet-600 to-indigo-600 text-white rounded-2xl rounded-br-sm px-4 py-3 text-sm shadow-md">
                    {m.content}
                  </div>
                  {m.confidence !== undefined && (
                    <div className={\`text-xs mt-1 text-right \${confidenceColor(m.confidence)}\`}>
                      STT confidence: {Math.round(m.confidence * 100)}% — {confidenceLabel(m.confidence)}
                    </div>
                  )}
                </div>
              ) : (
                <div className="max-w-[85%] bg-white rounded-2xl rounded-bl-sm px-4 py-3 text-sm shadow-md border border-violet-100">
                  {m.content ? (
                    <div className="space-y-3">
                      {/* Pronunciation feedback section */}
                      {m.content.includes("**PRONUNCIATION FEEDBACK:**") && (
                        <div className="bg-amber-50 border border-amber-200 rounded-xl p-3">
                          <div className="flex items-center gap-1.5 mb-1.5">
                            <svg className="w-4 h-4 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
                            </svg>
                            <span className="text-xs font-semibold text-amber-700">Pronunciation Feedback</span>
                          </div>
                          <p className="text-xs text-amber-800 whitespace-pre-wrap leading-relaxed">
                            {m.content.match(/\\*\\*PRONUNCIATION FEEDBACK:\\*\\*([\\s\\S]*?)(?=\\*\\*RESPONSE:|$)/)?.[1]?.trim()}
                          </p>
                        </div>
                      )}
                      {/* Conversation response */}
                      {m.content.includes("**RESPONSE:**") && (
                        <div>
                          <div className="flex items-center gap-1.5 mb-1">
                            <svg className="w-4 h-4 text-violet-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                            </svg>
                            <span className="text-xs font-semibold text-violet-600">Response</span>
                          </div>
                          <p className="text-gray-800 whitespace-pre-wrap leading-relaxed">
                            {m.content.match(/\\*\\*RESPONSE:\\*\\*([\\s\\S]*)/)?.[1]?.trim()}
                          </p>
                        </div>
                      )}
                      {/* Fallback if no format */}
                      {!m.content.includes("**PRONUNCIATION FEEDBACK:**") && !m.content.includes("**RESPONSE:**") && (
                        <p className="text-gray-800 whitespace-pre-wrap leading-relaxed">{m.content}</p>
                      )}
                    </div>
                  ) : (
                    processing && i === messages.length - 1 ? (
                      <span className="flex gap-1 items-center h-4">
                        <span className="w-1.5 h-1.5 bg-violet-400 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                        <span className="w-1.5 h-1.5 bg-violet-400 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                        <span className="w-1.5 h-1.5 bg-violet-400 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                      </span>
                    ) : null
                  )}
                </div>
              )}
            </div>
          ))}
          <div ref={endRef} />
        </div>

        {/* Transcript preview */}
        {(listening || transcript) && (
          <div className="px-4 py-2 bg-violet-50 border-t border-violet-100 flex-shrink-0">
            <p className="text-sm text-violet-700 italic text-center">
              {listening ? "🎙 " : ""}{transcript || "Listening..."}
            </p>
          </div>
        )}

        {/* Controls */}
        <div className="px-4 py-4 bg-white/80 backdrop-blur-sm border-t border-violet-100 flex-shrink-0">
          <div className="flex flex-col items-center gap-3">
            {!supported ? (
              <p className="text-sm text-red-500">Speech recognition not supported. Please use Chrome.</p>
            ) : (
              <>
                <div className="relative">
                  {listening && (
                    <>
                      <span className="absolute inset-0 rounded-full bg-red-400/30 animate-ping" />
                      <span className="absolute inset-[-8px] rounded-full bg-red-400/15 animate-ping" style={{ animationDelay: "0.1s" }} />
                    </>
                  )}
                  <button
                    onClick={listening ? stopListening : startListening}
                    disabled={processing}
                    className={\`relative w-16 h-16 rounded-full flex items-center justify-center shadow-xl transition-all \${
                      listening
                        ? "bg-red-500 scale-110"
                        : processing
                        ? "bg-gray-300 cursor-not-allowed"
                        : "bg-gradient-to-br from-violet-500 to-indigo-600 hover:scale-105 active:scale-95"
                    }\`}
                  >
                    <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      {listening
                        ? <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z M9 10a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z" />
                        : <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                      }
                    </svg>
                  </button>
                </div>
                <p className="text-xs text-gray-500">
                  {listening ? "Tap to stop" : processing ? "Analyzing..." : "Tap to speak"}
                </p>
                {messages.length > 0 && (
                  <button onClick={() => { setMessages([]); window.speechSynthesis?.cancel() }} className="text-xs text-gray-400 hover:text-red-400 transition-colors">
                    Clear conversation
                  </button>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}
`

fs.mkdirSync('app/api/pronunciation', { recursive: true })
fs.mkdirSync('app/dashboard-new/pronunciation', { recursive: true })
fs.writeFileSync('app/api/pronunciation/route.ts', apiRoute, 'utf8')
fs.writeFileSync('app/dashboard-new/pronunciation/page.tsx', page, 'utf8')
console.log('API:', fs.statSync('app/api/pronunciation/route.ts').size)
console.log('Page:', fs.statSync('app/dashboard-new/pronunciation/page.tsx').size)
