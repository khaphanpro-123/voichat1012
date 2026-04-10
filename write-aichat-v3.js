const fs = require('fs')

const page = `"use client"

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
  const [image, setImage] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [ks, setKs] = useState<KS | null>(null)
  const [sidebarOpen, setSidebarOpen] = useState(false) // closed by default on mobile
  const [dark, setDark] = useState(true)
  const [ready, setReady] = useState(false)
  const endRef = useRef<HTMLDivElement>(null)
  const ctrl = useRef<AbortController | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

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
    // Open sidebar by default on desktop
    if (window.innerWidth >= 768) setSidebarOpen(true)
    setReady(true)
  }, [])

  useEffect(() => {
    if (!session?.user || !ready) return
    fetch("/api/ai-chat").then(r => r.json()).then(setKs).catch(() => {})
  }, [session, ready])

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }) }, [sessions, busy])

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

  const bg = dark ? "bg-gray-950" : "bg-gray-50"
  const sidebarBg = dark ? "bg-gray-900 border-gray-800" : "bg-white border-gray-200"
  const headerBg = dark ? "bg-gray-900/95 border-gray-800" : "bg-white/95 border-gray-200"
  const inputBg = dark ? "bg-gray-800/80" : "bg-white border border-gray-200"
  const msgAi = dark ? "bg-gray-800 text-gray-100" : "bg-white text-gray-900 shadow-sm border border-gray-100"
  const textColor = dark ? "text-gray-100" : "text-gray-900"
  const subColor = dark ? "text-gray-400" : "text-gray-500"
  const borderColor = dark ? "border-gray-800" : "border-gray-200"
  const hoverBg = dark ? "hover:bg-gray-800" : "hover:bg-gray-50"

  const save = (list: CS[]) => { setSessions(list); localStorage.setItem(SK, JSON.stringify(list)) }
  const active = sessions.find(s => s.id === activeId) ?? null
  const msgs = active?.messages ?? []

  const newChat = () => {
    const s: CS = { id: uid(), title: "New conversation", messages: [], createdAt: Date.now() }
    save([s, ...sessions]); setActiveId(s.id); localStorage.setItem(AK, s.id)
    if (window.innerWidth < 768) setSidebarOpen(false)
  }

  const delChat = (id: string, e: React.MouseEvent) => {
    e.stopPropagation()
    const list = sessions.filter(s => s.id !== id); save(list)
    if (activeId === id) { const next = list[0]?.id ?? null; setActiveId(next); if (next) localStorage.setItem(AK, next) }
  }

  const selectChat = (id: string) => {
    setActiveId(id); localStorage.setItem(AK, id)
    if (window.innerWidth < 768) setSidebarOpen(false)
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

  const visionSupported = ks ? (ks.openai || ks.gemini) : true
  const conn = ks ? [ks.groq && "Groq", ks.openai && "OpenAI", ks.gemini && "Gemini"].filter(Boolean) : []

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
    const userMsg: Msg = { role: "user", content: text || (image ? "Please analyze this image in detail." : ""), ...(image ? { image } : {}) }
    const cur: Msg[] = [...base, userMsg]
    const curForDisplay = cur.map(m => m.image ? { ...m, image: undefined } : m)
    setMsgs(sid, curForDisplay); setInput(""); setImage(null); setBusy(true)
    if (textareaRef.current) textareaRef.current.style.height = "auto"
    ctrl.current = new AbortController()
    try {
      const res = await fetch("/api/ai-chat", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: cur }), signal: ctrl.current.signal,
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        setMsgs(sid, [...curForDisplay, { role: "assistant", content: "Error: " + (err.message ?? err.error ?? "Unknown") }])
        return
      }
      const reader = res.body!.getReader(); const dec = new TextDecoder(); let out = ""
      setMsgs(sid, [...curForDisplay, { role: "assistant", content: "" }])
      while (true) {
        const { done, value } = await reader.read(); if (done) break
        for (const line of dec.decode(value, { stream: true }).split("\\n")) {
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

  if (!ready) return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center">
      <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
    </div>
  )

  return (
    <DashboardLayout>
      <div className={\`flex flex-col \${bg} transition-colors duration-200\`} style={{ height: "100dvh" }}>

        {/* Top header bar - full width */}
        <div className={\`flex items-center gap-2 px-3 py-2.5 border-b \${headerBg} backdrop-blur-sm flex-shrink-0 z-10\`}>
          {/* Sidebar toggle - only show on mobile/tablet, hidden on lg since DashboardLayout handles it */}
          <button
            onClick={() => setSidebarOpen(v => !v)}
            className={\`lg:flex p-2 rounded-lg \${hoverBg} \${subColor} transition-colors flex-shrink-0\`}
            aria-label="Toggle chat history"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01" />
            </svg>
          </button>

          <div className="flex-1 min-w-0">
            <h1 className={\`text-sm font-semibold \${textColor} truncate\`}>
              {active ? active.title : "EnglishPal AI"}
            </h1>
            {conn.length > 0 && (
              <p className="text-xs text-green-500 truncate hidden sm:block">{conn.join(" · ")}</p>
            )}
          </div>

          <button onClick={newChat} className="flex-shrink-0 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium transition-colors">
            + New
          </button>

          <button onClick={toggleDark} className={\`flex-shrink-0 p-2 rounded-lg \${hoverBg} \${subColor} transition-colors\`}>
            {dark
              ? <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364-6.364l-.707.707M6.343 17.657l-.707.707M17.657 17.657l-.707-.707M6.343 6.343l-.707-.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
              : <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" /></svg>
            }
          </button>
        </div>

        {/* Body: sidebar + chat */}
        <div className="flex flex-1 min-h-0 overflow-hidden">

          {/* Sidebar - slides in/out */}
          <div className={\`
            flex-shrink-0 flex flex-col border-r \${sidebarBg} transition-all duration-200 overflow-hidden
            \${sidebarOpen ? "w-64" : "w-0"}
          \`}>
            {/* AI Connection status */}
            {ks && (
              <div className={\`px-3 py-2 border-b \${borderColor}\`}>
                <p className={\`text-xs \${subColor} mb-1\`}>AI Connection</p>
                <div className="flex flex-wrap gap-1">
                  {[{ l: "Groq", ok: ks.groq }, { l: "OpenAI", ok: ks.openai }, { l: "Gemini", ok: ks.gemini }].map(p => (
                    <span key={p.l} className={\`text-xs px-2 py-0.5 rounded-full \${p.ok ? "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400" : dark ? "bg-gray-800 text-gray-500" : "bg-gray-100 text-gray-400"}\`}>
                      {p.ok ? "✓" : "✗"} {p.l}
                    </span>
                  ))}
                </div>
                {conn.length === 0 && <a href="/settings" className="text-xs text-indigo-400 hover:underline mt-1 block">Add API key in Settings</a>}
              </div>
            )}

            {/* Session list */}
            <div className="flex-1 overflow-y-auto py-1">
              {sessions.length === 0
                ? <p className={\`text-xs \${subColor} text-center mt-8 px-3\`}>No conversations yet</p>
                : sessions.map(s => (
                  <div key={s.id} onClick={() => selectChat(s.id)}
                    className={\`group flex items-center gap-2 px-3 py-2.5 cursor-pointer transition-colors \${hoverBg} \${activeId === s.id ? (dark ? "bg-gray-800 border-l-2 border-indigo-500" : "bg-indigo-50 border-l-2 border-indigo-500") : ""}\`}>
                    <div className="min-w-0 flex-1">
                      <p className={\`text-sm \${textColor} truncate leading-tight\`}>{s.title}</p>
                      <p className={\`text-xs \${subColor}\`}>{s.messages.length} messages</p>
                    </div>
                    <button onClick={e => delChat(s.id, e)} className={\`opacity-0 group-hover:opacity-100 \${subColor} hover:text-red-400 text-xs transition-opacity flex-shrink-0\`}>✕</button>
                  </div>
                ))
              }
            </div>
          </div>

          {/* Overlay for mobile when sidebar open */}
          {sidebarOpen && (
            <div className="fixed inset-0 bg-black/30 z-10 md:hidden" onClick={() => setSidebarOpen(false)} />
          )}

          {/* Chat area */}
          <div className="flex-1 flex flex-col min-w-0 min-h-0">

            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-3 sm:px-4 py-4 space-y-3"
              onDrop={e => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) handleFile(f) }}
              onDragOver={e => e.preventDefault()}>

              {msgs.length === 0 && (
                <div className="flex flex-col items-center justify-center h-full text-center py-8 px-4">
                  <div className={\`w-14 h-14 rounded-2xl \${dark ? "bg-indigo-600/20" : "bg-indigo-50"} flex items-center justify-center mb-3\`}>
                    <svg className="w-7 h-7 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                    </svg>
                  </div>
                  <h2 className={\`text-lg font-semibold \${textColor} mb-1\`}>EnglishPal AI</h2>
                  <p className={\`\${subColor} text-sm max-w-xs mb-1\`}>AI assistant personalized to your learning data.</p>
                  <p className={\`\${subColor} text-xs mb-4\`}>Paste or upload images to ask questions.</p>
                  {conn.length > 0 && <p className="text-xs text-green-500 mb-3">Connected: {conn.join(", ")}</p>}
                  {conn.length === 0 && ks && <a href="/settings" className="text-sm text-indigo-400 hover:underline mb-4 block">Go to Settings to add API key</a>}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 w-full max-w-sm">
                    {QUICK.map(q => (
                      <button key={q} onClick={() => setInput(q)}
                        className={\`text-left text-xs sm:text-sm px-3 py-2 rounded-xl \${dark ? "bg-gray-800 hover:bg-gray-700 text-gray-300" : "bg-white hover:bg-gray-50 text-gray-700 border border-gray-200"} transition-colors\`}>
                        {q}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {msgs.map((m, i) => (
                <div key={i} className={\`flex \${m.role === "user" ? "justify-end" : "justify-start"}\`}>
                  <div className={\`max-w-[85%] sm:max-w-[75%] rounded-2xl px-3 sm:px-4 py-2.5 text-sm leading-relaxed \${
                    m.role === "user"
                      ? "bg-indigo-600 text-white rounded-br-sm"
                      : \`\${msgAi} rounded-bl-sm\`
                  }\`}>
                    {m.image && <img src={m.image} alt="uploaded" className="max-w-full rounded-xl mb-2 max-h-48 object-contain" />}
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
            <div className={\`px-3 sm:px-4 py-2.5 border-t \${borderColor} flex-shrink-0 \${dark ? "bg-gray-900/80" : "bg-white/80"} backdrop-blur-sm\`}>
              {/* Vision warning */}
              {image && !visionSupported && (
                <div className="mb-2 flex items-start gap-2 px-3 py-2 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-400 text-xs">
                  <svg className="w-4 h-4 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
                  </svg>
                  <span>Image analysis needs <strong>OpenAI</strong> or <strong>Gemini</strong> key. <a href="/settings" className="underline">Add in Settings</a>.</span>
                </div>
              )}

              {/* Image preview */}
              {image && (
                <div className="mb-2 relative inline-block">
                  <img src={image} alt="preview" className="h-16 rounded-xl object-cover border-2 border-indigo-400" />
                  <button onClick={() => setImage(null)} className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-red-500 text-white rounded-full text-xs flex items-center justify-center hover:bg-red-600">✕</button>
                </div>
              )}

              <div className={\`flex gap-2 items-end rounded-2xl \${inputBg} px-3 py-2\`}>
                <button onClick={() => fileRef.current?.click()} className={\`flex-shrink-0 p-1.5 rounded-lg \${subColor} hover:text-indigo-500 transition-colors\`} title="Upload image">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </button>
                <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); e.target.value = "" }} />

                <textarea ref={textareaRef} value={input} onChange={e => setInput(e.target.value)}
                  onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send() } }}
                  placeholder="Message... (Enter to send)"
                  rows={1} className={\`flex-1 resize-none bg-transparent \${textColor} placeholder-gray-400 text-sm focus:outline-none\`}
                  style={{ minHeight: "32px", maxHeight: "120px" }}
                  onInput={e => { const el = e.currentTarget; el.style.height = "auto"; el.style.height = Math.min(el.scrollHeight, 120) + "px" }}
                />

                {busy
                  ? <button onClick={() => ctrl.current?.abort()} className="flex-shrink-0 p-1.5 rounded-lg bg-red-500 hover:bg-red-400 text-white transition-colors">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                  : <button onClick={send} disabled={(!input.trim() && !image) || (!!image && !visionSupported)}
                      className="flex-shrink-0 p-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white transition-colors">
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" /></svg>
                    </button>
                }
              </div>
              <p className={\`text-xs \${subColor} text-center mt-1\`}>Ctrl+V to paste image · Drag & drop</p>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}
`

fs.writeFileSync('app/dashboard-new/ai-chat/page.tsx', page, 'utf8')
console.log('Written:', fs.statSync('app/dashboard-new/ai-chat/page.tsx').size, 'bytes')
