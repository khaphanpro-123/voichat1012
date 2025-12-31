"use client";
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  BookOpen,
  Brain,
  Clock,
  TrendingUp,
  Play,
  Pause,
  RotateCcw,
  CheckCircle,
  XCircle,
  Volume2,
  Image as ImageIcon,
  Loader,
  Star,
  Target,
} from "lucide-react";

interface VocabularyItem {
  _id: string;
  word: string;
  type: string;
  meaning: string;
  example: string;
  exampleTranslation: string;
  level: string;
  category: string;
  imagePrompt?: string;
  imageUrl?: string;
  audioUrl?: string;
  
  // SRS data
  easeFactor: number;
  interval: number;
  repetitions: number;
  nextReviewDate: string;
  
  // Learning progress
  timesReviewed: number;
  timesCorrect: number;
  timesIncorrect: number;
  isLearned: boolean;
  
  // Calculated fields
  priority?: number;
  successRate?: number;
  daysSinceLastReview?: number;
}

interface LearningStats {
  total: number;
  learned: number;
  due: number;
  avgSuccessRate: number;
}

export default function VocabularyLearning() {
  const [vocabularies, setVocabularies] = useState<VocabularyItem[]>([]);
  const [dueVocabularies, setDueVocabularies] = useState<VocabularyItem[]>([]);
  const [currentVocab, setCurrentVocab] = useState<VocabularyItem | null>(null);
  const [stats, setStats] = useState<LearningStats>({
    total: 0,
    learned: 0,
    due: 0,
    avgSuccessRate: 0
  });
  const [loading, setLoading] = useState(true);
  const [reviewMode, setReviewMode] = useState(false);
  const [showAnswer, setShowAnswer] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [sessionStats, setSessionStats] = useState({
    reviewed: 0,
    correct: 0,
    incorrect: 0
  });

  useEffect(() => {
    fetchVocabularies();
    fetchDueVocabularies();
  }, []);

  const fetchVocabularies = async () => {
    try {
      const response = await fetch('/api/extract-vocabulary?userId=anonymous&limit=100');
      const data = await response.json();
      
      if (data.success) {
        setVocabularies(data.vocabularies);
        setStats(data.stats);
      }
    } catch (error) {
      console.error('Error fetching vocabularies:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchDueVocabularies = async () => {
    try {
      const response = await fetch('/api/vocabulary-review?userId=anonymous&limit=20&includeNew=true');
      const data = await response.json();
      
      if (data.success) {
        setDueVocabularies(data.vocabularies);
        if (data.vocabularies.length > 0) {
          setCurrentVocab(data.vocabularies[0]);
        }
      }
    } catch (error) {
      console.error('Error fetching due vocabularies:', error);
    }
  };

  const startReviewSession = () => {
    if (dueVocabularies.length === 0) {
      fetchDueVocabularies();
      return;
    }
    
    setReviewMode(true);
    setCurrentIndex(0);
    setCurrentVocab(dueVocabularies[0]);
    setShowAnswer(false);
    setSessionStats({ reviewed: 0, correct: 0, incorrect: 0 });
  };

  const submitReview = async (quality: number) => {
    if (!currentVocab) return;

    try {
      const response = await fetch('/api/vocabulary-review', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          vocabularyId: currentVocab._id,
          quality,
          userId: 'anonymous'
        })
      });

      const data = await response.json();
      if (data.success) {
        // Update session stats
        setSessionStats(prev => ({
          reviewed: prev.reviewed + 1,
          correct: prev.correct + (quality >= 3 ? 1 : 0),
          incorrect: prev.incorrect + (quality < 3 ? 1 : 0)
        }));

        // Move to next vocabulary
        const nextIndex = currentIndex + 1;
        if (nextIndex < dueVocabularies.length) {
          setCurrentIndex(nextIndex);
          setCurrentVocab(dueVocabularies[nextIndex]);
          setShowAnswer(false);
        } else {
          // End of session
          setReviewMode(false);
          setCurrentVocab(null);
          fetchVocabularies(); // Refresh stats
          fetchDueVocabularies(); // Refresh due list
        }
      }
    } catch (error) {
      console.error('Error submitting review:', error);
    }
  };

  const speakWord = (text: string) => {
    if ('speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'vi-VN';
      utterance.rate = 0.8;
      utterance.pitch = 1.0;
      window.speechSynthesis.speak(utterance);
    }
  };

  const generateImage = async (vocab: VocabularyItem) => {
    try {
      const response = await fetch('/api/generate-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: vocab.imagePrompt,
          word: vocab.word
        })
      });

      const data = await response.json();
      if (data.success) {
        // Update vocabulary with image URL (you might want to save this to database)
        setCurrentVocab(prev => prev ? { ...prev, imageUrl: data.imageUrl } : null);
      }
    } catch (error) {
      console.error('Error generating image:', error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 flex items-center justify-center">
        <div className="text-center">
          <Loader className="w-12 h-12 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Đang tải từ vựng...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            🧠 Học từ vựng thông minh
          </h1>
          <p className="text-gray-600">
            Hệ thống học từ vựng với thuật toán Spaced Repetition
          </p>
        </div>

        {/* Stats Dashboard */}
        <div className="grid md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-2xl p-6 shadow-lg">
            <div className="flex items-center justify-between mb-2">
              <BookOpen className="w-8 h-8 text-blue-600" />
              <span className="text-2xl font-bold text-blue-600">{stats.total}</span>
            </div>
            <p className="text-gray-600 font-medium">Tổng từ vựng</p>
          </div>

          <div className="bg-white rounded-2xl p-6 shadow-lg">
            <div className="flex items-center justify-between mb-2">
              <CheckCircle className="w-8 h-8 text-green-600" />
              <span className="text-2xl font-bold text-green-600">{stats.learned}</span>
            </div>
            <p className="text-gray-600 font-medium">Đã học thuộc</p>
          </div>

          <div className="bg-white rounded-2xl p-6 shadow-lg">
            <div className="flex items-center justify-between mb-2">
              <Clock className="w-8 h-8 text-orange-600" />
              <span className="text-2xl font-bold text-orange-600">{stats.due}</span>
            </div>
            <p className="text-gray-600 font-medium">Cần ôn tập</p>
          </div>

          <div className="bg-white rounded-2xl p-6 shadow-lg">
            <div className="flex items-center justify-between mb-2">
              <TrendingUp className="w-8 h-8 text-purple-600" />
              <span className="text-2xl font-bold text-purple-600">
                {Math.round(stats.avgSuccessRate * 100)}%
              </span>
            </div>
            <p className="text-gray-600 font-medium">Tỷ lệ đúng</p>
          </div>
        </div>

        {/* Review Mode */}
        {reviewMode && currentVocab ? (
          <div className="bg-white rounded-3xl shadow-xl p-8 mb-8">
            <div className="flex justify-between items-center mb-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                  <Brain className="w-6 h-6 text-blue-600" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-gray-900">Ôn tập từ vựng</h2>
                  <p className="text-gray-600">
                    {currentIndex + 1} / {dueVocabularies.length}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setReviewMode(false)}
                className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition"
              >
                Thoát
              </button>
            </div>

            {/* Progress Bar */}
            <div className="w-full bg-gray-200 rounded-full h-2 mb-8">
              <div
                className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                style={{
                  width: `${((currentIndex + 1) / dueVocabularies.length) * 100}%`
                }}
              />
            </div>

            {/* Vocabulary Card */}
            <div className="text-center mb-8">
              <div className="mb-6">
                <h3 className="text-4xl font-bold text-gray-900 mb-2">
                  {currentVocab.word}
                </h3>
                <button
                  onClick={() => speakWord(currentVocab.word)}
                  className="p-3 bg-blue-100 text-blue-600 rounded-full hover:bg-blue-200 transition"
                >
                  <Volume2 className="w-6 h-6" />
                </button>
              </div>

              {/* Image */}
              <div className="mb-6">
                {currentVocab.imageUrl ? (
                  <img
                    src={currentVocab.imageUrl}
                    alt={currentVocab.word}
                    className="w-64 h-48 object-cover rounded-xl mx-auto"
                  />
                ) : (
                  <div className="w-64 h-48 bg-gray-100 rounded-xl mx-auto flex items-center justify-center">
                    <button
                      onClick={() => generateImage(currentVocab)}
                      className="flex items-center gap-2 text-gray-500 hover:text-blue-600 transition"
                    >
                      <ImageIcon className="w-8 h-8" />
                      <span>Tạo hình ảnh</span>
                    </button>
                  </div>
                )}
              </div>

              {!showAnswer ? (
                <button
                  onClick={() => setShowAnswer(true)}
                  className="px-8 py-4 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 transition"
                >
                  Hiển thị đáp án
                </button>
              ) : (
                <div className="space-y-4">
                  <div className="bg-gray-50 rounded-xl p-6">
                    <p className="text-xl font-semibold text-gray-900 mb-2">
                      {currentVocab.meaning}
                    </p>
                    <p className="text-gray-600 mb-4">
                      <span className="font-medium">Loại từ:</span> {currentVocab.type}
                    </p>
                    <div className="text-left">
                      <p className="font-medium text-gray-700 mb-1">Ví dụ:</p>
                      <p className="text-gray-800 italic mb-2">"{currentVocab.example}"</p>
                      <p className="text-gray-600 text-sm">"{currentVocab.exampleTranslation}"</p>
                    </div>
                  </div>

                  {/* Quality Buttons */}
                  <div className="flex justify-center gap-3">
                    <button
                      onClick={() => submitReview(1)}
                      className="px-6 py-3 bg-red-500 text-white rounded-xl hover:bg-red-600 transition flex items-center gap-2"
                    >
                      <XCircle className="w-5 h-5" />
                      Khó
                    </button>
                    <button
                      onClick={() => submitReview(3)}
                      className="px-6 py-3 bg-yellow-500 text-white rounded-xl hover:bg-yellow-600 transition flex items-center gap-2"
                    >
                      <RotateCcw className="w-5 h-5" />
                      Bình thường
                    </button>
                    <button
                      onClick={() => submitReview(5)}
                      className="px-6 py-3 bg-green-500 text-white rounded-xl hover:bg-green-600 transition flex items-center gap-2"
                    >
                      <CheckCircle className="w-5 h-5" />
                      Dễ
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Session Stats */}
            <div className="flex justify-center gap-6 text-sm text-gray-600">
              <span>Đã ôn: {sessionStats.reviewed}</span>
              <span className="text-green-600">Đúng: {sessionStats.correct}</span>
              <span className="text-red-600">Sai: {sessionStats.incorrect}</span>
            </div>
          </div>
        ) : (
          /* Main Dashboard */
          <div className="space-y-8">
            {/* Quick Actions */}
            <div className="bg-white rounded-3xl shadow-xl p-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">Bắt đầu học</h2>
              <div className="grid md:grid-cols-2 gap-6">
                <button
                  onClick={startReviewSession}
                  disabled={stats.due === 0}
                  className="p-6 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-2xl hover:shadow-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <div className="flex items-center justify-between mb-4">
                    <Target className="w-8 h-8" />
                    <span className="text-2xl font-bold">{stats.due}</span>
                  </div>
                  <h3 className="text-xl font-bold mb-2">Ôn tập từ vựng</h3>
                  <p className="opacity-90">
                    {stats.due > 0 
                      ? `${stats.due} từ cần ôn tập hôm nay`
                      : 'Không có từ nào cần ôn tập'
                    }
                  </p>
                </button>

                <div className="p-6 bg-gradient-to-r from-green-500 to-teal-600 text-white rounded-2xl">
                  <div className="flex items-center justify-between mb-4">
                    <Star className="w-8 h-8" />
                    <span className="text-2xl font-bold">{stats.learned}</span>
                  </div>
                  <h3 className="text-xl font-bold mb-2">Từ đã học thuộc</h3>
                  <p className="opacity-90">
                    Bạn đã học thuộc {stats.learned} từ vựng
                  </p>
                </div>
              </div>
            </div>

            {/* Recent Vocabularies */}
            <div className="bg-white rounded-3xl shadow-xl p-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">Từ vựng gần đây</h2>
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                {vocabularies.slice(0, 6).map((vocab) => (
                  <div
                    key={vocab._id}
                    className="p-4 border border-gray-200 rounded-xl hover:border-blue-300 transition"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="font-bold text-gray-900">{vocab.word}</h3>
                      <button
                        onClick={() => speakWord(vocab.word)}
                        className="p-1 text-blue-600 hover:bg-blue-50 rounded"
                      >
                        <Volume2 className="w-4 h-4" />
                      </button>
                    </div>
                    <p className="text-gray-600 text-sm mb-2">{vocab.meaning}</p>
                    <div className="flex items-center justify-between text-xs text-gray-500">
                      <span className={`px-2 py-1 rounded-full ${
                        vocab.level === 'beginner' ? 'bg-green-100 text-green-700' :
                        vocab.level === 'intermediate' ? 'bg-yellow-100 text-yellow-700' :
                        'bg-red-100 text-red-700'
                      }`}>
                        {vocab.level}
                      </span>
                      <span>
                        {vocab.timesReviewed > 0 
                          ? `${Math.round((vocab.timesCorrect / vocab.timesReviewed) * 100)}% đúng`
                          : 'Chưa ôn'
                        }
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}