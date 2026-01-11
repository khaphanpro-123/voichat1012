"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { 
  ArrowLeft, Key, Play, ExternalLink, CheckCircle, 
  Copy, Eye, EyeOff, Loader2, AlertCircle, Sparkles,
  Video, ChevronDown, ChevronUp, Trash2, LogIn
} from "lucide-react";

type Provider = "groq" | "openai" | "gemini" | "cohere";

interface ApiKeyState {
  groq: string;
  openai: string;
  gemini: string;
  cohere: string;
}

interface SavedKeyState {
  groq: string;
  openai: string;
  gemini: string;
  cohere: string;
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
    url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
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
    url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
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
    url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
    thumbnail: "https://img.youtube.com/vi/dQw4w9WgXcQ/maxresdefault.jpg",
    duration: "2:00",
    steps: [
      "Truy cập aistudio.google.com/apikey",
      "Đăng nhập bằng Google",
      "Click 'Create API Key'",
      "Chọn project hoặc tạo mới",
      "Copy key và dán vào đây"
    ]
  },
  {
    provider: "cohere",
    title: "Cách lấy Cohere API Key (Miễn phí)",
    url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
    thumbnail: "https://img.youtube.com/vi/dQw4w9WgXcQ/maxresdefault.jpg",
    duration: "2:00",
    steps: [
      "Truy cập dashboard.cohere.com",
      "Đăng nhập/Đăng ký tài khoản",
      "Vào mục API Keys",
      "Click 'Create Trial Key'",
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
    recommended: true,
    keyPrefix: "gsk_"
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
    recommended: false,
    keyPrefix: "sk-"
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
    recommended: true,
    keyPrefix: "AIza"
  },
  cohere: {
    name: "Cohere",
    color: "from-purple-500 to-pink-500",
    bgColor: "bg-purple-500/10",
    borderColor: "border-purple-500/30",
    textColor: "text-purple-400",
    icon: "🟣",
    description: "Miễn phí, Command-R models",
    link: "https://dashboard.cohere.com/api-keys",
    recommended: true,
    keyPrefix: ""
  }
};

// Mask key: show only last 4 characters
const maskKey = (key: string): string => {
  if (!key || key.length < 8) return "";
  return "••••••••" + key.slice(-4);
};

export default function SettingsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  
  const [keys, setKeys] = useState<ApiKeyState>({ groq: "", openai: "", gemini: "", cohere: "" });
  const [savedKeys, setSavedKeys] = useState<SavedKeyState>({ groq: "", openai: "", gemini: "", cohere: "" });
  const [showKeys, setShowKeys] = useState<Record<Provider, boolean>>({ groq: false, openai: false, gemini: false, cohere: false });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<Provider | null>(null);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [expandedGuide, setExpandedGuide] = useState<Provider | null>(null);
  const [showVideoModal, setShowVideoModal] = useState<Provider | null>(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    if (status === "authenticated") {
      setIsLoggedIn(true);
    } else if (status === "unauthenticated") {
      setIsLoggedIn(false);
      setLoading(false);
    }
  }, [status]);

  // Load existing keys
  useEffect(() => {
    const loadKeys = async () => {
      if (!session?.user) {
        setLoading(false);
        return;
      }
      const userId = (session.user as any).id;
      try {
        const res = await fetch(`/api/user-api-keys?userId=${userId}`);
        const data = await res.json();
        if (data.success && data.keys) {
          // Store saved keys separately for display
          setSavedKeys({
            groq: data.keys.groqKey || "",
            openai: data.keys.openaiKey || "",
            gemini: data.keys.geminiKey || "",
            cohere: data.keys.cohereKey || ""
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
    if (!session?.user) {
      setMessage({ type: "error", text: "Vui lòng đăng nhập để lưu API keys" });
      return;
    }
    setSaving(true);
    setMessage(null);
    
    try {
      const userId = (session.user as any).id;
      
      // Only send keys that have been entered (not empty)
      const keysToSave: Record<string, string | null> = { userId };
      if (keys.groq) keysToSave.groqKey = keys.groq;
      if (keys.openai) keysToSave.openaiKey = keys.openai;
      if (keys.gemini) keysToSave.geminiKey = keys.gemini;
      if (keys.cohere) keysToSave.cohereKey = keys.cohere;
      
      const res = await fetch("/api/user-api-keys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(keysToSave)
      });
      const data = await res.json();
      if (data.success) {
        setMessage({ type: "success", text: "✅ Đã lưu API keys thành công!" });
        // Update saved keys and clear input fields
        setSavedKeys(prev => ({
          groq: keys.groq || prev.groq,
          openai: keys.openai || prev.openai,
          gemini: keys.gemini || prev.gemini,
          cohere: keys.cohere || prev.cohere
        }));
        setKeys({ groq: "", openai: "", gemini: "", cohere: "" });
      } else {
        setMessage({ type: "error", text: data.message || "Lỗi khi lưu" });
      }
    } catch (err) {
      setMessage({ type: "error", text: "Không thể kết nối server" });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (provider: Provider) => {
    if (!session?.user) return;
    if (!confirm(`Bạn có chắc muốn xóa ${providerInfo[provider].name} API key?`)) return;
    
    setDeleting(provider);
    try {
      const userId = (session.user as any).id;
      const res = await fetch("/api/user-api-keys", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, provider })
      });
      const data = await res.json();
      if (data.success) {
        setMessage({ type: "success", text: `✅ Đã xóa ${providerInfo[provider].name} API key` });
        setSavedKeys(prev => ({ ...prev, [provider]: "" }));
      } else {
        setMessage({ type: "error", text: data.message || "Lỗi khi xóa" });
      }
    } catch (err) {
      setMessage({ type: "error", text: "Không thể kết nối server" });
    } finally {
      setDeleting(null);
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
            <p className="text-white/60 text-sm">
              {isLoggedIn ? `Xin chào, ${userName}` : "Chưa đăng nhập"}
            </p>
          </div>
        </div>

        {/* Login Warning */}
        {!isLoggedIn && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6 p-4 rounded-xl bg-yellow-500/20 border border-yellow-500/50"
          >
            <div className="flex items-start gap-3">
              <AlertCircle className="w-6 h-6 text-yellow-400 flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="text-yellow-300 font-semibold mb-1">Bạn chưa đăng nhập</h3>
                <p className="text-yellow-200/80 text-sm mb-3">
                  Vui lòng đăng nhập để lưu và quản lý API keys của bạn. API keys sẽ được lưu an toàn trong tài khoản.
                </p>
                <Link
                  href="/auth/login"
                  className="inline-flex items-center gap-2 px-4 py-2 bg-yellow-500 text-black font-medium rounded-lg hover:bg-yellow-400 transition"
                >
                  <LogIn className="w-4 h-4" />
                  Đăng nhập ngay
                </Link>
              </div>
            </div>
          </motion.div>
        )}

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
            const hasSavedKey = !!savedKeys[provider];
            
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
                        {hasSavedKey && (
                          <span className="text-xs bg-blue-500/30 text-blue-300 px-2 py-0.5 rounded-full">✓ Đã lưu</span>
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

                {/* Saved Key Display */}
                {hasSavedKey && (
                  <div className="px-4 pb-2">
                    <div className="flex items-center gap-2 p-3 bg-black/30 rounded-xl border border-green-500/30">
                      <CheckCircle className="w-4 h-4 text-green-400 flex-shrink-0" />
                      <span className="text-green-400 font-mono text-sm flex-1">
                        {showKeys[provider] ? savedKeys[provider] : maskKey(savedKeys[provider])}
                      </span>
                      <button
                        onClick={() => setShowKeys({ ...showKeys, [provider]: !showKeys[provider] })}
                        className="p-1.5 hover:bg-white/10 rounded-lg"
                        title={showKeys[provider] ? "Ẩn key" : "Hiện key"}
                      >
                        {showKeys[provider] ? <EyeOff className="w-4 h-4 text-white/60" /> : <Eye className="w-4 h-4 text-white/60" />}
                      </button>
                      <button
                        onClick={() => copyToClipboard(savedKeys[provider])}
                        className="p-1.5 hover:bg-white/10 rounded-lg"
                        title="Copy key"
                      >
                        <Copy className="w-4 h-4 text-white/60" />
                      </button>
                      <button
                        onClick={() => handleDelete(provider)}
                        disabled={deleting === provider || !isLoggedIn}
                        className="p-1.5 hover:bg-red-500/20 rounded-lg disabled:opacity-50"
                        title="Xóa key"
                      >
                        {deleting === provider ? (
                          <Loader2 className="w-4 h-4 text-red-400 animate-spin" />
                        ) : (
                          <Trash2 className="w-4 h-4 text-red-400" />
                        )}
                      </button>
                    </div>
                  </div>
                )}

                {/* Input for new/update key */}
                <div className="px-4 pb-4">
                  <div className="relative">
                    <input
                      type="text"
                      value={keys[provider]}
                      onChange={(e) => setKeys({ ...keys, [provider]: e.target.value })}
                      placeholder={hasSavedKey ? `Nhập key mới để cập nhật...` : `Nhập ${info.name} API Key...`}
                      disabled={!isLoggedIn}
                      className="w-full bg-black/30 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/30 focus:outline-none focus:border-white/30 disabled:opacity-50 disabled:cursor-not-allowed"
                    />
                  </div>
                  {hasSavedKey && (
                    <p className="text-white/40 text-xs mt-2">
                      💡 Nhập key mới ở trên để thay thế key hiện tại
                    </p>
                  )}
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
                            <Video className="w-12 h-12 text-white/30" />
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
          disabled={saving || !isLoggedIn || (!keys.groq && !keys.openai && !keys.gemini && !keys.cohere)}
          className="w-full py-4 bg-gradient-to-r from-teal-500 to-emerald-500 text-white font-bold rounded-xl hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg"
        >
          {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <CheckCircle className="w-5 h-5" />}
          {saving ? "Đang lưu..." : !isLoggedIn ? "Đăng nhập để lưu" : "Lưu API Keys"}
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
                  <Video className="w-16 h-16 mx-auto mb-4 text-red-500" />
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
