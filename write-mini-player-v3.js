const fs = require('fs')

const content = `"use client"

import { useState, useRef, useCallback, useEffect } from "react"
import { useVideoPlayer } from "@/contexts/VideoPlayerContext"
import { usePathname, useRouter } from "next/navigation"

export default function MiniVideoPlayer() {
  const { video, dismiss } = useVideoPlayer()
  const pathname = usePathname()
  const router = useRouter()
  const [minimized, setMinimized] = useState(false)
  // Start playing immediately when mini player appears (user was already watching)
  const [playing, setPlaying] = useState(true)
  const [pos, setPos] = useState({ x: 0, y: 0 })
  const dragging = useRef(false)
  const dragStart = useRef({ mx: 0, my: 0, px: 0, py: 0 })
  const prevVideoId = useRef<string | null>(null)

  // Only reset playing=false when a NEW video is selected (not on navigation)
  useEffect(() => {
    if (video?.videoId && video.videoId !== prevVideoId.current) {
      prevVideoId.current = video.videoId
      // Keep playing=true so it auto-plays when navigating away
    }
  }, [video?.videoId])

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

  // Don't render on listening page - full player is there
  if (!video?.videoId || pathname === "/dashboard-new/listening") return null

  // Responsive size: smaller on mobile
  const playerWidth = minimized ? 160 : undefined // auto on desktop, fixed on minimized

  return (
    <div
      className="fixed z-50"
      style={{
        bottom: \`\${16 + pos.y}px\`,
        right: \`\${16 + pos.x}px\`,
        // Responsive: 240px on mobile, 300px on tablet+, 320px on desktop
        width: minimized ? "160px" : "min(280px, calc(100vw - 32px))",
        maxWidth: minimized ? "160px" : "320px",
      }}
    >
      <div className="rounded-xl overflow-hidden border border-white/20 bg-gray-900 shadow-2xl">
        {/* Drag handle + controls */}
        <div
          className="flex items-center justify-between px-2 py-1.5 bg-gray-800 gap-1.5 cursor-grab active:cursor-grabbing select-none"
          onMouseDown={onMouseDown}
          onTouchStart={onTouchStart}
        >
          {/* Drag dots */}
          <div className="flex flex-col gap-0.5 flex-shrink-0 opacity-30">
            <div className="flex gap-0.5">{[0,1,2].map(i=><div key={i} className="w-1 h-1 rounded-full bg-white"/>)}</div>
            <div className="flex gap-0.5">{[0,1,2].map(i=><div key={i} className="w-1 h-1 rounded-full bg-white"/>)}</div>
          </div>

          <div className="min-w-0 flex-1 mx-1">
            <p className="text-xs text-white font-medium truncate leading-tight">{video.title}</p>
          </div>

          <div className="flex items-center gap-0.5 flex-shrink-0" onMouseDown={e => e.stopPropagation()}>
            <button onClick={() => setMinimized(v => !v)} className="text-gray-400 hover:text-white p-1 rounded transition-colors" title={minimized ? "Expand" : "Minimize"}>
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                {minimized
                  ? <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
                  : <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
                }
              </svg>
            </button>
            <button onClick={() => router.push("/dashboard-new/listening")} className="text-gray-400 hover:text-white p-1 rounded transition-colors" title="Back to Listening">
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
              </svg>
            </button>
            <button onClick={dismiss} className="text-gray-400 hover:text-red-400 p-1 rounded transition-colors" title="Close">
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
                key={video.videoId}
                src={\`https://www.youtube.com/embed/\${video.videoId}?autoplay=1&rel=0&modestbranding=1\`}
                className="absolute inset-0 w-full h-full"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                title={video.title}
              />
            ) : (
              <div className="absolute inset-0 bg-black flex items-center justify-center cursor-pointer group"
                onClick={() => setPlaying(true)}>
                {video.thumbnail
                  ? <img src={video.thumbnail} alt={video.title} className="w-full h-full object-cover opacity-80" />
                  : <div className="w-full h-full bg-gray-800" />
                }
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-10 h-10 rounded-full bg-red-600 group-hover:bg-red-500 flex items-center justify-center shadow-xl transition-colors">
                    <svg className="w-5 h-5 text-white ml-0.5" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z" /></svg>
                  </div>
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
