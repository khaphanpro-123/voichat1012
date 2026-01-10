"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import VoiceChatEnhanced from "@/components/VoiceChatEnhanced";
import VoiceChatLive from "@/components/VoiceChatLive";

export default function ChatPage() {
  const { status } = useSession();
  const router = useRouter();
  const [useEnhanced, setUseEnhanced] = useState(true);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/auth/login");
    }
  }, [status, router]);

  if (status === "loading") {
    return (
      <DashboardLayout>
        <div className="min-h-screen flex items-center justify-center">
          <div className="animate-spin w-8 h-8 border-4 border-purple-500 border-t-transparent rounded-full"></div>
        </div>
      </DashboardLayout>
    );
  }

  // Use enhanced version by default
  return useEnhanced ? <VoiceChatEnhanced /> : <VoiceChatLive />;
}
