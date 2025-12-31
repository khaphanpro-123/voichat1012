"use client";
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import EnhancedFlashCard from "./EnhancedFlashCard";
import {
  BookOpen,
  Clock,
  TrendingUp,
  RotateCcw,
  CheckCircle,
  Target,
  Brain,
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
  imageUrl?: string;
  imagePrompt?: string;
  
  // SRS data
  timesReviewed: number;
  timesCorrect: number;
  timesIncorrect: number;
  isLearned: boolean;
  nextReviewDate: string;
}

interface StudyStats {
  total: number;
  studied: number;
  correct: number;
  incorrect: number;
  streak: number;
}

export default function FlashCardStudy() {
  const [vocabularies, setVocabularies] = useState<VocabularyItem[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [studyMode, setStudyMode] = useState(false);
  const [stats, setStats] = useState<StudyStats>({
    total: 0,
    studied: 0,
    correct: 0,
    incorrect: 0,
    streak: 0
  });

  useEffect(() => {
    fetchDueVocabularies();
  }, []);

  const fetchDueVocabularies = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/vocabulary-review?userId=anonymous&limit=50&includeNew=true');
      const data = await response.json();
      
      if (data.success && data.vocabularies.length > 0) {
        setVocabularies(data.vocabularies);
        setStats(prev => ({ ...prev, total: data.vocabularies.length }));
      }
    } catch (error) {
      console.error('Error fetching vocabularies:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleNext = () => {
    if (currentIndex < vocabularies.length - 1) {
      setCurrentIndex(currentIndex + 1);
    } else {
      // End of study session
      setStudyMode(false);
      setCurrentIndex(0);
    }
  };

  const handlePrevious = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
    }
  };

  const handleRate = async (rating: number) => {
    const currentVocab = vocabularies[currentIndex];
    if (!currentVocab) return;

    try {
      const response = await fetch('/api/vocabulary-review', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          vocabularyId: currentVocab._id,
          quality: rating,
          userId: 'anonymous'
        })
      });

      if (response.ok) {
        // Update stats
        setStats(prev => ({
          ...prev,
          studied: prev.studied + 1,
          correct: rating >= 3 ? prev.correct + 1 : prev.correct,
          incorrect: rating < 3 ? prev.incorrect + 1 : prev.incorrect,
          streak: rating >= 3 ? prev.streak + 1 : 0
        }));

        // Move to next card after a short delay
        setTimeout(() => {
          handleNext();
        }, 1000);
      }
    } catch (error) {
      console.error('Error submitting review:', error);
    }
  };

  const startStudySession = () => {
    setStudyMode(true);
    setCurrentIndex(0);
    setStats(prev => ({
      ...prev,
      studied: 0,
      correct: 0,
      incorrect: 0,
      streak: 0
    }));
  };

  const resetSession = () => {
    setStudyMode(false);
    setCurrentIndex(0);
    setStats(prev => ({
      ...prev,
      studied: 0,
      correct: 0,
      incorrect: 0,
      streak: 0
    }));
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Đang tải flashcards...</p>
        </div>
      </div>
    );
  }

  if (vocabularies.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 flex items-center justify-center">
        <div className="text-center bg-white rounded-3xl shadow-xl p-12 max-w-md">
          <BookOpen className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-4">
            Không có từ vựng nào cần ôn
          </h2>
          <p className="text-gray-600 mb-6">
            Hãy upload tài liệu và trích xuất từ vựng để bắt đầu học!
          </p>
          <a
            href="/dashboard-new/documents"
            className="px-6 py-3 bg-blue-500 text-white rounded-xl hover:bg-blue-600 transition font-medium"
          >
            Tải lên tài liệu
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            🃏 Flashcard Study
          </h1>
          <p className="text-gray-600">
            Học từ vựng với flashcard tương tác và hình ảnh minh họa
          </p>
        </div>

        {!studyMode ? (
          /* Study Dashboard */
          <div className="space-y-8">
            {/* Stats */}
            <div className="grid md:grid-cols-4 gap-6">
              <div className="bg-white rounded-2xl p-6 shadow-lg text-center">
                <BookOpen className="w-8 h-8 text-blue-600 mx-auto mb-2" />
                <div className="text-2xl font-bold text-blue-600">{vocabularies.length}</div>
                <div className="text-gray-600 text-sm">Từ cần ôn</div>
              </div>
              
              <div className="bg-white rounded-2xl p-6 shadow-lg text-center">
                <Target className="w-8 h-8 text-green-600 mx-auto mb-2" />
                <div className="text-2xl font-bold text-green-600">{stats.studied}</div>
                <div className="text-gray-600 text-sm">Đã học</div>
              </div>
              
              <div className="bg-white rounded-2xl p-6 shadow-lg text-center">
                <TrendingUp className="w-8 h-8 text-purple-600 mx-auto mb-2" />
                <div className="text-2xl font-bold text-purple-600">
                  {stats.studied > 0 ? Math.round((stats.correct / stats.studied) * 100) : 0}%
                </div>
                <div className="text-gray-600 text-sm">Tỷ lệ đúng</div>
              </div>
              
              <div className="bg-white rounded-2xl p-6 shadow-lg text-center">
                <Brain className="w-8 h-8 text-orange-600 mx-auto mb-2" />
                <div className="text-2xl font-bold text-orange-600">{stats.streak}</div>
                <div className="text-gray-600 text-sm">Streak</div>
              </div>
            </div>

            {/* Start Button */}
            <div className="text-center">
              <button
                onClick={startStudySession}
                className="px-12 py-6 bg-gradient-to-r from-blue-500 to-purple-600 text-white text-xl font-bold rounded-3xl hover:shadow-2xl transition-all transform hover:scale-105"
              >
                🚀 Bắt đầu học với Flashcard
              </button>
            </div>

            {/* Preview */}
            <div className="bg-white rounded-3xl shadow-xl p-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-6 text-center">
                Preview Flashcard
              </h2>
              <div className="max-w-md mx-auto">
                <EnhancedFlashCard
                  vocabulary={vocabularies[0]}
                  showControls={false}
                />
              </div>
            </div>
          </div>
        ) : (
          /* Study Mode */
          <div className="space-y-6">
            {/* Progress Bar */}
            <div className="bg-white rounded-2xl shadow-lg p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-4">
                  <button
                    onClick={resetSession}
                    className="p-2 bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 transition"
                  >
                    <RotateCcw className="w-5 h-5" />
                  </button>
                  <div>
                    <h2 className="text-xl font-bold text-gray-900">
                      Flashcard {currentIndex + 1} / {vocabularies.length}
                    </h2>
                    <p className="text-gray-600">
                      {stats.studied} đã học • {stats.correct} đúng • {stats.incorrect} sai
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold text-blue-600">
                    {stats.streak}
                  </div>
                  <div className="text-sm text-gray-600">streak</div>
                </div>
              </div>
              
              <div className="w-full bg-gray-200 rounded-full h-3">
                <div
                  className="bg-gradient-to-r from-blue-500 to-purple-600 h-3 rounded-full transition-all duration-300"
                  style={{
                    width: `${((currentIndex + 1) / vocabularies.length) * 100}%`
                  }}
                />
              </div>
            </div>

            {/* Flashcard */}
            <AnimatePresence mode="wait">
              <motion.div
                key={currentIndex}
                initial={{ opacity: 0, x: 100 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -100 }}
                transition={{ duration: 0.3 }}
              >
                <EnhancedFlashCard
                  vocabulary={vocabularies[currentIndex]}
                  onNext={handleNext}
                  onPrevious={currentIndex > 0 ? handlePrevious : undefined}
                  onRate={handleRate}
                  showControls={true}
                />
              </motion.div>
            </AnimatePresence>

            {/* Session Complete */}
            {currentIndex >= vocabularies.length && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-white rounded-3xl shadow-xl p-12 text-center"
              >
                <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-6" />
                <h2 className="text-3xl font-bold text-gray-900 mb-4">
                  🎉 Hoàn thành phiên học!
                </h2>
                <div className="grid md:grid-cols-3 gap-6 mb-8">
                  <div>
                    <div className="text-2xl font-bold text-blue-600">{stats.studied}</div>
                    <div className="text-gray-600">Từ đã học</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-green-600">{stats.correct}</div>
                    <div className="text-gray-600">Trả lời đúng</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-purple-600">
                      {Math.round((stats.correct / stats.studied) * 100)}%
                    </div>
                    <div className="text-gray-600">Tỷ lệ chính xác</div>
                  </div>
                </div>
                <div className="flex gap-4 justify-center">
                  <button
                    onClick={resetSession}
                    className="px-6 py-3 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 transition font-medium"
                  >
                    Về dashboard
                  </button>
                  <button
                    onClick={() => {
                      setCurrentIndex(0);
                      setStats(prev => ({ ...prev, studied: 0, correct: 0, incorrect: 0, streak: 0 }));
                    }}
                    className="px-6 py-3 bg-blue-500 text-white rounded-xl hover:bg-blue-600 transition font-medium"
                  >
                    Học lại
                  </button>
                </div>
              </motion.div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}