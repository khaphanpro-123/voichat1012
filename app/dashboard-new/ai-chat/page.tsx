"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { useSession } from "next-auth/react"
import DashboardLayout from "@/components/DashboardLayout"

type Role = "user" | "assistant"
interface Msg { role: Role; content: string; image?: string }
interface CS { id: string; title: string; messages: Msg[]; createdAt: number }
interface KS { openai: boolean; groq: boolean; gemini: boolean }

const SK = "aic_sessions", AK = "aic_active"
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2)

const QUICK = [
  "Explain present perfect tense",
  "Fix grammar in this sentence",
  "Common business vocabulary",
  "Review vocabulary I learned",
]

export default function AiChatPage() {
  const { data: session } = useSession()
  const [sessions, setSessions] = useState<CS[]>([])
  const [activeId, setActiveId] = useState<string | null>(null)
  const [input, setInput] = useState("")
  const [image, setImage] = useState<string | null>(null) // base64
  const [busy, setBusy] = useState(false)
  const [ks, setKs] = useState<KS | null>(null)
  const [sidebar, setSidebar] = useState(true)
  const [dark, setDark] = useState(true)
  const [ready, setReady] = useState(false)
  const endRef = useRef<HTMLDivElement>(null)
  const ctrl = useRef<AbortController | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const d = dark
    ? { bg: "bg-gray-950", sidebar: "bg-gray-900 border-gray-800", header: "bg-gray-900 border-gray-800", input: "bg-gray-800 text-gray-100 placeholder-gray-500", msg: "bg-gray-800 text-gray-100", text: "text-gray-100", sub: "text-gray-400", border: "border-gray-800", hover: "hover:bg-gray-800" }
    : { bg: "bg-gray-50", sidebar: "bg-white border-gray-200", header: "bg-white border-gray-200", input: "bg-white text-gray-900 placeholder-gray-400 border border-gray-200", msg: "bg-white text-gray-900 shadow-sm border border-gray-100", text: "text-gray-900", sub: "text-gray-500", border: "border-gray-200", hover: "hover:bg-gray-100" }

  useEffect(() => {
    try {
      const s: CS[] = JSON.parse(localStorage.getItem(SK) || "[]")
      setSessions(s)
      const last = localStorage.getItem(AK)
      if (last && s.find(x => x.id === last)) setActiveId(last)
      else if (s.length > 0) setActiveId(s[0].id)
    } catch {}
    const savedDark = localStorage.getItem("aic_dark")
    if (savedDark !== null) setDark(savedDark === "1")
    setReady(true)
  }, [])

  useEffect(() => {
    if (!session?.user || !ready) return
    fetch("/api/ai-chat").then(r => r.json()).then(setKs).catch(() => {})
  }, [session, ready])

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }) }, [sessions, busy])

  // Paste image from clipboard
  useEffect(() => {
    const onPaste = (e: ClipboardEvent) => {
      const item = Array.from(e.clipboardData?.items || []).find(i => i.type.startsWith("image/"))
      if (!item) return
      const file = item.getAsFile()
      if (!file) return
      const reader = new FileReader()
      reader.onload = ev => setImage(ev.target?.result as string)
      reader.readAsDataURL(file)
    }
    window.addEventListener("paste", onPaste)
    return () => window.removeEventListener("paste", onPaste)
  }, [])

  const toggleDark = () => {
    const next = !dark
    setDark(next)
    localStorage.setItem("aic_dark", next ? "1" : "0")
  }

  const save = (list: CS[]) => { setSessions(list); localStorage.setItem(SK, JSON.stringify(list)) }
  const active = sessions.find(s => s.id === activeId) ?? null
  const msgs = active?.messages ?? []

  const newChat = () => {
    const s: CS = { id: uid(), title: "New conversation", messages: [], createdAt: Date.now() }
    save([s, ...sessions]); setActiveId(s.id); localStorage.setItem(AK, s.id)
  }

  const delChat = (id: string, e: React.MouseEvent) => {
    e.stopPropagation()
    const list = sessions.filter(s => s.id !== id); save(list)
    if (activeId === id) { const next = list[0]?.id ?? null; setActiveId(next); if (next) localStorage.setItem(AK, next) }
  }

  const setMsgs = useCallback((id: string, m: Msg[]) => {
    setSessions(prev => {
      const list = prev.map(s => {
        if (s.id !== id) return s
        return { ...s, messages: m, title: m.find(x => x.role === "user")?.content?.slice(0, 40) || s.title }
      })
      localStorage.setItem(SK, JSON.stringify(list)); return list
    })
  }, [])

  const handleFile = (file: File) => {
    if (!file.type.startsWith("image/")) return
    const reader = new FileReader()
    reader.onload = ev => setImage(ev.target?.result as string)
    reader.readAsDataURL(file)
  }

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault()
    const file = e.dataTransfer.files[0]
    if (file) handleFile(file)
  }

  const send = useCallback(async () => {
    const text = input.trim()
    if ((!text && !image) || busy) return
    let sid = activeId
    if (!sid) {
      const s: CS = { id: uid(), title: text.slice(0, 40) || "Image question", messages: [], createdAt: Date.now() }
      setSessions(prev => { const l = [s, ...prev]; localStorage.setItem(SK, JSON.stringify(l)); return l })
      sid = s.id; setActiveId(sid); localStorage.setItem(AK, sid)
    }
    const base = sessions.find(s => s.id === sid)?.messages ?? []
    const userMsg: Msg = { role: "user", content: text || (image ? "Please analyze this image in detail and explain what you see." : ""), ...(image ? { image } : {}) }
    const cur: Msg[] = [...base, userMsg]
    const curForDisplay = cur.map(m => m.image ? { ...m, image: undefined } : m)
setMsgs(sid, curForDisplay); setInput(""); setImage(null); setBusy(true)
    if (textareaRef.current) { textareaRef.current.style.height = "auto" }
    ctrl.current = new AbortController()
    try {
      const res = await fetch("/api/ai-chat", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: cur }), signal: ctrl.current.signal,
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        setMsgs(sid, [...curForDisplay, { role: "assistant", content: "Error: " + (err.message ?? err.error ?? "Unknown error") }])
        return
      }
      const reader = res.body!.getReader(); const dec = new TextDecoder(); let out = ""
      setMsgs(sid, [...curForDisplay, { role: "assistant", content: "" }])
      while (true) {
        const { done, value } = await reader.read(); if (done) break
        for (const line of dec.decode(value, { stream: true }).split("\n")) {
          if (!line.startsWith("data: ")) continue
          const d2 = line.slice(6).trim(); if (d2 === "[DONE]") break
          try { out += JSON.parse(d2).choices?.[0]?.delta?.content ?? ""; setMsgs(sid!, [...curForDisplay, { role: "assistant", content: out }]) } catch {}
        }
      }
    } catch (e) {
      const err = e as Error
      if (err.name !== "AbortError") setMsgs(sid, [...curForDisplay, { role: "assistant", content: "Connection error. Please try again." }])
    } finally { setBusy(false); ctrl.current = null }
  }, [input, image, busy, activeId, sessions, setMsgs])

  const conn = ks ? [ks.groq && "Groq", ks.openai && "OpenAI", ks.gemini && "Gemini"].filter(Boolean) : []

  if (!ready) return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center">
      <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
    </div>
  )

  return (
    <DashboardLayout>
      <div className={`flex ${d.bg} transition-colors duration-200`} style={{ height: "100vh" }}>

        {/* Sidebar */}
        <div className={`${sidebar ? "w-64" : "w-0"} transition-all duration-200 overflow-hidden flex-shrink-0 border-r ${d.sidebar} flex flex-col`}>
          <div className={`p-3 border-b ${d.border} flex gap-2`}>
            <button onClick={newChat} className="flex-1 py-2 px-3 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium transition-colors">
              + New chat
            </button>
            <button onClick={toggleDark} className={`p-2 rounded-lg ${d.hover} ${d.sub} transition-colors`} title="Toggle theme">
              {dark ? (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364-6.364l-.707.707M6.343 17.657l-.707.707M17.657 17.657l-.707-.707M6.343 6.343l-.707-.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
              ) : (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" /></svg>
              )}
            </button>
          </div>

          {ks && (
            <div className={`px-3 py-2 border-b ${d.border}`}>
              <p className={`text-xs ${d.sub} mb-1`}>AI Connection</p>
              <div className="flex flex-wrap gap-1">
                {[{ l: "Groq", ok: ks.groq }, { l: "OpenAI", ok: ks.openai }, { l: "Gemini", ok: ks.gemini }].map(p => (
                  <span key={p.l} className={`text-xs px-2 py-0.5 rounded-full ${p.ok ? "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300" : dark ? "bg-gray-800 text-gray-500" : "bg-gray-100 text-gray-400"}`}>
                    {p.ok ? "✓" : "✗"} {p.l}
                  </span>
                ))}
              </div>
              {conn.length === 0 && <a href="/settings" className="text-xs text-indigo-400 hover:underline mt-1 block">Add API key in Settings</a>}
            </div>
          )}

          <div className="flex-1 overflow-y-auto">
            {sessions.length === 0
              ? <p className={`text-xs ${d.sub} text-center mt-6 px-3`}>No conversations yet</p>
              : sessions.map(s => (
                <div key={s.id} onClick={() => { setActiveId(s.id); localStorage.setItem(AK, s.id) }}
                  className={`group flex items-center justify-between px-3 py-2.5 cursor-pointer transition-colors ${d.hover} ${activeId === s.id ? (dark ? "bg-gray-800 border-l-2 border-indigo-500" : "bg-indigo-50 border-l-2 border-indigo-500") : ""}`}>
                  <div className="min-w-0 flex-1">
                    <p className={`text-sm ${d.text} truncate`}>{s.title}</p>
                    <p className={`text-xs ${d.sub}`}>{s.messages.length} messages</p>
                  </div>
                  <button onClick={e => delChat(s.id, e)} className={`opacity-0 group-hover:opacity-100 ${d.sub} hover:text-red-400 ml-2 text-xs transition-opacity`}>✕</button>
                </div>
              ))
            }
          </div>
        </div>

        {/* Main */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Header */}
          <div className={`flex items-center gap-3 px-4 py-3 border-b ${d.header} flex-shrink-0`}>
            <button onClick={() => setSidebar(v => !v)} className={`${d.sub} hover:text-indigo-500 transition-colors`}>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg>
            </button>
            <h1 className={`text-base font-semibold ${d.text}`}>EnglishPal AI</h1>
            {active && <span className={`text-sm ${d.sub} truncate`}>{active.title}</span>}
            <div className="ml-auto flex items-center gap-2">
              {conn.length > 0 && <span className="text-xs text-green-500 hidden sm:block">{conn.join(" · ")}</span>}
              <button onClick={toggleDark} className={`p-1.5 rounded-lg ${d.hover} ${d.sub} transition-colors sm:hidden`}>
                {dark ? "☀️" : "🌙"}
              </button>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4" onDrop={onDrop} onDragOver={e => e.preventDefault()}>
            {msgs.length === 0 && (
              <div className="flex flex-col items-center justify-center h-full text-center py-12">
                <div className={`w-16 h-16 rounded-2xl ${dark ? "bg-indigo-600/20" : "bg-indigo-50"} flex items-center justify-center mb-4`}>
                  <svg className="w-8 h-8 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" /></svg>
                </div>
                <h2 className={`text-xl font-semibold ${d.text} mb-2`}>EnglishPal AI</h2>
                <p className={`${d.sub} text-sm max-w-sm mb-1`}>AI assistant personalized to your learning data.</p>
                <p className={`${d.sub} text-xs mb-4`}>You can also paste or upload images to ask questions.</p>
                {conn.length > 0 && <p className="text-xs text-green-500 mb-4">Connected: {conn.join(", ")}</p>}
                {conn.length === 0 && ks && <a href="/settings" className="text-sm text-indigo-400 hover:underline mb-4 block">Go to Settings to add API key</a>}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 w-full max-w-md">
                  {QUICK.map(q => (
                    <button key={q} onClick={() => setInput(q)}
                      className={`text-left text-sm px-3 py-2 rounded-xl ${dark ? "bg-gray-800 hover:bg-gray-700 text-gray-300" : "bg-white hover:bg-gray-50 text-gray-700 border border-gray-200"} transition-colors`}>
                      {q}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {msgs.map((m, i) => (
              <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                  m.role === "user"
                    ? "bg-indigo-600 text-white rounded-br-sm"
                    : `${d.msg} rounded-bl-sm`
                }`}>
                  {m.image && (
                    <img src={m.image} alt="uploaded" className="max-w-full rounded-xl mb-2 max-h-64 object-contain" />
                  )}
                  {m.content ? (
                    <span className="whitespace-pre-wrap">{m.content}</span>
                  ) : (busy && i === msgs.length - 1 ? (
                    <span className="flex gap-1 items-center h-4">
                      <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                      <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                      <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                    </span>
                  ) : null)}
                </div>
              </div>
            ))}
            <div ref={endRef} />
          </div>

          {/* Input area */}
          <div className={`px-4 py-3 border-t ${d.header} flex-shrink-0`}>
            {/* Image preview */}
            {image && (
              <div className="mb-2 relative inline-block">
                <img src={image} alt="preview" className="h-20 rounded-xl object-cover border border-indigo-400" />
                <button onClick={() => setImage(null)}
                  className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-red-500 text-white rounded-full text-xs flex items-center justify-center hover:bg-red-600">✕</button>
              </div>
            )}

            <div className={`flex gap-2 items-end max-w-4xl mx-auto rounded-2xl ${dark ? "bg-gray-800" : "bg-white border border-gray-200"} px-3 py-2`}>
              {/* Image upload button */}
              <button onClick={() => fileRef.current?.click()}
                className={`flex-shrink-0 p-1.5 rounded-lg ${d.sub} hover:text-indigo-500 transition-colors`} title="Upload image">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </button>
              <input ref={fileRef} type="file" accept="image/*" className="hidden"
                onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); e.target.value = "" }} />

              <textarea ref={textareaRef} value={input} onChange={e => setInput(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send() } }}
                placeholder="Type a message or paste an image... (Enter to send)"
                rows={1} className={`flex-1 resize-none bg-transparent ${d.text} placeholder-gray-400 text-sm focus:outline-none`}
                style={{ minHeight: "36px", maxHeight: "128px" }}
                onInput={e => { const el = e.currentTarget; el.style.height = "auto"; el.style.height = Math.min(el.scrollHeight, 128) + "px" }}
              />

              {busy
                ? <button onClick={() => ctrl.current?.abort()}
                    className="flex-shrink-0 p-1.5 rounded-lg bg-red-500 hover:bg-red-400 text-white transition-colors">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                  </button>
                : <button onClick={send} disabled={!input.trim() && !image}
                    className="flex-shrink-0 p-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white transition-colors">
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" /></svg>
                  </button>
              }
            </div>
            <p className={`text-xs ${d.sub} text-center mt-1.5`}>Paste image with Ctrl+V · Drag & drop · or click the image icon</p>
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}
