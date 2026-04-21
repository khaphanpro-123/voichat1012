"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { useSession } from "next-auth/react"
import { motion, AnimatePresence } from "framer-motion"
import { MessageCircle, X, Send, Minimize2, Maximize2 } from "lucide-react"

type Role = "user" | "assistant"
interface Msg { role: Role; content: string }
interface ChatSession { id: string; title: string; messages: Msg[]; createdAt: number }
interface KeyStatus { openai: boolean; groq: boolean; gemini: boolean }

const SK = "floating_aic_sessions"
const AK = "floating_aic_active"
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2)

export default function FloatingAiChat() {
  const { data: session } = useSession()
  const [isOpen, setIsOpen] = useState(false)
  const [isMinimized, setIsMinimized] = useState(false)
  const [sessions, setSessions] = useState<ChatSession[]>([])
  const [activeId, setActiveId] = useState<string | null>(null)
  const [input, setInput] = useState("")
  const [busy, setBusy] = useState(false)
  const [ks, setKs] = useState<KeyStatus | null>(null)
  const [ready, setReady] = useState(false)
  const endRef = useRef<HTMLDivElement>(null)
  const ctrl = useRef<AbortController | null>(null)

  // Load sessions from localStorage
  useEffect(() => {
    try {
      const s: ChatSession[] = JSON.parse(localStorage.getItem(SK) || "[]")
      setSessions(s)
      const last = localStorage.getItem(AK)
      if (last && s.find(x => x.id === last)) setActiveId(last)
      else if (s.length > 0) setActiveId(s[0].id)
    } catch {}
    setReady(true)
  }, [])

  // Check API keys
  useEffect(() => {
    if (!session?.user || !ready) return
    fetch("/api/ai-chat").then(r => r.json()).then(setKs).catch(() => {})
  }, [session, ready])

  // Auto-scroll to bottom
  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [sessions, busy])

  const save = (list: ChatSession[]) => {
    setSessions(list)
    localStorage.setItem(SK, JSON.stringify(list))
  }

  const active = sessions.find(s => s.id === activeId) ?? null
  const msgs = active?.messages ?? []

  const newChat = () => {
    const s: ChatSession = { id: uid(), title: "New chat", messages: [], createdAt: Date.now() }
    save([s, ...sessions])
    setActiveId(s.id)
    localStorage.setItem(AK, s.id)
  }

  const setMsgs = useCallback((id: string, m: Msg[]) => {
    setSessions(prev => {
      const list = prev.map(s => {
        if (s.id !== id) return s
        const title = m.find(x => x.role === "user")?.content.slice(0, 40) ?? s.title
        return { ...s, messages: m, title }
      })
      localStorage.setItem(SK, JSON.stringify(list))
      return list
    })
  }, [])

  const send = useCallback(async () => {
    const text = input.trim()
    if (!text || busy) return

    let sid = activeId
    if (!sid) {
      const s: ChatSession = { id: uid(), title: text.slice(0, 40), messages: [], createdAt: Date.now() }
      setSessions(prev => { const l = [s, ...prev]; localStorage.setItem(SK, JSON.stringify(l)); return l })
      sid = s.id
      setActiveId(sid)
      localStorage.setItem(AK, sid)
    }

    const base = sessions.find(s => s.id === sid)?.messages ?? []
    const cur: Msg[] = [...base, { role: "user", content: text }]
    setMsgs(sid, cur)
    setInput("")
    setBusy(true)
    ctrl.current = new AbortController()

    try {
      const res = await fetch("/api/ai-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: cur }),
        signal: ctrl.current.signal,
      })

      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        setMsgs(sid, [...cur, { role: "assistant", content: "Loi: " + (err.message ?? err.error ?? "Khong xac dinh") }])
        return
      }

      const reader = res.body!.getReader()
      const dec = new TextDecoder()
      let out = ""
      setMsgs(sid, [...cur, { role: "assistant", content: "" }])

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        for (const line of dec.decode(value, { stream: true }).split("\n")) {
          if (!line.startsWith("data: ")) continue
          const d = line.slice(6).trim()
          if (d === "[DONE]") break
          try { out += JSON.parse(d).choices?.[0]?.delta?.content ?? ""; setMsgs(sid!, [...cur, { role: "assistant", content: out }]) } catch {}
        }
      }
    } catch (e: any) {
      if (e.name !== "AbortError") setMsgs(sid, [...cur, { role: "assistant", content: "Loi ket noi. Thu lai." }])
    } finally {
      setBusy(false)
      ctrl.current = null
    }
  }, [input, busy, activeId, sessions, setMsgs])

  if (!ready || !session?.user) return null

  return (
    <>
      {/* Floating Button */}
      <AnimatePresence>
        {!isOpen && (
          <motion.button
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            onClick={() => setIsOpen(true)}
            className="fixed bottom-6 right-6 z-40 w-14 h-14 bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-full shadow-lg hover:shadow-xl flex items-center justify-center text-white hover:scale-110 transition-transform"
          >
            <MessageCircle className="w-6 h-6" />
          </motion.button>
        )}
      </AnimatePresence>

      {/* Chat Widget */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8, y: 20 }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className="fixed bottom-6 right-6 z-40 w-96 h-[600px] bg-gray-900 rounded-2xl shadow-2xl flex flex-col border border-gray-800 overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-800 bg-gray-800 flex-shrink-0">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                <h3 className="text-sm font-semibold text-white">AI Assistant</h3>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setIsMinimized(!isMinimized)}
                  className="p-1 hover:bg-gray-700 rounded-lg transition text-gray-400 hover:text-white"
                >
                  {isMinimized ? <Maximize2 className="w-4 h-4" /> : <Minimize2 className="w-4 h-4" />}
                </button>
                <button
                  onClick={() => setIsOpen(false)}
                  className="p-1 hover:bg-gray-700 rounded-lg transition text-gray-400 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Content */}
            {!isMinimized && (
              <>
                {/* Messages */}
                <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
                  {msgs.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-center py-8">
                      <MessageCircle className="w-8 h-8 text-gray-600 mb-2" />
                      <p className="text-xs text-gray-500">Start a conversation</p>
                    </div>
                  ) : (
                    msgs.map((m, i) => (
                      <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                        <div className={`max-w-[75%] rounded-lg px-3 py-2 text-xs leading-relaxed whitespace-pre-wrap ${m.role === "user" ? "bg-indigo-600 text-white rounded-br-none" : "bg-gray-800 text-gray-100 rounded-bl-none"}`}>
                          {m.content || (busy && i === msgs.length - 1
                            ? <span className="flex gap-1 items-center h-3">
                                <span className="w-1 h-1 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                                <span className="w-1 h-1 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                                <span className="w-1 h-1 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                              </span>
                            : "")}
                        </div>
                      </div>
                    ))
                  )}
                  <div ref={endRef} />
                </div>

                {/* Input */}
                <div className="px-3 py-3 border-t border-gray-800 bg-gray-800 flex-shrink-0">
                  <div className="flex gap-2 items-end">
                    <input
                      value={input}
                      onChange={e => setInput(e.target.value)}
                      onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send() } }}
                      placeholder="Ask AI..."
                      className="flex-1 bg-gray-700 text-gray-100 placeholder-gray-500 rounded-lg px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                    {busy
                      ? <button onClick={() => ctrl.current?.abort()} className="px-3 py-2 rounded-lg bg-red-600 hover:bg-red-500 text-white text-xs font-medium flex-shrink-0">Stop</button>
                      : <button onClick={send} disabled={!input.trim()} className="px-3 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white text-xs font-medium flex-shrink-0 flex items-center gap-1">
                          <Send className="w-3 h-3" />
                        </button>
                    }
                  </div>
                </div>
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
