"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function SurveyPage() {
  const router = useRouter();

  useEffect(() => {
    // Redirect to settings page with survey tab
    router.replace("/settings");
  }, [router]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-gray-900 to-zinc-900 flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin w-8 h-8 border-4 border-white/20 border-t-white rounded-full mx-auto mb-4"></div>
        <p className="text-white/60">Đang chuyển hướng...</p>
      </div>
    </div>
  );
}
