"use client"

import { useState, useRef } from "react"
import DashboardLayout from "@/components/DashboardLayout"
import { VIDEO_SECTIONS } from "@/config/video-links"

type VideoItem = {
  id: string
  title: string
  channel?: string
  thumbnail?: string
  source: string
  color: string
  url?: string
}

const SUGGESTED_QUERIES = [
  "BBC 6 Minute English",
  "English listening practice beginner",
  "TED talk English subtitles",
  "I'm Mary English",
  "Postcard English",
  "English conversation daily life",
]

export default function ListeningPage() {
  const allCurated: VideoItem[] = VIDEO_SECTIONS.flatMap((s) =>
    s.videos
      .filter((v) => v.id && !v.id.startsWith("DEMO"))
      .map((v) => ({ ...v, source: s.source, color: s.color }))
  )

  const [selectedVideo, setSelectedVideo] = useState<VideoItem | null>(allCurated[0] || null)
  const [activeTab, setActiveTab] = useState(0)
  const [searchQuery, setSearchQuery] = useState("")
  const [searchResults, setSearchResults] = useState<VideoItem[]>([])
  const [searching, setSearching] = useState(false)
  const [searchError, setSearchError] = useState("")
  const [hasSearched, setHasSearched] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const tabVideos: VideoItem[] = VIDEO_SECTIONS[activeTab]?.videos
    .filter((v) => v.id && !v.id.startsWith("DEMO"))
    .map((v) => ({ ...v, source: VIDEO_SECTIONS[activeTab].source, color: VIDEO_SECTIONS[activeTab].color })) || []

  const handleSearch = async (q?: string) => {
    const query = q || searchQuery.trim()
    if (!query) return
    setSearching(true)
    setSearchError("")
    setHasSearched(true)
    try {
      const res = await fetch(`/api/youtube-search?q=${encodeURIComponent(query)}`)
      const data = await res.json()
      if (!res.ok) {
        setSearchError(data.error || "Tìm kiếm thất bại")
        setSearchResults([])
        return
      }
      const results: VideoItem[] = (data.videos || []).map((v: any) => ({
        id: v.id,
        title: v.title,
        channel: v.channel,
        thumbnail: v.thumbnail,
        source: "YouTube",
        color: "bg-red-100 text-red-700",
      }))
      setSearchResults(results)
      if (results.length > 0) setSelectedVideo(results[0])
    } catch {
      setSearchError("Không thể kết nối. Vui lòng thử lại.")
    } finally {
      setSearching(false)
    }
  }

  const displayList = hasSearched ? searchResults : tabVideos

  return (
    <DashboardLayout>
      <div className="max-w-6xl mx-auto px-4 py-6 space-y-5">

        {/* Header */}
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Luyện nghe</h1>
          <p className="text-sm text-gray-500 mt-0.5">Tìm kiếm video tiếng Anh và xem ngay trên trang</p>
        </div>

        {/* Search */}
        <div className="bg-white rounded-2xl border border-gray-200 p-4 space-y-3">
          <div className="flex gap-2">
            <input
              ref={inputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              placeholder="Tìm kiếm video tiếng Anh... (vd: BBC 6 Minute English)"
              className="flex-1 px-4 py-2.5 text-sm border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            />
            <button
              onClick={() => handleSearch()}
              disabled={searching || !searchQuery.trim()}
              className="px-5 py-2.5 bg-indigo-600 text-white text-sm font-medium rounded-xl hover:bg-indigo-700 disabled:bg-gray-300 disabled:cursor-not-allowed active:scale-95 transition-all flex items-center gap-2"
            >
              {searching ? (
                <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
              ) : (
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              )}
              Tìm
            </button>
          </div>

          {/* Suggested queries */}
          {!hasSearched && (
            <div className="flex flex-wrap gap-1.5">
              <span className="text-xs text-gray-400 self-center">Gợi ý:</span>
              {SUGGESTED_QUERIES.map((q) => (
                <button
                  key={q}
                  onClick={() => { setSearchQuery(q); handleSearch(q) }}
                  className="text-xs px-3 py-1 bg-gray-100 text-gray-600 rounded-full hover:bg-indigo-100 hover:text-indigo-700 transition-colors"
                >
                  {q}
                </button>
              ))}
            </div>
          )}

          {searchError && (
            <p className="text-xs text-red-500">{searchError}</p>
          )}
        </div>

        {/* Main layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

          {/* Player */}
          <div className="lg:col-span-2 space-y-3">
            <div className="bg-black rounded-2xl overflow-hidden shadow-lg">
              {selectedVideo ? (
                <div className="relative w-full" style={{ paddingBottom: "56.25%" }}>
                  <iframe
                    key={selectedVideo.id}
                    src={`https://www.youtube.com/embed/${selectedVideo.id}?rel=0&modestbranding=1`}
                    className="absolute inset-0 w-full h-full"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
                    allowFullScreen
                    title={selectedVideo.title}
                  />
                </div>
              ) : (
                <div className="aspect-video flex flex-col items-center justify-center bg-gray-900 text-gray-500 gap-3">
                  <svg className="w-14 h-14 opacity-30" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                  <p className="text-sm">Tìm kiếm video để bắt đầu</p>
                </div>
              )}
            </div>

            {selectedVideo && (
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h2 className="text-base font-semibold text-gray-900 line-clamp-2">{selectedVideo.title}</h2>
                  <div className="flex items-center gap-2 mt-1">
                    {selectedVideo.channel && (
                      <span className="text-xs text-gray-500">{selectedVideo.channel}</span>
                    )}
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${selectedVideo.color}`}>
                      {selectedVideo.source}
                    </span>
                  </div>
                </div>
                <a
                  href={`https://www.youtube.com/watch?v=${selectedVideo.id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-shrink-0 text-xs text-gray-400 hover:text-gray-600 flex items-center gap-1 mt-1"
                >
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                  </svg>
                  YouTube
                </a>
              </div>
            )}
          </div>

          {/* Playlist */}
          <div className="lg:col-span-1 space-y-3">
            {/* Tabs — only show when not searching */}
            {!hasSearched && (
              <div className="flex gap-1.5 flex-wrap">
                {VIDEO_SECTIONS.map((section, si) => (
                  <button
                    key={si}
                    onClick={() => setActiveTab(si)}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                      activeTab === si
                        ? "bg-indigo-600 text-white shadow-sm"
                        : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                    }`}
                  >
                    {section.source}
                  </button>
                ))}
              </div>
            )}

            {hasSearched && (
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-gray-700">
                  {searching ? "Đang tìm..." : `${searchResults.length} kết quả`}
                </p>
                <button
                  onClick={() => { setHasSearched(false); setSearchResults([]); setSearchQuery("") }}
                  className="text-xs text-indigo-600 hover:text-indigo-800"
                >
                  Xem danh sách gợi ý
                </button>
              </div>
            )}

            <div className="space-y-2 max-h-[55vh] overflow-y-auto pr-0.5">
              {searching ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="flex gap-3 p-2.5 rounded-xl bg-gray-50 animate-pulse">
                    <div className="w-20 h-14 rounded-lg bg-gray-200 flex-shrink-0" />
                    <div className="flex-1 space-y-2 py-1">
                      <div className="h-3 bg-gray-200 rounded w-full" />
                      <div className="h-3 bg-gray-200 rounded w-2/3" />
                    </div>
                  </div>
                ))
              ) : displayList.length === 0 && hasSearched ? (
                <div className="text-center py-8 text-gray-400 text-sm">
                  Không tìm thấy video. Thử từ khóa khác.
                </div>
              ) : (
                displayList.map((video, vi) => {
                  const isSelected = selectedVideo?.id === video.id
                  return (
                    <div
                      key={vi}
                      onClick={() => setSelectedVideo(video)}
                      className={`flex items-center gap-3 p-2.5 rounded-xl cursor-pointer transition-all ${
                        isSelected
                          ? "bg-indigo-50 border border-indigo-200"
                          : "bg-gray-50 border border-transparent hover:bg-gray-100 hover:border-gray-200"
                      }`}
                    >
                      <div className="relative flex-shrink-0 w-20 h-14 rounded-lg overflow-hidden bg-gray-200">
                        {video.thumbnail ? (
                          <img src={video.thumbnail} alt={video.title} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-indigo-100 to-purple-100">
                            <svg className="w-5 h-5 text-indigo-400" fill="currentColor" viewBox="0 0 24 24">
                              <path d="M8 5v14l11-7z" />
                            </svg>
                          </div>
                        )}
                        {isSelected && (
                          <div className="absolute inset-0 bg-indigo-600/30 flex items-center justify-center">
                            <div className="w-6 h-6 rounded-full bg-indigo-600 flex items-center justify-center shadow">
                              <svg className="w-3 h-3 text-white ml-0.5" fill="currentColor" viewBox="0 0 24 24">
                                <path d="M8 5v14l11-7z" />
                              </svg>
                            </div>
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={`text-xs font-medium line-clamp-2 ${isSelected ? "text-indigo-700" : "text-gray-800"}`}>
                          {video.title}
                        </p>
                        {video.channel && (
                          <p className="text-xs text-gray-400 mt-0.5 truncate">{video.channel}</p>
                        )}
                      </div>
                    </div>
                  )
                })
              )}
            </div>
          </div>
        </div>

      </div>
    </DashboardLayout>
  )
}
