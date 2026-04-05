"use client"

import { createContext, useContext, useState, useCallback } from "react"

interface VideoState {
  videoId: string | null
  title: string
  channel: string
}

interface VideoPlayerContextType {
  video: VideoState | null
  setVideo: (v: VideoState | null) => void
  dismiss: () => void
}

const VideoPlayerContext = createContext<VideoPlayerContextType>({
  video: null,
  setVideo: () => {},
  dismiss: () => {},
})

export function VideoPlayerProvider({ children }: { children: React.ReactNode }) {
  const [video, setVideoState] = useState<VideoState | null>(null)

  const setVideo = useCallback((v: VideoState | null) => {
    setVideoState(v)
  }, [])

  const dismiss = useCallback(() => {
    setVideoState(null)
  }, [])

  return (
    <VideoPlayerContext.Provider value={{ video, setVideo, dismiss }}>
      {children}
    </VideoPlayerContext.Provider>
  )
}

export const useVideoPlayer = () => useContext(VideoPlayerContext)
