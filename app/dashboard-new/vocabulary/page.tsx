"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import VocabularyQuiz from "@/components/VocabularyQuiz";
import { motion, AnimatePresence } from "framer-motion";
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
  Languages,
  AlertCircle,
  Network,
  X,
} from "lucide-react";

interface VocabularyWord {
  _id: string;
  word: string;
  meaning: string;
  vietnamese?: string;
  example: string;
  exampleTranslation?: string;
  exampleEn?: string;
  exampleVi?: string;
  type: string;
  partOfSpeech?: string;
  level: string;
  timesReviewed: number;
  isLearned: boolean;
  source?: string;
  pronunciation?: string;
  ipa?: string; // IPA from database
}

interface QuizQuestion {
  word: VocabularyWord;
  type: "multiple_choice" | "fill_blank" | "word_order";
  question: string;
  options?: string[];
  correctAnswer: string;
  blankedSentence?: string;
  words?: string[];
}

type TabType = "vocabulary" | "structures" | "errors";

const WORD_TYPES = [
  { key: "all", label: "Tất cả" },
  { key: "noun", label: "Danh từ" },
  { key: "verb", label: "Động từ" },
  { key: "adjective", label: "Tính từ" },
  { key: "adverb", label: "Trạng từ" },
  { key: "preposition", label: "Giới từ" },
  { key: "other", label: "Khác" },
];

export default function VocabularyPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [vocabulary, setVocabulary] = useState<VocabularyWord[]>([]);
  const [structures, setStructures] = useState<VocabularyWord[]>([]);
  const [errors, setErrors] = useState<VocabularyWord[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedType, setSelectedType] = useState("all");
  const [selectedSource, setSelectedSource] = useState("all"); // New: source filter
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabType>("vocabulary");

  // New word form state
  const [showAddForm, setShowAddForm] = useState(false);
  const [newWord, setNewWord] = useState({
    word: "",
    meaning: "",
    example: "",
    type: "noun",
    level: "intermediate"
  });
  const [saving, setSaving] = useState(false);

  // Quiz state
  const [quizMode, setQuizMode] = useState(false);
  const [quizQuestions, setQuizQuestions] = useState<QuizQuestion[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [quizScore, setQuizScore] = useState(0);
  const [quizComplete, setQuizComplete] = useState(false);
  const [showResult, setShowResult] = useState(false);

  const userId = (session?.user as any)?.id;

  const getMeaning = (word: VocabularyWord): string => word.meaning || word.vietnamese || "";
  const getExample = (word: VocabularyWord): string => word.example || word.exampleEn || "";
  const getExampleTranslation = (word: VocabularyWord): string => word.exampleTranslation || word.exampleVi || "";
  const getWordType = (word: VocabularyWord): string => word.partOfSpeech || word.type || "other";
  
  useEffect(() => {
    if (status === "unauthenticated") router.push("/auth/login");
  }, [status, router]);

  const loadVocabulary = async () => {
    if (!userId) return;
    setLoading(true);

    try {
      // Load from vocabulary API (where documents-simple saves to)
      const res = await fetch(`/api/vocabulary?limit=1000`);
      const data = await res.json();
      
      console.log("📚 Loaded vocabulary:", data.length, "items");
      console.log("📊 Sample items:", data.slice(0, 3)); // Debug: show first 3 items
      
      if (Array.isArray(data)) {
        // Separate vocabulary, structures, and errors based on type or source
        const allWords = data.map((item: any) => ({
          _id: item._id,
          word: item.word,
          meaning: item.meaning,
          example: item.example || "",
          type: item.type || item.partOfSpeech || "other",
          level: item.level || "intermediate",
          timesReviewed: item.timesReviewed || 0,
          isLearned: item.isLearned || false,
          source: item.source || "",
          ipa: item.ipa || "", // Include IPA pronunciation
        }));
        
        setVocabulary(allWords.filter((w: VocabularyWord) => w.type !== "structure" && w.type !== "error"));
        setStructures(allWords.filter((w: VocabularyWord) => w.type === "structure"));
        setErrors(allWords.filter((w: VocabularyWord) => w.type === "error"));
        
        console.log("📊 Vocabulary stats:", {
          total: allWords.length,
          vocabulary: allWords.filter((w: VocabularyWord) => w.type !== "structure" && w.type !== "error").length,
          structures: allWords.filter((w: VocabularyWord) => w.type === "structure").length,
          fromVoiceChat: allWords.filter((w: VocabularyWord) => w.source === "voice_chat").length,
          fromDocument: allWords.filter((w: VocabularyWord) => w.source === "document").length,
        });
      }
    } catch (error) {
      console.error("Load vocabulary error:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (userId) loadVocabulary();
  }, [userId]);

  const normalizeType = (type: string): string => {
    const t = type?.toLowerCase() || "";
    if (t.includes("adverb") || t === "adv") return "adverb";
    if (t.includes("adjective") || t.includes("adj") || t === "a") return "adjective";
    if (t.includes("noun") || t === "n") return "noun";
    if (t.includes("verb") || t === "v") return "verb";
    if (t.includes("prep")) return "preposition";
    return "other";
  };

  const groupedVocabulary = vocabulary.reduce((acc, word) => {
    const type = normalizeType(getWordType(word));
    if (!acc[type]) acc[type] = [];
    acc[type].push(word);
    return acc;
  }, {} as Record<string, VocabularyWord[]>);

  const filteredVocabulary = vocabulary.filter((word) => {
    const meaning = getMeaning(word);
    const matchesSearch = word.word.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (meaning && meaning.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesType = selectedType === "all" || normalizeType(getWordType(word)) === selectedType;
    const matchesSource = selectedSource === "all" || word.source === selectedSource;
    return matchesSearch && matchesType && matchesSource;
  });

  const filteredStructures = structures.filter((s) =>
    s.word.toLowerCase().includes(searchTerm.toLowerCase()) ||
    getMeaning(s).toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredErrors = errors.filter((e) =>
    e.word.toLowerCase().includes(searchTerm.toLowerCase()) ||
    getMeaning(e).toLowerCase().includes(searchTerm.toLowerCase())
  );

  const speakWord = (word: string) => {
    const utterance = new SpeechSynthesisUtterance(word);
    utterance.lang = "en-US";
    utterance.rate = 0.8;
    speechSynthesis.speak(utterance);
  };

  const speakSentence = (sentence: string) => {
    // Cancel any ongoing speech
    speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(sentence);
    utterance.lang = "en-US";
    utterance.rate = 0.85;
    utterance.pitch = 1.0;
    speechSynthesis.speak(utterance);
  };

  const deleteWord = async (wordId: string) => {
    if (!confirm("Bạn có chắc muốn xóa?")) {
      return;
    }
    
    setDeletingId(wordId);
    
    try {
      const res = await fetch(`/api/vocabulary?id=${wordId}`, {
        method: "DELETE",
      });
      
      if (res.ok) {
        setVocabulary((prev) => prev.filter((w) => w._id !== wordId));
        setStructures((prev) => prev.filter((w) => w._id !== wordId));
        setErrors((prev) => prev.filter((w) => w._id !== wordId));
      }
    } catch (error) {
      console.error("Delete error:", error);
    } finally {
      setDeletingId(null);
    }
  };

  const handleAddWord = async () => {
    if (!newWord.word || !newWord.meaning) {
      alert("Vui lòng nhập từ và nghĩa");
      return;
    }

    setSaving(true);
    try {
      const res = await fetch("/api/vocabulary", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          word: newWord.word,
          meaning: newWord.meaning,
          example: newWord.example,
          type: newWord.type,
          level: newWord.level,
          source: "manual",
        }),
      });

      if (res.ok) {
        const data = await res.json();
        console.log("✅ Word saved:", data);
        
        // Reset form
        setNewWord({
          word: "",
          meaning: "",
          example: "",
          type: "noun",
          level: "intermediate"
        });
        setShowAddForm(false);
        
        // Reload vocabulary
        await loadVocabulary();
      } else {
        const error = await res.json();
        alert(`Lỗi: ${error.error || "Không thể lưu từ"}`);
      }
    } catch (error) {
      console.error("Save error:", error);
      alert("Lỗi khi lưu từ vựng");
    } finally {
      setSaving(false);
    }
  };

  // Quiz functions - Enhanced with multiple question types
  const startQuiz = () => {
    const validWords = vocabulary.filter((w) => getMeaning(w)?.trim().length > 0 && getExample(w)?.trim().length > 0);
    if (validWords.length < 4) {
      alert("Cần ít nhất 4 từ vựng có câu ví dụ để bắt đầu quiz!");
      return;
    }

    let selectedWords = [...validWords].sort(() => Math.random() - 0.5);
    if (selectedType !== "all") {
      selectedWords = selectedWords.filter((w) => normalizeType(getWordType(w)) === selectedType);
    }
    selectedWords = selectedWords.slice(0, 15);

    if (selectedWords.length < 4) {
      alert("Không đủ từ vựng để tạo quiz!");
      return;
    }

    const questions: QuizQuestion[] = [];
    
    selectedWords.forEach((word, index) => {
      const questionTypes: Array<"multiple_choice" | "fill_blank" | "word_order"> = ["multiple_choice", "fill_blank", "word_order"];
      const randomType = questionTypes[Math.floor(Math.random() * questionTypes.length)];
      
      if (randomType === "multiple_choice") {
        // Multiple choice: What does this word mean?
        const otherWords = validWords.filter((w) => w._id !== word._id && getMeaning(w)).sort(() => Math.random() - 0.5).slice(0, 3);
        const correctMeaning = getMeaning(word);
        const options = [correctMeaning, ...otherWords.map((w) => getMeaning(w))].sort(() => Math.random() - 0.5);
        questions.push({
          word,
          type: "multiple_choice",
          question: `Nghĩa của từ "${word.word}" là gì?`,
          options,
          correctAnswer: correctMeaning
        });
      } else if (randomType === "fill_blank" && getExample(word)) {
        // Fill in the blank: Complete the sentence
        const example = getExample(word);
        const wordInSentence = word.word;
        const blankedSentence = example.replace(new RegExp(`\\b${wordInSentence}\\b`, 'gi'), '______');
        
        if (blankedSentence !== example) { // Make sure word was found
          questions.push({
            word,
            type: "fill_blank",
            question: "Điền từ vào chỗ trống:",
            blankedSentence,
            correctAnswer: wordInSentence.toLowerCase()
          });
        } else {
          // Fallback to multiple choice if word not found in sentence
          const otherWords = validWords.filter((w) => w._id !== word._id && getMeaning(w)).sort(() => Math.random() - 0.5).slice(0, 3);
          const correctMeaning = getMeaning(word);
          const options = [correctMeaning, ...otherWords.map((w) => getMeaning(w))].sort(() => Math.random() - 0.5);
          questions.push({
            word,
            type: "multiple_choice",
            question: `Nghĩa của từ "${word.word}" là gì?`,
            options,
            correctAnswer: correctMeaning
          });
        }
      } else if (randomType === "word_order" && getExample(word)) {
        // Word order: Arrange words to form a sentence
        const example = getExample(word);
        const words = example.split(/\s+/).filter(w => w.length > 0);
        
        if (words.length >= 4 && words.length <= 10) {
          const shuffledWords = [...words].sort(() => Math.random() - 0.5);
          questions.push({
            word: {
              ...word,
              exampleTranslation: getExampleTranslation(word)
            },
            type: "word_order",
            question: "Sắp xếp các từ thành câu đúng:",
            words: shuffledWords,
            correctAnswer: example.toLowerCase().replace(/[.,!?]/g, '').trim()
          });
        } else {
          // Fallback to multiple choice if sentence too long/short
          const otherWords = validWords.filter((w) => w._id !== word._id && getMeaning(w)).sort(() => Math.random() - 0.5).slice(0, 3);
          const correctMeaning = getMeaning(word);
          const options = [correctMeaning, ...otherWords.map((w) => getMeaning(w))].sort(() => Math.random() - 0.5);
          questions.push({
            word,
            type: "multiple_choice",
            question: `Nghĩa của từ "${word.word}" là gì?`,
            options,
            correctAnswer: correctMeaning
          });
        }
      }
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
    
    const currentQ = quizQuestions[currentQuestionIndex];
    let isCorrect = false;
    
    if (currentQ.type === "multiple_choice") {
      isCorrect = answer === currentQ.correctAnswer;
    } else if (currentQ.type === "fill_blank") {
      isCorrect = answer.toLowerCase().trim() === currentQ.correctAnswer.toLowerCase().trim();
    } else if (currentQ.type === "word_order") {
      const userAnswer = answer.toLowerCase().replace(/[.,!?]/g, '').trim();
      const correctAnswer = currentQ.correctAnswer.toLowerCase().replace(/[.,!?]/g, '').trim();
      isCorrect = userAnswer === correctAnswer;
    }
    
    if (isCorrect) setQuizScore((prev) => prev + 1);

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
  };

  if (status === "loading" || loading) {
    return (
      <DashboardLayout>
        <div className="p-6 flex flex-col items-center justify-center min-h-[50vh] gap-4">
          <motion.div className="text-4xl" animate={{ scale: [1, 1.1, 1] }} transition={{ duration: 1.5, repeat: Infinity }}>📚</motion.div>
          <p className="text-gray-500">Đang tải...</p>
        </div>
      </DashboardLayout>
    );
  }

  // Quiz Mode UI
  if (quizMode) {
    return (
      <DashboardLayout>
        {!quizComplete ? (
          <VocabularyQuiz
            questions={quizQuestions}
            onExit={exitQuiz}
            onComplete={(finalScore) => {
              setQuizScore(finalScore);
              setQuizComplete(true);
            }}
            speakWord={speakWord}
          />
        ) : (
          <div className="p-6 md:p-8 max-w-3xl mx-auto">
            <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="bg-white rounded-3xl shadow-xl p-8 text-center">
              <Trophy className="w-20 h-20 text-yellow-500 mx-auto mb-4" />
              <h2 className="text-3xl font-bold mb-2">Hoàn thành!</h2>
              <p className="text-xl text-gray-600 mb-6">Bạn đạt <span className="font-bold text-teal-600">{quizScore}/{quizQuestions.length}</span> điểm</p>
              <div className="flex gap-4 justify-center">
                <button onClick={exitQuiz} className="px-6 py-3 bg-gray-100 rounded-xl hover:bg-gray-200">Quay lại</button>
                <button onClick={startQuiz} className="px-6 py-3 bg-teal-600 text-white rounded-xl hover:bg-teal-700">Chơi lại</button>
              </div>
            </motion.div>
          </div>
        )}
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
              Kho từ vựng
            </h1>
            <p className="text-gray-600 mt-1">{vocabulary.length} từ vựng • {structures.length} cấu trúc</p>
          </div>
          <div className="flex gap-3">
            <button onClick={loadVocabulary} className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200">
              <RefreshCw className="w-5 h-5" /> Làm mới
            </button>
            <button 
              onClick={() => setShowAddForm(!showAddForm)} 
              className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-xl hover:bg-green-700"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Thêm từ mới
            </button>
            <button onClick={() => router.push("/dashboard-new/documents-simple")} className="flex items-center gap-2 px-4 py-2 bg-teal-600 text-white rounded-xl hover:bg-teal-700">
              <Upload className="w-5 h-5" /> Upload tài liệu
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6 bg-gray-100 p-1 rounded-xl">
          <button onClick={() => setActiveTab("vocabulary")}
            className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg font-medium transition ${activeTab === "vocabulary" ? "bg-white text-teal-600 shadow" : "text-gray-600 hover:text-gray-900"}`}>
            <BookOpen className="w-5 h-5" />
            Từ vựng
            <span className="text-xs bg-teal-100 text-teal-600 px-2 py-0.5 rounded-full">{vocabulary.length}</span>
          </button>
          <button onClick={() => setActiveTab("structures")}
            className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg font-medium transition ${activeTab === "structures" ? "bg-white text-purple-600 shadow" : "text-gray-600 hover:text-gray-900"}`}>
            <Languages className="w-5 h-5" />
            Cấu trúc câu
            <span className="text-xs bg-purple-100 text-purple-600 px-2 py-0.5 rounded-full">{structures.length}</span>
          </button>
        </div>

        {/* Quiz Button - only for vocabulary tab */}
        {activeTab === "vocabulary" && vocabulary.length >= 4 && (
          <motion.button onClick={startQuiz} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
            className="w-full mb-6 p-4 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-2xl shadow-lg flex items-center justify-center gap-3">
            <Play className="w-6 h-6" />
            <span className="text-lg font-bold">Bắt đầu Quiz</span>
            <Zap className="w-6 h-6" />
          </motion.button>
        )}

        {/* Type Filter - only for vocabulary tab */}
        {activeTab === "vocabulary" && (
          <div className="mb-6">
            <div className="flex items-center gap-2 mb-3">
              <Filter className="w-5 h-5 text-gray-500" />
              <span className="font-medium text-gray-700">Lọc theo loại từ:</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {WORD_TYPES.map((type) => {
                const count = type.key === "all" ? vocabulary.length : groupedVocabulary[type.key]?.length || 0;
                return (
                  <button key={type.key} onClick={() => setSelectedType(type.key)}
                    className={`px-4 py-2 rounded-xl font-medium transition flex items-center gap-2 ${selectedType === type.key ? "bg-teal-500 text-white shadow-md" : "bg-white text-gray-700 hover:bg-gray-100 border border-gray-200"}`}>
                    <span>{type.label}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${selectedType === type.key ? "bg-white/20" : "bg-gray-100"}`}>{count}</span>
                  </button>
                );
              })}
            </div>
            
            {/* Source Filter */}
            <div className="flex items-center gap-2 mt-4 mb-2">
              <BookOpen className="w-5 h-5 text-gray-500" />
              <span className="font-medium text-gray-700">Lọc theo nguồn:</span>
            </div>
            <div className="flex flex-wrap gap-2">
              <button 
                onClick={() => setSelectedSource("all")}
                className={`px-4 py-2 rounded-xl font-medium transition flex items-center gap-2 ${selectedSource === "all" ? "bg-purple-500 text-white shadow-md" : "bg-white text-gray-700 hover:bg-gray-100 border border-gray-200"}`}
              >
                <span>Tất cả</span>
                <span className={`text-xs px-2 py-0.5 rounded-full ${selectedSource === "all" ? "bg-white/20" : "bg-gray-100"}`}>
                  {vocabulary.length}
                </span>
              </button>
              <button 
                onClick={() => setSelectedSource("voice_chat")}
                className={`px-4 py-2 rounded-xl font-medium transition flex items-center gap-2 ${selectedSource === "voice_chat" ? "bg-purple-500 text-white shadow-md" : "bg-white text-gray-700 hover:bg-gray-100 border border-gray-200"}`}
              >
                <span>🎤 Voice Chat</span>
                <span className={`text-xs px-2 py-0.5 rounded-full ${selectedSource === "voice_chat" ? "bg-white/20" : "bg-gray-100"}`}>
                  {vocabulary.filter(v => v.source === "voice_chat").length}
                </span>
              </button>
              <button 
                onClick={() => setSelectedSource("document")}
                className={`px-4 py-2 rounded-xl font-medium transition flex items-center gap-2 ${selectedSource === "document" ? "bg-purple-500 text-white shadow-md" : "bg-white text-gray-700 hover:bg-gray-100 border border-gray-200"}`}
              >
                <span>📄 Tài liệu</span>
                <span className={`text-xs px-2 py-0.5 rounded-full ${selectedSource === "document" ? "bg-white/20" : "bg-gray-100"}`}>
                  {vocabulary.filter(v => v.source === "document").length}
                </span>
              </button>
              <button 
                onClick={() => setSelectedSource("manual")}
                className={`px-4 py-2 rounded-xl font-medium transition flex items-center gap-2 ${selectedSource === "manual" ? "bg-purple-500 text-white shadow-md" : "bg-white text-gray-700 hover:bg-gray-100 border border-gray-200"}`}
              >
                <span>✍️ Thủ công</span>
                <span className={`text-xs px-2 py-0.5 rounded-full ${selectedSource === "manual" ? "bg-white/20" : "bg-gray-100"}`}>
                  {vocabulary.filter(v => v.source === "manual").length}
                </span>
              </button>
            </div>
          </div>
        )}

        {/* Search - Enhanced with database search */}
        <div className="relative mb-6">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input 
            type="text" 
            placeholder="Tìm kiếm từ vựng trong kho..." 
            value={searchTerm} 
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-12 pr-4 py-3 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-teal-500 focus:border-transparent shadow-sm" 
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm("")}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Add New Word Form */}
        {showAddForm && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="mb-6 bg-white rounded-xl shadow-lg p-6 border-2 border-green-200"
          >
            <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
              <svg className="w-6 h-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Thêm từ vựng mới
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Từ vựng <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={newWord.word}
                  onChange={(e) => setNewWord({ ...newWord, word: e.target.value })}
                  placeholder="Nhập từ tiếng Anh..."
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Nghĩa tiếng Việt <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={newWord.meaning}
                  onChange={(e) => setNewWord({ ...newWord, meaning: e.target.value })}
                  placeholder="Nhập nghĩa..."
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                />
              </div>
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Câu ví dụ
              </label>
              <input
                type="text"
                value={newWord.example}
                onChange={(e) => setNewWord({ ...newWord, example: e.target.value })}
                placeholder="Nhập câu ví dụ..."
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Loại từ
                </label>
                <select
                  value={newWord.type}
                  onChange={(e) => setNewWord({ ...newWord, type: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                >
                  <option value="noun">Danh từ</option>
                  <option value="verb">Động từ</option>
                  <option value="adjective">Tính từ</option>
                  <option value="adverb">Trạng từ</option>
                  <option value="preposition">Giới từ</option>
                  <option value="other">Khác</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Cấp độ
                </label>
                <select
                  value={newWord.level}
                  onChange={(e) => setNewWord({ ...newWord, level: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                >
                  <option value="beginner">Cơ bản</option>
                  <option value="intermediate">Trung cấp</option>
                  <option value="advanced">Nâng cao</option>
                </select>
              </div>
            </div>

            <div className="flex gap-3 justify-end">
              <button
                onClick={() => {
                  setShowAddForm(false);
                  setNewWord({
                    word: "",
                    meaning: "",
                    example: "",
                    type: "noun",
                    level: "intermediate"
                  });
                }}
                className="px-6 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
              >
                Hủy
              </button>
              <button
                onClick={handleAddWord}
                disabled={saving || !newWord.word || !newWord.meaning}
                className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center gap-2 transition-colors"
              >
                {saving ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    Đang lưu...
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    Lưu từ vựng
                  </>
                )}
              </button>
            </div>
          </motion.div>
        )}

        {/* Content based on active tab */}
        <AnimatePresence mode="wait">
          {activeTab === "vocabulary" && (
            <motion.div key="vocabulary" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
              {filteredVocabulary.length === 0 ? (
                <div className="text-center py-12 bg-white rounded-2xl shadow-md">
                  <BookOpen className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-xl font-semibold text-gray-700 mb-2">{vocabulary.length === 0 ? "Chưa có từ vựng" : "Không tìm thấy"}</h3>
                  <p className="text-gray-500">Upload tài liệu hoặc học qua hình ảnh để thêm từ vựng</p>
                </div>
              ) : (
                <div className="grid md:grid-cols-2 gap-3">
                  {filteredVocabulary.map((word: any) => {
                    const isPrimarySynonym = word.is_primary_synonym !== false;
                    const hasSynonymGroup = word.synonym_group_id !== undefined;
                    const similarityScore = word.similarity_to_primary;
                    
                    return (
                      <motion.div key={word._id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} 
                        className={`rounded-xl p-4 shadow hover:shadow-md transition border ${
                          isPrimarySynonym 
                            ? 'bg-white border-gray-100' 
                            : 'bg-blue-50 border-blue-200 ml-4'
                        }`}>
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              {!isPrimarySynonym && (
                                <span className="text-blue-500" title="Từ đồng nghĩa">🔗</span>
                              )}
                              <h3 className="text-lg font-bold text-gray-900">{word.word}</h3>
                              {word.ipa && (
                                <span className="text-sm text-gray-500 font-mono">/{word.ipa}/</span>
                              )}
                              <button onClick={() => speakWord(word.word)} className="p-1 bg-teal-100 text-teal-600 rounded hover:bg-teal-200">
                                <Volume2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                            <div className="flex items-center gap-2 mb-2">
                              <span className="text-xs px-2 py-0.5 bg-blue-100 text-blue-600 rounded-full">{getWordType(word)}</span>
                              {!isPrimarySynonym && similarityScore && (
                                <span className="text-xs px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full border border-blue-200">
                                  {(similarityScore * 100).toFixed(0)}% tương đồng
                                </span>
                              )}
                              {word.source && <span className="text-xs px-2 py-0.5 bg-gray-100 text-gray-500 rounded-full">{word.source}</span>}
                            </div>
                            <p className="text-sm text-teal-600 font-medium mb-2">{getMeaning(word)}</p>
                            {getExample(word) && (
                              <div className="text-xs text-gray-600 bg-gray-50 rounded p-2">
                                <div className="flex items-start gap-1">
                                  <p className="italic flex-1">&quot;{getExample(word)}&quot;</p>
                                  <button 
                                    onClick={() => speakSentence(getExample(word))} 
                                    className="p-1 bg-blue-100 text-blue-600 rounded hover:bg-blue-200 flex-shrink-0"
                                    title="Phát âm câu"
                                  >
                                    <Volume2 className="w-3 h-3" />
                                  </button>
                                </div>
                                {getExampleTranslation(word) && <p className="text-gray-500 mt-1">{getExampleTranslation(word)}</p>}
                              </div>
                            )}
                          </div>
                          <button onClick={() => deleteWord(word._id)} disabled={deletingId === word._id}
                            className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded disabled:opacity-50">
                            {deletingId === word._id ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                          </button>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              )}
            </motion.div>
          )}

          {activeTab === "structures" && (
            <motion.div key="structures" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
              {filteredStructures.length === 0 ? (
                <div className="text-center py-12 bg-white rounded-2xl shadow-md">
                  <Languages className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-xl font-semibold text-gray-700 mb-2">Chưa có cấu trúc câu</h3>
                  <p className="text-gray-500">Học qua hình ảnh hoặc voice chat để lưu cấu trúc câu</p>
                </div>
              ) : (
                <div className="grid gap-4">
                  {filteredStructures.map((structure) => (
                    <motion.div key={structure._id} initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                      className="bg-gradient-to-r from-purple-50 to-pink-50 border border-purple-200 rounded-2xl p-5 hover:shadow-lg transition">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <h3 className="text-xl font-bold text-purple-700 font-mono">{structure.word}</h3>
                            <span className="text-xs px-2 py-1 bg-purple-100 text-purple-600 rounded-full">Cấu trúc</span>
                          </div>
                          <p className="text-gray-700 mb-2">{getMeaning(structure)}</p>
                          {getExample(structure) && (
                            <div className="bg-white/50 rounded-lg p-3 mt-2">
                              <div className="flex items-start gap-2">
                                <p className="text-sm text-gray-600 flex-1">
                                  <span className="font-medium text-purple-600">Ví dụ:</span> {getExample(structure)}
                                </p>
                                <button 
                                  onClick={() => speakSentence(getExample(structure))} 
                                  className="p-1.5 bg-purple-100 text-purple-600 rounded-lg hover:bg-purple-200 flex-shrink-0"
                                  title="Phát âm câu ví dụ"
                                >
                                  <Volume2 className="w-4 h-4" />
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                        <button onClick={() => deleteWord(structure._id)} disabled={deletingId === structure._id}
                          className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg disabled:opacity-50">
                          {deletingId === structure._id ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                        </button>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </DashboardLayout>
  );
}
