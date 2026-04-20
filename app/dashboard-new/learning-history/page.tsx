"use client";

import { useSession } from "next-auth/react";
import { redirect } from "next/navigation";
import { motion } from "framer-motion";
import DashboardLayout from "@/components/DashboardLayout";
import LearningHistory from "@/components/LearningHistory";

export default function LearningHistoryPage() {
  const { data: session, status } = useSession();

  if (status === "loading") {
    return (
      <DashboardLayout>
        <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
          <motion.div
            className="text-4xl"
            animate={{ scale: [1, 1.1, 1], rotate: [0, 5, -5, 0] }}
            transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
          >
            
          </motion.div>
          <motion.p 
            className="text-gray-500"
            animate={{ opacity: [0.5, 1, 0.5] }}
            transition={{ duration: 2, repeat: Infinity }}
          >
            Đang tải lịch sử...
          </motion.p>
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
             Lịch sử học tập
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
