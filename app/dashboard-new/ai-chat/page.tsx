"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { useSession } from "next-auth/react"
import DashboardLayout from "@/components/DashboardLayout"

type Role = "user" | "assistant"
interface Msg { role: Role; content: string }
interface CS { id: string; title: string; messages: Msg[]; createdAt: number }
interface KS { openai: boolean; groq: boolean; gemini: boolean }

const SK = "aic_sessions", AK = "aic_active"
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2)

export default function AiChatPage() {
  const { data: session } = useSession()
  const [sessions, setSessions] = useState<CS[]>([])
  const [activeId, setActiveId] = useState<string | null>(null)
  const [input, setInput] = useState("")
  const [busy, setBusy] = useState(false)
  const [ks, setKs] = useState<KS | null>(null)
  const [sidebar, setSidebar] = useState(true)
  const [ready, setReady] = useState(false)
  const endRef = useRef<HTMLDivElement>(null)
  const ctrl = useRef<AbortController | null>(null)

  useEffect(() => {
    try {
      const s: CS[] = JSON.parse(localStorage.getItem(SK) || "[]")
      setSessions(s)
      const last = localStorage.getItem(AK)
      if (last && s.find(x => x.id === last)) setActiveId(last)
      else if (s.length > 0) setActiveId(s[0].id)
    } catch {}
    setReady(true)
  }, [])

  useEffect(() => {
    if (!session?.user || !ready) return
    fetch("/api/ai-chat").then(r => r.json()).then(setKs).catch(() => {})
  }, [session, ready])

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [sessions, busy])

  const save = (list: CS[]) => {
    setSessions(list)
    localStorage.setItem(SK, JSON.stringify(list))
  }

  const active = sessions.find(s => s.id === activeId) ?? null
  const msgs = active?.messages ?? []

  const newChat = () => {
    const s: CS = { id: uid(), title: "New conversation", messages: [], createdAt: Date.now() }
    save([s, ...sessions])
    setActiveId(s.id)
    localStorage.setItem(AK, s.id)
  }

  const delChat = (id: string, e: React.MouseEvent) => {
    e.stopPropagation()
    const list = sessions.filter(s => s.id !== id)
    save(list)
    if (activeId === id) {
      const next = list[0]?.id ?? null
      setActiveId(next)
      if (next) localStorage.setItem(AK, next)
    }
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
      const s: CS = { id: uid(), title: text.slice(0, 40), messages: [], createdAt: Date.now() }
      setSessions(prev => { const l = [s, ...prev]; localStorage.setItem(SK, JSON.stringify(l)); return l })
      sid = s.id; setActiveId(sid); localStorage.setItem(AK, sid)
    }
    const base = sessions.find(s => s.id === sid)?.messages ?? []
    const cur: Msg[] = [...base, { role: "user", content: text }]
    setMsgs(sid, cur); setInput(""); setBusy(true)
    ctrl.current = new AbortController()
    try {
      const res = await fetch("/api/ai-chat", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: cur }), signal: ctrl.current.signal,
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        setMsgs(sid, [...cur, { role: "assistant", content: "Error: " + (err.message ?? err.error ?? "Khong xac dinh") }])
        return
      }
      const reader = res.body!.getReader(); const dec = new TextDecoder(); let out = ""
      setMsgs(sid, [...cur, { role: "assistant", content: "" }])
      while (true) {
        const { done, value } = await reader.read(); if (done) break
        for (const line of dec.decode(value, { stream: true }).split("\n")) {
          if (!line.startsWith("data: ")) continue
          const d = line.slice(6).trim(); if (d === "[DONE]") break
          try { out += JSON.parse(d).choices?.[0]?.delta?.content ?? ""; setMsgs(sid!, [...cur, { role: "assistant", content: out }]) } catch {}
        }
      }
    } catch (e) {
      const err = e as Error
      if (err.name !== "AbortError") setMsgs(sid, [...cur, { role: "assistant", content: "Connection error. Please try again." }])
    } finally { setBusy(false); ctrl.current = null }
  }, [input, busy, activeId, sessions, setMsgs])

  const conn = ks ? [ks.groq && "Groq", ks.openai && "OpenAI", ks.gemini && "Gemini"].filter(Boolean) : []

  if (!ready) return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center">
      <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
    </div>
  )

  return (
    <DashboardLayout>
      <div className="flex bg-gray-950 text-gray-100" style={{ height: "100vh" }}>
        <div className={`${sidebar ? "w-60" : "w-0"} transition-all duration-200 overflow-hidden flex-shrink-0 border-r border-gray-800 flex flex-col bg-gray-900`}>
          <div className="p-3 border-b border-gray-800">
            <button onClick={newChat} className="w-full py-2 px-3 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium">
              + New conversation
            </button>
          </div>
          {ks && (
            <div className="px-3 py-2 border-b border-gray-800">
              <p className="text-xs text-gray-500 mb-1">AI Connection</p>
              <div className="flex flex-wrap gap-1">
                {[{ l: "Groq", ok: ks.groq }, { l: "OpenAI", ok: ks.openai }, { l: "Gemini", ok: ks.gemini }].map(p => (
                  <span key={p.l} className={`text-xs px-2 py-0.5 rounded-full ${p.ok ? "bg-green-900 text-green-300" : "bg-gray-800 text-gray-500"}`}>
                    {p.ok ? "v" : "x"} {p.l}
                  </span>
                ))}
              </div>
              {conn.length === 0 && <a href="/settings" className="text-xs text-indigo-400 hover:underline mt-1 block">Add API key in Settings</a>}
            </div>
          )}
          <div className="flex-1 overflow-y-auto">
            {sessions.length === 0
              ? <p className="text-xs text-gray-600 text-center mt-6 px-3">No conversations yet</p>
              : sessions.map(s => (
                <div key={s.id} onClick={() => { setActiveId(s.id); localStorage.setItem(AK, s.id) }}
                  className={`group flex items-center justify-between px-3 py-2.5 cursor-pointer hover:bg-gray-800 ${activeId === s.id ? "bg-gray-800 border-l-2 border-indigo-500" : ""}`}>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm text-gray-200 truncate">{s.title}</p>
                    <p className="text-xs text-gray-600">{s.messages.length} messages</p>
                  </div>
                  <button onClick={e => delChat(s.id, e)} className="opacity-0 group-hover:opacity-100 text-gray-600 hover:text-red-400 ml-2 text-xs">x</button>
                </div>
              ))
            }
          </div>
        </div>
        <div className="flex-1 flex flex-col min-w-0">
          <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-800 bg-gray-900 flex-shrink-0">
            <button onClick={() => setSidebar(v => !v)} className="text-gray-400 hover:text-white">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
            <h1 className="text-base font-semibold text-white">EnglishPal AI</h1>
            {active && <span className="text-sm text-gray-500 truncate">{active.title}</span>}
          </div>
          <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
            {msgs.length === 0 && (
              <div className="flex flex-col items-center justify-center h-full text-center py-12">
                <h2 className="text-xl font-semibold text-white mb-2">EnglishPal AI</h2>
                <p className="text-gray-400 text-sm max-w-sm mb-4">AI assistant personalized to your learning data.</p>
                {conn.length > 0 && <p className="text-xs text-green-400 mb-4">Connected: {conn.join(", ")}</p>}
                {conn.length === 0 && ks && <a href="/settings" className="text-sm text-indigo-400 hover:underline mb-4 block">Go to Settings to add API key</a>}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 w-full max-w-md">
                  {["Explain present perfect tense", "Fix grammar in this sentence", "Common business vocabulary", "Review vocabulary I learned"].map(q => (
                    <button key={q} onClick={() => setInput(q)} className="text-left text-sm px-3 py-2 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-300">{q}</button>
                  ))}
                </div>
              </div>
            )}
            {msgs.map((m, i) => (
              <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap ${m.role === "user" ? "bg-indigo-600 text-white rounded-br-sm" : "bg-gray-800 text-gray-100 rounded-bl-sm"}`}>
                  {m.content || (busy && i === msgs.length - 1
                    ? <span className="flex gap-1 items-center h-4">
                        <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                        <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                        <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                      </span>
                    : "")}
                </div>
              </div>
            ))}
            <div ref={endRef} />
          </div>
          <div className="px-4 py-3 border-t border-gray-800 bg-gray-900 flex-shrink-0">
            <div className="flex gap-2 items-end max-w-4xl mx-auto">
              <textarea value={input} onChange={e => setInput(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send() } }}
                placeholder="Nhap messages... (Enter gui, Shift+Enter xuong dong)"
                rows={1} className="flex-1 resize-none bg-gray-800 text-gray-100 placeholder-gray-500 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                style={{ minHeight: "48px", maxHeight: "128px" }}
                onInput={e => { const el = e.currentTarget; el.style.height = "auto"; el.style.height = Math.min(el.scrollHeight, 128) + "px" }}
              />
              {busy
                ? <button onClick={() => ctrl.current?.abort()} className="px-4 py-3 rounded-xl bg-red-600 hover:bg-red-500 text-white text-sm font-medium flex-shrink-0">Stop</button>
                : <button onClick={send} disabled={!input.trim()} className="px-4 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white text-sm font-medium flex-shrink-0">Send</button>
              }
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}
