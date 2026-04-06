"use client";

import { SessionProvider } from "next-auth/react";
import { VideoPlayerProvider } from "@/contexts/VideoPlayerContext";
import { VoiceChatProvider } from "@/contexts/VoiceChatContext";

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <VideoPlayerProvider>
        <VoiceChatProvider>
          {children}
        </VoiceChatProvider>
      </VideoPlayerProvider>
    </SessionProvider>
  );
}
