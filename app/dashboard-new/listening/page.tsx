"use client"

import { useState, useRef, useCallback } from "react"
import { motion, AnimatePresence } from "framer-motion"
import DashboardLayout from "@/components/DashboardLayout"
import { VIDEO_SECTIONS } from "@/config/video-links"

type VideoItem = {
  id: string; title: string; channel?: string; thumbnail?: string; source: string; color: string; url?: string
}

const SUGGESTED_QUERIES = [
  "BBC 6 Minute English", "TED talk English", "English conversation daily",
  "I'm Mary English", "Postcard English", "English listening beginner",
]

const SOURCE_COLORS: Record<string, string> = {
  "BBC Learning English": "from-red-500 to-rose-600",
  "TED-Ed": "from-orange-500 to-amber-600",
  "I'm Mary": "from-purple-500 to-violet-600",
  "Postcard English": "from-green-500 to-emerald-600",
  "Hướng dẫn sử dụng": "from-blue-500 to-indigo-600",
  "YouTube": "from-red-500 to-pink-600",
}

export default function ListeningPage() {
  const allCurated: VideoItem[] = VIDEO_SECTIONS.flatMap((s) =>
    s.videos.filter((v) => v.id && !v.id.startsWith("DEMO")).map((v) => ({ ...v, source: s.source, color: s.color }))
  )

  const [selectedVideo, setSelectedVideo] = useState<VideoItem | null>(allCurated[0] || null)
  const [activeTab, setActiveTab] = useState(0)
  const [searchQuery, setSearchQuery] = useState("")
  const [searchResults, setSearchResults] = useState<VideoItem[]>([])
  const [searching, setSearching] = useState(false)
  const [searchError, setSearchError] = useState("")
  const [hasSearched, setHasSearched] = useState(false)
  const [noApiKey, setNoApiKey] = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const tabVideos: VideoItem[] = VIDEO_SECTIONS[activeTab]?.videos
    .filter((v) => v.id && !v.id.startsWith("DEMO"))
    .map((v) => ({ ...v, source: VIDEO_SECTIONS[activeTab].source, color: VIDEO_SECTIONS[activeTab].color })) || []

  const displayList = hasSearched ? searchResults : tabVideos

  const doSearch = useCallback(async (query: string) => {
    if (!query.trim()) { setHasSearched(false); setSearchResults([]); return }
    setSearching(true); setSearchError(""); setHasSearched(true); setNoApiKey(false)
    try {
      const res = await fetch(`/api/youtube-search?q=${encodeURIComponent(query)}`)
      const data = await res.json()
      if (!res.ok) {
        if (res.status === 500 && data.error?.includes("API key")) {
          setNoApiKey(true)
          setSearchError("Chưa cài YOUTUBE_API_KEY. Xem hướng dẫn bên dưới.")
        } else {
          setSearchError(data.error || "Tìm kiếm thất bại")
        }
        setSearchResults([]); return
      }
      const results: VideoItem[] = (data.videos || []).map((v: any) => ({
        id: v.id, title: v.title, channel: v.channel, thumbnail: v.thumbnail,
        source: "YouTube", color: "bg-red-100 text-red-700",
      }))
      setSearchResults(results)
      if (results.length > 0) setSelectedVideo(results[0])
    } catch { setSearchError("Không thể kết nối. Vui lòng thử lại.") }
    finally { setSearching(false) }
  }, [])

  const handleInputChange = (value: string) => {
    setSearchQuery(value)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    if (!value.trim()) { setHasSearched(false); setSearchResults([]); setSearchError(""); return }
    debounceRef.current = setTimeout(() => doSearch(value), 600)
  }

  const gradientClass = selectedVideo ? (SOURCE_COLORS[selectedVideo.source] || "from-indigo-500 to-purple-600") : "from-slate-700 to-slate-900"

  return (
    <DashboardLayout>
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-indigo-950 to-slate-900 px-4 py-6">
        <div className="max-w-6xl mx-auto space-y-6">

          <motion.div initial={{ opacity: 0, y: -16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
            <h1 className="text-3xl font-bold text-white">Luyện nghe</h1>
            <p className="text-slate-400 mt-1 text-sm">Gõ tên video — hệ thống tự tìm và phát ngay trên trang</p>
          </motion.div>

          {/* Search */}
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.1 }}
            className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-4 space-y-3"
          >
            <div className="relative">
              {searching ? (
                <svg className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-indigo-400 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
              ) : (
                <svg className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              )}
              <input
                type="text" value={searchQuery}
                onChange={(e) => handleInputChange(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") { if (debounceRef.current) clearTimeout(debounceRef.current); doSearch(searchQuery) } }}
                placeholder="Gõ tên video để tìm kiếm... (tự động tìm sau khi gõ)"
                className="w-full pl-10 pr-10 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-slate-400 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent transition-all"
              />
              {searchQuery && (
                <button onClick={() => { setSearchQuery(""); setHasSearched(false); setSearchResults([]); setSearchError("") }}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
            </div>

            <div className="flex flex-wrap gap-2 items-center">
              <span className="text-xs text-slate-500">Gợi ý:</span>
              {SUGGESTED_QUERIES.map((q) => (
                <button key={q} onClick={() => { setSearchQuery(q); doSearch(q) }}
                  className="text-xs px-3 py-1.5 bg-white/10 text-slate-300 rounded-full hover:bg-indigo-500/30 hover:text-indigo-200 border border-white/10 hover:border-indigo-400/40 transition-all"
                >
                  {q}
                </button>
              ))}
            </div>

            {searchError && (
              <div className="text-xs space-y-1">
                <p className="text-red-400">{searchError}</p>
                {noApiKey && (
                  <p className="text-slate-400">
                    Cần thêm <code className="bg-white/10 px-1 rounded">YOUTUBE_API_KEY</code> vào Vercel.
                    Lấy key miễn phí tại{" "}
                    <a href="https://console.cloud.google.com" target="_blank" rel="noopener noreferrer" className="text-indigo-400 underline">
                      console.cloud.google.com
                    </a>
                    {" "}→ Enable YouTube Data API v3 → Create API Key.
                  </p>
                )}
              </div>
            )}
          </motion.div>

          {/* Main layout */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            {/* Player */}
            <motion.div initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.4, delay: 0.15 }}
              className="lg:col-span-2 space-y-3"
            >
              <div className={`p-0.5 rounded-2xl bg-gradient-to-br ${gradientClass} shadow-2xl transition-all duration-500`}>
                <div className="bg-black rounded-[14px] overflow-hidden">
                  <AnimatePresence mode="wait">
                    {selectedVideo ? (
                      <motion.div key={selectedVideo.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.3 }}
                        className="relative w-full" style={{ paddingBottom: "56.25%" }}
                      >
                        <iframe
                          src={`https://www.youtube.com/embed/${selectedVideo.id}?rel=0&modestbranding=1`}
                          className="absolute inset-0 w-full h-full"
                          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
                          allowFullScreen title={selectedVideo.title}
                        />
                      </motion.div>
                    ) : (
                      <motion.div key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                        className="aspect-video flex flex-col items-center justify-center text-slate-600 gap-3"
                      >
                        <svg className="w-16 h-16 opacity-30" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                        <p className="text-sm">Gõ tên video để tìm kiếm</p>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>

              <AnimatePresence mode="wait">
                {selectedVideo && (
                  <motion.div key={selectedVideo.id + "-info"} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.25 }}
                    className="bg-white/10 backdrop-blur-md border border-white/15 rounded-xl px-4 py-3 flex items-start justify-between gap-3"
                  >
                    <div className="min-w-0">
                      <p className="text-white font-semibold text-sm line-clamp-2">{selectedVideo.title}</p>
                      <div className="flex items-center gap-2 mt-1.5">
                        {selectedVideo.channel && <span className="text-xs text-slate-400">{selectedVideo.channel}</span>}
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium bg-gradient-to-r ${SOURCE_COLORS[selectedVideo.source] || "from-indigo-500 to-purple-600"} text-white`}>
                          {selectedVideo.source}
                        </span>
                      </div>
                    </div>
                    <a href={`https://www.youtube.com/watch?v=${selectedVideo.id}`} target="_blank" rel="noopener noreferrer"
                      className="flex-shrink-0 text-xs text-slate-400 hover:text-white flex items-center gap-1 mt-0.5 transition-colors"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                      </svg>
                      YouTube
                    </a>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>

            {/* Playlist */}
            <motion.div initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.4, delay: 0.2 }}
              className="lg:col-span-1 space-y-3"
            >
              {!hasSearched && (
                <div className="flex gap-1.5 flex-wrap">
                  {VIDEO_SECTIONS.map((section, si) => (
                    <button key={si} onClick={() => setActiveTab(si)}
                      className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                        activeTab === si
                          ? `bg-gradient-to-r ${SOURCE_COLORS[section.source] || "from-indigo-500 to-purple-600"} text-white shadow-lg`
                          : "bg-white/10 text-slate-400 hover:bg-white/20 hover:text-white border border-white/10"
                      }`}
                    >
                      {section.source}
                    </button>
                  ))}
                </div>
              )}

              {hasSearched && (
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium text-slate-300">
                    {searching ? "Đang tìm..." : `${searchResults.length} kết quả`}
                  </p>
                  <button onClick={() => { setHasSearched(false); setSearchResults([]); setSearchQuery("") }}
                    className="text-xs text-indigo-400 hover:text-indigo-200 transition-colors"
                  >
                    Xem gợi ý
                  </button>
                </div>
              )}

              <div className="space-y-2 max-h-[55vh] overflow-y-auto pr-0.5">
                <AnimatePresence mode="popLayout">
                  {searching ? (
                    Array.from({ length: 5 }).map((_, i) => (
                      <motion.div key={`sk-${i}`} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.05 }}
                        className="flex gap-3 p-2.5 rounded-xl bg-white/5 animate-pulse"
                      >
                        <div className="w-20 h-14 rounded-lg bg-white/10 flex-shrink-0" />
                        <div className="flex-1 space-y-2 py-1">
                          <div className="h-3 bg-white/10 rounded w-full" />
                          <div className="h-3 bg-white/10 rounded w-2/3" />
                        </div>
                      </motion.div>
                    ))
                  ) : displayList.length === 0 && hasSearched ? (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-10 text-slate-500 text-sm">
                      Không tìm thấy video. Thử từ khóa khác.
                    </motion.div>
                  ) : (
                    displayList.map((video, vi) => {
                      const isSelected = selectedVideo?.id === video.id
                      const grad = SOURCE_COLORS[video.source] || "from-indigo-500 to-purple-600"
                      return (
                        <motion.div key={video.id + vi} layout initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: vi * 0.04, duration: 0.25 }}
                          onClick={() => setSelectedVideo(video)}
                          className={`flex items-center gap-3 p-2.5 rounded-xl cursor-pointer transition-all group ${
                            isSelected ? "bg-white/15 border border-white/30 shadow-lg" : "bg-white/5 border border-white/10 hover:bg-white/10 hover:border-white/20"
                          }`}
                        >
                          <div className="relative flex-shrink-0 w-20 h-14 rounded-lg overflow-hidden">
                            {video.thumbnail ? (
                              <img src={video.thumbnail} alt={video.title} className="w-full h-full object-cover" />
                            ) : (
                              <div className={`w-full h-full bg-gradient-to-br ${grad} flex items-center justify-center`}>
                                <svg className="w-5 h-5 text-white/70" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z" /></svg>
                              </div>
                            )}
                            {isSelected && (
                              <div className={`absolute inset-0 bg-gradient-to-br ${grad} opacity-40 flex items-center justify-center`}>
                                <div className="w-7 h-7 rounded-full bg-white/90 flex items-center justify-center shadow-lg">
                                  <svg className="w-3.5 h-3.5 text-indigo-600 ml-0.5" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z" /></svg>
                                </div>
                              </div>
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className={`text-xs font-medium line-clamp-2 transition-colors ${isSelected ? "text-white" : "text-slate-300 group-hover:text-white"}`}>
                              {video.title}
                            </p>
                            {video.channel && <p className="text-xs text-slate-500 mt-0.5 truncate">{video.channel}</p>}
                          </div>
                        </motion.div>
                      )
                    })
                  )}
                </AnimatePresence>
              </div>
            </motion.div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}
