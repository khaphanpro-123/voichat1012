"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Key, ClipboardList } from "lucide-react";
import ApiKeySettings from "@/components/ApiKeySettings";
import EnglishLearnerSurvey from "@/components/EnglishLearnerSurvey";

type TabType = "api-keys" | "survey";

export default function SettingsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<TabType>("api-keys");

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/auth/login");
    }
  }, [status, router]);

  if (status === "loading") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-gray-900 to-zinc-900 flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-white/20 border-t-white rounded-full"></div>
      </div>
    );
  }

  const userId = (session?.user as any)?.id || "anonymous";
  const userName = session?.user?.name || session?.user?.email || "User";

  console.log('Settings page - session:', session);
  console.log('Settings page - userId:', userId);

  const tabs = [
    { id: "api-keys" as TabType, label: "API Keys", icon: Key },
    { id: "survey" as TabType, label: "Khảo sát học tập", icon: ClipboardList },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-gray-900 to-zinc-900 p-4 md:p-8">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <Link href="/dashboard-new" 
            className="p-2 bg-white/10 rounded-lg hover:bg-white/20 transition">
            <ArrowLeft className="w-5 h-5 text-white" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-white">⚙️ Cài đặt</h1>
            <p className="text-white/60 text-sm">Xin chào, {userName}</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-3 rounded-xl font-medium transition ${
                activeTab === tab.id
                  ? "bg-blue-500 text-white"
                  : "bg-white/10 text-white/70 hover:bg-white/20"
              }`}
            >
              <tab.icon className="w-5 h-5" />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        {activeTab === "api-keys" && (
          <>
            <ApiKeySettings userId={userId} />

            {/* Info Box */}
            <div className="mt-6 bg-white/5 rounded-xl p-4 border border-white/10">
              <h3 className="text-white font-medium mb-3">💡 Tại sao cần API key riêng?</h3>
              <ul className="text-white/60 text-sm space-y-2">
                <li className="flex items-start gap-2">
                  <span className="text-green-400">✓</span>
                  <span>Không bị giới hạn số lượt sử dụng</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-green-400">✓</span>
                  <span>Tốc độ phản hồi nhanh hơn</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-green-400">✓</span>
                  <span>Bảo mật - key chỉ lưu trong tài khoản của bạn</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-green-400">✓</span>
                  <span>Tự kiểm soát chi phí API</span>
                </li>
              </ul>
            </div>

            {/* How to get API keys */}
            <div className="mt-6 bg-gradient-to-r from-blue-500/10 to-purple-500/10 rounded-xl p-4 border border-blue-500/20">
              <h3 className="text-white font-medium mb-3">📖 Hướng dẫn lấy API Key</h3>
              
              <div className="space-y-4 text-sm">
                <div>
                  <p className="text-blue-400 font-medium mb-1">Google Gemini (Miễn phí)</p>
                  <ol className="text-white/60 space-y-1 ml-4 list-decimal">
                    <li>Truy cập <a href="https://aistudio.google.com/app/apikey" target="_blank" className="text-blue-400 hover:underline">Google AI Studio</a></li>
                    <li>Đăng nhập bằng tài khoản Google</li>
                    <li>Click &quot;Create API Key&quot;</li>
                    <li>Copy key và dán vào ô bên trên</li>
                  </ol>
                </div>

                <div>
                  <p className="text-green-400 font-medium mb-1">OpenAI (Trả phí)</p>
                  <ol className="text-white/60 space-y-1 ml-4 list-decimal">
                    <li>Truy cập <a href="https://platform.openai.com/api-keys" target="_blank" className="text-blue-400 hover:underline">OpenAI Platform</a></li>
                    <li>Đăng nhập/Đăng ký tài khoản</li>
                    <li>Click &quot;Create new secret key&quot;</li>
                    <li>Copy key (bắt đầu bằng sk-...)</li>
                  </ol>
                </div>
              </div>
            </div>
          </>
        )}

        {activeTab === "survey" && (
          <EnglishLearnerSurvey 
            userId={userId} 
            onComplete={(profile) => {
              console.log("Survey completed:", profile);
            }}
          />
        )}
      </div>
    </div>
  );
}
