"use client"

import { useState } from "react"
import { useVideoPlayer } from "@/contexts/VideoPlayerContext"
import { usePathname } from "next/navigation"

export default function MiniVideoPlayer() {
  const { video, dismiss } = useVideoPlayer()
  const pathname = usePathname()
  const [minimized, setMinimized] = useState(false)

  // Don't show on listening page (full player is there)
  if (!video?.videoId || pathname === "/dashboard-new/listening") return null

  return (
    <div
      className="fixed bottom-4 right-4 z-50 shadow-2xl rounded-2xl overflow-hidden border border-white/20 bg-gray-900 transition-all duration-300"
      style={{ width: minimized ? "200px" : "320px" }}
    >
      {/* Header bar */}
      <div className="flex items-center justify-between px-3 py-2 bg-gray-800 gap-2">
        <div className="min-w-0 flex-1">
          <p className="text-xs text-white font-medium truncate">{video.title}</p>
          {video.channel && <p className="text-xs text-gray-400 truncate">{video.channel}</p>}
        </div>
        <div className="flex items-center gap-1 flex-shrink-0">
          <button
            onClick={() => setMinimized(v => !v)}
            className="text-gray-400 hover:text-white p-1 rounded transition-colors"
            title={minimized ? "Mo rong" : "Thu nho"}
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              {minimized
                ? <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
                : <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
              }
            </svg>
          </button>
          <a
            href="/dashboard-new/listening"
            className="text-gray-400 hover:text-white p-1 rounded transition-colors"
            title="Mo trang luyen nghe"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
            </svg>
          </a>
          <button
            onClick={dismiss}
            className="text-gray-400 hover:text-red-400 p-1 rounded transition-colors"
            title="Dong"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>

      {/* Video iframe */}
      {!minimized && (
        <div className="relative w-full" style={{ paddingBottom: "56.25%" }}>
          <iframe
            src={`https://www.youtube.com/embed/${video.videoId}?autoplay=1&rel=0&modestbranding=1`}
            className="absolute inset-0 w-full h-full"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            title={video.title}
          />
        </div>
      )}
    </div>
  )
}
