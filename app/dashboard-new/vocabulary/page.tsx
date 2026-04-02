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

type TabType = "vocabulary" | "structures" | "errors" | "topics";

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
  const [topics, setTopics] = useState<any[]>([]); // New: topics from API
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
          fromDocumentPattern: allWords.filter((w: VocabularyWord) => w.source?.startsWith("document_")).length,
          fromEnglishLiveChat: allWords.filter((w: VocabularyWord) => w.source === "english_live_chat").length,
          fromManual: allWords.filter((w: VocabularyWord) => w.source === "manual").length,
          allSources: [...new Set(allWords.map((w: VocabularyWord) => w.source))].filter(Boolean)
        });
      }
      
      // Load topics from localStorage (saved from recent document uploads)
      loadTopicsFromStorage();
      
    } catch (error) {
      console.error("Load vocabulary error:", error);
    } finally {
      setLoading(false);
    }
  };

  const loadTopicsFromStorage = () => {
    try {
      // Load topics from localStorage (saved from documents-simple uploads)
      const savedTopics = localStorage.getItem('recent_topics');
      if (savedTopics) {
        const parsedTopics = JSON.parse(savedTopics);
        if (Array.isArray(parsedTopics) && parsedTopics.length > 0) {
          setTopics(parsedTopics);
          console.log("🎯 Loaded topics from storage:", parsedTopics.length, "topics");
        }
      }
    } catch (error) {
      console.error("Error loading topics from storage:", error);
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
    
    // Enhanced source matching
    let matchesSource = false;
    if (selectedSource === "all") {
      matchesSource = true;
    } else if (selectedSource === "document") {
      // Match both "document" and "document_*" patterns
      matchesSource = word.source === "document" || (word.source?.startsWith("document_") ?? false);
    } else if (selectedSource === "voice_chat") {
      // Match both "voice_chat" and "english_live_chat"
      matchesSource = word.source === "voice_chat" || word.source === "english_live_chat";
    } else {
      matchesSource = word.source === selectedSource;
    }
    
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
      <div className="p-3 sm:p-4 md:p-6 max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex flex-col gap-3 sm:gap-4 mb-4 sm:mb-6">
          <div>
            <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-900 flex items-center gap-2 sm:gap-3">
              <BookOpen className="w-6 h-6 sm:w-7 sm:h-7 md:w-8 md:h-8 text-teal-600" />
              Kho từ vựng
            </h1>
            <p className="text-gray-600 mt-1 text-sm sm:text-base">{vocabulary.length} từ vựng • {structures.length} cấu trúc</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button onClick={loadVocabulary} className="flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 text-sm sm:text-base">
              <RefreshCw className="w-4 h-4 sm:w-5 sm:h-5" /> <span className="hidden xs:inline">Làm mới</span>
            </button>
            <button 
              onClick={() => setShowAddForm(!showAddForm)} 
              className="flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 bg-green-600 text-white rounded-xl hover:bg-green-700 text-sm sm:text-base"
            >
              <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Thêm từ
            </button>
            <button onClick={() => router.push("/dashboard-new/documents-simple")} className="flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 bg-teal-600 text-white rounded-xl hover:bg-teal-700 text-sm sm:text-base">
              <Upload className="w-4 h-4 sm:w-5 sm:h-5" /> <span className="hidden xs:inline">Upload</span>
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 sm:gap-2 mb-4 sm:mb-6 bg-gray-100 p-1 rounded-xl">
          <button onClick={() => setActiveTab("vocabulary")}
            className={`flex-1 flex items-center justify-center gap-1 sm:gap-2 px-2 sm:px-4 py-2 sm:py-3 rounded-lg font-medium transition text-xs sm:text-base ${activeTab === "vocabulary" ? "bg-white text-teal-600 shadow" : "text-gray-600 hover:text-gray-900"}`}>
            <BookOpen className="w-4 h-4 sm:w-5 sm:h-5" />
            <span className="hidden xs:inline">Từ vựng</span>
            <span className="text-xs bg-teal-100 text-teal-600 px-1.5 sm:px-2 py-0.5 rounded-full">{vocabulary.length}</span>
          </button>
          <button onClick={() => setActiveTab("structures")}
            className={`flex-1 flex items-center justify-center gap-1 sm:gap-2 px-2 sm:px-4 py-2 sm:py-3 rounded-lg font-medium transition text-xs sm:text-base ${activeTab === "structures" ? "bg-white text-purple-600 shadow" : "text-gray-600 hover:text-gray-900"}`}>
            <Languages className="w-4 h-4 sm:w-5 sm:h-5" />
            <span className="hidden xs:inline">Cấu trúc</span>
            <span className="text-xs bg-purple-100 text-purple-600 px-1.5 sm:px-2 py-0.5 rounded-full">{structures.length}</span>
          </button>
          <button onClick={() => setActiveTab("topics")}
            className={`flex-1 flex items-center justify-center gap-1 sm:gap-2 px-2 sm:px-4 py-2 sm:py-3 rounded-lg font-medium transition text-xs sm:text-base ${activeTab === "topics" ? "bg-white text-blue-600 shadow" : "text-gray-600 hover:text-gray-900"}`}>
            <Network className="w-4 h-4 sm:w-5 sm:h-5" />
            <span className="hidden xs:inline">Chủ đề</span>
            <span className="text-xs bg-blue-100 text-blue-600 px-1.5 sm:px-2 py-0.5 rounded-full">{topics.length}</span>
          </button>
        </div>

        {/* Quiz Button - only for vocabulary tab */}
        {activeTab === "vocabulary" && vocabulary.length >= 4 && (
          <motion.button onClick={startQuiz} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
            className="w-full mb-4 sm:mb-6 p-3 sm:p-4 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-2xl shadow-lg flex items-center justify-center gap-2 sm:gap-3">
            <Play className="w-5 h-5 sm:w-6 sm:h-6" />
            <span className="text-base sm:text-lg font-bold">Bắt đầu Quiz</span>
            <Zap className="w-5 h-5 sm:w-6 sm:h-6" />
          </motion.button>
        )}

        {/* Type Filter - only for vocabulary tab */}
        {activeTab === "vocabulary" && (
          <div className="mb-4 sm:mb-6">
            <div className="flex items-center gap-2 mb-2 sm:mb-3">
              <Filter className="w-4 h-4 sm:w-5 sm:h-5 text-gray-500" />
              <span className="font-medium text-gray-700 text-sm sm:text-base">Lọc theo loại từ:</span>
            </div>
            <div className="flex flex-wrap gap-1.5 sm:gap-2">
              {WORD_TYPES.map((type) => {
                const count = type.key === "all" ? vocabulary.length : groupedVocabulary[type.key]?.length || 0;
                return (
                  <button key={type.key} onClick={() => setSelectedType(type.key)}
                    className={`px-2 sm:px-4 py-1.5 sm:py-2 rounded-xl font-medium transition flex items-center gap-1 sm:gap-2 text-xs sm:text-sm ${selectedType === type.key ? "bg-teal-500 text-white shadow-md" : "bg-white text-gray-700 hover:bg-gray-100 border border-gray-200"}`}>
                    <span>{type.label}</span>
                    <span className={`text-xs px-1.5 sm:px-2 py-0.5 rounded-full ${selectedType === type.key ? "bg-white/20" : "bg-gray-100"}`}>{count}</span>
                  </button>
                );
              })}
            </div>
            
            {/* Source Filter */}
            <div className="flex items-center gap-2 mt-3 sm:mt-4 mb-2">
              <BookOpen className="w-4 h-4 sm:w-5 sm:h-5 text-gray-500" />
              <span className="font-medium text-gray-700 text-sm sm:text-base">Lọc theo nguồn:</span>
            </div>
            <div className="flex flex-wrap gap-1.5 sm:gap-2">
              <button 
                onClick={() => setSelectedSource("all")}
                className={`px-2 sm:px-4 py-1.5 sm:py-2 rounded-xl font-medium transition flex items-center gap-1 sm:gap-2 text-xs sm:text-sm ${selectedSource === "all" ? "bg-purple-500 text-white shadow-md" : "bg-white text-gray-700 hover:bg-gray-100 border border-gray-200"}`}
              >
                <span>Tất cả</span>
                <span className={`text-xs px-1.5 sm:px-2 py-0.5 rounded-full ${selectedSource === "all" ? "bg-white/20" : "bg-gray-100"}`}>
                  {vocabulary.length}
                </span>
              </button>
              <button 
                onClick={() => setSelectedSource("voice_chat")}
                className={`px-2 sm:px-4 py-1.5 sm:py-2 rounded-xl font-medium transition flex items-center gap-1 sm:gap-2 text-xs sm:text-sm ${selectedSource === "voice_chat" ? "bg-purple-500 text-white shadow-md" : "bg-white text-gray-700 hover:bg-gray-100 border border-gray-200"}`}
              >
                <span>🎤 Chat</span>
                <span className={`text-xs px-1.5 sm:px-2 py-0.5 rounded-full ${selectedSource === "voice_chat" ? "bg-white/20" : "bg-gray-100"}`}>
                  {vocabulary.filter(v => v.source === "voice_chat" || v.source === "english_live_chat").length}
                </span>
              </button>
              <button 
                onClick={() => setSelectedSource("document")}
                className={`px-2 sm:px-4 py-1.5 sm:py-2 rounded-xl font-medium transition flex items-center gap-1 sm:gap-2 text-xs sm:text-sm ${selectedSource === "document" ? "bg-purple-500 text-white shadow-md" : "bg-white text-gray-700 hover:bg-gray-100 border border-gray-200"}`}
              >
                <span>📄 Tài liệu</span>
                <span className={`text-xs px-1.5 sm:px-2 py-0.5 rounded-full ${selectedSource === "document" ? "bg-white/20" : "bg-gray-100"}`}>
                  {vocabulary.filter(v => v.source === "document" || v.source?.startsWith("document_")).length}
                </span>
              </button>
              <button 
                onClick={() => setSelectedSource("manual")}
                className={`px-2 sm:px-4 py-1.5 sm:py-2 rounded-xl font-medium transition flex items-center gap-1 sm:gap-2 text-xs sm:text-sm ${selectedSource === "manual" ? "bg-purple-500 text-white shadow-md" : "bg-white text-gray-700 hover:bg-gray-100 border border-gray-200"}`}
              >
                <span>✍️ Thủ công</span>
                <span className={`text-xs px-1.5 sm:px-2 py-0.5 rounded-full ${selectedSource === "manual" ? "bg-white/20" : "bg-gray-100"}`}>
                  {vocabulary.filter(v => v.source === "manual").length}
                </span>
              </button>
            </div>
          </div>
        )}

        {/* Search - Enhanced with database search */}
        <div className="relative mb-4 sm:mb-6">
          <Search className="absolute left-3 sm:left-4 top-1/2 -translate-y-1/2 w-4 h-4 sm:w-5 sm:h-5 text-gray-400" />
          <input 
            type="text" 
            placeholder="Tìm kiếm..." 
            value={searchTerm} 
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 sm:pl-12 pr-10 sm:pr-12 py-2 sm:py-3 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-teal-500 focus:border-transparent shadow-sm text-sm sm:text-base" 
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm("")}
              className="absolute right-3 sm:right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              <X className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>
          )}
        </div>

        {/* Add New Word Form */}
        {showAddForm && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="mb-4 sm:mb-6 bg-white rounded-xl shadow-lg p-3 sm:p-4 md:p-6 border-2 border-green-200"
          >
            <h3 className="text-base sm:text-lg md:text-xl font-bold text-gray-900 mb-3 sm:mb-4 flex items-center gap-2">
              <svg className="w-5 h-5 sm:w-6 sm:h-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Thêm từ vựng mới
            </h3>
            
            <div className="space-y-3 sm:space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                <div>
                  <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1 sm:mb-2">
                    Từ vựng <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={newWord.word}
                    onChange={(e) => setNewWord({ ...newWord, word: e.target.value })}
                    placeholder="Nhập từ..."
                    className="w-full px-3 sm:px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent text-sm sm:text-base"
                  />
                </div>
                
                <div>
                  <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1 sm:mb-2">
                    Nghĩa <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={newWord.meaning}
                    onChange={(e) => setNewWord({ ...newWord, meaning: e.target.value })}
                    placeholder="Nhập nghĩa..."
                    className="w-full px-3 sm:px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent text-sm sm:text-base"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1 sm:mb-2">
                  Câu ví dụ
                </label>
                <input
                  type="text"
                  value={newWord.example}
                  onChange={(e) => setNewWord({ ...newWord, example: e.target.value })}
                  placeholder="Nhập câu ví dụ..."
                  className="w-full px-3 sm:px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent text-sm sm:text-base"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                <div>
                  <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1 sm:mb-2">
                    Loại từ
                  </label>
                  <select
                    value={newWord.type}
                    onChange={(e) => setNewWord({ ...newWord, type: e.target.value })}
                    className="w-full px-3 sm:px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent text-sm sm:text-base"
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
                  <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1 sm:mb-2">
                    Cấp độ
                  </label>
                  <select
                    value={newWord.level}
                    onChange={(e) => setNewWord({ ...newWord, level: e.target.value })}
                    className="w-full px-3 sm:px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent text-sm sm:text-base"
                  >
                    <option value="beginner">Cơ bản</option>
                    <option value="intermediate">Trung cấp</option>
                    <option value="advanced">Nâng cao</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="flex flex-col-reverse sm:flex-row gap-2 sm:gap-3 sm:justify-end">
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
                className="w-full sm:w-auto px-4 sm:px-6 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors text-sm sm:text-base"
              >
                Hủy
              </button>
              <button
                onClick={handleAddWord}
                disabled={saving || !newWord.word || !newWord.meaning}
                className="w-full sm:w-auto px-4 sm:px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-colors text-sm sm:text-base"
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

        {/* Vocabulary List */}
        {activeTab === "vocabulary" && (
          <div className="space-y-3 sm:space-y-4">
            {filteredVocabulary.length === 0 ? (
              <div className="text-center py-8 sm:py-12 text-gray-500">
                <BookOpen className="w-12 h-12 sm:w-16 sm:h-16 mx-auto mb-3 sm:mb-4 text-gray-300" />
                <p className="text-sm sm:text-base">Chưa có từ vựng nào</p>
              </div>
            ) : (
              filteredVocabulary.map((word) => (
                <motion.div
                  key={word._id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-white rounded-xl shadow-md p-3 sm:p-4 md:p-6 hover:shadow-lg transition-shadow border border-gray-100"
                >
                  <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 sm:gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 sm:gap-3 mb-2">
                        <h3 className="text-lg sm:text-xl md:text-2xl font-bold text-gray-900 break-words">{word.word}</h3>
                        <button
                          onClick={() => speakWord(word.word)}
                          className="flex-shrink-0 p-1.5 sm:p-2 hover:bg-gray-100 rounded-lg transition-colors"
                        >
                          <Volume2 className="w-4 h-4 sm:w-5 sm:h-5 text-teal-600" />
                        </button>
                        {word.ipa && (
                          <span className="text-xs sm:text-sm text-gray-500 font-mono">/{word.ipa}/</span>
                        )}
                      </div>
                      <p className="text-sm sm:text-base md:text-lg text-gray-700 mb-2 break-words">{getMeaning(word)}</p>
                      {getExample(word) && (
                        <div className="mt-2 sm:mt-3 p-2 sm:p-3 bg-gray-50 rounded-lg">
                          <div className="flex items-start gap-2">
                            <p className="text-xs sm:text-sm md:text-base text-gray-600 italic flex-1 break-words">{getExample(word)}</p>
                            <button
                              onClick={() => speakSentence(getExample(word))}
                              className="flex-shrink-0 p-1 hover:bg-gray-200 rounded transition-colors"
                            >
                              <Volume2 className="w-3 h-3 sm:w-4 sm:h-4 text-gray-500" />
                            </button>
                          </div>
                          {getExampleTranslation(word) && (
                            <p className="text-xs sm:text-sm text-gray-500 mt-1 break-words">{getExampleTranslation(word)}</p>
                          )}
                        </div>
                      )}
                      <div className="flex flex-wrap gap-1.5 sm:gap-2 mt-2 sm:mt-3">
                        <span className="px-2 sm:px-3 py-0.5 sm:py-1 bg-teal-100 text-teal-700 rounded-full text-xs sm:text-sm font-medium">
                          {getWordType(word)}
                        </span>
                        <span className="px-2 sm:px-3 py-0.5 sm:py-1 bg-blue-100 text-blue-700 rounded-full text-xs sm:text-sm">
                          {word.level}
                        </span>
                        {word.source && (
                          <span className="px-2 sm:px-3 py-0.5 sm:py-1 bg-purple-100 text-purple-700 rounded-full text-xs sm:text-sm">
                            {word.source === "voice_chat" ? "🎤 Chat" : 
                             word.source === "english_live_chat" ? "🎤 English Chat" :
                             word.source === "document" || word.source?.startsWith("document_") ? "📄 Tài liệu" : 
                             word.source === "manual" ? "✍️ Thủ công" : 
                             `📋 ${word.source}`}
                          </span>
                        )}
                      </div>
                    </div>
                    <button
                      onClick={() => deleteWord(word._id)}
                      disabled={deletingId === word._id}
                      className="flex-shrink-0 p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                    >
                      {deletingId === word._id ? (
                        <RefreshCw className="w-4 h-4 sm:w-5 sm:h-5 animate-spin" />
                      ) : (
                        <Trash2 className="w-4 h-4 sm:w-5 sm:h-5" />
                      )}
                    </button>
                  </div>
                </motion.div>
              ))
            )}
          </div>
        )}

        {/* Structures List */}
        {activeTab === "structures" && (
          <div className="space-y-3 sm:space-y-4">
            {filteredStructures.length === 0 ? (
              <div className="text-center py-8 sm:py-12 text-gray-500">
                <Languages className="w-12 h-12 sm:w-16 sm:h-16 mx-auto mb-3 sm:mb-4 text-gray-300" />
                <p className="text-sm sm:text-base">Chưa có cấu trúc nào</p>
              </div>
            ) : (
              filteredStructures.map((structure) => (
                <motion.div
                  key={structure._id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-white rounded-xl shadow-md p-3 sm:p-4 md:p-6 hover:shadow-lg transition-shadow border border-purple-100"
                >
                  <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 sm:gap-4">
                    <div className="flex-1 min-w-0">
                      <h3 className="text-lg sm:text-xl md:text-2xl font-bold text-purple-900 mb-2 break-words">{structure.word}</h3>
                      <p className="text-sm sm:text-base md:text-lg text-gray-700 mb-2 break-words">{getMeaning(structure)}</p>
                      {getExample(structure) && (
                        <div className="mt-2 sm:mt-3 p-2 sm:p-3 bg-purple-50 rounded-lg">
                          <p className="text-xs sm:text-sm md:text-base text-gray-600 italic break-words">{getExample(structure)}</p>
                          {getExampleTranslation(structure) && (
                            <p className="text-xs sm:text-sm text-gray-500 mt-1 break-words">{getExampleTranslation(structure)}</p>
                          )}
                        </div>
                      )}
                    </div>
                    <button
                      onClick={() => deleteWord(structure._id)}
                      disabled={deletingId === structure._id}
                      className="flex-shrink-0 p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                    >
                      {deletingId === structure._id ? (
                        <RefreshCw className="w-4 h-4 sm:w-5 sm:h-5 animate-spin" />
                      ) : (
                        <Trash2 className="w-4 h-4 sm:w-5 sm:h-5" />
                      )}
                    </button>
                  </div>
                </motion.div>
              ))
            )}
          </div>
        )}

        {/* Topics List */}
        {activeTab === "topics" && (
          <div className="space-y-3 sm:space-y-4">
            {topics.length === 0 ? (
              <div className="text-center py-8 sm:py-12 text-gray-500">
                <Network className="w-12 h-12 sm:w-16 sm:h-16 mx-auto mb-3 sm:mb-4 text-gray-300" />
                <p className="text-sm sm:text-base">Chưa có chủ đề nào</p>
                <p className="text-xs sm:text-sm text-gray-400 mt-2">
                  Chủ đề sẽ được tạo tự động khi bạn upload tài liệu
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                {topics.map((topic, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className="bg-gradient-to-br from-blue-50 to-purple-50 rounded-xl shadow-md p-3 sm:p-4 md:p-6 hover:shadow-lg transition-shadow border border-blue-100"
                  >
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="text-lg sm:text-xl md:text-2xl font-bold text-blue-900 flex items-center gap-2">
                        <Network className="w-5 h-5 text-blue-600" />
                        Topic {index + 1}
                      </h3>
                      <span className="text-xs bg-blue-100 text-blue-600 px-2 py-1 rounded-full">
                        {topic.items?.length || topic.item_count || 0} từ
                      </span>
                    </div>
                    
                    {/* Topic Name */}
                    {(topic.topic_name || topic.topic_label) && (
                      <p className="text-sm sm:text-base md:text-lg text-gray-700 mb-3 font-medium">
                        📌 {topic.topic_name || topic.topic_label}
                      </p>
                    )}
                    
                    {/* Core Phrase */}
                    {topic.core_phrase && (
                      <div className="mb-3 p-2 bg-yellow-100 border border-yellow-200 rounded-lg">
                        <p className="text-xs sm:text-sm text-yellow-800">
                          🎯 <strong>Từ khóa chính:</strong> {topic.core_phrase}
                        </p>
                      </div>
                    )}
                    
                    {/* Topic Items */}
                    {topic.items && topic.items.length > 0 && (
                      <div className="space-y-3">
                        {/* Phrases */}
                        {topic.items.filter((item: any) => item.type === 'phrase').length > 0 && (
                          <div>
                            <p className="text-xs sm:text-sm font-semibold text-green-600 mb-2">
                              🔤 Cụm từ ({topic.items.filter((item: any) => item.type === 'phrase').length}):
                            </p>
                            <div className="flex flex-wrap gap-1 sm:gap-2">
                              {topic.items
                                .filter((item: any) => item.type === 'phrase')
                                .slice(0, 4)
                                .map((item: any, i: number) => (
                                  <span key={i} className="text-xs sm:text-sm bg-green-100 text-green-700 px-2 py-1 rounded border border-green-200 font-medium">
                                    {item.word || item.phrase || item.term}
                                  </span>
                                ))}
                              {topic.items.filter((item: any) => item.type === 'phrase').length > 4 && (
                                <span className="text-xs text-gray-500 px-2 py-1">
                                  +{topic.items.filter((item: any) => item.type === 'phrase').length - 4} khác
                                </span>
                              )}
                            </div>
                          </div>
                        )}
                        
                        {/* Words */}
                        {topic.items.filter((item: any) => item.type === 'word').length > 0 && (
                          <div>
                            <p className="text-xs sm:text-sm font-semibold text-blue-600 mb-2">
                              📝 Từ đơn ({topic.items.filter((item: any) => item.type === 'word').length}):
                            </p>
                            <div className="flex flex-wrap gap-1 sm:gap-2">
                              {topic.items
                                .filter((item: any) => item.type === 'word')
                                .slice(0, 6)
                                .map((item: any, i: number) => (
                                  <span key={i} className="text-xs sm:text-sm bg-blue-100 text-blue-700 px-2 py-1 rounded border border-blue-200 font-medium">
                                    {item.word || item.phrase || item.term}
                                  </span>
                                ))}
                              {topic.items.filter((item: any) => item.type === 'word').length > 6 && (
                                <span className="text-xs text-gray-500 px-2 py-1">
                                  +{topic.items.filter((item: any) => item.type === 'word').length - 6} khác
                                </span>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                    
                    {/* Topic Statistics */}
                    <div className="mt-3 pt-3 border-t border-blue-200">
                      <div className="grid grid-cols-2 gap-2 text-xs text-gray-600">
                        <div className="text-center">
                          <div className="font-bold text-blue-600">
                            {topic.items?.filter((item: any) => item.type === 'phrase').length || 0}
                          </div>
                          <div>Cụm từ</div>
                        </div>
                        <div className="text-center">
                          <div className="font-bold text-blue-600">
                            {topic.items?.filter((item: any) => item.type === 'word').length || 0}
                          </div>
                          <div>Từ đơn</div>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
            
            {/* Topics Info */}
            {topics.length > 0 && (
              <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                  <div className="text-sm text-blue-800">
                    <p className="font-semibold mb-1">💡 Về Topic Modeling:</p>
                    <p className="text-xs sm:text-sm leading-relaxed">
                      Hệ thống sử dụng thuật toán <strong>KMeans Clustering</strong> để tự động phân nhóm từ vựng theo chủ đề dựa trên 
                      semantic embeddings. Điều này giúp bạn học từ vựng theo nhóm chủ đề có liên quan, tăng hiệu quả ghi nhớ.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

      </div>
  </DashboardLayout>
);
}
