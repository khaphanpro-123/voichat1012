"use client"

import { useState } from "react"
import DashboardLayout from "@/components/DashboardLayout"
import { VIDEO_SECTIONS } from "@/config/video-links"

export default function ListeningPage() {
  // Flatten all videos with section info
  const allVideos = VIDEO_SECTIONS.flatMap((section) =>
    section.videos.map((v) => ({ ...v, source: section.source, color: section.color }))
  )

  const [activeTab, setActiveTab] = useState(0)
  const [selectedVideo, setSelectedVideo] = useState(
    allVideos.find((v) => v.id && !v.id.startsWith("DEMO")) || allVideos[0]
  )

  const tabVideos = VIDEO_SECTIONS[activeTab]?.videos.map((v) => ({
    ...v,
    source: VIDEO_SECTIONS[activeTab].source,
    color: VIDEO_SECTIONS[activeTab].color,
  })) || []

  const hasEmbed = (id: string) => id && !id.startsWith("DEMO")

  return (
    <DashboardLayout>
      <div className="max-w-5xl mx-auto px-4 py-6">
        <div className="mb-5">
          <h1 className="text-2xl font-semibold text-gray-900">Luyện nghe & Hướng dẫn</h1>
          <p className="text-sm text-gray-500 mt-1">Xem video ngay trên trang, không cần chuyển sang YouTube</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {/* Player - left/top */}
          <div className="lg:col-span-2">
            <div className="bg-black rounded-2xl overflow-hidden shadow-lg">
              {selectedVideo && hasEmbed(selectedVideo.id) ? (
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
                <div className="aspect-video flex flex-col items-center justify-center bg-gray-900 text-gray-400 gap-3">
                  <svg className="w-12 h-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <p className="text-sm">Chọn video để xem</p>
                </div>
              )}
            </div>

            {/* Video info */}
            {selectedVideo && (
              <div className="mt-3 px-1">
                <h2 className="text-base font-semibold text-gray-900">{selectedVideo.title}</h2>
                <span className={`inline-block mt-1 text-xs px-2 py-0.5 rounded-full font-medium ${selectedVideo.color}`}>
                  {selectedVideo.source}
                </span>
              </div>
            )}
          </div>

          {/* Playlist - right/bottom */}
          <div className="lg:col-span-1 flex flex-col gap-3">
            {/* Source tabs */}
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

            {/* Video list */}
            <div className="space-y-2 overflow-y-auto max-h-[60vh] pr-1">
              {tabVideos.map((video, vi) => {
                const isSelected = selectedVideo?.id === video.id
                const canEmbed = hasEmbed(video.id)
                return (
                  <div
                    key={vi}
                    onClick={() => canEmbed ? setSelectedVideo(video) : window.open(video.url, "_blank")}
                    className={`flex items-center gap-3 p-2.5 rounded-xl cursor-pointer transition-all group ${
                      isSelected
                        ? "bg-indigo-50 border border-indigo-200"
                        : "bg-gray-50 border border-gray-100 hover:bg-gray-100"
                    }`}
                  >
                    {/* Thumbnail */}
                    <div className="relative flex-shrink-0 w-20 h-14 rounded-lg overflow-hidden bg-gray-200">
                      {canEmbed ? (
                        <img
                          src={`https://img.youtube.com/vi/${video.id}/mqdefault.jpg`}
                          alt={video.title}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-indigo-100 to-purple-100">
                          <svg className="w-5 h-5 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                          </svg>
                        </div>
                      )}
                      {isSelected && (
                        <div className="absolute inset-0 bg-indigo-600/20 flex items-center justify-center">
                          <div className="w-6 h-6 rounded-full bg-indigo-600 flex items-center justify-center">
                            <svg className="w-3 h-3 text-white ml-0.5" fill="currentColor" viewBox="0 0 24 24">
                              <path d="M8 5v14l11-7z" />
                            </svg>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <p className={`text-xs font-medium line-clamp-2 ${isSelected ? "text-indigo-700" : "text-gray-800"}`}>
                        {video.title}
                      </p>
                      <p className="text-xs text-gray-400 mt-0.5">
                        {canEmbed ? "Xem ngay" : "Mở YouTube"}
                      </p>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}
