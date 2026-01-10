"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { 
  ArrowLeft, Key, Play, ExternalLink, CheckCircle, 
  Copy, Eye, EyeOff, Loader2, AlertCircle, Sparkles,
  Youtube, ChevronDown, ChevronUp
} from "lucide-react";

type Provider = "groq" | "openai" | "gemini";

interface ApiKeyState {
  groq: string;
  openai: string;
  gemini: string;
}

interface VideoGuide {
  provider: Provider;
  title: string;
  url: string;
  thumbnail: string;
  duration: string;
  steps: string[];
}

const videoGuides: VideoGuide[] = [
  {
    provider: "groq",
    title: "Cách lấy Groq API Key (Miễn phí)",
    url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ", // Replace with actual video
    thumbnail: "https://img.youtube.com/vi/dQw4w9WgXcQ/maxresdefault.jpg",
    duration: "2:30",
    steps: [
      "Truy cập console.groq.com",
      "Đăng nhập bằng Google/GitHub",
      "Vào mục API Keys",
      "Click 'Create API Key'",
      "Copy key và dán vào đây"
    ]
  },
  {
    provider: "openai",
    title: "Cách lấy OpenAI API Key",
    url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ", // Replace with actual video
    thumbnail: "https://img.youtube.com/vi/dQw4w9WgXcQ/maxresdefault.jpg",
    duration: "3:15",
    steps: [
      "Truy cập platform.openai.com",
      "Đăng nhập/Đăng ký tài khoản",
      "Vào Settings → API Keys",
      "Click 'Create new secret key'",
      "Copy key (bắt đầu bằng sk-...)"
    ]
  },
  {
    provider: "gemini",
    title: "Cách lấy Google Gemini API Key (Miễn phí)",
    url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ", // Replace with actual video
    thumbnail: "https://img.youtube.com/vi/dQw4w9WgXcQ/maxresdefault.jpg",
    duration: "2:00",
    steps: [
      "Truy cập aistudio.google.com/apikey",
      "Đăng nhập bằng Google",
      "Click 'Create API Key'",
      "Chọn project hoặc tạo mới",
      "Copy key và dán vào đây"
    ]
  }
];

const providerInfo = {
  groq: {
    name: "Groq",
    color: "from-orange-500 to-red-500",
    bgColor: "bg-orange-500/10",
    borderColor: "border-orange-500/30",
    textColor: "text-orange-400",
    icon: "⚡",
    description: "Miễn phí, tốc độ cực nhanh",
    link: "https://console.groq.com/keys",
    recommended: true
  },
  openai: {
    name: "OpenAI",
    color: "from-green-500 to-emerald-500",
    bgColor: "bg-green-500/10",
    borderColor: "border-green-500/30",
    textColor: "text-green-400",
    icon: "🤖",
    description: "Chất lượng cao, trả phí",
    link: "https://platform.openai.com/api-keys",
    recommended: false
  },
  gemini: {
    name: "Google Gemini",
    color: "from-blue-500 to-purple-500",
    bgColor: "bg-blue-500/10",
    borderColor: "border-blue-500/30",
    textColor: "text-blue-400",
    icon: "✨",
    description: "Miễn phí, hỗ trợ Vision",
    link: "https://aistudio.google.com/app/apikey",
    recommended: true
  }
};

export default function SettingsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  
  const [keys, setKeys] = useState<ApiKeyState>({ groq: "", openai: "", gemini: "" });
  const [showKeys, setShowKeys] = useState<Record<Provider, boolean>>({ groq: false, openai: false, gemini: false });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [expandedGuide, setExpandedGuide] = useState<Provider | null>(null);
  const [showVideoModal, setShowVideoModal] = useState<Provider | null>(null);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/auth/login");
    }
  }, [status, router]);

  // Load existing keys
  useEffect(() => {
    const loadKeys = async () => {
      if (!session?.user) return;
      const userId = (session.user as any).id;
      try {
        const res = await fetch(`/api/user-api-keys?userId=${userId}`);
        const data = await res.json();
        if (data.success && data.keys) {
          setKeys({
            groq: data.keys.groqKey || "",
            openai: data.keys.openaiKey || "",
            gemini: data.keys.geminiKey || ""
          });
        }
      } catch (err) {
        console.error("Load keys error:", err);
      } finally {
        setLoading(false);
      }
    };
    if (session) loadKeys();
  }, [session]);

  const handleSave = async () => {
    if (!session?.user) return;
    setSaving(true);
    setMessage(null);
    
    try {
      const userId = (session.user as any).id;
      const res = await fetch("/api/user-api-keys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId,
          groqKey: keys.groq || null,
          openaiKey: keys.openai || null,
          geminiKey: keys.gemini || null
        })
      });
      const data = await res.json();
      if (data.success) {
        setMessage({ type: "success", text: "✅ Đã lưu API keys thành công!" });
      } else {
        setMessage({ type: "error", text: data.message || "Lỗi khi lưu" });
      }
    } catch (err) {
      setMessage({ type: "error", text: "Không thể kết nối server" });
    } finally {
      setSaving(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setMessage({ type: "success", text: "Đã copy!" });
    setTimeout(() => setMessage(null), 2000);
  };

  if (status === "loading" || loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-gray-900 to-zinc-900 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-white animate-spin" />
      </div>
    );
  }

  const userName = session?.user?.name || session?.user?.email || "User";

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-gray-900 to-zinc-900 p-4 md:p-8">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Link href="/dashboard-new" className="p-2 bg-white/10 rounded-xl hover:bg-white/20 transition">
            <ArrowLeft className="w-5 h-5 text-white" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-white flex items-center gap-2">
              <Key className="w-6 h-6 text-yellow-400" />
              Cài đặt API Keys
            </h1>
            <p className="text-white/60 text-sm">Xin chào, {userName}</p>
          </div>
        </div>

        {/* Message */}
        <AnimatePresence>
          {message && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className={`mb-6 p-4 rounded-xl flex items-center gap-2 ${
                message.type === "success" 
                  ? "bg-green-500/20 border border-green-500/50 text-green-300"
                  : "bg-red-500/20 border border-red-500/50 text-red-300"
              }`}
            >
              {message.type === "success" ? <CheckCircle className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
              {message.text}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Why API Keys */}
        <div className="bg-gradient-to-r from-purple-500/10 to-pink-500/10 rounded-2xl p-6 border border-purple-500/20 mb-8">
          <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-yellow-400" />
            Tại sao cần API key riêng?
          </h2>
          <div className="grid md:grid-cols-2 gap-4">
            {[
              { icon: "🚀", text: "Không giới hạn số lượt sử dụng" },
              { icon: "⚡", text: "Tốc độ phản hồi nhanh hơn" },
              { icon: "🔒", text: "Bảo mật - key chỉ lưu trong tài khoản bạn" },
              { icon: "💰", text: "Tự kiểm soát chi phí API" }
            ].map((item, i) => (
              <div key={i} className="flex items-center gap-3 bg-white/5 rounded-xl p-3">
                <span className="text-2xl">{item.icon}</span>
                <span className="text-white/80 text-sm">{item.text}</span>
              </div>
            ))}
          </div>
        </div>

        {/* API Key Inputs */}
        <div className="space-y-6 mb-8">
          {(Object.keys(providerInfo) as Provider[]).map((provider) => {
            const info = providerInfo[provider];
            const guide = videoGuides.find(g => g.provider === provider)!;
            const isExpanded = expandedGuide === provider;
            
            return (
              <motion.div
                key={provider}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className={`${info.bgColor} border ${info.borderColor} rounded-2xl overflow-hidden`}
              >
                {/* Provider Header */}
                <div className="p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`w-12 h-12 bg-gradient-to-br ${info.color} rounded-xl flex items-center justify-center text-2xl`}>
                      {info.icon}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-white font-bold">{info.name}</h3>
                        {info.recommended && (
                          <span className="text-xs bg-green-500/30 text-green-300 px-2 py-0.5 rounded-full">Khuyên dùng</span>
                        )}
                      </div>
                      <p className="text-white/60 text-sm">{info.description}</p>
                    </div>
                  </div>
                  <a
                    href={info.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`flex items-center gap-1 px-3 py-1.5 ${info.bgColor} ${info.textColor} rounded-lg text-sm hover:opacity-80`}
                  >
                    Lấy key <ExternalLink className="w-3 h-3" />
                  </a>
                </div>

                {/* Input */}
                <div className="px-4 pb-4">
                  <div className="relative">
                    <input
                      type={showKeys[provider] ? "text" : "password"}
                      value={keys[provider]}
                      onChange={(e) => setKeys({ ...keys, [provider]: e.target.value })}
                      placeholder={`Nhập ${info.name} API Key...`}
                      className="w-full bg-black/30 border border-white/10 rounded-xl px-4 py-3 pr-20 text-white placeholder-white/30 focus:outline-none focus:border-white/30"
                    />
                    <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                      <button
                        onClick={() => setShowKeys({ ...showKeys, [provider]: !showKeys[provider] })}
                        className="p-2 hover:bg-white/10 rounded-lg"
                      >
                        {showKeys[provider] ? <EyeOff className="w-4 h-4 text-white/60" /> : <Eye className="w-4 h-4 text-white/60" />}
                      </button>
                      {keys[provider] && (
                        <button
                          onClick={() => copyToClipboard(keys[provider])}
                          className="p-2 hover:bg-white/10 rounded-lg"
                        >
                          <Copy className="w-4 h-4 text-white/60" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {/* Video Guide Toggle */}
                <button
                  onClick={() => setExpandedGuide(isExpanded ? null : provider)}
                  className="w-full px-4 py-3 bg-black/20 flex items-center justify-between text-white/70 hover:text-white hover:bg-black/30 transition"
                >
                  <span className="flex items-center gap-2 text-sm">
                    <Play className="w-4 h-4" />
                    Xem hướng dẫn lấy API key
                  </span>
                  {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </button>

                {/* Expanded Guide */}
                <AnimatePresence>
                  {isExpanded && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="overflow-hidden"
                    >
                      <div className="p-4 bg-black/20 space-y-4">
                        {/* Video Thumbnail */}
                        <button
                          onClick={() => setShowVideoModal(provider)}
                          className="relative w-full aspect-video rounded-xl overflow-hidden group"
                        >
                          <div className="absolute inset-0 bg-gradient-to-br from-black/50 to-transparent z-10" />
                          <div className="absolute inset-0 flex items-center justify-center z-20">
                            <div className="w-16 h-16 bg-red-600 rounded-full flex items-center justify-center group-hover:scale-110 transition shadow-lg">
                              <Play className="w-8 h-8 text-white ml-1" />
                            </div>
                          </div>
                          <div className="absolute bottom-2 right-2 z-20 bg-black/70 px-2 py-1 rounded text-white text-xs">
                            {guide.duration}
                          </div>
                          <div className="w-full h-full bg-gradient-to-br from-gray-700 to-gray-800 flex items-center justify-center">
                            <Youtube className="w-12 h-12 text-white/30" />
                          </div>
                        </button>

                        {/* Steps */}
                        <div>
                          <h4 className="text-white/80 font-medium mb-2 text-sm">Các bước thực hiện:</h4>
                          <ol className="space-y-2">
                            {guide.steps.map((step, i) => (
                              <li key={i} className="flex items-start gap-2 text-white/60 text-sm">
                                <span className={`w-5 h-5 ${info.bgColor} ${info.textColor} rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0`}>
                                  {i + 1}
                                </span>
                                {step}
                              </li>
                            ))}
                          </ol>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            );
          })}
        </div>

        {/* Save Button */}
        <button
          onClick={handleSave}
          disabled={saving}
          className="w-full py-4 bg-gradient-to-r from-teal-500 to-emerald-500 text-white font-bold rounded-xl hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-2 shadow-lg"
        >
          {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <CheckCircle className="w-5 h-5" />}
          {saving ? "Đang lưu..." : "Lưu API Keys"}
        </button>

        {/* Quick Links */}
        <div className="mt-8 grid grid-cols-2 gap-4">
          <Link
            href="/dashboard-new/survey"
            className="p-4 bg-white/5 rounded-xl border border-white/10 hover:bg-white/10 transition text-center"
          >
            <span className="text-2xl mb-2 block">📋</span>
            <span className="text-white/80 text-sm">Khảo sát học tập</span>
          </Link>
          <Link
            href="/dashboard-new/guide"
            className="p-4 bg-white/5 rounded-xl border border-white/10 hover:bg-white/10 transition text-center"
          >
            <span className="text-2xl mb-2 block">📖</span>
            <span className="text-white/80 text-sm">Hướng dẫn sử dụng</span>
          </Link>
        </div>
      </div>

      {/* Video Modal */}
      <AnimatePresence>
        {showVideoModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
            onClick={() => setShowVideoModal(null)}
          >
            <motion.div
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.9 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-3xl bg-gray-900 rounded-2xl overflow-hidden"
            >
              <div className="p-4 flex items-center justify-between border-b border-white/10">
                <h3 className="text-white font-bold">
                  {videoGuides.find(g => g.provider === showVideoModal)?.title}
                </h3>
                <button onClick={() => setShowVideoModal(null)} className="text-white/60 hover:text-white">
                  ✕
                </button>
              </div>
              <div className="aspect-video bg-black flex items-center justify-center">
                <div className="text-center text-white/60">
                  <Youtube className="w-16 h-16 mx-auto mb-4 text-red-500" />
                  <p>Video hướng dẫn sẽ được cập nhật sớm</p>
                  <a
                    href={providerInfo[showVideoModal].link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 mt-4 px-4 py-2 bg-white/10 rounded-lg hover:bg-white/20"
                  >
                    Truy cập trực tiếp <ExternalLink className="w-4 h-4" />
                  </a>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
