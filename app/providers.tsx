"use client";

import { SessionProvider } from "next-auth/react";
import { VideoPlayerProvider } from "@/contexts/VideoPlayerContext";

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <VideoPlayerProvider>
        {children}
      </VideoPlayerProvider>
    </SessionProvider>
  );
}
