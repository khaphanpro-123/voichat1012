"use client"
import { createContext, useContext, useState, useCallback } from "react"

interface VoiceSession {
  active: boolean
  listening: boolean
  speaking: boolean
  processing: boolean
  lastText: string // last AI response snippet
}

interface VoiceChatContextType {
  voiceSession: VoiceSession | null
  setVoiceSession: (s: VoiceSession | null) => void
  stopSession: () => void
}

const VoiceChatContext = createContext<VoiceChatContextType>({
  voiceSession: null,
  setVoiceSession: () => {},
  stopSession: () => {},
})

export function VoiceChatProvider({ children }: { children: React.ReactNode }) {
  const [voiceSession, setVoiceSessionState] = useState<VoiceSession | null>(null)
  const [stopCb, setStopCb] = useState<(() => void) | null>(null)

  const setVoiceSession = useCallback((s: VoiceSession | null) => {
    setVoiceSessionState(s)
  }, [])

  const stopSession = useCallback(() => {
    setVoiceSessionState(null)
    stopCb?.()
  }, [stopCb])

  return (
    <VoiceChatContext.Provider value={{ voiceSession, setVoiceSession, stopSession }}>
      {children}
    </VoiceChatContext.Provider>
  )
}

export const useVoiceChat = () => useContext(VoiceChatContext)
