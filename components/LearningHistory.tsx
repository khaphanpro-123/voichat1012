"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  TrendingUp,
  Clock,
  Target,
  AlertCircle,
  CheckCircle,
  Mic,
  BookOpen,
  MessageCircle,
  ChevronDown,
  ChevronUp
} from "lucide-react";

interface SessionSummary {
  byType: Array<{
    _id: string;
    totalSessions: number;
    avgScore: number;
    avgPronunciation: number;
    avgGrammar: number;
    totalDuration: number;
    totalWords: number;
  }>;
  commonPronunciationErrors: Array<{ word: string; count: number }>;
  commonGrammarErrors: Array<{ type: string; count: number }>;
}

interface LearningSession {
  _id: string;
  sessionNumber: number;
  sessionType: string;
  startTime: string;
  duration: number;
  overallScore: number;
  pronunciationScore: number;
  grammarScore: number;
  totalErrors: number;
  pronunciationErrors: Array<{
    word: string;
    feedback: string;
  }>;
  grammarErrors: Array<{
    original: string;
    corrected: string;
    errorType: string;
    explanationVi?: string;
  }>;
  strengths: string[];
  areasToImprove: string[];
  createdAt: string;
}

export default function LearningHistory({ userId }: { userId: string }) {
  const [summary, setSummary] = useState<SessionSummary | null>(null);
  const [sessions, setSessions] = useState<LearningSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedSession, setExpandedSession] = useState<string | null>(null);

  useEffect(() => {
    fetchData();
  }, [userId]);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch summary
      const summaryRes = await fetch(`/api/learning-session?userId=${userId}&summary=true`);
      const summaryData = await summaryRes.json();
      if (summaryData.success) setSummary(summaryData.summary);

      // Fetch recent sessions
      const sessionsRes = await fetch(`/api/learning-session?userId=${userId}&limit=10`);
      const sessionsData = await sessionsRes.json();
      if (sessionsData.success) setSessions(sessionsData.sessions);
    } catch (error) {
      console.error("Fetch learning history error:", error);
    }
    setLoading(false);
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const getSessionIcon = (type: string) => {
    switch (type) {
      case "voice_chat": return <Mic className="w-5 h-5" />;
      case "pronunciation": return <Mic className="w-5 h-5" />;
      case "vocabulary": return <BookOpen className="w-5 h-5" />;
      default: return <MessageCircle className="w-5 h-5" />;
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return "text-green-500";
    if (score >= 60) return "text-yellow-500";
    return "text-red-500";
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin w-8 h-8 border-4 border-teal-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      {summary && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Tổng quan */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-gradient-to-br from-teal-500 to-cyan-600 rounded-2xl p-6 text-white"
          >
            <div className="flex items-center gap-3 mb-4">
              <TrendingUp className="w-6 h-6" />
              <h3 className="font-bold text-lg">Tổng quan</h3>
            </div>
            <div className="space-y-2">
              <p className="text-3xl font-bold">
                {summary.byType.reduce((sum, t) => sum + t.totalSessions, 0)} phiên
              </p>
              <p className="text-white/80">
                Điểm TB: {Math.round(summary.byType.reduce((sum, t) => sum + t.avgScore, 0) / (summary.byType.length || 1))}
              </p>
            </div>
          </motion.div>

          {/* Lỗi phát âm phổ biến */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-lg"
          >
            <div className="flex items-center gap-3 mb-4">
              <AlertCircle className="w-6 h-6 text-orange-500" />
              <h3 className="font-bold text-lg">Lỗi phát âm thường gặp</h3>
            </div>
            {summary.commonPronunciationErrors.length > 0 ? (
              <ul className="space-y-2">
                {summary.commonPronunciationErrors.map((e, i) => (
                  <li key={i} className="flex justify-between text-sm">
                    <span className="font-medium">{e.word}</span>
                    <span className="text-gray-500">{e.count} lần</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-gray-500 text-sm">Chưa có dữ liệu</p>
            )}
          </motion.div>

          {/* Lỗi ngữ pháp phổ biến */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-lg"
          >
            <div className="flex items-center gap-3 mb-4">
              <Target className="w-6 h-6 text-purple-500" />
              <h3 className="font-bold text-lg">Lỗi ngữ pháp thường gặp</h3>
            </div>
            {summary.commonGrammarErrors.length > 0 ? (
              <ul className="space-y-2">
                {summary.commonGrammarErrors.map((e, i) => (
                  <li key={i} className="flex justify-between text-sm">
                    <span className="font-medium capitalize">{e.type.replace("_", " ")}</span>
                    <span className="text-gray-500">{e.count} lần</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-gray-500 text-sm">Chưa có dữ liệu</p>
            )}
          </motion.div>
        </div>
      )}

      {/* Recent Sessions */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg overflow-hidden">
        <div className="p-6 border-b dark:border-gray-700">
          <h3 className="font-bold text-lg flex items-center gap-2">
            <Clock className="w-5 h-5 text-teal-500" />
            Phiên học gần đây
          </h3>
        </div>

        {sessions.length > 0 ? (
          <div className="divide-y dark:divide-gray-700">
            {sessions.map((session) => (
              <div key={session._id} className="p-4">
                <button
                  onClick={() => setExpandedSession(
                    expandedSession === session._id ? null : session._id
                  )}
                  className="w-full flex items-center justify-between"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-teal-100 dark:bg-teal-900 flex items-center justify-center text-teal-600">
                      {getSessionIcon(session.sessionType)}
                    </div>
                    <div className="text-left">
                      <p className="font-medium capitalize">
                        Phiên #{session.sessionNumber || "?"} - {session.sessionType.replace("_", " ")}
                      </p>
                      <p className="text-sm text-gray-500">
                        {new Date(session.createdAt).toLocaleDateString("vi-VN")} • {formatDuration(session.duration)}
                        {session.totalErrors > 0 && (
                          <span className="ml-2 text-red-500">• {session.totalErrors} lỗi</span>
                        )}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className={`text-2xl font-bold ${getScoreColor(session.overallScore)}`}>
                      {session.overallScore}
                    </span>
                    {expandedSession === session._id ? (
                      <ChevronUp className="w-5 h-5 text-gray-400" />
                    ) : (
                      <ChevronDown className="w-5 h-5 text-gray-400" />
                    )}
                  </div>
                </button>

                {/* Expanded Details */}
                {expandedSession === session._id && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    className="mt-4 pt-4 border-t dark:border-gray-700"
                  >
                    {/* Scores */}
                    <div className="grid grid-cols-3 gap-4 mb-4">
                      <div className="text-center p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                        <p className="text-sm text-gray-500">Phát âm</p>
                        <p className={`text-xl font-bold ${getScoreColor(session.pronunciationScore)}`}>
                          {session.pronunciationScore}
                        </p>
                      </div>
                      <div className="text-center p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                        <p className="text-sm text-gray-500">Ngữ pháp</p>
                        <p className={`text-xl font-bold ${getScoreColor(session.grammarScore)}`}>
                          {session.grammarScore}
                        </p>
                      </div>
                      <div className="text-center p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                        <p className="text-sm text-gray-500">Tổng</p>
                        <p className={`text-xl font-bold ${getScoreColor(session.overallScore)}`}>
                          {session.overallScore}
                        </p>
                      </div>
                    </div>

                    {/* Errors */}
                    {session.pronunciationErrors?.length > 0 && (
                      <div className="mb-4">
                        <p className="font-medium text-sm mb-2 text-orange-600">Lỗi phát âm:</p>
                        <div className="flex flex-wrap gap-2">
                          {session.pronunciationErrors.map((e, i) => (
                            <span key={i} className="px-3 py-1 bg-orange-100 text-orange-700 rounded-full text-sm">
                              {e.word}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {session.grammarErrors?.length > 0 && (
                      <div className="mb-4">
                        <p className="font-medium text-sm mb-2 text-purple-600">Lỗi ngữ pháp ({session.grammarErrors.length}):</p>
                        <div className="space-y-2">
                          {session.grammarErrors.slice(0, 5).map((e, i) => (
                            <div key={i} className="text-sm bg-purple-50 dark:bg-purple-900/20 p-3 rounded-lg">
                              <div className="flex items-start gap-2">
                                <span className="text-red-500 font-medium">✗</span>
                                <span className="line-through text-red-500">{e.original}</span>
                              </div>
                              <div className="flex items-start gap-2 mt-1">
                                <span className="text-green-500 font-medium">✓</span>
                                <span className="text-green-600 font-medium">{e.corrected}</span>
                              </div>
                              {e.explanationVi && (
                                <p className="text-gray-500 text-xs mt-2 italic">{e.explanationVi}</p>
                              )}
                            </div>
                          ))}
                          {session.grammarErrors.length > 5 && (
                            <p className="text-xs text-gray-400">+{session.grammarErrors.length - 5} lỗi khác</p>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Strengths & Improvements */}
                    <div className="grid grid-cols-2 gap-4">
                      {session.strengths?.length > 0 && (
                        <div>
                          <p className="font-medium text-sm mb-2 text-green-600 flex items-center gap-1">
                            <CheckCircle className="w-4 h-4" /> Điểm mạnh
                          </p>
                          <ul className="text-sm space-y-1">
                            {session.strengths.map((s, i) => (
                              <li key={i} className="text-gray-600 dark:text-gray-400">• {s}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                      {session.areasToImprove?.length > 0 && (
                        <div>
                          <p className="font-medium text-sm mb-2 text-orange-600 flex items-center gap-1">
                            <Target className="w-4 h-4" /> Cần cải thiện
                          </p>
                          <ul className="text-sm space-y-1">
                            {session.areasToImprove.map((a, i) => (
                              <li key={i} className="text-gray-600 dark:text-gray-400">• {a}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  </motion.div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="p-8 text-center text-gray-500">
            <BookOpen className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>Chưa có phiên học nào</p>
            <p className="text-sm">Bắt đầu học để xem lịch sử tại đây!</p>
          </div>
        )}
      </div>
    </div>
  );
}
