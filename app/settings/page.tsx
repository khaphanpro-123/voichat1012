"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";

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
        setMessage({ type: "success", text: " Đã lưu API keys thành công!" });
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
        setMessage({ type: "success", text: ` Đã xóa ${providerInfo[provider].name} API key` });
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
        <div className="w-8 h-8 border-4 border-gray-300 border-t-gray-800 rounded-full animate-spin" />
      </div>
    );
  }

  const userName = session?.user?.name || session?.user?.email || "User";

  return (
    <div className="min-h-screen bg-white p-4 sm:p-6 md:p-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <Link href="/dashboard-new" className="px-4 py-2 bg-gray-100 rounded-lg hover:bg-gray-200 transition flex-shrink-0 text-sm font-semibold text-gray-700">
            Quay lại
          </Link>
          <div className="flex-1 min-w-0">
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900 truncate">
              Cài đặt API Keys
            </h1>
            <p className="text-sm sm:text-base text-gray-600 font-medium truncate">
              {isLoggedIn ? `Xin chào, ${userName}` : "Chưa đăng nhập"}
            </p>
          </div>
        </div>

        {/* Login Warning */}
        {!isLoggedIn && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6 p-4 rounded-lg bg-yellow-50 border border-yellow-300"
          >
            <h3 className="text-yellow-800 font-bold text-base mb-2">Bạn chưa đăng nhập</h3>
            <p className="text-yellow-700 text-sm mb-3">
              Vui lòng đăng nhập để lưu và quản lý API keys của bạn.
            </p>
            <Link
              href="/auth/login"
              className="inline-flex items-center justify-center px-4 py-2 bg-yellow-500 text-black font-semibold text-sm rounded-lg hover:bg-yellow-400 transition"
            >
              Đăng nhập ngay
            </Link>
          </motion.div>
        )}

        {/* Message */}
        <AnimatePresence>
          {message && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className={`mb-4 p-3 rounded-lg text-sm font-semibold ${
                message.type === "success" 
                  ? "bg-green-50 border border-green-300 text-green-800"
                  : "bg-red-50 border border-red-300 text-red-800"
              }`}
            >
              {message.text}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Why API Keys */}
        <div className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-lg p-4 border border-purple-200 mb-6">
          <h2 className="text-base font-bold text-gray-900 mb-3">
            Tại sao cần API key riêng?
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {[
              { text: "Không giới hạn số lượt sử dụng" },
              { text: "Tốc độ phản hồi nhanh hơn" },
              { text: "Bảo mật - key chỉ lưu trong tài khoản bạn" },
              { text: "Tự kiểm soát chi phí API" }
            ].map((item, i) => (
              <div key={i} className="bg-white rounded-lg p-3 shadow-sm">
                <span className="text-gray-800 font-medium text-sm">{item.text}</span>
              </div>
            ))}
          </div>
        </div>

        {/* API Key Inputs */}
        <div className="space-y-4 mb-6">
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
                className={`${info.bgColor} border ${info.borderColor} rounded-lg overflow-hidden shadow-sm`}
              >
                {/* Provider Header */}
                <div className="p-4">
                  <div className="mb-3">
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <h3 className="text-gray-900 font-bold text-base">{info.name}</h3>
                      {info.recommended && (
                        <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-semibold">Khuyên dùng</span>
                      )}
                      {hasSavedKey && (
                        <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-semibold">Đã lưu</span>
                      )}
                    </div>
                    <p className="text-gray-600 font-medium text-xs">{info.description}</p>
                  </div>
                  
                  <a
                    href={info.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`w-full flex items-center justify-center px-4 py-2 bg-white ${info.textColor} rounded-lg text-sm font-semibold hover:opacity-80 shadow-sm border ${info.borderColor}`}
                  >
                    Lấy key
                  </a>
                </div>

                {/* Saved Key Display */}
                {hasSavedKey && (
                  <div className="px-4 pb-3">
                    <div className="flex items-center gap-2 p-2 bg-white rounded-lg border border-green-300 shadow-sm">
                      <span className="text-green-700 font-mono text-xs flex-1 font-semibold truncate">
                        {showKeys[provider] ? savedKeys[provider] : maskKey(savedKeys[provider])}
                      </span>
                      <button
                        onClick={() => setShowKeys({ ...showKeys, [provider]: !showKeys[provider] })}
                        className="px-2 py-1 bg-gray-100 hover:bg-gray-200 rounded text-xs font-semibold text-gray-700 flex-shrink-0"
                      >
                        {showKeys[provider] ? "Ẩn" : "Hiện"}
                      </button>
                      <button
                        onClick={() => copyToClipboard(savedKeys[provider])}
                        className="px-2 py-1 bg-blue-100 hover:bg-blue-200 rounded text-xs font-semibold text-blue-700 flex-shrink-0"
                      >
                        Copy
                      </button>
                      <button
                        onClick={() => handleDelete(provider)}
                        disabled={deleting === provider || !isLoggedIn}
                        className="px-2 py-1 bg-red-100 hover:bg-red-200 rounded disabled:opacity-50 text-xs font-semibold text-red-700 flex-shrink-0"
                      >
                        {deleting === provider ? "..." : "Xóa"}
                      </button>
                    </div>
                  </div>
                )}

                {/* Input for new/update key */}
                <div className="px-4 pb-4">
                  <input
                    type="text"
                    value={keys[provider]}
                    onChange={(e) => setKeys({ ...keys, [provider]: e.target.value })}
                    placeholder={hasSavedKey ? `Nhập key mới để cập nhật...` : `Nhập ${info.name} API Key...`}
                    disabled={!isLoggedIn}
                    className="w-full bg-white border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:border-gray-500 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
                  />
                  {hasSavedKey && (
                    <p className="text-gray-600 text-xs mt-2 font-medium">
                      Nhập key mới ở trên để thay thế key hiện tại
                    </p>
                  )}
                </div>

                {/* Video Guide Toggle */}
                <button
                  onClick={() => setExpandedGuide(isExpanded ? null : provider)}
                  className="w-full px-4 py-2 bg-white/50 flex items-center justify-between text-gray-700 hover:text-gray-900 hover:bg-white/80 transition border-t border-gray-200 text-sm"
                >
                  <span className="font-semibold">
                    Xem hướng dẫn lấy API key
                  </span>
                  <span className="font-bold">{isExpanded ? "▲" : "▼"}</span>
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
                      <div className="p-3 sm:p-4 bg-white/70 space-y-3 sm:space-y-4 border-t border-gray-200">
                        {/* Video Placeholder */}
                        <button
                          onClick={() => setShowVideoModal(provider)}
                          className="relative w-full aspect-video rounded-xl overflow-hidden group shadow-md bg-gradient-to-br from-gray-200 to-gray-300 flex items-center justify-center"
                        >
                          <div className="absolute inset-0 bg-gradient-to-br from-black/50 to-transparent z-10" />
                          <div className="absolute inset-0 flex items-center justify-center z-20">
                            <div className="w-12 h-12 sm:w-16 sm:h-16 bg-red-600 rounded-full flex items-center justify-center group-hover:scale-110 transition shadow-lg">
                              <span className="text-white text-xl sm:text-2xl font-bold ml-1">▶</span>
                            </div>
                          </div>
                          <div className="absolute bottom-2 right-2 z-20 bg-black/70 px-2 py-1 rounded text-white text-xs font-semibold">
                            {guide.duration}
                          </div>
                          <span className="text-gray-400 text-4xl sm:text-5xl font-bold">VIDEO</span>
                        </button>

                        {/* Steps */}
                        <div>
                          <h4 className="text-gray-800 font-bold mb-2 text-sm">Các bước thực hiện:</h4>
                          <ol className="space-y-2">
                            {guide.steps.map((step, i) => (
                              <li key={i} className="flex items-start gap-2 text-gray-700 font-medium text-xs">
                                <span className={`w-5 h-5 ${info.bgColor} ${info.textColor} rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 border ${info.borderColor}`}>
                                  {i + 1}
                                </span>
                                <span className="flex-1">{step}</span>
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
          className="w-full py-3 bg-gradient-to-r from-teal-500 to-emerald-500 text-white font-bold text-base rounded-lg hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg"
        >
          {saving ? (
            <>
              <div className="w-5 h-5 border-3 border-white border-t-transparent rounded-full animate-spin" />
              Đang lưu...
            </>
          ) : (
            <>
              {!isLoggedIn ? "Đăng nhập để lưu" : "Lưu API Keys"}
            </>
          )}
        </button>

        {/* Quick Links */}
        <div className="mt-6 grid grid-cols-2 gap-3">
          <Link
            href="/dashboard-new/survey"
            className="p-3 bg-gray-50 rounded-lg border border-gray-200 hover:bg-gray-100 transition text-center shadow-sm"
          >
            <span className="text-gray-800 font-semibold text-sm">Khảo sát học tập</span>
          </Link>
          <Link
            href="/dashboard-new/guide"
            className="p-3 bg-gray-50 rounded-lg border border-gray-200 hover:bg-gray-100 transition text-center shadow-sm"
          >
            <span className="text-gray-800 font-semibold text-sm">Hướng dẫn sử dụng</span>
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
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-3 sm:p-4"
            onClick={() => setShowVideoModal(null)}
          >
            <motion.div
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.9 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-3xl bg-white rounded-2xl overflow-hidden shadow-2xl"
            >
              <div className="p-3 sm:p-4 flex items-center justify-between border-b border-gray-200">
                <h3 className="text-gray-900 font-bold text-sm sm:text-lg truncate flex-1 pr-2">
                  {videoGuides.find(g => g.provider === showVideoModal)?.title}
                </h3>
                <button onClick={() => setShowVideoModal(null)} className="text-gray-500 hover:text-gray-900 text-xl font-bold flex-shrink-0">
                  
                </button>
              </div>
              <div className="aspect-video bg-gray-100 flex items-center justify-center p-4">
                <div className="text-center text-gray-600">
                  <p className="text-2xl sm:text-3xl font-bold block mb-4">VIDEO</p>
                  <p className="font-medium text-sm sm:text-base mb-4">Video hướng dẫn sẽ được cập nhật sớm</p>
                  <a
                    href={providerInfo[showVideoModal].link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-4 py-2 bg-gray-200 text-gray-800 font-semibold rounded-lg hover:bg-gray-300 text-sm sm:text-base"
                  >
                    Truy cập trực tiếp
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
