"use client";

import { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  TrendingUp, TrendingDown, Clock, BookOpen, MessageCircle, ChevronDown, ChevronUp,
  BarChart3, RefreshCw, Calendar, Filter, PenLine, Volume2, 
  Image as ImageIcon, FileText, Mic, AlertTriangle, Lightbulb, Eye,
  CheckCircle, XCircle, HelpCircle, Info
} from "lucide-react";

// Types
interface GrammarError {
  original: string;
  corrected: string;
  errorType: string;
  explanation?: string;
  explanationVi?: string;
}

interface PronunciationError {
  word: string;
  userPronunciation?: string;
  correctPronunciation?: string;
  feedback?: string;
}

interface LearningSession {
  _id: string;
  sessionNumber: number;
  sessionType: string;
  duration: number;
  totalErrors: number;
  pronunciationErrors: PronunciationError[];
  grammarErrors: GrammarError[];
  learnedVocabulary: { word: string; meaning: string }[];
  createdAt: string;
  wordsSpoken?: number;
  sentencesWritten?: number;
  overallScore?: number;
}

interface ErrorSummary {
  type: string;
  typeLabel: string;
  count: number;
  examples: { original: string; corrected: string; explanation?: string }[];
  suggestion: string;
}

type TimeFilter = "week" | "month" | "all";
type ViewMode = "overview" | "errors" | "timeline";

const FUNCTION_CONFIG: Record<string, { label: string; icon: any; color: string; bgColor: string }> = {
  voice_chat: { label: "Voice Chat", icon: MessageCircle, color: "text-purple-600", bgColor: "bg-purple-100" },
  image_learning: { label: "Viết câu từ hình", icon: ImageIcon, color: "text-pink-600", bgColor: "bg-pink-100" },
  writing: { label: "Viết đoạn văn", icon: FileText, color: "text-blue-600", bgColor: "bg-blue-100" },
  pronunciation: { label: "Phát âm", icon: Mic, color: "text-orange-600", bgColor: "bg-orange-100" },
  grammar_quiz: { label: "Ngữ pháp", icon: PenLine, color: "text-green-600", bgColor: "bg-green-100" },
};

const ERROR_TYPE_MAP: Record<string, { label: string; suggestion: string }> = {
  subject_verb_agreement: { label: "Hòa hợp chủ-vị", suggestion: "Ngôi 3 số ít (he/she/it) → động từ thêm -s/-es" },
  verb_form_after_attitude: { label: "Dạng động từ sau like/love", suggestion: "Sau like/love/hate dùng V-ing hoặc to V" },
  article: { label: "Mạo từ (a/an/the)", suggestion: "Danh từ đếm được số ít cần a/an/the" },
  capitalization: { label: "Viết hoa", suggestion: "Nhớ viết hoa 'I' và chữ cái đầu câu" },
  punctuation: { label: "Dấu câu", suggestion: "Câu kết thúc bằng dấu chấm (.)" },
  spelling: { label: "Chính tả", suggestion: "Đọc nhiều và ghi nhớ cách viết từ" },
  word_order: { label: "Trật tự từ", suggestion: "Ghi nhớ cấu trúc S + V + O" },
  tense: { label: "Thì động từ", suggestion: "Ôn lại các thì cơ bản và dấu hiệu nhận biết" },
  negation: { label: "Câu phủ định", suggestion: "He/She/It dùng doesn't, I/You/We/They dùng don't" },
  question_form: { label: "Câu hỏi", suggestion: "Câu hỏi Yes/No: Do/Does + S + V?" },
  preposition: { label: "Giới từ", suggestion: "Học các cụm giới từ thông dụng" },
  plural: { label: "Số ít/nhiều", suggestion: "Chú ý danh từ đếm được/không đếm được" },
  pronunciation: { label: "Phát âm", suggestion: "Luyện phát âm theo mẫu, chú ý nhấn âm" },
};

export default function LearningHistory({ userId }: { userId: string }) {
  const [sessions, setSessions] = useState<LearningSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [timeFilter, setTimeFilter] = useState<TimeFilter>("month");
  const [viewMode, setViewMode] = useState<ViewMode>("overview");
  const [expandedError, setExpandedError] = useState<string | null>(null);
  const [showGuide, setShowGuide] = useState(false);

  useEffect(() => {
    fetchData();
  }, [userId, timeFilter]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const days = timeFilter === "week" ? 7 : timeFilter === "month" ? 30 : 365;
      const res = await fetch(`/api/analyze-learning?userId=${userId}&limit=100&days=${days}`);
      const data = await res.json();
      if (data.success) {
        setSessions(data.sessions || []);
      }
    } catch (error) {
      console.error("Fetch error:", error);
    }
    setLoading(false);
  };

  // Calculate overview stats
  const stats = useMemo(() => {
    const totalSessions = sessions.length;
    const totalDuration = sessions.reduce((a, s) => a + (s.duration || 0), 0);
    const totalVocabulary = sessions.reduce((a, s) => a + (s.learnedVocabulary?.length || 0), 0);
    const totalSentences = sessions.reduce((a, s) => a + (s.sentencesWritten || 0), 0);
    const totalErrors = sessions.reduce((a, s) => a + (s.totalErrors || 0), 0);
    
    // Completion rate (sessions > 1 min)
    const completedSessions = sessions.filter(s => s.duration > 60).length;
    const completionRate = totalSessions > 0 ? Math.round((completedSessions / totalSessions) * 100) : 0;

    // Improvement (compare recent vs older errors)
    const midpoint = Math.floor(sessions.length / 2);
    const recentErrors = sessions.slice(0, midpoint).reduce((a, s) => a + (s.totalErrors || 0), 0);
    const olderErrors = sessions.slice(midpoint).reduce((a, s) => a + (s.totalErrors || 0), 0);
    const improvementRate = olderErrors > 0 ? Math.round(((olderErrors - recentErrors) / olderErrors) * 100) : 0;

    return { totalSessions, totalDuration, totalVocabulary, totalSentences, totalErrors, completionRate, improvementRate };
  }, [sessions]);

  // Analyze errors - only errors, grouped by type
  const errorSummary = useMemo((): ErrorSummary[] => {
    const errorMap: Record<string, { count: number; examples: { original: string; corrected: string; explanation?: string }[] }> = {};

    sessions.forEach(s => {
      // Grammar errors
      s.grammarErrors?.forEach((e: GrammarError) => {
        const type = e.errorType || "grammar";
        if (!errorMap[type]) errorMap[type] = { count: 0, examples: [] };
        errorMap[type].count++;
        if (errorMap[type].examples.length < 3) {
          errorMap[type].examples.push({
            original: e.original,
            corrected: e.corrected,
            explanation: e.explanationVi || e.explanation
          });
        }
      });

      // Pronunciation errors
      s.pronunciationErrors?.forEach((e: PronunciationError) => {
        if (!errorMap["pronunciation"]) errorMap["pronunciation"] = { count: 0, examples: [] };
        errorMap["pronunciation"].count++;
        if (errorMap["pronunciation"].examples.length < 5) {
          errorMap["pronunciation"].examples.push({
            original: e.word,
            corrected: e.correctPronunciation || e.word,
            explanation: e.feedback
          });
        }
      });
    });

    return Object.entries(errorMap)
      .map(([type, data]) => ({
        type,
        typeLabel: ERROR_TYPE_MAP[type]?.label || type.replace(/_/g, " "),
        count: data.count,
        examples: data.examples,
        suggestion: ERROR_TYPE_MAP[type]?.suggestion || "Luyện tập thêm để cải thiện"
      }))
      .sort((a, b) => b.count - a.count);
  }, [sessions]);

  const formatDuration = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    if (hours > 0) return `${hours}h ${mins}m`;
    return `${mins} phút`;
  };

  const speak = (text: string) => {
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = "en-US";
    u.rate = 0.9;
    window.speechSynthesis.speak(u);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="text-center">
          <div className="animate-spin w-10 h-10 border-4 border-teal-500 border-t-transparent rounded-full mx-auto mb-4" />
          <p className="text-gray-500">Đang tải dữ liệu...</p>
        </div>
      </div>
    );
  }

  if (sessions.length === 0) {
    return (
      <div className="text-center p-12 bg-white rounded-2xl shadow-lg">
        <BarChart3 className="w-16 h-16 mx-auto mb-4 text-gray-300" />
        <h3 className="text-xl font-bold text-gray-600 mb-2">Chưa có dữ liệu học tập</h3>
        <p className="text-gray-500 mb-4">Bắt đầu học để xem phân tích tại đây!</p>
        <a href="/dashboard-new/image-learning" className="inline-flex items-center gap-2 px-4 py-2 bg-teal-500 text-white rounded-lg hover:bg-teal-600">
          <ImageIcon className="w-4 h-4" /> Bắt đầu học ngay
        </a>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-teal-100 rounded-xl flex items-center justify-center">
            <BarChart3 className="w-5 h-5 text-teal-600" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-800">Lịch sử học tập</h2>
            <p className="text-sm text-gray-500">Chỉ ghi nhận lỗi sai để cải thiện</p>
          </div>
        </div>
        
        <div className="flex items-center gap-2 flex-wrap">
          {/* Time Filter */}
          <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
            {[
              { id: "week", label: "7 ngày" },
              { id: "month", label: "30 ngày" },
              { id: "all", label: "Tất cả" },
            ].map(f => (
              <button
                key={f.id}
                onClick={() => setTimeFilter(f.id as TimeFilter)}
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition ${
                  timeFilter === f.id ? "bg-white text-teal-600 shadow-sm" : "text-gray-600 hover:text-gray-800"
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
          
          <button onClick={fetchData} className="p-2 hover:bg-gray-100 rounded-lg" title="Làm mới">
            <RefreshCw className="w-4 h-4 text-gray-500" />
          </button>
          
          <button onClick={() => setShowGuide(!showGuide)} className="p-2 hover:bg-gray-100 rounded-lg" title="Hướng dẫn">
            <HelpCircle className="w-4 h-4 text-gray-500" />
          </button>
        </div>
      </div>

      {/* Guide Panel */}
      <AnimatePresence>
        {showGuide && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="bg-blue-50 border border-blue-200 rounded-xl overflow-hidden"
          >
            <div className="p-4">
              <div className="flex items-start gap-3">
                <Info className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-semibold text-blue-800 mb-2">Cách hệ thống hoạt động</h4>
                  <ul className="text-sm text-blue-700 space-y-1">
                    <li>• <strong>Chỉ lưu lỗi sai</strong>: Hệ thống không lưu toàn bộ hội thoại, chỉ ghi nhận câu có lỗi</li>
                    <li>• <strong>Phân loại lỗi</strong>: Ngữ pháp (chia động từ, mạo từ...) và Phát âm</li>
                    <li>• <strong>Gợi ý sửa</strong>: Mỗi lỗi đều có ví dụ và cách khắc phục</li>
                    <li>• <strong>Theo dõi tiến bộ</strong>: So sánh số lỗi giữa các giai đoạn</li>
                  </ul>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* View Mode Tabs */}
      <div className="flex gap-2 border-b border-gray-200 pb-2">
        {[
          { id: "overview", label: "Tổng quan", icon: BarChart3 },
          { id: "errors", label: "Phân tích lỗi", icon: AlertTriangle },
          { id: "timeline", label: "Timeline", icon: Clock },
        ].map(tab => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setViewMode(tab.id as ViewMode)}
              className={`flex items-center gap-2 px-4 py-2 rounded-t-lg font-medium transition ${
                viewMode === tab.id 
                  ? "bg-white text-teal-600 border-b-2 border-teal-500" 
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
              {tab.id === "errors" && stats.totalErrors > 0 && (
                <span className="px-1.5 py-0.5 bg-orange-100 text-orange-600 rounded-full text-xs font-bold">
                  {stats.totalErrors}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* OVERVIEW TAB */}
      {viewMode === "overview" && (
        <div className="bg-white rounded-2xl p-6 shadow-lg">
          {/* Stats Grid */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
            <div className="bg-gradient-to-br from-teal-500 to-cyan-600 rounded-xl p-4 text-white">
              <Calendar className="w-5 h-5 opacity-80 mb-1" />
              <p className="text-2xl font-bold">{stats.totalSessions}</p>
              <p className="text-white/80 text-xs">Phiên học</p>
            </div>
            
            <div className="bg-gradient-to-br from-purple-500 to-pink-600 rounded-xl p-4 text-white">
              <Clock className="w-5 h-5 opacity-80 mb-1" />
              <p className="text-2xl font-bold">{formatDuration(stats.totalDuration)}</p>
              <p className="text-white/80 text-xs">Thời gian học</p>
            </div>

            <div className="bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl p-4 text-white">
              <BookOpen className="w-5 h-5 opacity-80 mb-1" />
              <p className="text-2xl font-bold">{stats.totalVocabulary}</p>
              <p className="text-white/80 text-xs">Từ vựng đã học</p>
            </div>

            <div className="bg-gradient-to-br from-orange-500 to-red-600 rounded-xl p-4 text-white">
              <PenLine className="w-5 h-5 opacity-80 mb-1" />
              <p className="text-2xl font-bold">{stats.totalSentences}</p>
              <p className="text-white/80 text-xs">Câu đã viết</p>
            </div>

            <div className="bg-white border-2 border-green-200 rounded-xl p-4">
              <div className="flex items-center gap-1 mb-1">
                <CheckCircle className="w-4 h-4 text-green-500" />
                <span className="text-xs text-gray-500">Hoàn thành</span>
              </div>
              <p className="text-2xl font-bold text-green-600">{stats.completionRate}%</p>
            </div>

            <div className="bg-white border-2 border-blue-200 rounded-xl p-4">
              <div className="flex items-center gap-1 mb-1">
                {stats.improvementRate >= 0 ? (
                  <TrendingUp className="w-4 h-4 text-blue-500" />
                ) : (
                  <TrendingDown className="w-4 h-4 text-red-500" />
                )}
                <span className="text-xs text-gray-500">Cải thiện</span>
              </div>
              <p className={`text-2xl font-bold ${stats.improvementRate >= 0 ? "text-blue-600" : "text-red-600"}`}>
                {stats.improvementRate >= 0 ? "+" : ""}{stats.improvementRate}%
              </p>
            </div>
          </div>

          {/* Quick Error Summary */}
          {errorSummary.length > 0 && (
            <div className="border-t border-gray-100 pt-4">
              <h4 className="font-medium text-gray-700 mb-3 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-orange-500" />
                Lỗi phổ biến nhất
              </h4>
              <div className="flex flex-wrap gap-2">
                {errorSummary.slice(0, 5).map((err, i) => (
                  <span key={i} className="px-3 py-1.5 bg-orange-50 text-orange-700 rounded-full text-sm flex items-center gap-1">
                    {err.typeLabel}
                    <span className="px-1.5 py-0.5 bg-orange-200 rounded-full text-xs font-bold">{err.count}</span>
                  </span>
                ))}
              </div>
              <button
                onClick={() => setViewMode("errors")}
                className="mt-3 text-sm text-teal-600 hover:text-teal-700 flex items-center gap-1"
              >
                Xem chi tiết phân tích lỗi <ChevronDown className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      )}

      {/* ERRORS TAB */}
      {viewMode === "errors" && (
        <div className="bg-white rounded-2xl p-6 shadow-lg">
          {errorSummary.length === 0 ? (
            <div className="text-center py-8">
              <div className="w-16 h-16 mx-auto mb-4 bg-green-100 rounded-full flex items-center justify-center">
                <span className="text-3xl">🎉</span>
              </div>
              <p className="text-green-600 font-medium">Tuyệt vời! Không có lỗi nào được ghi nhận.</p>
              <p className="text-gray-500 text-sm mt-1">Tiếp tục học để duy trì phong độ!</p>
            </div>
          ) : (
            <>
              {/* Error Summary Table */}
              <div className="overflow-x-auto mb-6">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b-2 border-gray-200">
                      <th className="text-left py-3 px-2 font-semibold text-gray-700">Loại lỗi</th>
                      <th className="text-center py-3 px-2 font-semibold text-gray-700">Số lần</th>
                      <th className="text-left py-3 px-2 font-semibold text-gray-700">Gợi ý khắc phục</th>
                      <th className="text-center py-3 px-2 font-semibold text-gray-700"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {errorSummary.map((err, i) => (
                      <tr key={i} className="border-b border-gray-100 hover:bg-gray-50">
                        <td className="py-3 px-2">
                          <span className="font-medium text-gray-800">{err.typeLabel}</span>
                        </td>
                        <td className="py-3 px-2 text-center">
                          <span className="px-2 py-1 bg-orange-100 text-orange-600 rounded-full font-bold">
                            {err.count}
                          </span>
                        </td>
                        <td className="py-3 px-2 text-gray-600 text-xs">{err.suggestion}</td>
                        <td className="py-3 px-2 text-center">
                          <button
                            onClick={() => setExpandedError(expandedError === err.type ? null : err.type)}
                            className="p-1 hover:bg-gray-100 rounded"
                          >
                            {expandedError === err.type ? (
                              <ChevronUp className="w-4 h-4 text-gray-400" />
                            ) : (
                              <ChevronDown className="w-4 h-4 text-gray-400" />
                            )}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Expanded Error Details */}
              <AnimatePresence>
                {expandedError && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="border border-orange-200 rounded-xl overflow-hidden mb-4"
                  >
                    <div className="bg-orange-50 p-4">
                      <h4 className="font-semibold text-orange-800 mb-3 flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4" />
                        Ví dụ lỗi: {errorSummary.find(e => e.type === expandedError)?.typeLabel}
                      </h4>
                      <div className="space-y-3">
                        {errorSummary.find(e => e.type === expandedError)?.examples.map((ex, i) => (
                          <div key={i} className="bg-white p-3 rounded-lg border border-orange-100">
                            <div className="flex items-center gap-2 mb-2">
                              <XCircle className="w-4 h-4 text-red-500" />
                              <span className="text-red-600 line-through">{ex.original}</span>
                            </div>
                            <div className="flex items-center gap-2 mb-2">
                              <CheckCircle className="w-4 h-4 text-green-500" />
                              <span className="text-green-600 font-medium">{ex.corrected}</span>
                              {expandedError === "pronunciation" && (
                                <button onClick={() => speak(ex.corrected)} className="p-1 hover:bg-gray-100 rounded">
                                  <Volume2 className="w-4 h-4 text-blue-500" />
                                </button>
                              )}
                            </div>
                            {ex.explanation && (
                              <div className="flex items-start gap-2 mt-2 p-2 bg-yellow-50 rounded">
                                <Lightbulb className="w-4 h-4 text-yellow-600 flex-shrink-0 mt-0.5" />
                                <p className="text-xs text-yellow-800">{ex.explanation}</p>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Improvement Tips */}
              <div className="bg-gradient-to-r from-teal-50 to-cyan-50 rounded-xl p-4 border border-teal-200">
                <h4 className="font-semibold text-teal-800 mb-2 flex items-center gap-2">
                  <Lightbulb className="w-5 h-5 text-teal-600" />
                  Gợi ý cải thiện
                </h4>
                <ul className="text-sm text-teal-700 space-y-1">
                  {errorSummary.slice(0, 3).map((err, i) => (
                    <li key={i}>• <strong>{err.typeLabel}</strong>: {err.suggestion}</li>
                  ))}
                </ul>
              </div>
            </>
          )}
        </div>
      )}

      {/* TIMELINE TAB */}
      {viewMode === "timeline" && (
        <div className="bg-white rounded-2xl p-6 shadow-lg">
          <div className="space-y-3 max-h-[500px] overflow-y-auto">
            {sessions.slice(0, 30).map((session, i) => {
              const config = FUNCTION_CONFIG[session.sessionType] || { 
                label: session.sessionType, 
                icon: PenLine, 
                color: "text-gray-600", 
                bgColor: "bg-gray-100" 
              };
              const Icon = config.icon;
              const hasErrors = session.totalErrors > 0;
              
              return (
                <motion.div
                  key={session._id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.03 }}
                  className={`flex items-center gap-4 p-4 rounded-xl border transition hover:shadow-md ${
                    hasErrors ? "border-orange-200 bg-orange-50/50" : "border-gray-100 bg-gray-50"
                  }`}
                >
                  {/* Icon */}
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${config.bgColor}`}>
                    <Icon className={`w-6 h-6 ${config.color}`} />
                  </div>
                  
                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium text-gray-800">{config.label}</span>
                      <span className="text-xs text-gray-400">#{session.sessionNumber}</span>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-gray-500">
                      <span>{new Date(session.createdAt).toLocaleDateString("vi-VN")}</span>
                      <span>•</span>
                      <span>{formatDuration(session.duration)}</span>
                      {session.learnedVocabulary?.length > 0 && (
                        <>
                          <span>•</span>
                          <span>{session.learnedVocabulary.length} từ mới</span>
                        </>
                      )}
                    </div>
                  </div>
                  
                  {/* Status */}
                  <div className="flex items-center gap-2">
                    {hasErrors ? (
                      <span className="px-3 py-1.5 bg-orange-100 text-orange-600 rounded-full text-sm font-medium flex items-center gap-1">
                        <XCircle className="w-4 h-4" />
                        {session.totalErrors} lỗi
                      </span>
                    ) : (
                      <span className="px-3 py-1.5 bg-green-100 text-green-600 rounded-full text-sm font-medium flex items-center gap-1">
                        <CheckCircle className="w-4 h-4" />
                        Hoàn thành
                      </span>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
