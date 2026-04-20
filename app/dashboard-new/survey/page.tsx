"use client";

import { useSession } from "next-auth/react";
import DashboardLayout from "@/components/DashboardLayout";
import EnglishLearnerSurvey from "@/components/EnglishLearnerSurvey";

export default function SurveyPage() {
  const { data: session } = useSession();
  const userId = (session?.user as any)?.id || "anonymous";

  return (
    <DashboardLayout>
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-gray-900 to-zinc-900 p-4 md:p-8">
        <div className="max-w-2xl mx-auto">
          <div className="text-center mb-6">
            <h1 className="text-2xl font-bold text-white mb-2"> Khảo sát học tập ban đầu</h1>
            <p className="text-white/60">Giúp chúng tôi hiểu nhu cầu học tập của bạn để tạo kế hoạch phù hợp</p>
          </div>
          
          <EnglishLearnerSurvey 
            userId={userId} 
            onComplete={(profile) => {
              console.log("Survey completed:", profile);
            }}
          />
        </div>
      </div>
    </DashboardLayout>
  );
}
