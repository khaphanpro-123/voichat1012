"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import VocabularyQuiz from "@/components/VocabularyQuiz";
import { motion, AnimatePresence } from "framer-motion";
import { getIPA } from "@/lib/ipaDict";
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

type TabType = "vocabulary" | "structures" | "errors" | "mindmap";

interface KnowledgeGraphData {
  nodes: Array<{
    id: string;
    label: string;
    type: 'root' | 'cluster' | 'phrase' | 'word';
    cluster_id?: number;
  }>;
  edges: Array<{
    source: string;
    target: string;
    relation: string;
  }>;
}

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
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabType>("vocabulary");
  const [knowledgeGraphData, setKnowledgeGraphData] = useState<KnowledgeGraphData | null>(null);
  const [loadingGraph, setLoadingGraph] = useState(false);
  const [latestDocumentId, setLatestDocumentId] = useState<string | null>(null);

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
  
  // Get IPA pronunciation - prioritize database IPA, then dictionary, then pronunciation field
  const getPronunciation = (word: VocabularyWord): string => {
    if (word.ipa) return word.ipa;
    if (word.pronunciation) return word.pronunciation;
    return getIPA(word.word);
  };

  useEffect(() => {
    if (status === "unauthenticated") router.push("/auth/login");
  }, [status, router]);

  const loadVocabulary = async () => {
    if (!userId) return;
    setLoading(true);

    try {
      const res = await fetch(`/api/generate-flashcard?userId=${userId}`);
      const data = await res.json();
      if (data.success) {
        const allWords = data.vocabulary || [];
        // Separate vocabulary, structures, and errors
        setVocabulary(allWords.filter((w: VocabularyWord) => w.type !== "structure" && w.type !== "error"));
        setStructures(allWords.filter((w: VocabularyWord) => w.type === "structure"));
        setErrors(allWords.filter((w: VocabularyWord) => w.type === "error"));
        
        // Store latest document ID if available
        if (data.document_id) {
          setLatestDocumentId(data.document_id);
        }
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

  const loadKnowledgeGraph = async (documentId: string) => {
    setLoadingGraph(true);
    try {
      const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'https://perceptive-charm-production-eb6c.up.railway.app';
      const res = await fetch(`${backendUrl}/api/knowledge-graph/${documentId}`);
      const data = await res.json();
      
      if (data.nodes && data.edges) {
        setKnowledgeGraphData({
          nodes: data.nodes,
          edges: data.edges
        });
      }
    } catch (error) {
      console.error("Load knowledge graph error:", error);
      alert("Không thể tải knowledge graph. Vui lòng thử lại sau.");
    } finally {
      setLoadingGraph(false);
    }
  };

  // Load knowledge graph when switching to mindmap tab
  useEffect(() => {
    if (activeTab === "mindmap" && latestDocumentId && !knowledgeGraphData) {
      loadKnowledgeGraph(latestDocumentId);
    }
  }, [activeTab, latestDocumentId]);

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
    return matchesSearch && matchesType;
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
    if (!confirm("Bạn có chắc muốn xóa?")) return;
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
        setStructures((prev) => prev.filter((w) => w._id !== wordId));
        setErrors((prev) => prev.filter((w) => w._id !== wordId));
      }
    } catch (error) {
      console.error("Delete error:", error);
    } finally {
      setDeletingId(null);
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
            <button onClick={() => router.push("/dashboard-new/documents")} className="flex items-center gap-2 px-4 py-2 bg-teal-600 text-white rounded-xl hover:bg-teal-700">
              <Upload className="w-5 h-5" /> Upload
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
          <button onClick={() => setActiveTab("mindmap")}
            className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg font-medium transition ${activeTab === "mindmap" ? "bg-white text-blue-600 shadow" : "text-gray-600 hover:text-gray-900"}`}>
            <Network className="w-5 h-5" />
            Sơ đồ tư duy
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
          </div>
        )}

        {/* Search */}
        <div className="relative mb-6">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input type="text" placeholder="Tìm kiếm..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-12 pr-4 py-3 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-teal-500" />
        </div>

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
                  {filteredVocabulary.map((word) => (
                    <motion.div key={word._id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} 
                      className="bg-white rounded-xl p-4 shadow hover:shadow-md transition border border-gray-100">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="text-lg font-bold text-gray-900">{word.word}</h3>
                            <span className="text-sm text-gray-600 font-mono">/{getPronunciation(word)}/</span>
                            <button onClick={() => speakWord(word.word)} className="p-1 bg-teal-100 text-teal-600 rounded hover:bg-teal-200">
                              <Volume2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                          <div className="flex items-center gap-2 mb-2">
                            <span className="text-xs px-2 py-0.5 bg-blue-100 text-blue-600 rounded-full">{getWordType(word)}</span>
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
                  ))}
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

          {activeTab === "mindmap" && (
            <motion.div key="mindmap" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
              {loadingGraph ? (
                <div className="text-center py-12 bg-white rounded-2xl shadow-md">
                  <RefreshCw className="w-16 h-16 text-blue-500 mx-auto mb-4 animate-spin" />
                  <h3 className="text-xl font-semibold text-gray-700 mb-2">Đang tải sơ đồ tư duy...</h3>
                  <p className="text-gray-500">Vui lòng đợi trong giây lát</p>
                </div>
              ) : !latestDocumentId ? (
                <div className="text-center py-12 bg-white rounded-2xl shadow-md">
                  <Network className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-xl font-semibold text-gray-700 mb-2">Chưa có tài liệu</h3>
                  <p className="text-gray-500 mb-4">Upload tài liệu để xem sơ đồ tư duy</p>
                  <button 
                    onClick={() => router.push("/dashboard-new/documents")}
                    className="px-6 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700"
                  >
                    <Upload className="w-5 h-5 inline mr-2" />
                    Upload tài liệu
                  </button>
                </div>
              ) : !knowledgeGraphData ? (
                <div className="text-center py-12 bg-white rounded-2xl shadow-md">
                  <AlertCircle className="w-16 h-16 text-orange-500 mx-auto mb-4" />
                  <h3 className="text-xl font-semibold text-gray-700 mb-2">Không thể tải sơ đồ</h3>
                  <p className="text-gray-500 mb-4">Vui lòng thử lại hoặc upload tài liệu mới</p>
                  <button 
                    onClick={() => latestDocumentId && loadKnowledgeGraph(latestDocumentId)}
                    className="px-6 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700"
                  >
                    <RefreshCw className="w-5 h-5 inline mr-2" />
                    Thử lại
                  </button>
                </div>
              ) : (
                <div className="bg-white rounded-2xl shadow-md p-8" style={{ height: '700px' }}>
                  <div className="flex flex-col items-center justify-center h-full">
                    <Network className="w-16 h-16 text-blue-500 mb-4" />
                    <h3 className="text-xl font-semibold text-gray-700 mb-2">Sơ đồ tư duy</h3>
                    <p className="text-gray-500 mb-4 text-center max-w-md">
                      Tính năng visualization đang được cập nhật để tương thích với phiên bản mới
                    </p>
                    {knowledgeGraphData && (
                      <div className="text-sm text-gray-600 space-y-1">
                        <p>✓ Dữ liệu đã sẵn sàng</p>
                        <p>• {knowledgeGraphData.nodes?.length || 0} nodes</p>
                        <p>• {knowledgeGraphData.edges?.length || 0} edges</p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </DashboardLayout>
  );
}
