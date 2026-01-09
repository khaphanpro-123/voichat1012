"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  TrendingUp, TrendingDown, Clock, Target, AlertCircle, CheckCircle,
  Mic, BookOpen, MessageCircle, ChevronDown, ChevronUp, Brain,
  Sparkles, BarChart3, RefreshCw, Lightbulb
} from "lucide-react";

interface BasicStats {
  totalSessions: number;
  avgScore: number;
  trend: "improving" | "stable" | "declining";
  trendPercent: number;
  pronunciationErrors: { total: number; common: { word: string; count: number }[] };
  grammarErrors: { total: number; common: { type: string; count: number }[] };
  vocabularyLearned: number;
}

interface AIAnalysis {
  summary: { totalSessions: number; avgScore: number; trend: string; trendPercent: number };
  errorAnalysis: {
    pronunciation: { count: number; commonErrors: any[]; exercises: string[] };
    grammar: { count: number; commonErrors: any[]; exercises: string[] };
    vocabulary: { count: number; wordsToReview: string[] };
  };
  recommendations: { flashcards: any[]; practiceAreas: string[]; nextSteps: string[] };
  strengths: string[];
  weeklyGoal: string;
}

interface LearningSession {
  _id: string;
  sessionNumber: number;
  sessionType: string;
  duration: number;
  overallScore: number;
  pronunciationScore: number;
  grammarScore: number;
  totalErrors: number;
  pronunciationErrors: any[];
  grammarErrors: any[];
  strengths: string[];
  areasToImprove: string[];
  createdAt: string;
}

export default function LearningHistory({ userId }: { userId: string }) {
  const [stats, setStats] = useState<BasicStats | null>(null);
  const [aiAnalysis, setAiAnalysis] = useState<AIAnalysis | null>(null);
  const [sessions, setSessions] = useState<LearningSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [aiLoading, setAiLoading] = useState(false);
  const [expandedSession, setExpandedSession] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"overview" | "sessions" | "analysis">("overview");

  useEffect(() => {
    fetchData();
  }, [userId]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/analyze-learning?userId=${userId}&limit=20`);
      const data = await res.json();
      if (data.success) {
        setStats(data.analysis);
        setSessions(data.sessions || []);
      }
    } catch (error) {
      console.error("Fetch error:", error);
    }
    setLoading(false);
  };

  const fetchAIAnalysis = async () => {
    setAiLoading(true);
    try {
      const res = await fetch(`/api/analyze-learning?userId=${userId}&ai=true&limit=20`);
      const data = await res.json();
      if (data.success && data.aiAnalysis) {
        setAiAnalysis(data.aiAnalysis);
        setActiveTab("analysis");
      }
    } catch (error) {
      console.error("AI analysis error:", error);
    }
    setAiLoading(false);
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    return `${mins} phút`;
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

  const getTrendIcon = (trend: string) => {
    if (trend === "improving") return <TrendingUp className="w-5 h-5 text-green-500" />;
    if (trend === "declining") return <TrendingDown className="w-5 h-5 text-red-500" />;
    return <BarChart3 className="w-5 h-5 text-gray-500" />;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin w-8 h-8 border-4 border-teal-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="text-center p-8">
        <BookOpen className="w-16 h-16 mx-auto mb-4 text-gray-300" />
        <h3 className="text-xl font-bold text-gray-600 mb-2">Chưa có dữ liệu học tập</h3>
        <p className="text-gray-500">Bắt đầu học để xem phân tích tại đây!</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Tabs */}
      <div className="flex gap-2 bg-gray-100 dark:bg-gray-800 p-1 rounded-xl">
        {[
          { id: "overview", label: "Tổng quan", icon: BarChart3 },
          { id: "sessions", label: "Phiên học", icon: Clock },
          { id: "analysis", label: "Phân tích AI", icon: Brain },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`flex-1 flex items-center justify-center gap-2 py-2 px-4 rounded-lg font-medium transition ${
              activeTab === tab.id
                ? "bg-white dark:bg-gray-700 shadow text-teal-600"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Overview Tab */}
      {activeTab === "overview" && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
          {/* Stats Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-gradient-to-br from-teal-500 to-cyan-600 rounded-2xl p-5 text-white">
              <p className="text-white/80 text-sm">Tổng phiên học</p>
              <p className="text-3xl font-bold">{stats.totalSessions}</p>
            </div>
            <div className="bg-gradient-to-br from-purple-500 to-pink-600 rounded-2xl p-5 text-white">
              <p className="text-white/80 text-sm">Điểm trung bình</p>
              <p className="text-3xl font-bold">{stats.avgScore}</p>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-2xl p-5 shadow-lg">
              <p className="text-gray-500 text-sm">Xu hướng</p>
              <div className="flex items-center gap-2">
                {getTrendIcon(stats.trend)}
                <span className={`text-xl font-bold ${
                  stats.trend === "improving" ? "text-green-500" :
                  stats.trend === "declining" ? "text-red-500" : "text-gray-500"
                }`}>
                  {stats.trendPercent > 0 ? "+" : ""}{stats.trendPercent}%
                </span>
              </div>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-2xl p-5 shadow-lg">
              <p className="text-gray-500 text-sm">Từ vựng đã học</p>
              <p className="text-3xl font-bold text-blue-600">{stats.vocabularyLearned}</p>
            </div>
          </div>

          {/* Error Summary */}
          <div className="grid md:grid-cols-2 gap-6">
            {/* Pronunciation Errors */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-lg">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-orange-100 rounded-lg">
                  <AlertCircle className="w-5 h-5 text-orange-600" />
                </div>
                <div>
                  <h3 className="font-bold">Lỗi phát âm</h3>
                  <p className="text-sm text-gray-500">{stats.pronunciationErrors.total} lỗi tổng cộng</p>
                </div>
              </div>
              {stats.pronunciationErrors.common.length > 0 ? (
                <div className="space-y-2">
                  {stats.pronunciationErrors.common.map((e, i) => (
                    <div key={i} className="flex justify-between items-center p-2 bg-orange-50 dark:bg-orange-900/20 rounded-lg">
                      <span className="font-medium">{e.word}</span>
                      <span className="text-sm text-orange-600">{e.count} lần</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-400 text-sm">Không có lỗi phát âm</p>
              )}
            </div>

            {/* Grammar Errors */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-lg">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-purple-100 rounded-lg">
                  <Target className="w-5 h-5 text-purple-600" />
                </div>
                <div>
                  <h3 className="font-bold">Lỗi ngữ pháp</h3>
                  <p className="text-sm text-gray-500">{stats.grammarErrors.total} lỗi tổng cộng</p>
                </div>
              </div>
              {stats.grammarErrors.common.length > 0 ? (
                <div className="space-y-2">
                  {stats.grammarErrors.common.map((e, i) => (
                    <div key={i} className="flex justify-between items-center p-2 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
                      <span className="font-medium capitalize">{e.type.replace(/_/g, " ")}</span>
                      <span className="text-sm text-purple-600">{e.count} lần</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-400 text-sm">Không có lỗi ngữ pháp</p>
              )}
            </div>
          </div>

          {/* AI Analysis Button */}
          <button
            onClick={fetchAIAnalysis}
            disabled={aiLoading}
            className="w-full py-4 bg-gradient-to-r from-purple-500 to-pink-500 text-white font-bold rounded-xl hover:shadow-lg transition flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {aiLoading ? (
              <><RefreshCw className="w-5 h-5 animate-spin" /> Đang phân tích...</>
            ) : (
              <><Brain className="w-5 h-5" /> Phân tích chi tiết với AI</>
            )}
          </button>
        </motion.div>
      )}

      {/* Sessions Tab */}
      {activeTab === "sessions" && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
          {sessions.length > 0 ? (
            sessions.map((session) => (
              <div key={session._id} className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg overflow-hidden">
                <button
                  onClick={() => setExpandedSession(expandedSession === session._id ? null : session._id)}
                  className="w-full p-4 flex items-center justify-between"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-teal-100 dark:bg-teal-900 flex items-center justify-center text-teal-600">
                      {getSessionIcon(session.sessionType)}
                    </div>
                    <div className="text-left">
                      <p className="font-bold">
                        Phiên #{session.sessionNumber} - {session.sessionType.replace("_", " ")}
                      </p>
                      <p className="text-sm text-gray-500">
                        {new Date(session.createdAt).toLocaleDateString("vi-VN", { 
                          day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" 
                        })}
                        {" • "}{formatDuration(session.duration)}
                        {session.totalErrors > 0 && (
                          <span className="text-red-500"> • {session.totalErrors} lỗi</span>
                        )}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <p className={`text-2xl font-bold ${getScoreColor(session.overallScore)}`}>
                        {session.overallScore}
                      </p>
                      <p className="text-xs text-gray-400">điểm</p>
                    </div>
                    {expandedSession === session._id ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                  </div>
                </button>

                {expandedSession === session._id && (
                  <motion.div initial={{ height: 0 }} animate={{ height: "auto" }} className="px-4 pb-4 border-t dark:border-gray-700">
                    <div className="pt-4 space-y-4">
                      {/* Scores */}
                      <div className="grid grid-cols-3 gap-3">
                        <div className="text-center p-3 bg-gray-50 dark:bg-gray-700 rounded-xl">
                          <p className="text-xs text-gray-500">Phát âm</p>
                          <p className={`text-xl font-bold ${getScoreColor(session.pronunciationScore)}`}>{session.pronunciationScore}</p>
                        </div>
                        <div className="text-center p-3 bg-gray-50 dark:bg-gray-700 rounded-xl">
                          <p className="text-xs text-gray-500">Ngữ pháp</p>
                          <p className={`text-xl font-bold ${getScoreColor(session.grammarScore)}`}>{session.grammarScore}</p>
                        </div>
                        <div className="text-center p-3 bg-gray-50 dark:bg-gray-700 rounded-xl">
                          <p className="text-xs text-gray-500">Tổng</p>
                          <p className={`text-xl font-bold ${getScoreColor(session.overallScore)}`}>{session.overallScore}</p>
                        </div>
                      </div>

                      {/* Errors */}
                      {session.pronunciationErrors?.length > 0 && (
                        <div>
                          <p className="text-sm font-medium text-orange-600 mb-2">❌ Lỗi phát âm ({session.pronunciationErrors.length})</p>
                          <div className="flex flex-wrap gap-2">
                            {session.pronunciationErrors.map((e, i) => (
                              <span key={i} className="px-3 py-1 bg-orange-100 text-orange-700 rounded-full text-sm">{e.word}</span>
                            ))}
                          </div>
                        </div>
                      )}

                      {session.grammarErrors?.length > 0 && (
                        <div>
                          <p className="text-sm font-medium text-purple-600 mb-2">❌ Lỗi ngữ pháp ({session.grammarErrors.length})</p>
                          <div className="space-y-2">
                            {session.grammarErrors.slice(0, 3).map((e, i) => (
                              <div key={i} className="p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg text-sm">
                                <p><span className="text-red-500 line-through">{e.original}</span></p>
                                <p><span className="text-green-600 font-medium">✓ {e.corrected}</span></p>
                                {e.explanationVi && <p className="text-gray-500 text-xs mt-1">{e.explanationVi}</p>}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Feedback */}
                      <div className="grid grid-cols-2 gap-4">
                        {session.strengths?.length > 0 && (
                          <div>
                            <p className="text-sm font-medium text-green-600 mb-2 flex items-center gap-1">
                              <CheckCircle className="w-4 h-4" /> Điểm mạnh
                            </p>
                            <ul className="text-sm space-y-1 text-gray-600">
                              {session.strengths.map((s, i) => <li key={i}>• {s}</li>)}
                            </ul>
                          </div>
                        )}
                        {session.areasToImprove?.length > 0 && (
                          <div>
                            <p className="text-sm font-medium text-orange-600 mb-2 flex items-center gap-1">
                              <Target className="w-4 h-4" /> Cần cải thiện
                            </p>
                            <ul className="text-sm space-y-1 text-gray-600">
                              {session.areasToImprove.map((a, i) => <li key={i}>• {a}</li>)}
                            </ul>
                          </div>
                        )}
                      </div>
                    </div>
                  </motion.div>
                )}
              </div>
            ))
          ) : (
            <div className="text-center p-8 text-gray-500">
              <Clock className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>Chưa có phiên học nào</p>
            </div>
          )}
        </motion.div>
      )}

      {/* AI Analysis Tab */}
      {activeTab === "analysis" && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
          {aiAnalysis ? (
            <>
              {/* Summary */}
              <div className="bg-gradient-to-r from-purple-500 to-pink-500 rounded-2xl p-6 text-white">
                <div className="flex items-center gap-3 mb-4">
                  <Sparkles className="w-6 h-6" />
                  <h3 className="font-bold text-lg">Phân tích AI</h3>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <p className="text-white/70 text-sm">Xu hướng</p>
                    <p className="text-xl font-bold capitalize">{aiAnalysis.summary.trend}</p>
                  </div>
                  <div>
                    <p className="text-white/70 text-sm">Thay đổi</p>
                    <p className="text-xl font-bold">{aiAnalysis.summary.trendPercent > 0 ? "+" : ""}{aiAnalysis.summary.trendPercent}%</p>
                  </div>
                  <div>
                    <p className="text-white/70 text-sm">Điểm TB</p>
                    <p className="text-xl font-bold">{aiAnalysis.summary.avgScore}</p>
                  </div>
                  <div>
                    <p className="text-white/70 text-sm">Phiên học</p>
                    <p className="text-xl font-bold">{aiAnalysis.summary.totalSessions}</p>
                  </div>
                </div>
              </div>

              {/* Weekly Goal */}
              {aiAnalysis.weeklyGoal && (
                <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 rounded-2xl p-4 flex items-start gap-3">
                  <Lightbulb className="w-6 h-6 text-yellow-600 flex-shrink-0" />
                  <div>
                    <p className="font-bold text-yellow-800">Mục tiêu tuần này</p>
                    <p className="text-yellow-700">{aiAnalysis.weeklyGoal}</p>
                  </div>
                </div>
              )}

              {/* Strengths */}
              {aiAnalysis.strengths?.length > 0 && (
                <div className="bg-green-50 dark:bg-green-900/20 rounded-2xl p-6">
                  <h4 className="font-bold text-green-700 mb-3 flex items-center gap-2">
                    <CheckCircle className="w-5 h-5" /> Điểm mạnh của bạn
                  </h4>
                  <ul className="space-y-2">
                    {aiAnalysis.strengths.map((s, i) => (
                      <li key={i} className="flex items-start gap-2 text-green-800">
                        <span className="text-green-500">✓</span> {s}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Error Analysis */}
              <div className="grid md:grid-cols-2 gap-6">
                {/* Pronunciation */}
                {aiAnalysis.errorAnalysis.pronunciation.commonErrors?.length > 0 && (
                  <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-lg">
                    <h4 className="font-bold text-orange-600 mb-4 flex items-center gap-2">
                      <Mic className="w-5 h-5" /> Lỗi phát âm cần khắc phục
                    </h4>
                    <div className="space-y-3">
                      {aiAnalysis.errorAnalysis.pronunciation.commonErrors.map((e, i) => (
                        <div key={i} className="p-3 bg-orange-50 dark:bg-orange-900/20 rounded-lg">
                          <p className="font-medium text-orange-700">Âm: {e.sound}</p>
                          <p className="text-sm text-gray-600">Từ: {e.words?.join(", ")}</p>
                          <p className="text-sm text-orange-600 mt-1">💡 {e.tip}</p>
                        </div>
                      ))}
                    </div>
                    {aiAnalysis.errorAnalysis.pronunciation.exercises?.length > 0 && (
                      <div className="mt-4 pt-4 border-t">
                        <p className="text-sm font-medium mb-2">Bài tập gợi ý:</p>
                        <ul className="text-sm text-gray-600 space-y-1">
                          {aiAnalysis.errorAnalysis.pronunciation.exercises.map((ex, i) => (
                            <li key={i}>• {ex}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                )}

                {/* Grammar */}
                {aiAnalysis.errorAnalysis.grammar.commonErrors?.length > 0 && (
                  <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-lg">
                    <h4 className="font-bold text-purple-600 mb-4 flex items-center gap-2">
                      <BookOpen className="w-5 h-5" /> Lỗi ngữ pháp cần khắc phục
                    </h4>
                    <div className="space-y-3">
                      {aiAnalysis.errorAnalysis.grammar.commonErrors.map((e, i) => (
                        <div key={i} className="p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
                          <p className="font-medium text-purple-700">{e.type}</p>
                          <p className="text-sm text-gray-600">{e.ruleVi || e.rule}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Recommendations */}
              {aiAnalysis.recommendations && (
                <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-lg">
                  <h4 className="font-bold text-blue-600 mb-4 flex items-center gap-2">
                    <Target className="w-5 h-5" /> Gợi ý tiếp theo
                  </h4>
                  
                  {aiAnalysis.recommendations.practiceAreas?.length > 0 && (
                    <div className="mb-4">
                      <p className="text-sm font-medium mb-2">Lĩnh vực cần luyện tập:</p>
                      <div className="flex flex-wrap gap-2">
                        {aiAnalysis.recommendations.practiceAreas.map((area, i) => (
                          <span key={i} className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm">{area}</span>
                        ))}
                      </div>
                    </div>
                  )}

                  {aiAnalysis.recommendations.nextSteps?.length > 0 && (
                    <div>
                      <p className="text-sm font-medium mb-2">Bước tiếp theo:</p>
                      <ul className="space-y-2">
                        {aiAnalysis.recommendations.nextSteps.map((step, i) => (
                          <li key={i} className="flex items-start gap-2 text-gray-700">
                            <span className="text-blue-500 font-bold">{i + 1}.</span> {step}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}
            </>
          ) : (
            <div className="text-center p-8">
              <Brain className="w-16 h-16 mx-auto mb-4 text-gray-300" />
              <h3 className="text-xl font-bold text-gray-600 mb-2">Chưa có phân tích AI</h3>
              <p className="text-gray-500 mb-4">Nhấn nút bên dưới để AI phân tích lịch sử học tập của bạn</p>
              <button
                onClick={fetchAIAnalysis}
                disabled={aiLoading}
                className="px-6 py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white font-bold rounded-xl hover:shadow-lg transition flex items-center justify-center gap-2 mx-auto disabled:opacity-50"
              >
                {aiLoading ? (
                  <><RefreshCw className="w-5 h-5 animate-spin" /> Đang phân tích...</>
                ) : (
                  <><Sparkles className="w-5 h-5" /> Phân tích với AI</>
                )}
              </button>
            </div>
          )}
        </motion.div>
      )}
    </div>
  );
}
