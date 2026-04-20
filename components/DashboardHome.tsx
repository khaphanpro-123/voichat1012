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
  Play,
  Network,
} from "lucide-react";
import { OnboardingTutorial } from "./OnboardingTutorial";
import { VIDEO_SECTIONS } from "@/config/video-links";

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
    title: "Voice Chat",
    description: "Trò chuyện & luyện phát âm tiếng Anh hiệu quả",
    icon: MessageCircle,
    color: "from-purple-400 to-pink-500",
    href: "/dashboard-new/chat",
    activity: "chatSessions",
  },
  {
    id: "image-learning",
    title: "Học qua hình ảnh",
    description: "Upload ảnh, học words vựng words hình ảnh",
    icon: Camera,
    color: "from-blue-400 to-cyan-500",
    href: "/dashboard-new/image-learning",
    activity: "photoAnalysis",
  },
  {
    id: "vocabulary",
    title: "Vocabulary",
    description: "Ôn tập và học words vựng mới",
    icon: BookOpen,
    color: "from-green-400 to-emerald-500",
    href: "/dashboard-new/vocabulary",
    activity: "vocabularyLearned",
  },
  {
    id: "topic-modeling",
    title: "Topic Modeling",
    description: "Phân nhóm words vựng theo chủ đề tự động",
    icon: Network,
    color: "from-indigo-400 to-blue-500",
    href: "/dashboard-new/topic-modeling-demo",
    activity: "documentsUploaded",
  },
  {
    id: "learning-history",
    title: "Lịch sử học tập",
    description: "Xem tiến trình và errors thường gặp",
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
  const [showVideoModal, setShowVideoModal] = useState(false);
  const [activeVideoTab, setActiveVideoTab] = useState(0);

  // Video hướng dẫn - YouTube embed URL
  const TUTORIAL_VIDEO_URL = "https://www.youtube.com/embed/1bW10HRrjy0";

  // Video sources for listening practice
  const VIDEO_SECTIONS = [
    {
      source: "Hướng dẫn sử dụng",
      color: "bg-blue-100 text-blue-700",
      videos: [
        { id: "1bW10HRrjy0", title: "Hướng dẫn sử dụng trang web", url: "https://www.youtube.com/watch?v=1bW10HRrjy0" },
      ]
    },
    {
      source: "BBC Learning English",
      color: "bg-red-100 text-red-700",
      videos: [
        { id: "dQw4w9WgXcQ", title: "6 Minute English - BBC", url: "https://www.youtube.com/@BBCLearningEnglish" },
        { id: "dQw4w9WgXcQ", title: "English In A Minute - BBC", url: "https://www.youtube.com/@BBCLearningEnglish/videos" },
      ]
    },
    {
      source: "TED-Ed",
      color: "bg-orange-100 text-orange-700",
      videos: [
        { id: "ArJ4I8TgZpI", title: "How to speak so that people want to listen", url: "https://www.youtube.com/watch?v=eIho2S0ZahI" },
        { id: "8S0FDjFBj8o", title: "The linguistic genius of babies", url: "https://www.youtube.com/watch?v=G2XBIkHW954" },
      ]
    },
    {
      source: "I'm Mary",
      color: "bg-purple-100 text-purple-700",
      videos: [
        { id: "placeholder", title: "Xem playlist I'm Mary", url: "https://www.youtube.com/@ImMary113/playlists" },
        { id: "placeholder2", title: "Video luyện nghe tiếng Anh", url: "https://www.youtube.com/@ImMary113/videos" },
      ]
    },
    {
      source: "Postcard English",
      color: "bg-green-100 text-green-700",
      videos: [
        { id: "placeholder3", title: "Xem kênh Postcard English", url: "https://www.youtube.com/@PostcardEnglish" },
        { id: "placeholder4", title: "English Listening Practice", url: "https://www.youtube.com/@PostcardEnglish/videos" },
      ]
    },
  ];

  // Check if user is new (first time) - only show once per user
  useEffect(() => {
    if (userId) {
      const tutorialKey = `l2brain_tutorial_completed_${userId}`;
      const completed = localStorage.getItem(tutorialKey);
      
      // Only show if not completed AND not already showing
      if (!completed && !showTutorial) {
        // Show tutorial for new users after a short delay
        setTimeout(() => setShowTutorial(true), 500);
      }
    }
  }, [userId]); // Only run when userId changes (login/logout)

  const handleTutorialComplete = () => {
    if (userId) {
      const tutorialKey = `l2brain_tutorial_completed_${userId}`;
      localStorage.setItem(tutorialKey, "true");
    }
    setShowTutorial(false);
  };

  const handleTutorialClose = () => {
    // Mark as completed even when closing (X button)
    if (userId) {
      const tutorialKey = `l2brain_tutorial_completed_${userId}`;
      localStorage.setItem(tutorialKey, "true");
    }
    setShowTutorial(false);
  };

  // Pre-warm DB connection on mount (fire-and-forget)
  useEffect(() => {
    fetch("/api/health").catch(() => {
      // Silently ignore health check errors
    });
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

  if (loading) {
    return (
      <div className="p-6 md:p-8 max-w-7xl mx-auto flex flex-col items-center justify-center min-h-[50vh] gap-4">
        <motion.div
          className="text-5xl"
          animate={{ scale: [1, 1.1, 1], rotate: [0, 5, -5, 0] }}
          transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
        >
          
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
    <div className="p-6 md:p-8 max-w-7xl mx-auto relative">
      {/* Decorative background blobs */}
      <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-teal-400/10 rounded-full blur-3xl" />
        <div className="absolute top-1/3 -left-32 w-80 h-80 bg-emerald-400/10 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-1/4 w-72 h-72 bg-indigo-400/8 rounded-full blur-3xl" />
      </div>
      {/* Onboarding Tutorial */}
      <OnboardingTutorial
        isOpen={showTutorial}
        onClose={handleTutorialClose}
        onComplete={handleTutorialComplete}
      />

      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8"
      >
        <h1 className="text-3xl md:text-4xl font-bold text-gray-900">
          Xin chào, {userName}! 
        </h1>
      </motion.div>

      {/* Stats Cards - 3 columns */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="grid md:grid-cols-2 gap-6 mb-8"
      >
        {/* XP Card */}
        <div className="bg-gradient-to-br from-teal-500 to-emerald-600 rounded-3xl p-6 text-white shadow-xl">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-white/20 rounded-2xl flex items-center justify-center backdrop-blur-sm">
              <Trophy className="w-7 h-7" />
            </div>
            <div>
              <p className="text-sm opacity-90 mb-1">Điểm kinh nghiệm</p>
              <p className="text-3xl font-bold">{totalXp} XP</p>
            </div>
          </div>
          <div className="mt-3">
            <div className="w-full bg-white/20 rounded-full h-2">
              <div 
                className="bg-white h-2 rounded-full transition-all duration-500" 
                style={{ width: `${levelProgress}%` }} 
              />
            </div>
          </div>
        </div>

        {/* Video Card */}
        <div 
          onClick={() => setShowVideoModal(true)}
          className="bg-gradient-to-br from-purple-500 to-indigo-600 rounded-3xl p-6 text-white shadow-xl cursor-pointer hover:scale-[1.02] transition-transform"
        >
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-white/20 rounded-2xl flex items-center justify-center backdrop-blur-sm">
              <Play className="w-7 h-7" />
            </div>
            <div>
              <p className="text-sm opacity-90 mb-1">Luyện nghe & Hướng dẫn</p>
              <p className="text-xl font-bold">Xem video</p>
            </div>
          </div>
          <p className="text-sm opacity-75 mt-3">
            BBC, TED, I'm Mary, Postcard English
          </p>
        </div>
      </motion.div>

      {/* Video Modal */}
      {showVideoModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
          onClick={() => setShowVideoModal(false)}
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0, y: 10 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            transition={{ type: "spring", stiffness: 300, damping: 25 }}
            className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[88vh] flex flex-col overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between flex-shrink-0">
              <div>
                <h3 className="text-base font-semibold text-gray-900">Luyện nghe & Hướng dẫn</h3>
                <p className="text-xs text-gray-500 mt-0.5">Chọn nguồn để xem video</p>
              </div>
              <button
                onClick={() => setShowVideoModal(false)}
                className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-500 transition-colors text-lg"
              >
                ×
              </button>
            </div>

            {/* Source Tabs */}
            <div className="flex gap-1 px-4 pt-3 pb-1 overflow-x-auto flex-shrink-0 scrollbar-hide">
              {VIDEO_SECTIONS.map((section, si) => (
                <button
                  key={si}
                  onClick={() => setActiveVideoTab(si)}
                  className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                    activeVideoTab === si
                      ? "bg-indigo-600 text-white shadow-sm"
                      : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                  }`}
                >
                  {section.source}
                </button>
              ))}
            </div>

            {/* Video List */}
            <div className="overflow-y-auto flex-1 px-4 py-3 space-y-2">
              {VIDEO_SECTIONS[activeVideoTab]?.videos.map((video, vi) => (
                <a
                  key={vi}
                  href={video.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 p-3 rounded-xl border border-gray-100 bg-gray-50 hover:bg-indigo-50 hover:border-indigo-200 active:scale-[0.98] transition-all group cursor-pointer"
                >
                  {/* Thumbnail */}
                  <div className="relative flex-shrink-0 w-24 h-16 rounded-lg overflow-hidden bg-gray-200">
                    {video.id && !video.id.startsWith("DEMO") ? (
                      <img
                        src={`https://img.youtube.com/vi/${video.id}/mqdefault.jpg`}
                        alt={video.title}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-indigo-100 to-purple-100">
                        <Play className="w-6 h-6 text-indigo-400" />
                      </div>
                    )}
                    {/* Play overlay */}
                    <div className="absolute inset-0 flex items-center justify-center bg-black/0 group-hover:bg-black/20 transition-colors">
                      <div className="w-7 h-7 rounded-full bg-white/0 group-hover:bg-white/90 flex items-center justify-center transition-all scale-0 group-hover:scale-100">
                        <Play className="w-3 h-3 text-indigo-600 ml-0.5" />
                      </div>
                    </div>
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-800 line-clamp-2 group-hover:text-indigo-700 transition-colors">
                      {video.title}
                    </p>
                    <p className="text-xs text-gray-400 mt-1">{VIDEO_SECTIONS[activeVideoTab].source}</p>
                  </div>

                  {/* Arrow */}
                  <svg className="w-4 h-4 text-gray-300 group-hover:text-indigo-500 flex-shrink-0 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </a>
              ))}
            </div>
          </motion.div>
        </div>
      )}

      {/* Activity Summary */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
        className="grid grid-cols-2 gap-4 mb-8"
      >
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-4 shadow-md text-center border border-teal-100/50">
          <p className="text-3xl font-bold text-purple-600">{activities.vocabularyLearned}</p>
          <p className="text-sm text-gray-600">Vocabulary đã học</p>
        </div>
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-4 shadow-md text-center border border-emerald-100/50">
          <p className="text-3xl font-bold text-green-600">{activities.documentsUploaded}</p>
          <p className="text-sm text-gray-600">Documents</p>
        </div>
      </motion.div>

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
                <div className="group bg-white/80 backdrop-blur-sm rounded-3xl p-6 shadow-lg hover:shadow-2xl transition-all duration-300 cursor-pointer border border-white hover:border-teal-200 hover:-translate-y-1">
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
                      <span>Start learning</span>
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
        <div className="bg-white/70 backdrop-blur-sm rounded-2xl p-6 shadow-md border-2 border-dashed border-teal-200 text-center hover:border-teal-400 transition-colors">
          <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-700 mb-2">Upload documents để học words vựng</h3>
          <p className="text-gray-500 mb-4">Hỗ trợ PDF, Word, hình ảnh. Trích xuất words vựng tự động với OCR.</p>
          <Link href="/dashboard-new/documents-simple">
            <button className="px-6 py-3 bg-teal-600 text-white rounded-xl hover:bg-teal-700 transition">
              Bắt đầu upload
            </button>
          </Link>
        </div>
      </motion.div>
    </div>
  );
}
