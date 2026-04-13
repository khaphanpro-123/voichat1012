"use client"

import { useState, useRef, useEffect, useCallback } from "react"
import { useSession } from "next-auth/react"
import DashboardLayout from "@/components/DashboardLayout"

interface Msg { role: "user" | "assistant"; content: string }

export default function PronunciationPage() {
  const { data: session } = useSession()
  const [messages, setMessages] = useState<Msg[]>([])
  const [listening, setListening] = useState(false)
  const [processing, setProcessing] = useState(false)
  const [speaking, setSpeaking] = useState(false)
  const [transcript, setTranscript] = useState("")
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
    const match = text.match(/\*\*RESPONSE:\*\*([\s\S]*)/)
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

  const sendToAI = useCallback(async (userText: string) => {
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
        for (const line of dec.decode(value, { stream: true }).split("\n")) {
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
    let finalText = "";     rec.onstart = () => { setListening(true); setTranscript(""); setConfidence(null) }
    rec.onresult = (e: any) => {
      let interim = ""
      for (let i = 0; i < e.results.length; i++) {
        if (e.results[i].isFinal) { finalText += e.results[i][0].transcript; finalConf = e.results[i][0].confidence }
        else interim += e.results[i][0].transcript
      }
      setTranscript(finalText || interim)
          }
    rec.onend = () => {
      setListening(false); recRef.current = null
      if (finalText.trim()) {
        setMessages(prev => [...prev, { role: "user", content: finalText.trim(),  }])
        setTranscript("")
        sendToAI(finalText.trim())
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
            <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
              {m.role === "user" ? (
                <div className="max-w-[80%]">
                  <div className="bg-gradient-to-r from-violet-600 to-indigo-600 text-white rounded-2xl rounded-br-sm px-4 py-3 text-sm shadow-md">
                    {m.content}
                  </div>
                </div>
              ) : (
                <div className="max-w-[85%] bg-white rounded-2xl rounded-bl-sm px-4 py-3 text-sm shadow-md border border-violet-100">
                  {m.content ? (
                    <p className="text-gray-800 whitespace-pre-wrap leading-relaxed text-sm">{m.content}</p>
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
                      <span className="absolute inset-[-8px] rounded-full bg-red-400/15 animate-ping" style={{ animationDelay: "0.3s" }} />
                    </>
                  )}
                  <button
                    onClick={listening ? stopListening : startListening}
                    disabled={processing}
                    className={`relative w-16 h-16 rounded-full flex items-center justify-center shadow-xl transition-all ${
                      listening
                        ? "bg-red-500 scale-110"
                        : processing
                        ? "bg-gray-300 cursor-not-allowed"
                        : "bg-gradient-to-br from-violet-500 to-indigo-600 hover:scale-105 active:scale-95"
                    }`}
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
