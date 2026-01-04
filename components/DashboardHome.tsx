"use client";
import { useState, useEffect, useMemo } from "react";
import { useSession } from "next-auth/react";
import { motion } from "framer-motion";
import Link from "next/link";
import {
  MessageCircle,
  Camera,
  Flame,
  Trophy,
  ArrowRight,
  Upload,
  BookOpen,
  History,
  HelpCircle,
} from "lucide-react";
import { OnboardingTutorial } from "./OnboardingTutorial";

interface UserProgress {
  level: string;
  totalXp: number;
  currentStreak: number;
  longestStreak: number;
  activities: {
    chatSessions: number;
    photoAnalysis: number;
    debateSessions: number;
    mediaLessons: number;
    documentsUploaded: number;
    vocabularyLearned: number;
    pronunciationPractice: number;
  };
  commonMistakes?: Array<{
    type: string;
    original: string;
    corrected: string;
    explanation: string;
    count: number;
  }>;
  levelProgress: {
    level: string;
    progress: number;
    xpInLevel: number;
    xpToNextLevel: number;
  };
}

// Cache key for localStorage
const PROGRESS_CACHE_KEY = "l2brain_user_progress";
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

// Get cached progress from localStorage
function getCachedProgress(userId: string): UserProgress | null {
  if (typeof window === "undefined") return null;
  try {
    const cached = localStorage.getItem(`${PROGRESS_CACHE_KEY}_${userId}`);
    if (!cached) return null;
    const { data, timestamp } = JSON.parse(cached);
    if (Date.now() - timestamp > CACHE_TTL) return null;
    return data;
  } catch {
    return null;
  }
}

// Save progress to localStorage
function setCachedProgress(userId: string, data: UserProgress): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(
      `${PROGRESS_CACHE_KEY}_${userId}`,
      JSON.stringify({ data, timestamp: Date.now() })
    );
  } catch {
    // Ignore storage errors
  }
}

const learningModes = [
  {
    id: "chat",
    title: "L2-BRAIN",
    description: "Trò chuyện & luyện phát âm tiếng Anh hiệu quả",
    icon: MessageCircle,
    color: "from-purple-400 to-pink-500",
    href: "/dashboard-new/chat",
    activity: "chatSessions",
  },
  {
    id: "photomode",
    title: "Học qua hình ảnh",
    description: "Upload ảnh, học từ vựng từ hình ảnh",
    icon: Camera,
    color: "from-blue-400 to-cyan-500",
    href: "/dashboard-new/photo-mode",
    activity: "photoAnalysis",
  },
  {
    id: "vocabulary",
    title: "Từ vựng",
    description: "Ôn tập và học từ vựng mới",
    icon: BookOpen,
    color: "from-green-400 to-emerald-500",
    href: "/dashboard-new/vocabulary",
    activity: "vocabularyLearned",
  },
  {
    id: "learning-history",
    title: "Lịch sử học tập",
    description: "Xem tiến trình và lỗi thường gặp",
    icon: History,
    color: "from-orange-400 to-amber-500",
    href: "/dashboard-new/learning-history",
    activity: "chatSessions",
  },
];

export default function DashboardHome() {
  const { data: session } = useSession();
  const userId = (session?.user as any)?.id;
  const userName = session?.user?.name || session?.user?.email?.split("@")[0] || "User";
  
  // Initialize with cached data immediately (no loading state if cached)
  const cachedProgress = useMemo(() => userId ? getCachedProgress(userId) : null, [userId]);
  const [progress, setProgress] = useState<UserProgress | null>(cachedProgress);
  const [loading, setLoading] = useState(!cachedProgress); // Only show loading if no cache
  
  // Onboarding tutorial state
  const [showTutorial, setShowTutorial] = useState(false);

  // Check if user is new (first time)
  useEffect(() => {
    if (userId) {
      const tutorialKey = `l2brain_tutorial_completed_${userId}`;
      const completed = localStorage.getItem(tutorialKey);
      if (!completed) {
        // Show tutorial for new users after a short delay
        setTimeout(() => setShowTutorial(true), 500);
      }
    }
  }, [userId]);

  const handleTutorialComplete = () => {
    if (userId) {
      localStorage.setItem(`l2brain_tutorial_completed_${userId}`, "true");
    }
    setShowTutorial(false);
  };

  // Pre-warm DB connection on mount (fire-and-forget)
  useEffect(() => {
    fetch("/api/health").catch(() => {});
  }, []);

  // Load user progress (background refresh)
  useEffect(() => {
    const loadProgress = async () => {
      if (!userId) {
        setLoading(false);
        return;
      }

      try {
        const res = await fetch(`/api/user-progress?userId=${userId}`);
        const data = await res.json();
        if (data.success) {
          setProgress(data.progress);
          setCachedProgress(userId, data.progress); // Update cache
        }
      } catch (error) {
        console.error("Load progress error:", error);
      } finally {
        setLoading(false);
      }
    };

    loadProgress();
  }, [userId]);

  // Default values for new users
  const currentStreak = progress?.currentStreak || 0;
  const totalXp = progress?.totalXp || 0;
  const level = progress?.level || "Beginner";
  const levelProgress = progress?.levelProgress?.progress || 0;
  const activities = progress?.activities || {
    chatSessions: 0,
    photoAnalysis: 0,
    debateSessions: 0,
    mediaLessons: 0,
    documentsUploaded: 0,
    vocabularyLearned: 0,
    pronunciationPractice: 0,
  };

  // Tips for Vietnamese learners
  const tips = [
    "Luyện phát âm mỗi ngày 15 phút để cải thiện accent!",
    "Học 5-10 từ vựng mới mỗi ngày và ôn lại từ cũ.",
    "Xem phim/video tiếng Anh có phụ đề để cải thiện listening.",
    "Đừng ngại mắc lỗi - đó là cách tốt nhất để học!",
    "Ghi âm giọng nói của bạn và so sánh với native speaker.",
  ];
  const randomTip = tips[Math.floor(Math.random() * tips.length)];

  if (loading) {
    return (
      <div className="p-6 md:p-8 max-w-7xl mx-auto flex flex-col items-center justify-center min-h-[50vh] gap-4">
        <motion.div
          className="text-5xl"
          animate={{ scale: [1, 1.1, 1], rotate: [0, 5, -5, 0] }}
          transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
        >
          🧠
        </motion.div>
        <motion.p 
          className="text-gray-500"
          animate={{ opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 2, repeat: Infinity }}
        >
          Đang tải dữ liệu...
        </motion.p>
      </div>
    );
  }

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto">
      {/* Onboarding Tutorial */}
      <OnboardingTutorial
        isOpen={showTutorial}
        onClose={() => setShowTutorial(false)}
        onComplete={handleTutorialComplete}
      />

      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8"
      >
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-2">
              Xin chào, {userName}! 👋
            </h1>
            <p className="text-xl text-gray-600">
              Trình độ: <span className="font-bold text-teal-600">{level}</span>
            </p>
          </div>
          <button
            onClick={() => setShowTutorial(true)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-100 text-blue-700 rounded-xl hover:bg-blue-200 transition-colors"
            title="Xem hướng dẫn"
          >
            <HelpCircle className="w-5 h-5" />
            <span className="hidden md:inline">Hướng dẫn</span>
          </button>
        </div>
      </motion.div>

      {/* Daily Stats */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="grid md:grid-cols-2 gap-6 mb-8"
      >
        {/* Streak Card */}
        <div className="bg-gradient-to-br from-orange-500 to-red-600 rounded-3xl p-6 text-white shadow-xl">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center backdrop-blur-sm">
              <Flame className="w-8 h-8" />
            </div>
            <div>
              <p className="text-sm opacity-90 mb-1">Chuỗi ngày học</p>
              <p className="text-4xl font-bold">{currentStreak} ngày</p>
            </div>
          </div>
          <p className="text-sm opacity-75 mt-4">
            {currentStreak === 0 
              ? "Bắt đầu học ngay để tạo chuỗi ngày! 🔥" 
              : "Tuyệt vời! Tiếp tục duy trì nhé! 🔥"}
          </p>
        </div>

        {/* XP Card */}
        <div className="bg-gradient-to-br from-teal-500 to-emerald-600 rounded-3xl p-6 text-white shadow-xl">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center backdrop-blur-sm">
              <Trophy className="w-8 h-8" />
            </div>
            <div>
              <p className="text-sm opacity-90 mb-1">Điểm kinh nghiệm</p>
              <p className="text-4xl font-bold">{totalXp} XP</p>
            </div>
          </div>
          <div className="mt-4">
            <div className="flex justify-between text-sm opacity-75 mb-2">
              <span>Tiến độ level</span>
              <span>{levelProgress}%</span>
            </div>
            <div className="w-full bg-white/20 rounded-full h-2">
              <div 
                className="bg-white h-2 rounded-full transition-all duration-500" 
                style={{ width: `${levelProgress}%` }} 
              />
            </div>
          </div>
        </div>
      </motion.div>

      {/* Activity Summary */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
        className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8"
      >
        <div className="bg-white rounded-2xl p-4 shadow-md text-center">
          <p className="text-3xl font-bold text-blue-600">{activities.chatSessions}</p>
          <p className="text-sm text-gray-600">Phiên chat</p>
        </div>
        <div className="bg-white rounded-2xl p-4 shadow-md text-center">
          <p className="text-3xl font-bold text-purple-600">{activities.vocabularyLearned}</p>
          <p className="text-sm text-gray-600">Từ vựng đã học</p>
        </div>
        <div className="bg-white rounded-2xl p-4 shadow-md text-center">
          <p className="text-3xl font-bold text-green-600">{activities.documentsUploaded}</p>
          <p className="text-sm text-gray-600">Tài liệu</p>
        </div>
        <div className="bg-white rounded-2xl p-4 shadow-md text-center">
          <p className="text-3xl font-bold text-orange-600">{activities.pronunciationPractice}</p>
          <p className="text-sm text-gray-600">Luyện phát âm</p>
        </div>
      </motion.div>

      {/* Common Mistakes Section */}
      {progress?.commonMistakes && progress.commonMistakes.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.18 }}
          className="mb-8"
        >
          <h2 className="text-xl font-bold text-gray-900 mb-4">⚠️ Lỗi thường gặp</h2>
          <div className="bg-white rounded-2xl shadow-md p-4 space-y-3 max-h-[200px] overflow-y-auto">
            {progress.commonMistakes.slice(0, 5).map((mistake, idx) => (
              <div key={idx} className="flex items-start gap-3 p-3 bg-red-50 rounded-xl">
                <span className="text-red-500 font-bold text-sm">{mistake.count}x</span>
                <div className="flex-1">
                  <p className="text-red-600 line-through text-sm">{mistake.original}</p>
                  <p className="text-green-600 font-medium text-sm">✓ {mistake.corrected}</p>
                  <p className="text-gray-500 text-xs mt-1">{mistake.explanation}</p>
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      )}

      {/* Mode Selection */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <h2 className="text-2xl font-bold text-gray-900 mb-6">Chọn chế độ học</h2>
        <div className="grid md:grid-cols-2 gap-6">
          {learningModes.map((mode, index) => (
            <motion.div
              key={mode.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 + index * 0.1 }}
            >
              <Link href={mode.href}>
                <div className="group bg-white rounded-3xl p-6 shadow-lg hover:shadow-2xl transition-all duration-300 cursor-pointer border-2 border-transparent hover:border-teal-300">
                  <div className="flex items-start gap-4 mb-4">
                    <div
                      className={`w-14 h-14 bg-gradient-to-br ${mode.color} rounded-2xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform`}
                    >
                      <mode.icon className="w-7 h-7 text-white" />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-xl font-bold text-gray-900 mb-1">{mode.title}</h3>
                      <p className="text-gray-600 text-sm">{mode.description}</p>
                    </div>
                    <ArrowRight className="w-5 h-5 text-gray-400 group-hover:text-teal-600 group-hover:translate-x-1 transition-all" />
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-sm text-teal-600 font-semibold">
                      <span>Bắt đầu học</span>
                      <ArrowRight className="w-4 h-4" />
                    </div>
                    <span className="text-xs text-gray-400">
                      {activities[mode.activity as keyof typeof activities] || 0} lần
                    </span>
                  </div>
                </div>
              </Link>
            </motion.div>
          ))}
        </div>
      </motion.div>

      {/* Upload Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.7 }}
        className="mt-8"
      >
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-gray-900">Upload tài liệu & OCR</h2>
          <Link href="/dashboard-new/documents">
            <button className="flex items-center gap-2 px-4 py-2 bg-teal-600 text-white rounded-xl hover:bg-teal-700 transition">
              <Upload className="w-5 h-5" />
              <span>Đi đến trang tài liệu</span>
            </button>
          </Link>
        </div>

        <div className="bg-white rounded-2xl p-6 shadow-md border-2 border-dashed border-gray-200 text-center">
          <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-700 mb-2">Upload tài liệu để học từ vựng</h3>
          <p className="text-gray-500 mb-4">Hỗ trợ PDF, Word, hình ảnh. Trích xuất từ vựng tự động với OCR.</p>
          <Link href="/dashboard-new/documents">
            <button className="px-6 py-3 bg-teal-600 text-white rounded-xl hover:bg-teal-700 transition">
              Bắt đầu upload
            </button>
          </Link>
        </div>
      </motion.div>

      {/* Quick Tips */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.8 }}
        className="mt-8 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-3xl p-6 border border-blue-200"
      >
        <h3 className="text-lg font-bold text-gray-900 mb-3">💡 Mẹo học tiếng Anh</h3>
        <p className="text-gray-700">{randomTip}</p>
      </motion.div>
    </div>
  );
}
