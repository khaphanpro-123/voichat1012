"use client";

import { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  TrendingUp, TrendingDown, Clock, Target, AlertCircle, CheckCircle,
  Mic, BookOpen, MessageCircle, ChevronDown, ChevronUp, Brain,
  Sparkles, BarChart3, RefreshCw, Lightbulb, Star, Calendar,
  Filter, PenLine, Volume2, Image as ImageIcon, Zap
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
  rating?: number;
}

interface SkillData {
  skill: string;
  sessions: number;
  avgScore: number;
  trend: number;
}

type TabType = "overview" | "sessions" | "analysis";
type TimeFilter = "week" | "month" | "all";

export default function LearningHistory({ userId }: { userId: string }) {
  const [stats, setStats] = useState<BasicStats | null>(null);
  const [sessions, setSessions] = useState<LearningSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiAnalysis, setAiAnalysis] = useState<any>(null);
  const [expandedSession, setExpandedSession] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabType>("overview");
  const [timeFilter, setTimeFilter] = useState<TimeFilter>("month");
  const [ratingSession, setRatingSession] = useState<string | null>(null);

  useEffect(() => {
    fetchData();
  }, [userId, timeFilter]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const days = timeFilter === "week" ? 7 : timeFilter === "month" ? 30 : 365;
      const res = await fetch(`/api/analyze-learning?userId=${userId}&limit=50&days=${days}`);
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

  const rateSession = async (sessionId: string, rating: number) => {
    try {
      await fetch("/api/learning-session", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId, rating })
      });
      setSessions(prev => prev.map(s => s._id === sessionId ? { ...s, rating } : s));
      setRatingSession(null);
    } catch (error) {
      console.error("Rate error:", error);
    }
  };

  // Calculate skill breakdown from sessions
  const skillBreakdown = useMemo((): SkillData[] => {
    const skillMap: Record<string, { sessions: number; totalScore: number; recentScores: number[] }> = {};
    
    sessions.forEach(s => {
      const skill = s.sessionType;
      if (!skillMap[skill]) skillMap[skill] = { sessions: 0, totalScore: 0, recentScores: [] };
      skillMap[skill].sessions++;
      skillMap[skill].totalScore += s.overallScore || 0;
      if (skillMap[skill].recentScores.length < 5) skillMap[skill].recentScores.push(s.overallScore || 0);
    });

    return Object.entries(skillMap).map(([skill, data]) => {
      const avgScore = Math.round(data.totalScore / data.sessions);
      const recent = data.recentScores;
      const trend = recent.length >= 2 ? recent[0] - recent[recent.length - 1] : 0;
      return { skill, sessions: data.sessions, avgScore, trend };
    }).sort((a, b) => b.sessions - a.sessions);
  }, [sessions]);

  // Group sessions by date
  const sessionsByDate = useMemo(() => {
    const groups: Record<string, LearningSession[]> = {};
    sessions.forEach(s => {
      const date = new Date(s.createdAt).toLocaleDateString("vi-VN");
      if (!groups[date]) groups[date] = [];
      groups[date].push(s);
    });
    return groups;
  }, [sessions]);

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    return mins > 0 ? `${mins} phút` : `${seconds} giây`;
  };

  const getSessionIcon = (type: string) => {
    switch (type) {
      case "voice_chat": return <MessageCircle className="w-5 h-5" />;
      case "pronunciation": return <Mic className="w-5 h-5" />;
      case "vocabulary": return <BookOpen className="w-5 h-5" />;
      case "image_describe": return <ImageIcon className="w-5 h-5" />;
      case "image_learning": return <ImageIcon className="w-5 h-5" />;
      default: return <PenLine className="w-5 h-5" />;
    }
  };

  const getSessionLabel = (type: string) => {
    const labels: Record<string, string> = {
      voice_chat: "Voice Chat",
      pronunciation: "Phát âm",
      vocabulary: "Từ vựng",
      image_describe: "Mô tả ảnh",
      image_learning: "Học qua ảnh",
      debate: "Tranh luận"
    };
    return labels[type] || type;
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return "text-green-500";
    if (score >= 60) return "text-yellow-500";
    return "text-red-500";
  };

  const getScoreBg = (score: number) => {
    if (score >= 80) return "bg-green-500";
    if (score >= 60) return "bg-yellow-500";
    return "bg-red-500";
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin w-8 h-8 border-4 border-teal-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!stats || sessions.length === 0) {
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
      {/* Tabs */}
      <div className="flex gap-2 bg-gray-100 p-1 rounded-xl">
        {[
          { id: "overview", label: "Tổng quan", icon: BarChart3 },
          { id: "sessions", label: "Phiên học", icon: Clock },
          { id: "analysis", label: "Phân tích AI", icon: Brain },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as TabType)}
            className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-lg font-medium transition ${
              activeTab === tab.id ? "bg-white shadow text-teal-600" : "text-gray-500 hover:text-gray-700"
            }`}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Time Filter */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-gray-500" />
          <span className="text-sm text-gray-600">Lọc theo:</span>
        </div>
        <div className="flex gap-2">
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
        </div>
      </div>

      <AnimatePresence mode="wait">
        {/* Overview Tab */}
        {activeTab === "overview" && (
          <motion.div key="overview" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-6">
            {/* Stats Cards - No scores, focus on activity */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-gradient-to-br from-teal-500 to-cyan-600 rounded-2xl p-5 text-white">
                <div className="flex items-center gap-2 mb-2">
                  <Calendar className="w-5 h-5 opacity-80" />
                  <span className="text-white/80 text-sm">Tổng phiên học</span>
                </div>
                <p className="text-4xl font-bold">{stats.totalSessions}</p>
              </div>
              
              <div className="bg-gradient-to-br from-purple-500 to-pink-600 rounded-2xl p-5 text-white">
                <div className="flex items-center gap-2 mb-2">
                  <Clock className="w-5 h-5 opacity-80" />
                  <span className="text-white/80 text-sm">Thời gian học</span>
                </div>
                <p className="text-4xl font-bold">{Math.round(sessions.reduce((a, s) => a + (s.duration || 0), 0) / 60)}</p>
                <p className="text-white/70 text-sm">phút</p>
              </div>

              <div className="bg-white rounded-2xl p-5 shadow-lg border border-gray-100">
                <div className="flex items-center gap-2 mb-2">
                  {stats.trend === "improving" ? <TrendingUp className="w-5 h-5 text-green-500" /> : 
                   stats.trend === "declining" ? <TrendingDown className="w-5 h-5 text-red-500" /> :
                   <BarChart3 className="w-5 h-5 text-gray-500" />}
                  <span className="text-gray-500 text-sm">Xu hướng</span>
                </div>
                <p className={`text-2xl font-bold ${stats.trend === "improving" ? "text-green-500" : stats.trend === "declining" ? "text-red-500" : "text-gray-500"}`}>
                  {stats.trendPercent > 0 ? "+" : ""}{stats.trendPercent}%
                </p>
              </div>

              <div className="bg-white rounded-2xl p-5 shadow-lg border border-gray-100">
                <div className="flex items-center gap-2 mb-2">
                  <BookOpen className="w-5 h-5 text-blue-500" />
                  <span className="text-gray-500 text-sm">Từ vựng đã học</span>
                </div>
                <p className="text-4xl font-bold text-blue-600">{stats.vocabularyLearned}</p>
              </div>
            </div>

            {/* Skill Breakdown Chart */}
            <div className="bg-white rounded-2xl p-6 shadow-lg">
              <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-teal-500" />
                Phân bố theo kỹ năng
              </h3>
              <div className="space-y-4">
                {skillBreakdown.map((skill, i) => (
                  <div key={skill.skill} className="flex items-center gap-4">
                    <div className="w-24 flex items-center gap-2">
                      {getSessionIcon(skill.skill)}
                      <span className="text-sm font-medium text-gray-700">{getSessionLabel(skill.skill)}</span>
                    </div>
                    <div className="flex-1">
                      <div className="h-6 bg-gray-100 rounded-full overflow-hidden">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${(skill.sessions / stats.totalSessions) * 100}%` }}
                          transition={{ delay: i * 0.1, duration: 0.5 }}
                          className="h-full bg-gradient-to-r from-teal-400 to-cyan-500 rounded-full flex items-center justify-end pr-2"
                        >
                          <span className="text-xs text-white font-bold">{skill.sessions}</span>
                        </motion.div>
                      </div>
                    </div>
                    <div className="w-16 text-right">
                      {skill.trend > 0 ? (
                        <span className="text-green-500 text-sm flex items-center justify-end gap-1">
                          <TrendingUp className="w-3 h-3" /> +{skill.trend}
                        </span>
                      ) : skill.trend < 0 ? (
                        <span className="text-red-500 text-sm flex items-center justify-end gap-1">
                          <TrendingDown className="w-3 h-3" /> {skill.trend}
                        </span>
                      ) : (
                        <span className="text-gray-400 text-sm">—</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Error Summary */}
            <div className="grid md:grid-cols-2 gap-6">
              {/* Pronunciation Errors */}
              <div className="bg-white rounded-2xl p-6 shadow-lg">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 bg-orange-100 rounded-lg">
                    <Mic className="w-5 h-5 text-orange-600" />
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-800">Lỗi phát âm</h3>
                    <p className="text-sm text-gray-500">{stats.pronunciationErrors.total} lỗi tổng cộng</p>
                  </div>
                </div>
                {stats.pronunciationErrors.common.length > 0 ? (
                  <div className="space-y-2">
                    {stats.pronunciationErrors.common.slice(0, 5).map((e, i) => (
                      <div key={i} className="flex justify-between items-center p-3 bg-orange-50 rounded-xl">
                        <div className="flex items-center gap-2">
                          <button onClick={() => {
                            const u = new SpeechSynthesisUtterance(e.word);
                            u.lang = "en-US";
                            speechSynthesis.speak(u);
                          }} className="p-1 hover:bg-orange-100 rounded">
                            <Volume2 className="w-4 h-4 text-orange-500" />
                          </button>
                          <span className="font-medium text-gray-800">{e.word}</span>
                        </div>
                        <span className="text-sm text-orange-600 font-bold">{e.count}x</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-400 text-sm text-center py-4">🎉 Không có lỗi phát âm!</p>
                )}
              </div>

              {/* Grammar Errors */}
              <div className="bg-white rounded-2xl p-6 shadow-lg">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 bg-purple-100 rounded-lg">
                    <PenLine className="w-5 h-5 text-purple-600" />
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-800">Lỗi ngữ pháp</h3>
                    <p className="text-sm text-gray-500">{stats.grammarErrors.total} lỗi tổng cộng</p>
                  </div>
                </div>
                {stats.grammarErrors.common.length > 0 ? (
                  <div className="space-y-2">
                    {stats.grammarErrors.common.slice(0, 5).map((e, i) => (
                      <div key={i} className="flex justify-between items-center p-3 bg-purple-50 rounded-xl">
                        <span className="font-medium text-gray-800 capitalize">{e.type.replace(/_/g, " ")}</span>
                        <span className="text-sm text-purple-600 font-bold">{e.count}x</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-400 text-sm text-center py-4">🎉 Không có lỗi ngữ pháp!</p>
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
          <motion.div key="sessions" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-6">
            {/* Rating Prompt */}
            <div className="bg-gradient-to-r from-yellow-50 to-orange-50 border border-yellow-200 rounded-2xl p-4 flex items-start gap-3">
              <Lightbulb className="w-6 h-6 text-yellow-600 flex-shrink-0" />
              <div>
                <p className="font-medium text-yellow-800">Đánh giá phiên học</p>
                <p className="text-sm text-yellow-700">Bạn có cảm thấy phiên học giúp bạn cải thiện kỹ năng không? Hãy đánh giá bằng sao để chúng tôi hiểu rõ hơn!</p>
              </div>
            </div>

            {/* Sessions grouped by date */}
            {Object.entries(sessionsByDate).map(([date, dateSessions]) => (
              <div key={date}>
                <div className="flex items-center gap-2 mb-3">
                  <Calendar className="w-4 h-4 text-gray-400" />
                  <span className="text-sm font-medium text-gray-500">{date}</span>
                  <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">{dateSessions.length} phiên</span>
                </div>
                
                <div className="space-y-3">
                  {dateSessions.map((session) => (
                    <div key={session._id} className="bg-white rounded-2xl shadow-lg overflow-hidden">
                      <button
                        onClick={() => setExpandedSession(expandedSession === session._id ? null : session._id)}
                        className="w-full p-4 flex items-center justify-between hover:bg-gray-50 transition"
                      >
                        <div className="flex items-center gap-4">
                          <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                            session.sessionType === "voice_chat" ? "bg-purple-100 text-purple-600" :
                            session.sessionType === "pronunciation" ? "bg-orange-100 text-orange-600" :
                            session.sessionType === "vocabulary" ? "bg-green-100 text-green-600" :
                            "bg-blue-100 text-blue-600"
                          }`}>
                            {getSessionIcon(session.sessionType)}
                          </div>
                          <div className="text-left">
                            <p className="font-bold text-gray-800">
                              {getSessionLabel(session.sessionType)} #{session.sessionNumber}
                            </p>
                            <p className="text-sm text-gray-500">
                              {new Date(session.createdAt).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" })}
                              {" • "}{formatDuration(session.duration)}
                              {session.totalErrors > 0 && (
                                <span className="text-orange-500"> • {session.totalErrors} lỗi</span>
                              )}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          {/* Star Rating */}
                          <div className="flex items-center gap-1">
                            {[1, 2, 3, 4, 5].map(star => (
                              <button
                                key={star}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  rateSession(session._id, star);
                                }}
                                className={`p-0.5 ${session.rating && session.rating >= star ? "text-yellow-400" : "text-gray-300"} hover:text-yellow-400 transition`}
                              >
                                <Star className="w-4 h-4" fill={session.rating && session.rating >= star ? "currentColor" : "none"} />
                              </button>
                            ))}
                          </div>
                          {expandedSession === session._id ? <ChevronUp className="w-5 h-5 text-gray-400" /> : <ChevronDown className="w-5 h-5 text-gray-400" />}
                        </div>
                      </button>

                      <AnimatePresence>
                        {expandedSession === session._id && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: "auto", opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            className="border-t border-gray-100"
                          >
                            <div className="p-4 space-y-4">
                              {/* Errors */}
                              {session.pronunciationErrors?.length > 0 && (
                                <div>
                                  <p className="text-sm font-medium text-orange-600 mb-2 flex items-center gap-1">
                                    <Mic className="w-4 h-4" /> Lỗi phát âm ({session.pronunciationErrors.length})
                                  </p>
                                  <div className="flex flex-wrap gap-2">
                                    {session.pronunciationErrors.map((e: any, i: number) => (
                                      <span key={i} className="px-3 py-1 bg-orange-100 text-orange-700 rounded-full text-sm">{e.word}</span>
                                    ))}
                                  </div>
                                </div>
                              )}

                              {session.grammarErrors?.length > 0 && (
                                <div>
                                  <p className="text-sm font-medium text-purple-600 mb-2 flex items-center gap-1">
                                    <PenLine className="w-4 h-4" /> Lỗi ngữ pháp ({session.grammarErrors.length})
                                  </p>
                                  <div className="space-y-2">
                                    {session.grammarErrors.slice(0, 3).map((e: any, i: number) => (
                                      <div key={i} className="p-3 bg-purple-50 rounded-lg text-sm">
                                        <p className="text-red-500 line-through">{e.original}</p>
                                        <p className="text-green-600 font-medium">✓ {e.corrected}</p>
                                        {e.explanationVi && <p className="text-gray-500 text-xs mt-1">{e.explanationVi}</p>}
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}

                              {/* Feedback */}
                              <div className="grid grid-cols-2 gap-4">
                                {session.strengths?.length > 0 && (
                                  <div className="p-3 bg-green-50 rounded-xl">
                                    <p className="text-sm font-medium text-green-700 mb-2 flex items-center gap-1">
                                      <CheckCircle className="w-4 h-4" /> Điểm mạnh
                                    </p>
                                    <ul className="text-sm space-y-1 text-green-800">
                                      {session.strengths.map((s, i) => <li key={i}>• {s}</li>)}
                                    </ul>
                                  </div>
                                )}
                                {session.areasToImprove?.length > 0 && (
                                  <div className="p-3 bg-orange-50 rounded-xl">
                                    <p className="text-sm font-medium text-orange-700 mb-2 flex items-center gap-1">
                                      <Target className="w-4 h-4" /> Cần cải thiện
                                    </p>
                                    <ul className="text-sm space-y-1 text-orange-800">
                                      {session.areasToImprove.map((a, i) => <li key={i}>• {a}</li>)}
                                    </ul>
                                  </div>
                                )}
                              </div>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  ))}
                </div>
              </div>
            ))}

            {sessions.length === 0 && (
              <div className="text-center p-8 text-gray-500">
                <Clock className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>Chưa có phiên học nào trong khoảng thời gian này</p>
              </div>
            )}
          </motion.div>
        )}

        {/* AI Analysis Tab */}
        {activeTab === "analysis" && (
          <motion.div key="analysis" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-6">
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
                      <p className="text-xl font-bold capitalize">{aiAnalysis.summary?.trend || "stable"}</p>
                    </div>
                    <div>
                      <p className="text-white/70 text-sm">Thay đổi</p>
                      <p className="text-xl font-bold">{(aiAnalysis.summary?.trendPercent || 0) > 0 ? "+" : ""}{aiAnalysis.summary?.trendPercent || 0}%</p>
                    </div>
                    <div>
                      <p className="text-white/70 text-sm">Phiên học</p>
                      <p className="text-xl font-bold">{aiAnalysis.summary?.totalSessions || 0}</p>
                    </div>
                    <div>
                      <p className="text-white/70 text-sm">Lỗi cần sửa</p>
                      <p className="text-xl font-bold">{(aiAnalysis.errorAnalysis?.pronunciation?.count || 0) + (aiAnalysis.errorAnalysis?.grammar?.count || 0)}</p>
                    </div>
                  </div>
                </div>

                {/* Weekly Goal */}
                {aiAnalysis.weeklyGoal && (
                  <div className="bg-yellow-50 border border-yellow-200 rounded-2xl p-4 flex items-start gap-3">
                    <Zap className="w-6 h-6 text-yellow-600 flex-shrink-0" />
                    <div>
                      <p className="font-bold text-yellow-800">🎯 Mục tiêu tuần này</p>
                      <p className="text-yellow-700">{aiAnalysis.weeklyGoal}</p>
                    </div>
                  </div>
                )}

                {/* Strengths */}
                {aiAnalysis.strengths?.length > 0 && (
                  <div className="bg-green-50 rounded-2xl p-6">
                    <h4 className="font-bold text-green-700 mb-3 flex items-center gap-2">
                      <CheckCircle className="w-5 h-5" /> Điểm mạnh của bạn
                    </h4>
                    <ul className="space-y-2">
                      {aiAnalysis.strengths.map((s: string, i: number) => (
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
                  {aiAnalysis.errorAnalysis?.pronunciation?.commonErrors?.length > 0 && (
                    <div className="bg-white rounded-2xl p-6 shadow-lg">
                      <h4 className="font-bold text-orange-600 mb-4 flex items-center gap-2">
                        <Mic className="w-5 h-5" /> Lỗi phát âm cần khắc phục
                      </h4>
                      <div className="space-y-3">
                        {aiAnalysis.errorAnalysis.pronunciation.commonErrors.map((e: any, i: number) => (
                          <div key={i} className="p-3 bg-orange-50 rounded-lg">
                            <p className="font-medium text-orange-700">Âm: {e.sound}</p>
                            <p className="text-sm text-gray-600">Từ: {e.words?.join(", ")}</p>
                            {e.tip && <p className="text-sm text-orange-600 mt-1">💡 {e.tip}</p>}
                          </div>
                        ))}
                      </div>
                      {aiAnalysis.errorAnalysis.pronunciation.exercises?.length > 0 && (
                        <div className="mt-4 pt-4 border-t border-orange-100">
                          <p className="text-sm font-medium mb-2 text-gray-700">Bài tập gợi ý:</p>
                          <ul className="text-sm text-gray-600 space-y-1">
                            {aiAnalysis.errorAnalysis.pronunciation.exercises.map((ex: string, i: number) => (
                              <li key={i}>• {ex}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Grammar */}
                  {aiAnalysis.errorAnalysis?.grammar?.commonErrors?.length > 0 && (
                    <div className="bg-white rounded-2xl p-6 shadow-lg">
                      <h4 className="font-bold text-purple-600 mb-4 flex items-center gap-2">
                        <PenLine className="w-5 h-5" /> Lỗi ngữ pháp cần khắc phục
                      </h4>
                      <div className="space-y-3">
                        {aiAnalysis.errorAnalysis.grammar.commonErrors.map((e: any, i: number) => (
                          <div key={i} className="p-3 bg-purple-50 rounded-lg">
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
                  <div className="bg-white rounded-2xl p-6 shadow-lg">
                    <h4 className="font-bold text-blue-600 mb-4 flex items-center gap-2">
                      <Target className="w-5 h-5" /> Lộ trình học tập cá nhân hóa
                    </h4>
                    
                    {aiAnalysis.recommendations.practiceAreas?.length > 0 && (
                      <div className="mb-4">
                        <p className="text-sm font-medium mb-2 text-gray-700">Lĩnh vực cần luyện tập:</p>
                        <div className="flex flex-wrap gap-2">
                          {aiAnalysis.recommendations.practiceAreas.map((area: string, i: number) => (
                            <span key={i} className="px-3 py-1.5 bg-blue-100 text-blue-700 rounded-full text-sm font-medium">{area}</span>
                          ))}
                        </div>
                      </div>
                    )}

                    {aiAnalysis.recommendations.nextSteps?.length > 0 && (
                      <div>
                        <p className="text-sm font-medium mb-2 text-gray-700">Bước tiếp theo:</p>
                        <ul className="space-y-2">
                          {aiAnalysis.recommendations.nextSteps.map((step: string, i: number) => (
                            <li key={i} className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                              <span className="w-6 h-6 bg-blue-500 text-white rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0">{i + 1}</span>
                              <span className="text-gray-700">{step}</span>
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
      </AnimatePresence>
    </div>
  );
}
