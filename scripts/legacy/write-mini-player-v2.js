const fs = require('fs')

const content = `"use client"

import { useState, useRef, useCallback } from "react"
import { useVideoPlayer } from "@/contexts/VideoPlayerContext"
import { usePathname, useRouter } from "next/navigation"

export default function MiniVideoPlayer() {
  const { video, dismiss } = useVideoPlayer()
  const pathname = usePathname()
  const router = useRouter()
  const [minimized, setMinimized] = useState(false)
  const [playing, setPlaying] = useState(false) // user must click to play
  const [pos, setPos] = useState({ x: 0, y: 0 })
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

  const onTouchStart = useCallback((e: React.TouchEvent) => {
    const t = e.touches[0]
    dragging.current = true
    dragStart.current = { mx: t.clientX, my: t.clientY, px: pos.x, py: pos.y }
    const onMove = (ev: TouchEvent) => {
      if (!dragging.current) return
      const touch = ev.touches[0]
      setPos({ x: dragStart.current.px - (touch.clientX - dragStart.current.mx), y: dragStart.current.py - (touch.clientY - dragStart.current.my) })
    }
    const onUp = () => { dragging.current = false; window.removeEventListener("touchmove", onMove); window.removeEventListener("touchend", onUp) }
    window.addEventListener("touchmove", onMove, { passive: true })
    window.addEventListener("touchend", onUp)
  }, [pos])

  // Don't render on listening page - full player is there, prevents double audio
  if (!video?.videoId || pathname === "/dashboard-new/listening") return null

  return (
    <div
      className="fixed z-50"
      style={{ bottom: \`\${16 + pos.y}px\`, right: \`\${16 + pos.x}px\`, width: minimized ? "200px" : "320px" }}
    >
      <div className="rounded-2xl overflow-hidden border border-white/20 bg-gray-900 shadow-2xl">
        {/* Drag handle + controls */}
        <div
          className="flex items-center justify-between px-3 py-2 bg-gray-800 gap-2 cursor-grab active:cursor-grabbing select-none"
          onMouseDown={onMouseDown}
          onTouchStart={onTouchStart}
        >
          <div className="flex flex-col gap-0.5 flex-shrink-0 opacity-40">
            <div className="flex gap-0.5">{[0,1,2].map(i=><div key={i} className="w-1 h-1 rounded-full bg-white"/>)}</div>
            <div className="flex gap-0.5">{[0,1,2].map(i=><div key={i} className="w-1 h-1 rounded-full bg-white"/>)}</div>
          </div>

          <div className="min-w-0 flex-1 mx-2">
            <p className="text-xs text-white font-medium truncate">{video.title}</p>
            {video.channel && <p className="text-xs text-gray-400 truncate">{video.channel}</p>}
          </div>

          <div className="flex items-center gap-1 flex-shrink-0" onMouseDown={e => e.stopPropagation()}>
            <button onClick={() => setMinimized(v => !v)} className="text-gray-400 hover:text-white p-1 rounded transition-colors" title={minimized ? "Expand" : "Minimize"}>
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                {minimized
                  ? <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
                  : <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
                }
              </svg>
            </button>
            <button onClick={() => router.push("/dashboard-new/listening")} className="text-gray-400 hover:text-white p-1 rounded transition-colors" title="Back to Listening">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
              </svg>
            </button>
            <button onClick={dismiss} className="text-gray-400 hover:text-red-400 p-1 rounded transition-colors" title="Close">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Video area */}
        {!minimized && (
          <div className="relative w-full" style={{ paddingBottom: "56.25%" }}>
            {playing ? (
              <iframe
                src={\`https://www.youtube.com/embed/\${video.videoId}?autoplay=1&rel=0&modestbranding=1\`}
                className="absolute inset-0 w-full h-full"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                title={video.title}
              />
            ) : (
              /* Thumbnail + play button overlay - no audio until user clicks */
              <div className="absolute inset-0 bg-black flex items-center justify-center cursor-pointer group"
                onClick={() => setPlaying(true)}>
                {video.thumbnail ? (
                  <img src={video.thumbnail} alt={video.title} className="w-full h-full object-cover opacity-80" />
                ) : (
                  <div className="w-full h-full bg-gray-800" />
                )}
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-14 h-14 rounded-full bg-red-600 group-hover:bg-red-500 flex items-center justify-center shadow-xl transition-colors">
                    <svg className="w-6 h-6 text-white ml-1" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M8 5v14l11-7z" />
                    </svg>
                  </div>
                </div>
                <div className="absolute bottom-2 left-2 right-2">
                  <p className="text-white text-xs font-medium line-clamp-1 drop-shadow">{video.title}</p>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
`

fs.writeFileSync('components/MiniVideoPlayer.tsx', content, 'utf8')
console.log('Written:', fs.statSync('components/MiniVideoPlayer.tsx').size, 'bytes')
