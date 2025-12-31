"use client";

import { useSession } from "next-auth/react";
import { redirect } from "next/navigation";
import DashboardLayout from "@/components/DashboardLayout";
import LearningHistory from "@/components/LearningHistory";

export default function LearningHistoryPage() {
  const { data: session, status } = useSession();

  if (status === "loading") {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="animate-spin w-8 h-8 border-4 border-teal-500 border-t-transparent rounded-full" />
        </div>
      </DashboardLayout>
    );
  }

  if (!session) {
    redirect("/auth/login");
  }

  return (
    <DashboardLayout>
      <div className="p-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            📊 Lịch sử học tập
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Theo dõi tiến trình và cải thiện kỹ năng của bạn
          </p>
        </div>
        
        <LearningHistory userId={(session.user as any)?.id || ""} />
      </div>
    </DashboardLayout>
  );
}
