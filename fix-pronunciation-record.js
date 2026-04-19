const fs = require('fs')

const page = `"use client"

import { useState, useRef, useEffect, useCallback } from "react"
import { useSession } from "next-auth/react"
import DashboardLayout from "@/components/DashboardLayout"

interface Msg {
  role: "user" | "assistant"
  content: string
  audioUrl?: string // blob URL of recorded audio
}

function extractMispronouncedWords(text: string): string[] {
  const matches = text.match(/\\/([a-zA-Z]+)\\//g) || []
  return [...new Set(matches.map(m => m.replace(/\\//g, "")))]
}

function MessageContent({ content, onSpeak }: { content: string; onSpeak: (word: string) => void }) {
  const words = extractMispronouncedWords(content)
  return (
    <div>
      <p className="text-sm text-gray-800 whitespace-pre-wrap leading-relaxed">{content}</p>
      {words.length > 0 && (
        <div className="mt-3 pt-3 border-t border-violet-100">
          <p className="text-xs text-violet-600 font-semibold mb-2">Listen to correct pronunciation:</p>
          <div className="flex flex-wrap gap-2">
            {words.map(word => (
              <button key={word} onClick={() => onSpeak(word)}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-violet-100 hover:bg-violet-200 text-violet-800 rounded-full text-sm font-medium transition-colors group">
                <svg className="w-3.5 h-3.5 text-violet-600" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02z"/>
                </svg>
                <span>/{word}/</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

export default function PronunciationPage() {
  const { data: session } = useSession()
  const [messages, setMessages] = useState<Msg[]>([])
  const [listening, setListening] = useState(false)
  const [processing, setProcessing] = useState(false)
  const [speaking, setSpeaking] = useState(false)
  const [speakingWord, setSpeakingWord] = useState<string | null>(null)
  const [transcript, setTranscript] = useState("")
  const [autoSpeak, setAutoSpeak] = useState(true)
  const [supported, setSupported] = useState(true)
  const [recordingTime, setRecordingTime] = useState(0)
  const recRef = useRef<any>(null)
  const mediaRecRef = useRef<MediaRecorder | null>(null)
  const audioChunksRef = useRef<Blob[]>([])
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const endRef = useRef<HTMLDivElement>(null)
  const historyRef = useRef<Msg[]>([])

  useEffect(() => { historyRef.current = messages }, [messages])
  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }) }, [messages, processing])
  useEffect(() => {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    if (!SR) setSupported(false)
    return () => {
      // Cleanup blob URLs on unmount
      historyRef.current.forEach(m => { if (m.audioUrl) URL.revokeObjectURL(m.audioUrl) })
    }
  }, [])

  const speakWord = useCallback((word: string) => {
    window.speechSynthesis?.cancel()
    setSpeakingWord(word)
    const utt = new SpeechSynthesisUtterance(word)
    utt.lang = "en-US"; utt.rate = 0.7; utt.pitch = 1.1
    const voices = window.speechSynthesis.getVoices()
    const enVoice = voices.find(v => v.lang === "en-US" && v.name.includes("Female"))
      || voices.find(v => v.lang === "en-US") || voices.find(v => v.lang.startsWith("en"))
    if (enVoice) utt.voice = enVoice
    utt.onend = () => setSpeakingWord(null)
    utt.onerror = () => setSpeakingWord(null)
    window.speechSynthesis.speak(utt)
  }, [])

  const speak = useCallback((text: string) => {
    if (!autoSpeak) return
    window.speechSynthesis?.cancel()
    const utt = new SpeechSynthesisUtterance(text)
    utt.lang = "en-US"; utt.rate = 0.9
    const voices = window.speechSynthesis.getVoices()
    const enVoice = voices.find(v => v.lang.startsWith("en") && v.name.includes("Female")) || voices.find(v => v.lang.startsWith("en"))
    if (enVoice) utt.voice = enVoice
    utt.onstart = () => setSpeaking(true)
    utt.onend = () => setSpeaking(false)
    window.speechSynthesis.speak(utt)
  }, [autoSpeak])

  const sendToAI = useCallback(async (userText: string, audioUrl?: string) => {
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

  const startListening = async () => {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    if (!SR) return
    window.speechSynthesis?.cancel()

    // Start MediaRecorder for audio recording
    let audioUrl: string | undefined
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      audioChunksRef.current = []
      const mediaRec = new MediaRecorder(stream, { mimeType: MediaRecorder.isTypeSupported("audio/webm") ? "audio/webm" : "audio/ogg" })
      mediaRec.ondataavailable = e => { if (e.data.size > 0) audioChunksRef.current.push(e.data) }
      mediaRec.onstop = () => {
        const blob = new Blob(audioChunksRef.current, { type: mediaRec.mimeType })
        audioUrl = URL.createObjectURL(blob)
        stream.getTracks().forEach(t => t.stop())
      }
      mediaRec.start(100)
      mediaRecRef.current = mediaRec
    } catch {
      // Microphone permission denied or not available - continue without recording
    }

    // Start recording timer
    setRecordingTime(0)
    timerRef.current = setInterval(() => setRecordingTime(t => t + 1), 1000)

    // Start STT
    const rec = new SR()
    rec.continuous = false; rec.interimResults = true; rec.lang = "en-US"
    let finalText = ""
    rec.onstart = () => { setListening(true); setTranscript("") }
    rec.onresult = (e: any) => {
      let interim = ""
      for (let i = 0; i < e.results.length; i++) {
        if (e.results[i].isFinal) finalText += e.results[i][0].transcript
        else interim += e.results[i][0].transcript
      }
      setTranscript(finalText || interim)
    }
    rec.onend = () => {
      setListening(false); recRef.current = null
      if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null }
      setRecordingTime(0)
      // Stop media recorder
      if (mediaRecRef.current && mediaRecRef.current.state !== "inactive") {
        mediaRecRef.current.stop()
      }
      if (finalText.trim()) {
        // Wait a tick for onstop to fire and create audioUrl
        setTimeout(() => {
          setMessages(prev => [...prev, { role: "user", content: finalText.trim(), audioUrl }])
          setTranscript("")
          sendToAI(finalText.trim(), audioUrl)
        }, 200)
      } else { setTranscript("") }
    }
    rec.onerror = () => {
      setListening(false); recRef.current = null
      if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null }
      setRecordingTime(0)
      if (mediaRecRef.current && mediaRecRef.current.state !== "inactive") mediaRecRef.current.stop()
      setTranscript("")
    }
    recRef.current = rec; rec.start()
  }

  const stopListening = () => {
    recRef.current?.stop()
    if (mediaRecRef.current && mediaRecRef.current.state !== "inactive") mediaRecRef.current.stop()
  }

  const formatTime = (s: number) => \`\${Math.floor(s / 60).toString().padStart(2, "0")}:\${(s % 60).toString().padStart(2, "0")}\`

  return (
    <DashboardLayout>
      <div className="flex flex-col h-screen bg-gradient-to-br from-violet-50 via-white to-indigo-50">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 bg-white/80 backdrop-blur-sm border-b border-violet-100 flex-shrink-0">
          <div>
            <h1 className="text-base font-bold text-gray-900">Pronunciation Coach</h1>
            <p className="text-xs text-gray-500">Speak English — hear your recording + get feedback</p>
          </div>
          <div className="flex items-center gap-3">
            <label className="flex items-center gap-1.5 text-xs text-gray-600 cursor-pointer">
              <input type="checkbox" checked={autoSpeak} onChange={e => setAutoSpeak(e.target.checked)} className="rounded" />
              Auto-speak
            </label>
            {speaking && <button onClick={() => window.speechSynthesis?.cancel()} className="text-xs text-violet-600 hover:underline">Stop</button>}
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
              <p className="text-gray-500 text-sm max-w-xs mb-2">Press the mic and speak in English.</p>
              <p className="text-gray-400 text-xs max-w-xs mb-6">Your voice will be recorded so you can listen back. If you mispronounce a word, tap the <span className="bg-violet-100 text-violet-700 px-1.5 py-0.5 rounded-full text-xs font-medium">🔊 /word/</span> button to hear the correct pronunciation.</p>
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
                <div className="max-w-[80%] space-y-2">
                  {/* Text bubble */}
                  <div className="bg-gradient-to-r from-violet-600 to-indigo-600 text-white rounded-2xl rounded-br-sm px-4 py-3 text-sm shadow-md">
                    {m.content}
                  </div>
                  {/* Audio playback */}
                  {m.audioUrl && (
                    <div className="bg-white rounded-xl px-3 py-2 shadow-sm border border-violet-100 flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-violet-100 flex items-center justify-center flex-shrink-0">
                        <svg className="w-3 h-3 text-violet-600" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z"/>
                          <path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z"/>
                        </svg>
                      </div>
                      <audio src={m.audioUrl} controls className="h-7 flex-1" style={{ minWidth: 0 }} />
                      <span className="text-xs text-gray-400 flex-shrink-0">Your voice</span>
                    </div>
                  )}
                </div>
              ) : (
                <div className="max-w-[85%] bg-white rounded-2xl rounded-bl-sm px-4 py-3 text-sm shadow-md border border-violet-100">
                  {m.content ? (
                    <MessageContent content={m.content} onSpeak={speakWord} />
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

          {speakingWord && (
            <div className="flex justify-center">
              <div className="bg-violet-600 text-white px-4 py-2 rounded-full text-sm font-medium animate-pulse">
                Speaking: /{speakingWord}/
              </div>
            </div>
          )}
          <div ref={endRef} />
        </div>

        {/* Transcript + recording indicator */}
        {(listening || transcript) && (
          <div className="px-4 py-2 bg-violet-50 border-t border-violet-100 flex-shrink-0">
            <div className="flex items-center justify-center gap-3">
              {listening && (
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                  <span className="text-xs text-red-600 font-medium">{formatTime(recordingTime)}</span>
                </div>
              )}
              <p className="text-sm text-violet-700 italic">{transcript || "Listening..."}</p>
            </div>
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
                    className={\`relative w-16 h-16 rounded-full flex items-center justify-center shadow-xl transition-all \${
                      listening ? "bg-red-500 scale-110"
                        : processing ? "bg-gray-300 cursor-not-allowed"
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
                  {listening ? "Recording... tap to stop" : processing ? "Analyzing..." : "Tap to speak & record"}
                </p>
                {messages.length > 0 && (
                  <button onClick={() => {
                    messages.forEach(m => { if (m.audioUrl) URL.revokeObjectURL(m.audioUrl) })
                    setMessages([])
                    window.speechSynthesis?.cancel()
                  }} className="text-xs text-gray-400 hover:text-red-400 transition-colors">
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

fs.writeFileSync('app/dashboard-new/pronunciation/page.tsx', page, 'utf8')
console.log('Done:', fs.statSync('app/dashboard-new/pronunciation/page.tsx').size)
