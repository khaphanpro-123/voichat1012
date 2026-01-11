"use client";

import { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  TrendingUp, Clock, BookOpen, MessageCircle, ChevronDown, ChevronUp,
  BarChart3, RefreshCw, Calendar, Filter, PenLine, Volume2, 
  Image as ImageIcon, FileText, Mic, AlertTriangle, Lightbulb, Eye
} from "lucide-react";

// Types
interface LearningSession {
  _id: string;
  sessionNumber: number;
  sessionType: string;
  duration: number;
  totalErrors: number;
  pronunciationErrors: any[];
  grammarErrors: any[];
  learnedVocabulary: any[];
  createdAt: string;
  wordsSpoken?: number;
  sentencesWritten?: number;
}

interface ErrorByFunction {
  functionName: string;
  functionLabel: string;
  icon: any;
  color: string;
  totalErrors: number;
  errorTypes: { type: string; count: number; examples: string[]; suggestion: string }[];
}

type TimeFilter = "week" | "month" | "all";

const FUNCTION_CONFIG: Record<string, { label: string; icon: any; color: string }> = {
  voice_chat: { label: "Voice Chat", icon: MessageCircle, color: "purple" },
  image_learning: { label: "Viết câu từ hình ảnh", icon: ImageIcon, color: "pink" },
  writing: { label: "Viết đoạn văn", icon: FileText, color: "blue" },
  pronunciation: { label: "Phát âm từ vựng", icon: Mic, color: "orange" },
  grammar_quiz: { label: "Trắc nghiệm ngữ pháp", icon: PenLine, color: "green" },
};

export default function LearningHistory({ userId }: { userId: string }) {
  const [sessions, setSessions] = useState<LearningSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [timeFilter, setTimeFilter] = useState<TimeFilter>("month");
  const [expandedFunction, setExpandedFunction] = useState<string | null>(null);
  const [expandedSession, setExpandedSession] = useState<string | null>(null);

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
  const overviewStats = useMemo(() => {
    const totalSessions = sessions.length;
    const totalDuration = sessions.reduce((a, s) => a + (s.duration || 0), 0);
    const totalVocabulary = sessions.reduce((a, s) => a + (s.learnedVocabulary?.length || 0), 0);
    const totalSentences = sessions.reduce((a, s) => a + (s.sentencesWritten || 0), 0);
    const completedSessions = sessions.filter(s => s.duration > 60).length;
    const completionRate = totalSessions > 0 ? Math.round((completedSessions / totalSessions) * 100) : 0;

    // Calculate improvement (compare first half vs second half)
    const midpoint = Math.floor(sessions.length / 2);
    const recentErrors = sessions.slice(0, midpoint).reduce((a, s) => a + (s.totalErrors || 0), 0);
    const olderErrors = sessions.slice(midpoint).reduce((a, s) => a + (s.totalErrors || 0), 0);
    const improvementRate = olderErrors > 0 ? Math.round(((olderErrors - recentErrors) / olderErrors) * 100) : 0;

    // Sessions by type for chart
    const byType: Record<string, number> = {};
    sessions.forEach(s => {
      byType[s.sessionType] = (byType[s.sessionType] || 0) + 1;
    });

    return { totalSessions, totalDuration, totalVocabulary, totalSentences, completionRate, improvementRate, byType };
  }, [sessions]);

  // Analyze errors by function - only show functions with errors
  const errorsByFunction = useMemo((): ErrorByFunction[] => {
    const errorMap: Record<string, { errors: any[]; grammarErrors: any[]; pronunciationErrors: any[] }> = {};

    sessions.forEach(s => {
      const funcType = s.sessionType;
      if (!errorMap[funcType]) {
        errorMap[funcType] = { errors: [], grammarErrors: [], pronunciationErrors: [] };
      }
      if (s.grammarErrors?.length) errorMap[funcType].grammarErrors.push(...s.grammarErrors);
      if (s.pronunciationErrors?.length) errorMap[funcType].pronunciationErrors.push(...s.pronunciationErrors);
    });

    const result: ErrorByFunction[] = [];

    Object.entries(errorMap).forEach(([funcType, data]) => {
      const config = FUNCTION_CONFIG[funcType] || { label: funcType, icon: PenLine, color: "gray" };
      const totalErrors = data.grammarErrors.length + data.pronunciationErrors.length;
      
      if (totalErrors === 0) return; // Skip functions with no errors

      // Group grammar errors by type
      const grammarByType: Record<string, { count: number; examples: string[] }> = {};
      data.grammarErrors.forEach((e: any) => {
        const type = e.errorType || "grammar";
        if (!grammarByType[type]) grammarByType[type] = { count: 0, examples: [] };
        grammarByType[type].count++;
        if (grammarByType[type].examples.length < 3 && e.original) {
          grammarByType[type].examples.push(`${e.original} → ${e.corrected}`);
        }
      });

      // Group pronunciation errors
      const pronByWord: Record<string, number> = {};
      data.pronunciationErrors.forEach((e: any) => {
        const word = e.word || "unknown";
        pronByWord[word] = (pronByWord[word] || 0) + 1;
      });

      const errorTypes: ErrorByFunction["errorTypes"] = [];

      // Add grammar error types
      Object.entries(grammarByType).forEach(([type, info]) => {
        errorTypes.push({
          type: formatErrorType(type),
          count: info.count,
          examples: info.examples,
          suggestion: getSuggestion(type)
        });
      });

      // Add pronunciation errors as one type
      if (data.pronunciationErrors.length > 0) {
        const topWords = Object.entries(pronByWord)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 5)
          .map(([word]) => word);
        errorTypes.push({
          type: "Lỗi phát âm",
          count: data.pronunciationErrors.length,
          examples: topWords,
          suggestion: "Luyện phát âm theo mẫu, chú ý nhấn âm và âm cuối"
        });
      }

      result.push({
        functionName: funcType,
        functionLabel: config.label,
        icon: config.icon,
        color: config.color,
        totalErrors,
        errorTypes: errorTypes.sort((a, b) => b.count - a.count)
      });
    });

    return result.sort((a, b) => b.totalErrors - a.totalErrors);
  }, [sessions]);

  const formatErrorType = (type: string): string => {
    const map: Record<string, string> = {
      tense: "Sai thì",
      article: "Thiếu/sai mạo từ",
      plural: "Sai số ít/nhiều",
      word_order: "Sai trật tự từ",
      preposition: "Sai giới từ",
      subject_verb: "Sai hòa hợp chủ-vị",
      question_form: "Sai dạng câu hỏi",
      spelling: "Lỗi chính tả",
      punctuation: "Lỗi dấu câu",
      connector: "Thiếu từ nối",
    };
    return map[type] || type.replace(/_/g, " ");
  };

  const getSuggestion = (type: string): string => {
    const map: Record<string, string> = {
      tense: "Ôn lại các thì cơ bản, chú ý dấu hiệu nhận biết",
      article: "Học quy tắc dùng a/an/the",
      plural: "Chú ý danh từ đếm được/không đếm được",
      word_order: "Ghi nhớ cấu trúc S + V + O",
      preposition: "Học các cụm giới từ thông dụng",
      subject_verb: "Chú ý ngôi thứ 3 số ít thêm -s/-es",
      question_form: "Luyện mẫu câu hỏi Yes/No và Wh-",
      spelling: "Đọc nhiều và ghi nhớ cách viết",
      connector: "Học các từ nối: however, therefore, moreover...",
    };
    return map[type] || "Luyện tập thêm để cải thiện";
  };

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
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin w-8 h-8 border-4 border-teal-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  if (sessions.length === 0) {
    return (
      <div className="text-center p-8">
        <BarChart3 className="w-16 h-16 mx-auto mb-4 text-gray-300" />
        <h3 className="text-xl font-bold text-gray-600 mb-2">Chưa có dữ liệu học tập</h3>
        <p className="text-gray-500">Bắt đầu học để xem phân tích tại đây!</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with Time Filter */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
          <BarChart3 className="w-6 h-6 text-teal-500" />
          Lịch sử học tập
        </h2>
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-gray-500" />
          {[
            { id: "week", label: "7 ngày" },
            { id: "month", label: "30 ngày" },
            { id: "all", label: "Tất cả" },
          ].map(f => (
            <button
              key={f.id}
              onClick={() => setTimeFilter(f.id as TimeFilter)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition ${
                timeFilter === f.id ? "bg-teal-500 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              {f.label}
            </button>
          ))}
          <button onClick={fetchData} className="p-2 hover:bg-gray-100 rounded-lg">
            <RefreshCw className="w-4 h-4 text-gray-500" />
          </button>
        </div>
      </div>

      {/* Part 1: Overview Stats */}
      <div className="bg-white rounded-2xl p-6 shadow-lg">
        <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
          📊 Tổng quan học tập ({timeFilter === "week" ? "7 ngày" : timeFilter === "month" ? "30 ngày" : "tất cả"})
        </h3>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
          <div className="bg-gradient-to-br from-teal-500 to-cyan-600 rounded-xl p-4 text-white">
            <Calendar className="w-5 h-5 opacity-80 mb-1" />
            <p className="text-2xl font-bold">{overviewStats.totalSessions}</p>
            <p className="text-white/80 text-xs">Phiên học</p>
          </div>
          
          <div className="bg-gradient-to-br from-purple-500 to-pink-600 rounded-xl p-4 text-white">
            <Clock className="w-5 h-5 opacity-80 mb-1" />
            <p className="text-2xl font-bold">{formatDuration(overviewStats.totalDuration)}</p>
            <p className="text-white/80 text-xs">Thời gian học</p>
          </div>

          <div className="bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl p-4 text-white">
            <BookOpen className="w-5 h-5 opacity-80 mb-1" />
            <p className="text-2xl font-bold">{overviewStats.totalVocabulary}</p>
            <p className="text-white/80 text-xs">Từ vựng đã học</p>
          </div>

          <div className="bg-gradient-to-br from-orange-500 to-red-600 rounded-xl p-4 text-white">
            <PenLine className="w-5 h-5 opacity-80 mb-1" />
            <p className="text-2xl font-bold">{overviewStats.totalSentences}</p>
            <p className="text-white/80 text-xs">Câu đã viết</p>
          </div>

          <div className="bg-white border-2 border-green-200 rounded-xl p-4">
            <div className="flex items-center gap-1 mb-1">
              <div className="w-2 h-2 bg-green-500 rounded-full" />
              <span className="text-xs text-gray-500">Hoàn thành</span>
            </div>
            <p className="text-2xl font-bold text-green-600">{overviewStats.completionRate}%</p>
            <p className="text-gray-500 text-xs">Tỷ lệ hoàn thành</p>
          </div>

          <div className="bg-white border-2 border-blue-200 rounded-xl p-4">
            <div className="flex items-center gap-1 mb-1">
              <TrendingUp className="w-4 h-4 text-blue-500" />
              <span className="text-xs text-gray-500">Cải thiện</span>
            </div>
            <p className={`text-2xl font-bold ${overviewStats.improvementRate >= 0 ? "text-blue-600" : "text-red-600"}`}>
              {overviewStats.improvementRate >= 0 ? "+" : ""}{overviewStats.improvementRate}%
            </p>
            <p className="text-gray-500 text-xs">Giảm lỗi sai</p>
          </div>
        </div>

        {/* Activity Chart by Function */}
        <div className="mb-4">
          <p className="text-sm font-medium text-gray-600 mb-3">Phân bố theo chức năng:</p>
          <div className="space-y-3">
            {Object.entries(overviewStats.byType).map(([type, count], i) => {
              const config = FUNCTION_CONFIG[type] || { label: type, color: "gray" };
              const percentage = Math.round((count / overviewStats.totalSessions) * 100);
              const colorClasses: Record<string, string> = {
                purple: "from-purple-400 to-purple-600",
                pink: "from-pink-400 to-pink-600",
                blue: "from-blue-400 to-blue-600",
                orange: "from-orange-400 to-orange-600",
                green: "from-green-400 to-green-600",
                gray: "from-gray-400 to-gray-600",
              };
              return (
                <div key={type} className="flex items-center gap-3">
                  <span className="w-32 text-sm text-gray-700 truncate">{config.label}</span>
                  <div className="flex-1 h-6 bg-gray-100 rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${percentage}%` }}
                      transition={{ delay: i * 0.1, duration: 0.5 }}
                      className={`h-full bg-gradient-to-r ${colorClasses[config.color]} rounded-full flex items-center justify-end pr-2`}
                    >
                      {percentage > 10 && <span className="text-xs text-white font-bold">{count}</span>}
                    </motion.div>
                  </div>
                  <span className="w-12 text-right text-sm text-gray-500">{percentage}%</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* View Sessions Detail */}
        <button
          onClick={() => setExpandedSession(expandedSession === "all" ? null : "all")}
          className="w-full py-2 text-sm text-teal-600 hover:bg-teal-50 rounded-lg flex items-center justify-center gap-1"
        >
          <Eye className="w-4 h-4" />
          {expandedSession === "all" ? "Ẩn chi tiết phiên học" : "Xem chi tiết từng phiên học"}
          {expandedSession === "all" ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>

        {/* Sessions Detail */}
        <AnimatePresence>
          {expandedSession === "all" && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="mt-4 max-h-96 overflow-y-auto space-y-2"
            >
              {sessions.slice(0, 20).map((session) => {
                const config = FUNCTION_CONFIG[session.sessionType] || { label: session.sessionType, icon: PenLine, color: "gray" };
                const Icon = config.icon;
                return (
                  <div key={session._id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl hover:bg-gray-100 transition">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center bg-${config.color}-100`}>
                      <Icon className={`w-5 h-5 text-${config.color}-600`} />
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-gray-800 text-sm">{config.label} #{session.sessionNumber}</p>
                      <p className="text-xs text-gray-500">
                        {new Date(session.createdAt).toLocaleDateString("vi-VN")} • {formatDuration(session.duration)}
                      </p>
                    </div>
                    {session.totalErrors > 0 && (
                      <span className="px-2 py-1 bg-orange-100 text-orange-600 rounded-full text-xs font-medium">
                        {session.totalErrors} lỗi
                      </span>
                    )}
                  </div>
                );
              })}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Part 2: Error Analysis by Function */}
      <div className="bg-white rounded-2xl p-6 shadow-lg">
        <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
          <AlertTriangle className="w-5 h-5 text-orange-500" />
          Phân tích lỗi học tập
        </h3>

        {errorsByFunction.length === 0 ? (
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
            <div className="overflow-x-auto mb-4">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-3 px-2 font-medium text-gray-600">Chức năng</th>
                    <th className="text-left py-3 px-2 font-medium text-gray-600">Loại lỗi phổ biến</th>
                    <th className="text-center py-3 px-2 font-medium text-gray-600">Số lỗi</th>
                    <th className="text-left py-3 px-2 font-medium text-gray-600">Gợi ý cải thiện</th>
                  </tr>
                </thead>
                <tbody>
                  {errorsByFunction.map((func) => {
                    const Icon = func.icon;
                    const topError = func.errorTypes[0];
                    return (
                      <tr key={func.functionName} className="border-b border-gray-100 hover:bg-gray-50">
                        <td className="py-3 px-2">
                          <div className="flex items-center gap-2">
                            <Icon className={`w-4 h-4 text-${func.color}-500`} />
                            <span className="font-medium text-gray-800">{func.functionLabel}</span>
                          </div>
                        </td>
                        <td className="py-3 px-2 text-gray-600">{topError?.type || "-"}</td>
                        <td className="py-3 px-2 text-center">
                          <span className="px-2 py-1 bg-orange-100 text-orange-600 rounded-full font-medium">
                            {func.totalErrors}
                          </span>
                        </td>
                        <td className="py-3 px-2 text-gray-500 text-xs">{topError?.suggestion || "-"}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Detailed Error Cards */}
            <div className="space-y-4">
              {errorsByFunction.map((func) => {
                const Icon = func.icon;
                const isExpanded = expandedFunction === func.functionName;
                const colorClasses: Record<string, { bg: string; border: string; text: string }> = {
                  purple: { bg: "bg-purple-50", border: "border-purple-200", text: "text-purple-600" },
                  pink: { bg: "bg-pink-50", border: "border-pink-200", text: "text-pink-600" },
                  blue: { bg: "bg-blue-50", border: "border-blue-200", text: "text-blue-600" },
                  orange: { bg: "bg-orange-50", border: "border-orange-200", text: "text-orange-600" },
                  green: { bg: "bg-green-50", border: "border-green-200", text: "text-green-600" },
                  gray: { bg: "bg-gray-50", border: "border-gray-200", text: "text-gray-600" },
                };
                const colors = colorClasses[func.color] || colorClasses.gray;

                return (
                  <div key={func.functionName} className={`rounded-xl border ${colors.border} overflow-hidden`}>
                    <button
                      onClick={() => setExpandedFunction(isExpanded ? null : func.functionName)}
                      className={`w-full p-4 flex items-center justify-between ${colors.bg} hover:opacity-90 transition`}
                    >
                      <div className="flex items-center gap-3">
                        <Icon className={`w-5 h-5 ${colors.text}`} />
                        <span className="font-medium text-gray-800">{func.functionLabel}</span>
                        <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${colors.bg} ${colors.text} border ${colors.border}`}>
                          {func.totalErrors} lỗi
                        </span>
                      </div>
                      {isExpanded ? <ChevronUp className="w-5 h-5 text-gray-400" /> : <ChevronDown className="w-5 h-5 text-gray-400" />}
                    </button>

                    <AnimatePresence>
                      {isExpanded && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          className="bg-white"
                        >
                          <div className="p-4 space-y-4">
                            {func.errorTypes.map((errorType, i) => (
                              <div key={i} className="p-3 bg-gray-50 rounded-lg">
                                <div className="flex items-center justify-between mb-2">
                                  <span className="font-medium text-gray-800">{errorType.type}</span>
                                  <span className="text-sm text-orange-600 font-bold">{errorType.count}x</span>
                                </div>
                                
                                {/* Examples */}
                                {errorType.examples.length > 0 && (
                                  <div className="mb-2">
                                    <p className="text-xs text-gray-500 mb-1">Ví dụ:</p>
                                    <div className="flex flex-wrap gap-2">
                                      {errorType.examples.map((ex, j) => (
                                        <span key={j} className="px-2 py-1 bg-white border border-gray-200 rounded text-xs text-gray-700">
                                          {errorType.type === "Lỗi phát âm" ? (
                                            <button onClick={() => speak(ex)} className="flex items-center gap-1 hover:text-blue-600">
                                              <Volume2 className="w-3 h-3" /> {ex}
                                            </button>
                                          ) : ex}
                                        </span>
                                      ))}
                                    </div>
                                  </div>
                                )}

                                {/* Suggestion */}
                                <div className="flex items-start gap-2 p-2 bg-yellow-50 rounded border border-yellow-200">
                                  <Lightbulb className="w-4 h-4 text-yellow-600 flex-shrink-0 mt-0.5" />
                                  <p className="text-xs text-yellow-800">{errorType.suggestion}</p>
                                </div>
                              </div>
                            ))}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
