"use client"
import { useVoiceChat } from "@/contexts/VoiceChatContext"
import { usePathname, useRouter } from "next/navigation"
import { useState, useRef, useCallback, useEffect } from "react"

export default function MiniVoicePlayer() {
  const { voiceSession, stopSession } = useVoiceChat()
  const pathname = usePathname()
  const router = useRouter()
  const [pos, setPos] = useState({ x: 0, y: 80 }) // offset from bottom-right
  const dragging = useRef(false)
  const dragStart = useRef({ mx: 0, my: 0, px: 0, py: 0 })

  const onMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    dragging.current = true
    dragStart.current = { mx: e.clientX, my: e.clientY, px: pos.x, py: pos.y }
    const onMove = (ev: MouseEvent) => {
      if (!dragging.current) return
      setPos({ x: dragStart.current.px - (ev.clientX - dragStart.current.mx), y: dragStart.current.py - (ev.clientY - dragStart.current.my) })
    }
    const onUp = () => { dragging.current = false; window.removeEventListener("mousemove", onMove); window.removeEventListener("mouseup", onUp) }
    window.addEventListener("mousemove", onMove)
    window.addEventListener("mouseup", onUp)
  }, [pos])

  if (!voiceSession?.active) return null
  const isChat = pathname === "/dashboard-new/chat"

  const { listening, speaking, processing, lastText } = voiceSession

  const statusColor = listening ? "bg-red-500" : speaking ? "bg-green-500" : processing ? "bg-yellow-500" : "bg-gray-500"
  const statusLabel = listening ? "Listening..." : speaking ? "Speaking..." : processing ? "Processing..." : "Idle"

  return (
    <div
      className="fixed z-50"
      style={{ bottom: `${16 + pos.y}px`, right: `${16 + pos.x}px`, visibility: isChat ? "hidden" : "visible", pointerEvents: isChat ? "none" : "auto" }}
    >
      <div className="w-72 rounded-2xl overflow-hidden bg-gray-900 border border-white/20 shadow-2xl">
        {/* Drag header */}
        <div
          className="flex items-center gap-2 px-3 py-2 bg-gray-800 cursor-grab active:cursor-grabbing select-none"
          onMouseDown={onMouseDown}
        >
          <div className="flex flex-col gap-0.5 opacity-40 flex-shrink-0">
            <div className="flex gap-0.5">{[0,1,2].map(i=><div key={i} className="w-1 h-1 rounded-full bg-white"/>)}</div>
            <div className="flex gap-0.5">{[0,1,2].map(i=><div key={i} className="w-1 h-1 rounded-full bg-white"/>)}</div>
          </div>
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <div className={`w-2 h-2 rounded-full ${statusColor} ${listening || speaking ? "animate-pulse" : ""}`} />
            <span className="text-xs text-white font-medium">Voice Chat</span>
            <span className="text-xs text-gray-400">{statusLabel}</span>
          </div>
          <div className="flex gap-1 flex-shrink-0" onMouseDown={e => e.stopPropagation()}>
            <button onClick={() => router.push("/dashboard-new/chat")}
              className="text-gray-400 hover:text-white p-1 rounded transition-colors" title="Open Voice Chat">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
              </svg>
            </button>
            <button onClick={stopSession}
              className="text-gray-400 hover:text-red-400 p-1 rounded transition-colors" title="Stop conversation">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 10a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z" />
              </svg>
            </button>
          </div>
        </div>

        {/* Waveform + status */}
        <div className="px-4 py-3 flex items-center gap-3">
          {/* Animated bars */}
          <div className="flex items-end gap-0.5 h-8">
            {[0,1,2,3,4,5,6].map(i => (
              <div key={i}
                className={`w-1 rounded-full ${listening ? "bg-red-400" : speaking ? "bg-green-400" : "bg-gray-600"}`}
                style={{
                  height: (listening || speaking) ? `${20 + Math.sin(i * 0.8) * 12}px` : "8px",
                  animation: (listening || speaking) ? `pulse ${0.6 + i * 0.1}s ease-in-out infinite alternate` : "none",
                  animationDelay: `${i * 80}ms`
                }}
              />
            ))}
          </div>
          {lastText && (
            <p className="text-xs text-gray-300 line-clamp-2 flex-1">{lastText}</p>
          )}
        </div>
      </div>
    </div>
  )
}
