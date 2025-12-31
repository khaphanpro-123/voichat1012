"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { motion } from "framer-motion";
import {
  BookOpen,
  Search,
  Volume2,
  Upload,
  RefreshCw,
  Filter,
  Play,
  CheckCircle,
  XCircle,
  Trophy,
  Zap,
  Trash2,
} from "lucide-react";

interface VocabularyWord {
  _id: string;
  word: string;
  meaning: string;
  vietnamese?: string; // Some data may have this instead of meaning
  example: string;
  exampleTranslation?: string;
  exampleEn?: string;
  exampleVi?: string;
  type: string;
  partOfSpeech?: string;
  level: string;
  timesReviewed: number;
  isLearned: boolean;
}

interface QuizQuestion {
  word: VocabularyWord;
  options: string[];
  correctAnswer: string;
}

const WORD_TYPES = [
  { key: "all", label: "Tất cả" },
  { key: "noun", label: "Danh từ" },
  { key: "verb", label: "Động từ" },
  { key: "adjective", label: "Tính từ" },
  { key: "adverb", label: "Trạng từ" },
  { key: "preposition", label: "Giới từ" },
  { key: "conjunction", label: "Liên từ" },
  { key: "pronoun", label: "Đại từ" },
  { key: "other", label: "Khác" },
];

export default function VocabularyPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [vocabulary, setVocabulary] = useState<VocabularyWord[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedType, setSelectedType] = useState("all");
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Quiz state
  const [quizMode, setQuizMode] = useState(false);
  const [quizQuestions, setQuizQuestions] = useState<QuizQuestion[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [quizScore, setQuizScore] = useState(0);
  const [quizComplete, setQuizComplete] = useState(false);
  const [showResult, setShowResult] = useState(false);

  const userId = (session?.user as any)?.id;

  // Helper to get meaning from word (handles both meaning and vietnamese fields)
  const getMeaning = (word: VocabularyWord): string => {
    return word.meaning || word.vietnamese || "";
  };

  // Helper to get example
  const getExample = (word: VocabularyWord): string => {
    return word.example || word.exampleEn || "";
  };

  // Helper to get example translation
  const getExampleTranslation = (word: VocabularyWord): string => {
    return word.exampleTranslation || word.exampleVi || "";
  };

  // Helper to get word type - prioritize partOfSpeech over type
  const getWordType = (word: VocabularyWord): string => {
    return word.partOfSpeech || word.type || "other";
  };

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/auth/login");
    }
  }, [status, router]);

  const loadVocabulary = async () => {
    if (!userId) return;
    setLoading(true);

    try {
      const res = await fetch(`/api/generate-flashcard?userId=${userId}`);
      const data = await res.json();
      if (data.success) {
        setVocabulary(data.vocabulary || []);
      }
    } catch (error) {
      console.error("Load vocabulary error:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (userId) {
      loadVocabulary();
    }
  }, [userId]);

  // Normalize word type for filtering
  const normalizeType = (type: string): string => {
    const t = type?.toLowerCase() || "";
    // Check adverb BEFORE verb (because "adverb" contains "verb")
    if (t.includes("adverb") || t === "adv") return "adverb";
    if (t.includes("adjective") || t.includes("adj") || t === "a") return "adjective";
    if (t.includes("noun") || t === "n") return "noun";
    if (t.includes("verb") || t === "v") return "verb";
    if (t.includes("prep")) return "preposition";
    if (t.includes("conj")) return "conjunction";
    if (t.includes("pron")) return "pronoun";
    if (t.includes("interrog") || t.includes("question")) return "other"; // how, what, etc.
    return "other";
  };

  // Group vocabulary by type
  const groupedVocabulary = vocabulary.reduce((acc, word) => {
    const type = normalizeType(getWordType(word));
    if (!acc[type]) acc[type] = [];
    acc[type].push(word);
    return acc;
  }, {} as Record<string, VocabularyWord[]>);

  // Filter vocabulary
  const filteredVocabulary = vocabulary.filter((word) => {
    const meaning = getMeaning(word);
    const matchesSearch =
      word.word.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (meaning && meaning.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesType =
      selectedType === "all" || normalizeType(getWordType(word)) === selectedType;
    return matchesSearch && matchesType;
  });

  const speakWord = (word: string) => {
    const utterance = new SpeechSynthesisUtterance(word);
    utterance.lang = "en-US";
    utterance.rate = 0.8;
    speechSynthesis.speak(utterance);
  };

  // Delete vocabulary word
  const deleteWord = async (wordId: string) => {
    if (!confirm("Bạn có chắc muốn xóa từ này?")) return;
    
    setDeletingId(wordId);
    try {
      const res = await fetch("/api/generate-flashcard", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ wordId, userId }),
      });
      const data = await res.json();
      if (data.success) {
        setVocabulary((prev) => prev.filter((w) => w._id !== wordId));
      } else {
        alert("Không thể xóa từ vựng");
      }
    } catch (error) {
      console.error("Delete error:", error);
      alert("Lỗi khi xóa từ vựng");
    } finally {
      setDeletingId(null);
    }
  };

  // Quiz functions - pick 15-20 random questions from each word type
  const startQuiz = () => {
    // Filter words that have valid meaning
    const validWords = vocabulary.filter(
      (w) => getMeaning(w) && getMeaning(w).trim().length > 0
    );

    if (validWords.length < 4) {
      alert("Cần ít nhất 4 từ vựng có nghĩa để bắt đầu quiz!");
      return;
    }

    // Group valid words by type
    const wordsByType: Record<string, VocabularyWord[]> = {};
    validWords.forEach((word) => {
      const type = normalizeType(getWordType(word));
      if (!wordsByType[type]) wordsByType[type] = [];
      wordsByType[type].push(word);
    });

    // Collect questions from each type (proportionally)
    let selectedWords: VocabularyWord[] = [];
    const maxQuestions = 20;
    const minQuestions = 15;
    
    // If filtering by type, only use that type
    if (selectedType !== "all") {
      const typeWords = wordsByType[selectedType] || [];
      selectedWords = [...typeWords].sort(() => Math.random() - 0.5);
    } else {
      // Mix from all types proportionally
      const types = Object.keys(wordsByType);
      const questionsPerType = Math.max(2, Math.floor(maxQuestions / types.length));
      
      types.forEach((type) => {
        const typeWords = wordsByType[type];
        const shuffled = [...typeWords].sort(() => Math.random() - 0.5);
        selectedWords.push(...shuffled.slice(0, questionsPerType));
      });
      
      // Shuffle all selected words
      selectedWords = selectedWords.sort(() => Math.random() - 0.5);
    }

    // Limit to 15-20 questions
    const questionCount = Math.min(Math.max(selectedWords.length, minQuestions), maxQuestions);
    selectedWords = selectedWords.slice(0, questionCount);

    if (selectedWords.length < 4) {
      alert("Không đủ từ vựng để tạo quiz. Cần ít nhất 4 từ!");
      return;
    }
    
    const questions: QuizQuestion[] = selectedWords.map((word) => {
      // Get other words with valid meanings for wrong options
      const otherWords = validWords
        .filter((w) => w._id !== word._id && getMeaning(w) && getMeaning(w).trim().length > 0)
        .sort(() => Math.random() - 0.5)
        .slice(0, 3);

      // Create options array with the correct answer and 3 wrong answers
      const correctMeaning = getMeaning(word);
      const allOptions = [
        correctMeaning,
        ...otherWords.map((w) => getMeaning(w)),
      ].filter((opt) => opt && opt.trim().length > 0);

      // Shuffle options
      const options = allOptions.sort(() => Math.random() - 0.5);

      return {
        word,
        options,
        correctAnswer: correctMeaning,
      };
    });

    setQuizQuestions(questions);
    setCurrentQuestionIndex(0);
    setQuizScore(0);
    setQuizComplete(false);
    setSelectedAnswer(null);
    setShowResult(false);
    setQuizMode(true);
  };

  const handleAnswer = (answer: string) => {
    if (showResult) return;

    setSelectedAnswer(answer);
    setShowResult(true);

    if (answer === quizQuestions[currentQuestionIndex].correctAnswer) {
      setQuizScore((prev) => prev + 1);
    }

    setTimeout(() => {
      if (currentQuestionIndex < quizQuestions.length - 1) {
        setCurrentQuestionIndex((prev) => prev + 1);
        setSelectedAnswer(null);
        setShowResult(false);
      } else {
        setQuizComplete(true);
      }
    }, 1500);
  };

  const exitQuiz = () => {
    setQuizMode(false);
    setQuizQuestions([]);
    setCurrentQuestionIndex(0);
    setQuizScore(0);
    setQuizComplete(false);
  };

  if (status === "loading" || loading) {
    return (
      <DashboardLayout>
        <div className="p-6 flex items-center justify-center min-h-[50vh]">
          <div className="animate-spin w-8 h-8 border-4 border-teal-500 border-t-transparent rounded-full"></div>
        </div>
      </DashboardLayout>
    );
  }

  // Quiz Mode UI
  if (quizMode) {
    return (
      <DashboardLayout>
        <div className="p-6 md:p-8 max-w-3xl mx-auto">
          {!quizComplete ? (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white rounded-3xl shadow-xl p-8"
            >
              {/* Quiz Header */}
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <Zap className="w-6 h-6 text-yellow-500" />
                  <span className="font-bold text-gray-700">
                    Câu {currentQuestionIndex + 1}/{quizQuestions.length}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Trophy className="w-5 h-5 text-teal-500" />
                  <span className="font-bold text-teal-600">{quizScore} điểm</span>
                </div>
              </div>

              {/* Progress Bar */}
              <div className="w-full bg-gray-200 rounded-full h-2 mb-8">
                <div
                  className="bg-teal-500 h-2 rounded-full transition-all"
                  style={{
                    width: `${((currentQuestionIndex + 1) / quizQuestions.length) * 100}%`,
                  }}
                />
              </div>

              {/* Question */}
              <div className="text-center mb-8">
                <p className="text-gray-500 mb-2">Nghĩa của từ này là gì?</p>
                <div className="flex items-center justify-center gap-3">
                  <h2 className="text-4xl font-bold text-gray-900">
                    {quizQuestions[currentQuestionIndex]?.word.word}
                  </h2>
                  <button
                    onClick={() =>
                      speakWord(quizQuestions[currentQuestionIndex]?.word.word)
                    }
                    className="p-2 bg-teal-100 text-teal-600 rounded-full hover:bg-teal-200"
                  >
                    <Volume2 className="w-5 h-5" />
                  </button>
                </div>
                <p className="text-sm text-gray-400 mt-2">
                  ({getWordType(quizQuestions[currentQuestionIndex]?.word)})
                </p>
              </div>

              {/* Options */}
              <div className="grid gap-3">
                {quizQuestions[currentQuestionIndex]?.options.map((option, idx) => {
                  const isCorrect =
                    option === quizQuestions[currentQuestionIndex].correctAnswer;
                  const isSelected = selectedAnswer === option;

                  return (
                    <button
                      key={idx}
                      onClick={() => handleAnswer(option)}
                      disabled={showResult}
                      className={`w-full p-4 rounded-xl text-left font-medium transition ${
                        showResult
                          ? isCorrect
                            ? "bg-green-100 border-2 border-green-500 text-green-700"
                            : isSelected
                            ? "bg-red-100 border-2 border-red-500 text-red-700"
                            : "bg-gray-100 text-gray-500"
                          : "bg-gray-100 hover:bg-teal-50 hover:border-teal-300 border-2 border-transparent"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span>{option}</span>
                        {showResult && isCorrect && (
                          <CheckCircle className="w-5 h-5 text-green-500" />
                        )}
                        {showResult && isSelected && !isCorrect && (
                          <XCircle className="w-5 h-5 text-red-500" />
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Exit Button */}
              <button
                onClick={exitQuiz}
                className="mt-6 w-full py-3 text-gray-500 hover:text-gray-700"
              >
                Thoát Quiz
              </button>
            </motion.div>
          ) : (
            /* Quiz Complete */
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-white rounded-3xl shadow-xl p-8 text-center"
            >
              <Trophy className="w-20 h-20 text-yellow-500 mx-auto mb-4" />
              <h2 className="text-3xl font-bold text-gray-900 mb-2">
                Hoàn thành Quiz!
              </h2>
              <p className="text-xl text-gray-600 mb-6">
                Bạn đạt{" "}
                <span className="font-bold text-teal-600">
                  {quizScore}/{quizQuestions.length}
                </span>{" "}
                điểm
              </p>

              <div className="text-6xl mb-6">
                {quizScore === quizQuestions.length
                  ? "🎉"
                  : quizScore >= quizQuestions.length * 0.7
                  ? "👏"
                  : quizScore >= quizQuestions.length * 0.5
                  ? "💪"
                  : "📚"}
              </div>

              <p className="text-gray-500 mb-8">
                {quizScore === quizQuestions.length
                  ? "Xuất sắc! Bạn đã thuộc hết từ vựng!"
                  : quizScore >= quizQuestions.length * 0.7
                  ? "Tốt lắm! Tiếp tục ôn tập nhé!"
                  : "Cố gắng ôn tập thêm nhé!"}
              </p>

              <div className="flex gap-4 justify-center">
                <button
                  onClick={exitQuiz}
                  className="px-6 py-3 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200"
                >
                  Quay lại
                </button>
                <button
                  onClick={startQuiz}
                  className="px-6 py-3 bg-teal-600 text-white rounded-xl hover:bg-teal-700"
                >
                  Chơi lại
                </button>
              </div>
            </motion.div>
          )}
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="p-6 md:p-8 max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
              <BookOpen className="w-8 h-8 text-teal-600" />
              Từ vựng của tôi
            </h1>
            <p className="text-gray-600 mt-1">{vocabulary.length} từ đã học</p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={loadVocabulary}
              className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 transition"
            >
              <RefreshCw className="w-5 h-5" />
              Làm mới
            </button>
            <button
              onClick={() => router.push("/dashboard-new/documents")}
              className="flex items-center gap-2 px-4 py-2 bg-teal-600 text-white rounded-xl hover:bg-teal-700 transition"
            >
              <Upload className="w-5 h-5" />
              Upload tài liệu
            </button>
          </div>
        </div>

        {/* Quiz Button */}
        {vocabulary.length >= 4 && (
          <motion.button
            onClick={startQuiz}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="w-full mb-6 p-4 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-2xl shadow-lg hover:shadow-xl transition flex items-center justify-center gap-3"
          >
            <Play className="w-6 h-6" />
            <span className="text-lg font-bold">
              Bắt đầu Quiz (15-20 câu ngẫu nhiên)
            </span>
            <Zap className="w-6 h-6" />
          </motion.button>
        )}

        {/* Type Filter Tabs */}
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-3">
            <Filter className="w-5 h-5 text-gray-500" />
            <span className="font-medium text-gray-700">Lọc theo loại từ:</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {WORD_TYPES.map((type) => {
              const count =
                type.key === "all"
                  ? vocabulary.length
                  : groupedVocabulary[type.key]?.length || 0;

              return (
                <button
                  key={type.key}
                  onClick={() => setSelectedType(type.key)}
                  className={`px-4 py-2 rounded-xl font-medium transition flex items-center gap-2 ${
                    selectedType === type.key
                      ? "bg-teal-500 text-white shadow-md"
                      : "bg-white text-gray-700 hover:bg-gray-100 border border-gray-200"
                  }`}
                >
                  <span>{type.label}</span>
                  <span
                    className={`text-xs px-2 py-0.5 rounded-full ${
                      selectedType === type.key
                        ? "bg-white/20"
                        : "bg-gray-100"
                    }`}
                  >
                    {count}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Search */}
        <div className="relative mb-6">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Tìm kiếm từ vựng..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-12 pr-4 py-3 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-teal-500 focus:border-transparent"
          />
        </div>

        {/* Vocabulary List */}
        {filteredVocabulary.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-2xl shadow-md">
            <BookOpen className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-700 mb-2">
              {vocabulary.length === 0 ? "Chưa có từ vựng nào" : "Không tìm thấy"}
            </h3>
            <p className="text-gray-500 mb-4">
              {vocabulary.length === 0
                ? "Upload tài liệu để trích xuất từ vựng tự động"
                : "Thử tìm kiếm với từ khóa khác hoặc đổi bộ lọc"}
            </p>
            {vocabulary.length === 0 && (
              <button
                onClick={() => router.push("/dashboard-new/documents")}
                className="px-6 py-3 bg-teal-600 text-white rounded-xl hover:bg-teal-700 transition inline-flex items-center gap-2"
              >
                <Upload className="w-5 h-5" />
                Upload tài liệu ngay
              </button>
            )}
          </div>
        ) : (
          <div className="grid gap-4">
            {filteredVocabulary.map((word) => (
              <motion.div
                key={word._id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white rounded-2xl p-5 shadow-md hover:shadow-lg transition"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-xl font-bold text-gray-900">
                        {word.word}
                      </h3>
                      <button
                        onClick={() => speakWord(word.word)}
                        className="p-1.5 bg-teal-100 text-teal-600 rounded-lg hover:bg-teal-200 transition"
                      >
                        <Volume2 className="w-4 h-4" />
                      </button>
                      <span className="text-xs px-2 py-1 bg-blue-100 text-blue-600 rounded-full font-medium">
                        {getWordType(word)}
                      </span>
                      <span
                        className={`text-xs px-2 py-1 rounded-full ${
                          word.level === "beginner"
                            ? "bg-green-100 text-green-600"
                            : word.level === "intermediate"
                            ? "bg-yellow-100 text-yellow-600"
                            : "bg-red-100 text-red-600"
                        }`}
                      >
                        {word.level}
                      </span>
                    </div>
                    <p className="text-lg text-teal-600 font-medium mb-2">
                      {getMeaning(word)}
                    </p>
                    {getExample(word) && (
                      <div className="text-gray-600 text-sm">
                        <p className="italic">&quot;{getExample(word)}&quot;</p>
                        {getExampleTranslation(word) && (
                          <p className="text-gray-500 mt-1">
                            {getExampleTranslation(word)}
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                  <div className="text-right flex flex-col items-end gap-2">
                    <button
                      onClick={() => deleteWord(word._id)}
                      disabled={deletingId === word._id}
                      className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition disabled:opacity-50"
                      title="Xóa từ vựng"
                    >
                      {deletingId === word._id ? (
                        <RefreshCw className="w-4 h-4 animate-spin" />
                      ) : (
                        <Trash2 className="w-4 h-4" />
                      )}
                    </button>
                    <p className="text-xs text-gray-400">
                      Đã ôn {word.timesReviewed || 0} lần
                    </p>
                    {word.isLearned && (
                      <span className="text-xs text-green-600">✓ Đã thuộc</span>
                    )}
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
