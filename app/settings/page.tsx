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
    bgColor: "bg-orange-50",
    borderColor: "border-orange-300",
    textColor: "text-orange-600",
    icon: "⚡",
    description: "Miễn phí, tốc độ cực nhanh",
    link: "https://console.groq.com/keys",
    recommended: true,
    keyPrefix: "gsk_"
  },
  openai: {
    name: "OpenAI",
    color: "from-green-500 to-emerald-500",
    bgColor: "bg-green-50",
    borderColor: "border-green-300",
    textColor: "text-green-600",
    icon: "🤖",
    description: "Chất lượng cao, trả phí",
    link: "https://platform.openai.com/api-keys",
    recommended: false,
    keyPrefix: "sk-"
  },
  gemini: {
    name: "Google Gemini",
    color: "from-blue-500 to-purple-500",
    bgColor: "bg-blue-50",
    borderColor: "border-blue-300",
    textColor: "text-blue-600",
    icon: "✨",
    description: "Miễn phí, hỗ trợ Vision",
    link: "https://aistudio.google.com/app/apikey",
    recommended: true,
    keyPrefix: "AIza"
  },
  cohere: {
    name: "Cohere",
    color: "from-purple-500 to-pink-500",
    bgColor: "bg-purple-50",
    borderColor: "border-purple-300",
    textColor: "text-purple-600",
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
      <div className="min-h-screen bg-white flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-gray-800 animate-spin" />
      </div>
    );
  }

  const userName = session?.user?.name || session?.user?.email || "User";

  return (
    <div className="min-h-screen bg-white p-4 md:p-8">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Link href="/dashboard-new" className="p-2 bg-gray-100 rounded-xl hover:bg-gray-200 transition">
            <ArrowLeft className="w-5 h-5 text-gray-800" />
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
              <Key className="w-7 h-7 text-yellow-500" />
              Cài đặt API Keys
            </h1>
            <p className="text-gray-600 text-base font-medium">
              {isLoggedIn ? `Xin chào, ${userName}` : "Chưa đăng nhập"}
            </p>
          </div>
        </div>

        {/* Login Warning */}
        {!isLoggedIn && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6 p-4 rounded-xl bg-yellow-50 border-2 border-yellow-400"
          >
            <div className="flex items-start gap-3">
              <AlertCircle className="w-6 h-6 text-yellow-600 flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="text-yellow-800 font-bold text-lg mb-1">Bạn chưa đăng nhập</h3>
                <p className="text-yellow-700 text-base mb-3">
                  Vui lòng đăng nhập để lưu và quản lý API keys của bạn. API keys sẽ được lưu an toàn trong tài khoản.
                </p>
                <Link
                  href="/auth/login"
                  className="inline-flex items-center gap-2 px-4 py-2 bg-yellow-500 text-black font-bold rounded-lg hover:bg-yellow-400 transition"
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
                  ? "bg-green-50 border-2 border-green-400 text-green-800"
                  : "bg-red-50 border-2 border-red-400 text-red-800"
              }`}
            >
              {message.type === "success" ? <CheckCircle className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
              <span className="font-semibold">{message.text}</span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Why API Keys */}
        <div className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-2xl p-6 border-2 border-purple-200 mb-8">
          <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
            <Sparkles className="w-6 h-6 text-yellow-500" />
            Tại sao cần API key riêng?
          </h2>
          <div className="grid md:grid-cols-2 gap-4">
            {[
              { icon: "🚀", text: "Không giới hạn số lượt sử dụng" },
              { icon: "⚡", text: "Tốc độ phản hồi nhanh hơn" },
              { icon: "🔒", text: "Bảo mật - key chỉ lưu trong tài khoản bạn" },
              { icon: "💰", text: "Tự kiểm soát chi phí API" }
            ].map((item, i) => (
              <div key={i} className="flex items-center gap-3 bg-white rounded-xl p-3 shadow-sm">
                <span className="text-2xl">{item.icon}</span>
                <span className="text-gray-800 font-medium">{item.text}</span>
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
                className={`${info.bgColor} border-2 ${info.borderColor} rounded-2xl overflow-hidden shadow-sm`}
              >
                {/* Provider Header */}
                <div className="p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`w-12 h-12 bg-gradient-to-br ${info.color} rounded-xl flex items-center justify-center text-2xl shadow-md`}>
                      {info.icon}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-gray-900 font-bold text-lg">{info.name}</h3>
                        {info.recommended && (
                          <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-semibold">Khuyên dùng</span>
                        )}
                        {hasSavedKey && (
                          <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-semibold">✓ Đã lưu</span>
                        )}
                      </div>
                      <p className="text-gray-600 font-medium">{info.description}</p>
                    </div>
                  </div>
                  <a
                    href={info.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`flex items-center gap-1 px-3 py-1.5 bg-white ${info.textColor} rounded-lg text-sm font-semibold hover:opacity-80 shadow-sm border ${info.borderColor}`}
                  >
                    Lấy key <ExternalLink className="w-3 h-3" />
                  </a>
                </div>

                {/* Saved Key Display */}
                {hasSavedKey && (
                  <div className="px-4 pb-2">
                    <div className="flex items-center gap-2 p-3 bg-white rounded-xl border-2 border-green-300 shadow-sm">
                      <CheckCircle className="w-4 h-4 text-green-600 flex-shrink-0" />
                      <span className="text-green-700 font-mono text-sm flex-1 font-semibold">
                        {showKeys[provider] ? savedKeys[provider] : maskKey(savedKeys[provider])}
                      </span>
                      <button
                        onClick={() => setShowKeys({ ...showKeys, [provider]: !showKeys[provider] })}
                        className="p-1.5 hover:bg-gray-100 rounded-lg"
                        title={showKeys[provider] ? "Ẩn key" : "Hiện key"}
                      >
                        {showKeys[provider] ? <EyeOff className="w-4 h-4 text-gray-500" /> : <Eye className="w-4 h-4 text-gray-500" />}
                      </button>
                      <button
                        onClick={() => copyToClipboard(savedKeys[provider])}
                        className="p-1.5 hover:bg-gray-100 rounded-lg"
                        title="Copy key"
                      >
                        <Copy className="w-4 h-4 text-gray-500" />
                      </button>
                      <button
                        onClick={() => handleDelete(provider)}
                        disabled={deleting === provider || !isLoggedIn}
                        className="p-1.5 hover:bg-red-50 rounded-lg disabled:opacity-50"
                        title="Xóa key"
                      >
                        {deleting === provider ? (
                          <Loader2 className="w-4 h-4 text-red-500 animate-spin" />
                        ) : (
                          <Trash2 className="w-4 h-4 text-red-500" />
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
                      className="w-full bg-white border-2 border-gray-200 rounded-xl px-4 py-3 text-gray-900 placeholder-gray-400 focus:outline-none focus:border-gray-400 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
                    />
                  </div>
                  {hasSavedKey && (
                    <p className="text-gray-500 text-sm mt-2 font-medium">
                      💡 Nhập key mới ở trên để thay thế key hiện tại
                    </p>
                  )}
                </div>

                {/* Video Guide Toggle */}
                <button
                  onClick={() => setExpandedGuide(isExpanded ? null : provider)}
                  className="w-full px-4 py-3 bg-white/50 flex items-center justify-between text-gray-600 hover:text-gray-900 hover:bg-white/80 transition border-t border-gray-200"
                >
                  <span className="flex items-center gap-2 font-medium">
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
                      <div className="p-4 bg-white/70 space-y-4 border-t border-gray-200">
                        {/* Video Thumbnail */}
                        <button
                          onClick={() => setShowVideoModal(provider)}
                          className="relative w-full aspect-video rounded-xl overflow-hidden group shadow-md"
                        >
                          <div className="absolute inset-0 bg-gradient-to-br from-black/50 to-transparent z-10" />
                          <div className="absolute inset-0 flex items-center justify-center z-20">
                            <div className="w-16 h-16 bg-red-600 rounded-full flex items-center justify-center group-hover:scale-110 transition shadow-lg">
                              <Play className="w-8 h-8 text-white ml-1" />
                            </div>
                          </div>
                          <div className="absolute bottom-2 right-2 z-20 bg-black/70 px-2 py-1 rounded text-white text-xs font-semibold">
                            {guide.duration}
                          </div>
                          <div className="w-full h-full bg-gradient-to-br from-gray-200 to-gray-300 flex items-center justify-center">
                            <Video className="w-12 h-12 text-gray-400" />
                          </div>
                        </button>

                        {/* Steps */}
                        <div>
                          <h4 className="text-gray-800 font-bold mb-2">Các bước thực hiện:</h4>
                          <ol className="space-y-2">
                            {guide.steps.map((step, i) => (
                              <li key={i} className="flex items-start gap-2 text-gray-700 font-medium">
                                <span className={`w-5 h-5 ${info.bgColor} ${info.textColor} rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 border ${info.borderColor}`}>
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
          className="w-full py-4 bg-gradient-to-r from-teal-500 to-emerald-500 text-white font-bold text-lg rounded-xl hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg"
        >
          {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <CheckCircle className="w-5 h-5" />}
          {saving ? "Đang lưu..." : !isLoggedIn ? "Đăng nhập để lưu" : "Lưu API Keys"}
        </button>

        {/* Quick Links */}
        <div className="mt-8 grid grid-cols-2 gap-4">
          <Link
            href="/dashboard-new/survey"
            className="p-4 bg-gray-50 rounded-xl border-2 border-gray-200 hover:bg-gray-100 transition text-center shadow-sm"
          >
            <span className="text-2xl mb-2 block">📋</span>
            <span className="text-gray-800 font-semibold">Khảo sát học tập</span>
          </Link>
          <Link
            href="/dashboard-new/guide"
            className="p-4 bg-gray-50 rounded-xl border-2 border-gray-200 hover:bg-gray-100 transition text-center shadow-sm"
          >
            <span className="text-2xl mb-2 block">📖</span>
            <span className="text-gray-800 font-semibold">Hướng dẫn sử dụng</span>
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
              className="w-full max-w-3xl bg-white rounded-2xl overflow-hidden shadow-2xl"
            >
              <div className="p-4 flex items-center justify-between border-b border-gray-200">
                <h3 className="text-gray-900 font-bold text-lg">
                  {videoGuides.find(g => g.provider === showVideoModal)?.title}
                </h3>
                <button onClick={() => setShowVideoModal(null)} className="text-gray-500 hover:text-gray-900 text-xl font-bold">
                  ✕
                </button>
              </div>
              <div className="aspect-video bg-gray-100 flex items-center justify-center">
                <div className="text-center text-gray-600">
                  <Video className="w-16 h-16 mx-auto mb-4 text-red-500" />
                  <p className="font-medium">Video hướng dẫn sẽ được cập nhật sớm</p>
                  <a
                    href={providerInfo[showVideoModal].link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 mt-4 px-4 py-2 bg-gray-200 text-gray-800 font-semibold rounded-lg hover:bg-gray-300"
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
