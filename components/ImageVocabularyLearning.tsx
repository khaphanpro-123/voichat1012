"use client";

import { useState, useMemo } from "react";
import { useSession } from "next-auth/react";
import { motion } from "framer-motion";
import {
  Check, X, Volume2, AlertCircle, Loader2, ChevronRight, 
  Save, RefreshCw, PenLine, CheckCircle2, XCircle, Lightbulb, Edit3,
  Image as ImageIcon, Grid3X3, Sparkles
} from "lucide-react";
import DashboardLayout from "./DashboardLayout";

// Kho ảnh với nhãn từ vựng có sẵn
const IMAGE_DATABASE = [
  // Animals
  { id: "dog", word: "dog", wordVi: "con chó", variants: ["dogs"], category: "animals", image: "https://images.unsplash.com/photo-1587300003388-59208cc962cb?w=400" },
  { id: "cat", word: "cat", wordVi: "con mèo", variants: ["cats"], category: "animals", image: "https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?w=400" },
  { id: "bird", word: "bird", wordVi: "con chim", variants: ["birds"], category: "animals", image: "https://images.unsplash.com/photo-1444464666168-49d633b86797?w=400" },
  { id: "fish", word: "fish", wordVi: "con cá", variants: ["fishes", "fish"], category: "animals", image: "https://images.unsplash.com/photo-1524704654690-b56c05c78a00?w=400" },
  { id: "elephant", word: "elephant", wordVi: "con voi", variants: ["elephants"], category: "animals", image: "https://images.unsplash.com/photo-1557050543-4d5f4e07ef46?w=400" },
  { id: "rabbit", word: "rabbit", wordVi: "con thỏ", variants: ["rabbits"], category: "animals", image: "https://images.unsplash.com/photo-1585110396000-c9ffd4e4b308?w=400" },
  // Objects
  { id: "book", word: "book", wordVi: "quyển sách", variants: ["books"], category: "objects", image: "https://images.unsplash.com/photo-1544947950-fa07a98d237f?w=400" },
  { id: "phone", word: "phone", wordVi: "điện thoại", variants: ["phones"], category: "objects", image: "https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=400" },
  { id: "computer", word: "computer", wordVi: "máy tính", variants: ["computers"], category: "objects", image: "https://images.unsplash.com/photo-1496181133206-80ce9b88a853?w=400" },
  { id: "chair", word: "chair", wordVi: "cái ghế", variants: ["chairs"], category: "objects", image: "https://images.unsplash.com/photo-1503602642458-232111445657?w=400" },
  { id: "table", word: "table", wordVi: "cái bàn", variants: ["tables"], category: "objects", image: "https://images.unsplash.com/photo-1611269154421-4e27233ac5c7?w=400" },
  { id: "lamp", word: "lamp", wordVi: "cái đèn", variants: ["lamps"], category: "objects", image: "https://images.unsplash.com/photo-1507473885765-e6ed057f782c?w=400" },
  // Food
  { id: "apple", word: "apple", wordVi: "quả táo", variants: ["apples"], category: "food", image: "https://images.unsplash.com/photo-1560806887-1e4cd0b6cbd6?w=400" },
  { id: "banana", word: "banana", wordVi: "quả chuối", variants: ["bananas"], category: "food", image: "https://images.unsplash.com/photo-1571771894821-ce9b6c11b08e?w=400" },
  { id: "orange", word: "orange", wordVi: "quả cam", variants: ["oranges"], category: "food", image: "https://images.unsplash.com/photo-1547514701-42782101795e?w=400" },
  { id: "bread", word: "bread", wordVi: "bánh mì", variants: ["breads"], category: "food", image: "https://images.unsplash.com/photo-1509440159596-0249088772ff?w=400" },
  // Activities
  { id: "run", word: "run", wordVi: "chạy", variants: ["runs", "running", "ran"], category: "activities", image: "https://images.unsplash.com/photo-1552674605-db6ffd4facb5?w=400" },
  { id: "swim", word: "swim", wordVi: "bơi", variants: ["swims", "swimming", "swam"], category: "activities", image: "https://images.unsplash.com/photo-1530549387789-4c1017266635?w=400" },
];

const CATEGORIES = [
  { id: "all", label: "Tất cả", icon: "🌟" },
  { id: "animals", label: "Động vật", icon: "🐾" },
  { id: "objects", label: "Đồ vật", icon: "📦" },
  { id: "food", label: "Thức ăn", icon: "🍎" },
  { id: "activities", label: "Hoạt động", icon: "🏃" },
];

interface SentenceCheck {
  sentence: string;
  isCorrect: boolean;
  correctedSentence: string;
  errors: Array<{
    type: string;
    original: string;
    corrected: string;
    explanation: string;
    explanationVi: string;
    position?: string;
    errorWord?: string;
    errorPosition?: string;
    errorMessage?: string;
  }>;
  vietnameseTranslation: string;
  hasTargetWord: boolean;
  isDuplicate: boolean;
  grammarRule?: string;
  grammarRuleVi?: string;
  encouragement?: string;
}

type Step = "select" | "guess" | "sentences" | "checking" | "results";

export default function ImageVocabularyLearning() {
  const { data: session } = useSession();
  const userId = (session?.user as any)?.id || "anonymous";

  const [step, setStep] = useState<Step>("select");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [selectedImage, setSelectedImage] = useState<typeof IMAGE_DATABASE[0] | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Step 2: Guess
  const [userGuess, setUserGuess] = useState("");
  const [guessAttempts, setGuessAttempts] = useState(0);
  const [guessResult, setGuessResult] = useState<{ isCorrect: boolean; message: string } | null>(null);
  const [showAnswer, setShowAnswer] = useState(false);

  // Step 3-4: Sentences
  const [sentences, setSentences] = useState<string[]>(["", "", "", ""]);
  const [checkedSentences, setCheckedSentences] = useState<SentenceCheck[]>([]);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editedSentence, setEditedSentence] = useState("");

  // Results
  const [saved, setSaved] = useState(false);

  // Filter images by category
  const filteredImages = useMemo(() => {
    if (selectedCategory === "all") return IMAGE_DATABASE;
    return IMAGE_DATABASE.filter(img => img.category === selectedCategory);
  }, [selectedCategory]);

  // Normalize text for comparison
  const normalize = (text: string) => text.toLowerCase().trim().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

  // Check if word matches (including variants)
  const isWordMatch = (input: string, target: typeof IMAGE_DATABASE[0]) => {
    const normalizedInput = normalize(input);
    const normalizedWord = normalize(target.word);
    if (normalizedInput === normalizedWord) return true;
    return target.variants.some(v => normalize(v) === normalizedInput);
  };

  // Check if sentence contains target word
  const sentenceContainsWord = (sentence: string, target: typeof IMAGE_DATABASE[0]) => {
    const words = normalize(sentence).split(/\s+/);
    const targetWords = [normalize(target.word), ...target.variants.map(normalize)];
    return words.some(w => targetWords.includes(w));
  };

  // Step 1: Select image
  const handleSelectImage = (img: typeof IMAGE_DATABASE[0]) => {
    setSelectedImage(img);
    setStep("guess");
  };

  // Step 2: Check guess
  const handleGuessSubmit = () => {
    if (!userGuess.trim() || !selectedImage) return;

    const isCorrect = isWordMatch(userGuess, selectedImage);
    const newAttempts = guessAttempts + 1;
    setGuessAttempts(newAttempts);

    if (isCorrect) {
      setGuessResult({ isCorrect: true, message: "🎉 Chính xác! Bạn đã nhập đúng từ!" });
      setTimeout(() => setStep("sentences"), 1500);
    } else {
      if (newAttempts >= 3) {
        setShowAnswer(true);
        setGuessResult({ isCorrect: false, message: `❌ Sai 3 lần. Từ đúng là "${selectedImage.word}"` });
      } else {
        setGuessResult({ isCorrect: false, message: `❌ Chưa đúng! Còn ${3 - newAttempts} lần thử.` });
      }
      setUserGuess("");
    }
  };

  // Skip after 3 wrong
  const handleSkipToSentences = () => {
    setStep("sentences");
  };

  // Step 3: Validate sentences before checking grammar
  const validateSentences = (): string | null => {
    if (!selectedImage) return "Chưa chọn ảnh";
    
    const validSentences = sentences.filter(s => s.trim());
    if (validSentences.length < 4) return `Vui lòng viết đủ 4 câu (còn thiếu ${4 - validSentences.length} câu)`;

    // Check for target word
    for (let i = 0; i < 4; i++) {
      if (!sentenceContainsWord(sentences[i], selectedImage)) {
        return `Câu ${i + 1} chưa chứa từ "${selectedImage.word}" hoặc biến thể của nó`;
      }
    }

    // Check for duplicates
    const normalized = sentences.map(s => normalize(s));
    const unique = new Set(normalized);
    if (unique.size < 4) return "Có câu bị trùng lặp. Vui lòng viết 4 câu khác nhau.";

    return null;
  };

  // Step 4: Check grammar with AI
  const handleCheckSentences = async () => {
    const validationError = validateSentences();
    if (validationError) {
      setError(validationError);
      return;
    }

    setStep("checking");
    setIsLoading(true);
    setError(null);

    const results: SentenceCheck[] = [];
    const normalizedSentences = sentences.map(s => normalize(s));

    for (let i = 0; i < 4; i++) {
      const sentence = sentences[i];
      const isDuplicate = normalizedSentences.indexOf(normalize(sentence)) !== i;
      const hasTargetWord = sentenceContainsWord(sentence, selectedImage!);

      try {
        const res = await fetch("/api/image-vocabulary-learning", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "checkSentence", sentence, targetWord: selectedImage!.word, userId })
        });
        const data = await res.json();

        if (data.success) {
          results.push({ sentence, hasTargetWord, isDuplicate, ...data.data });
        } else {
          results.push({
            sentence, hasTargetWord, isDuplicate, isCorrect: false,
            correctedSentence: "", errors: [], vietnameseTranslation: ""
          });
        }
      } catch {
        results.push({
          sentence, hasTargetWord, isDuplicate, isCorrect: false,
          correctedSentence: "", errors: [], vietnameseTranslation: ""
        });
      }
    }

    setCheckedSentences(results);
    setIsLoading(false);
    setStep("results");
  };

  // Edit and resubmit sentence
  const handleEditSentence = (index: number) => {
    setEditingIndex(index);
    setEditedSentence(checkedSentences[index].sentence);
  };

  const handleResubmitSentence = async () => {
    if (editingIndex === null || !selectedImage || !editedSentence.trim()) return;

    // Validate edited sentence
    if (!sentenceContainsWord(editedSentence, selectedImage)) {
      setError(`Câu phải chứa từ "${selectedImage.word}"`);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/image-vocabulary-learning", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "checkSentence", sentence: editedSentence, targetWord: selectedImage.word, userId })
      });
      const data = await res.json();

      if (data.success) {
        const newChecked = [...checkedSentences];
        newChecked[editingIndex] = {
          sentence: editedSentence,
          hasTargetWord: true,
          isDuplicate: false,
          ...data.data
        };
        setCheckedSentences(newChecked);
      }
    } catch (err) {
      console.error("Recheck error:", err);
    } finally {
      setIsLoading(false);
      setEditingIndex(null);
      setEditedSentence("");
    }
  };

  // Save results
  const handleSave = async () => {
    if (!selectedImage) return;
    setIsLoading(true);

    try {
      const structures = checkedSentences
        .filter(s => s.isCorrect)
        .map(s => ({ pattern: "", explanation: "", example: s.sentence }));

      const errors = checkedSentences
        .filter(s => !s.isCorrect && s.errors?.length > 0)
        .flatMap(s => s.errors.map(e => ({
          original: e.original || "",
          corrected: e.corrected || "",
          type: e.type || "grammar",
          explanation: e.explanation || ""
        })));

      await fetch("/api/image-vocabulary-learning", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "saveAll", userId,
          vocabulary: { word: selectedImage.word, meaning: selectedImage.wordVi, partOfSpeech: "noun" },
          structures, errors
        })
      });

      setSaved(true);
    } catch (err) {
      console.error("Save error:", err);
    } finally {
      setIsLoading(false);
    }
  };

  // Reset
  const handleReset = () => {
    setStep("select");
    setSelectedImage(null);
    setUserGuess("");
    setGuessAttempts(0);
    setGuessResult(null);
    setShowAnswer(false);
    setSentences(["", "", "", ""]);
    setCheckedSentences([]);
    setEditingIndex(null);
    setEditedSentence("");
    setSaved(false);
    setError(null);
  };

  // Speak
  const speak = (text: string) => {
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = "en-US";
    u.rate = 0.9;
    window.speechSynthesis.speak(u);
  };

  const correctCount = checkedSentences.filter(s => s.isCorrect).length;
  const wrongCount = checkedSentences.filter(s => !s.isCorrect).length;

  // Analyze common errors for summary
  const errorSummary = useMemo(() => {
    const errorTypes: Record<string, { count: number; examples: string[] }> = {};
    checkedSentences.forEach(s => {
      if (s.errors) {
        s.errors.forEach(e => {
          const type = e.type || "grammar";
          if (!errorTypes[type]) errorTypes[type] = { count: 0, examples: [] };
          errorTypes[type].count++;
          if (errorTypes[type].examples.length < 2) {
            errorTypes[type].examples.push(`${e.original} → ${e.corrected}`);
          }
        });
      }
    });
    return Object.entries(errorTypes)
      .map(([type, data]) => ({ type, ...data }))
      .sort((a, b) => b.count - a.count);
  }, [checkedSentences]);

  const getErrorTypeLabel = (type: string): string => {
    const labels: Record<string, string> = {
      subject_verb_agreement: "Hòa hợp chủ-vị",
      article: "Mạo từ (a/an/the)",
      singular_plural: "Số ít/số nhiều",
      spelling: "Chính tả",
      punctuation: "Dấu câu",
      word_order: "Trật tự từ",
      word_type: "Sai loại từ",
      tense: "Thì động từ",
      grammar: "Ngữ pháp chung",
      missing_verb: "Thiếu động từ",
      comparative: "Lỗi so sánh",
      capitalization: "Viết hoa sai"
    };
    return labels[type] || type.replace(/_/g, " ");
  };

  const getErrorSuggestion = (type: string): string => {
    const suggestions: Record<string, string> = {
      subject_verb_agreement: "Ôn lại quy tắc chia động từ theo chủ ngữ số ít/nhiều",
      article: "Học quy tắc dùng a/an/the với danh từ đếm được",
      singular_plural: "Chú ý danh từ đếm được cần mạo từ hoặc dạng số nhiều",
      spelling: "Đọc nhiều và ghi nhớ cách viết từ",
      punctuation: "Nhớ kết thúc câu bằng dấu chấm (.)",
      word_order: "Ghi nhớ cấu trúc S + V + O trong tiếng Anh",
      word_type: "Phân biệt tính từ (adj) và trạng từ (adv)",
      tense: "Ôn lại các thì cơ bản và dấu hiệu nhận biết",
      missing_verb: "Câu tiếng Anh cần có động từ (is/are/was/were...)",
      comparative: "Dùng 'much' + tính từ so sánh hơn, không dùng 'very'",
      capitalization: "Nhớ viết hoa 'I' và chữ cái đầu câu"
    };
    return suggestions[type] || "Luyện tập thêm để cải thiện";
  };

  return (
    <DashboardLayout>
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-indigo-900 to-slate-900 p-4">
        <div className="max-w-5xl mx-auto">
          {/* Header */}
          <div className="text-center mb-6">
            <h1 className="text-2xl font-bold text-white flex items-center justify-center gap-2">
              <ImageIcon className="w-6 h-6 text-pink-400" />
              Học từ vựng qua hình ảnh
            </h1>
            <p className="text-white/60 text-sm mt-1">Chọn ảnh → Nhập từ → Viết câu → Kiểm tra ngữ pháp</p>
          </div>

          {/* Progress */}
          <div className="flex items-center justify-center gap-2 mb-6">
            {[
              { id: "select", label: "Chọn ảnh" },
              { id: "guess", label: "Nhập từ" },
              { id: "sentences", label: "Viết câu" },
              { id: "results", label: "Kết quả" }
            ].map((s, i) => {
              const stepOrder = ["select", "guess", "sentences", "results"];
              const currentIndex = stepOrder.indexOf(step === "checking" ? "results" : step);
              const isActive = step === s.id || (s.id === "results" && step === "checking");
              const isPast = stepOrder.indexOf(s.id) < currentIndex;
              return (
                <div key={s.id} className="flex items-center">
                  <div className="flex flex-col items-center">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold transition-all ${
                      isActive ? "bg-pink-500 text-white scale-110" : isPast ? "bg-green-500 text-white" : "bg-white/20 text-white/50"
                    }`}>
                      {isPast ? <Check className="w-5 h-5" /> : i + 1}
                    </div>
                    <span className={`text-xs mt-1 ${isActive ? "text-pink-400" : "text-white/50"}`}>{s.label}</span>
                  </div>
                  {i < 3 && <ChevronRight className="w-4 h-4 text-white/30 mx-2" />}
                </div>
              );
            })}
          </div>

          {/* Error */}
          {error && (
            <div className="bg-red-500/20 border border-red-500/50 rounded-xl p-3 mb-4 flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0" />
              <p className="text-red-300 text-sm flex-1">{error}</p>
              <button onClick={() => setError(null)}><X className="w-4 h-4 text-red-400" /></button>
            </div>
          )}

          {/* Step 1: Select Image from Gallery */}
          {step === "select" && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
              <div className="bg-white/10 backdrop-blur rounded-2xl p-6">
                <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                  <Grid3X3 className="w-5 h-5 text-pink-400" />
                  Bước 1: Chọn ảnh để học từ vựng
                </h2>

                {/* Category Filter */}
                <div className="flex flex-wrap gap-2 mb-6">
                  {CATEGORIES.map(cat => (
                    <button
                      key={cat.id}
                      onClick={() => setSelectedCategory(cat.id)}
                      className={`px-4 py-2 rounded-xl text-sm font-medium transition ${
                        selectedCategory === cat.id
                          ? "bg-pink-500 text-white"
                          : "bg-white/10 text-white/70 hover:bg-white/20"
                      }`}
                    >
                      {cat.icon} {cat.label}
                    </button>
                  ))}
                </div>

                {/* Image Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                  {filteredImages.map(img => (
                    <button
                      key={img.id}
                      onClick={() => handleSelectImage(img)}
                      className="group relative aspect-square rounded-xl overflow-hidden border-2 border-transparent hover:border-pink-500 transition-all"
                    >
                      <img
                        src={img.image}
                        alt={img.word}
                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end justify-center pb-3">
                        <span className="text-white font-medium text-sm">Chọn ảnh này</span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </motion.div>
          )}

          {/* Step 2: Guess the word */}
          {step === "guess" && selectedImage && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="bg-white/10 backdrop-blur rounded-2xl p-6">
              <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                <PenLine className="w-5 h-5 text-pink-400" />
                Bước 2: Nhập từ tiếng Anh cho đối tượng
              </h2>

              <div className="flex flex-col md:flex-row gap-6">
                <div className="md:w-1/2">
                  <img src={selectedImage.image} alt="Target" className="w-full aspect-square object-cover rounded-xl" />
                </div>

                <div className="md:w-1/2 flex flex-col justify-center">
                  <p className="text-white/70 mb-4">Đây là gì? Nhập từ tiếng Anh:</p>

                  <div className="flex gap-2 mb-4">
                    <input
                      type="text"
                      value={userGuess}
                      onChange={(e) => setUserGuess(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && !showAnswer && handleGuessSubmit()}
                      placeholder="Nhập từ tiếng Anh..."
                      className="flex-1 bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-white text-lg focus:border-pink-500 transition"
                      disabled={showAnswer || guessResult?.isCorrect}
                    />
                    <button
                      onClick={handleGuessSubmit}
                      disabled={!userGuess.trim() || showAnswer || guessResult?.isCorrect}
                      className="px-6 py-3 bg-pink-500 text-white rounded-xl disabled:opacity-50"
                    >
                      <Check className="w-5 h-5" />
                    </button>
                  </div>

                  {guessAttempts > 0 && !guessResult?.isCorrect && !showAnswer && (
                    <p className="text-orange-400 text-sm mb-2">Số lần thử: {guessAttempts}/3</p>
                  )}

                  {guessResult && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={`p-4 rounded-xl ${guessResult.isCorrect ? "bg-green-500/20 border border-green-500/50" : "bg-orange-500/20 border border-orange-500/50"}`}
                    >
                      <p className={`font-medium ${guessResult.isCorrect ? "text-green-300" : "text-orange-300"}`}>
                        {guessResult.message}
                      </p>

                      {(guessResult.isCorrect || showAnswer) && (
                        <div className="mt-3 flex items-center gap-4 flex-wrap">
                          <div className="flex items-center gap-2">
                            <span className="text-white font-bold text-xl">{selectedImage.word}</span>
                            <button onClick={() => speak(selectedImage.word)} className="p-1 hover:bg-white/10 rounded">
                              <Volume2 className="w-5 h-5 text-white/60" />
                            </button>
                          </div>
                          <span className="text-green-300">= {selectedImage.wordVi}</span>
                        </div>
                      )}
                    </motion.div>
                  )}

                  {showAnswer && !guessResult?.isCorrect && (
                    <button
                      onClick={handleSkipToSentences}
                      className="mt-4 w-full py-3 bg-gradient-to-r from-pink-500 to-violet-500 text-white rounded-xl font-medium"
                    >
                      Tiếp tục viết câu →
                    </button>
                  )}
                </div>
              </div>
            </motion.div>
          )}

          {/* Step 3: Write 4 sentences */}
          {step === "sentences" && selectedImage && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="bg-white/10 backdrop-blur rounded-2xl p-6">
              <h2 className="text-lg font-bold text-white mb-2 flex items-center gap-2">
                <PenLine className="w-5 h-5 text-pink-400" />
                Bước 3: Viết 4 câu với từ "{selectedImage.word}"
              </h2>
              <p className="text-white/60 text-sm mb-4">
                Viết 4 câu khác nhau có chứa từ <span className="text-pink-400 font-bold">"{selectedImage.word}"</span> hoặc biến thể ({selectedImage.variants.join(", ")})
              </p>

              <div className="mb-4 p-3 bg-blue-500/20 border border-blue-500/30 rounded-xl">
                <p className="text-blue-300 text-sm flex items-start gap-2">
                  <Lightbulb className="w-4 h-4 mt-0.5 flex-shrink-0" />
                  Gợi ý: Thử viết câu khẳng định, phủ định, câu hỏi, hoặc các thì khác nhau
                </p>
              </div>

              <div className="space-y-3 mb-6">
                {sentences.map((s, i) => {
                  const hasWord = s.trim() && sentenceContainsWord(s, selectedImage);
                  return (
                    <div key={i} className="flex items-center gap-2">
                      <span className="text-white/40 w-6 text-center">{i + 1}.</span>
                      <div className="flex-1 relative">
                        <input
                          type="text"
                          value={s}
                          onChange={(e) => {
                            const newSentences = [...sentences];
                            newSentences[i] = e.target.value;
                            setSentences(newSentences);
                          }}
                          placeholder={`Câu ${i + 1} với từ "${selectedImage.word}"...`}
                          className={`w-full bg-white/10 border rounded-xl px-4 py-3 text-white transition ${
                            s.trim() ? (hasWord ? "border-green-500/50" : "border-red-500/50") : "border-white/20"
                          }`}
                        />
                        {s.trim() && (
                          <span className={`absolute right-3 top-1/2 -translate-y-1/2 ${hasWord ? "text-green-400" : "text-red-400"}`}>
                            {hasWord ? <CheckCircle2 className="w-5 h-5" /> : <XCircle className="w-5 h-5" />}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              <button
                onClick={handleCheckSentences}
                disabled={isLoading}
                className="w-full py-4 bg-gradient-to-r from-pink-500 to-violet-500 text-white rounded-xl font-medium disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Check className="w-5 h-5" />}
                Kiểm tra ngữ pháp
              </button>
            </motion.div>
          )}

          {/* Step 4: Checking */}
          {step === "checking" && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="bg-white/10 backdrop-blur rounded-2xl p-6 text-center">
              <Loader2 className="w-12 h-12 text-pink-400 animate-spin mx-auto mb-4" />
              <h2 className="text-xl font-bold text-white mb-2">Đang kiểm tra ngữ pháp...</h2>
              <p className="text-white/60">AI đang phân tích từng câu của bạn</p>
            </motion.div>
          )}

          {/* Step 4: Results */}
          {step === "results" && selectedImage && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
              {/* Checked sentences */}
              <div className="bg-white/10 backdrop-blur rounded-2xl p-6">
                <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-yellow-400" />
                  Bước 4: Kết quả kiểm tra ngữ pháp
                </h3>

                <div className="space-y-4">
                  {checkedSentences.map((s, i) => (
                    <div key={i} className={`p-4 rounded-xl transition-all ${
                      s.isCorrect ? "bg-green-500/10 border border-green-500/30" : "bg-red-500/10 border border-red-500/30"
                    }`}>
                      {editingIndex === i ? (
                        <div className="space-y-3">
                          <input
                            type="text"
                            value={editedSentence}
                            onChange={(e) => setEditedSentence(e.target.value)}
                            className="w-full bg-white/10 border border-white/30 rounded-lg px-4 py-2 text-white"
                            autoFocus
                          />
                          <div className="flex gap-2">
                            <button
                              onClick={handleResubmitSentence}
                              disabled={isLoading}
                              className="flex-1 py-2 bg-green-500 text-white rounded-lg font-medium flex items-center justify-center gap-2"
                            >
                              {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                              Kiểm tra lại
                            </button>
                            <button
                              onClick={() => { setEditingIndex(null); setEditedSentence(""); }}
                              className="px-4 py-2 bg-gray-500 text-white rounded-lg"
                            >
                              Hủy
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-start gap-3">
                          {s.isCorrect ? (
                            <CheckCircle2 className="w-6 h-6 text-green-400 flex-shrink-0 mt-0.5" />
                          ) : (
                            <XCircle className="w-6 h-6 text-red-400 flex-shrink-0 mt-0.5" />
                          )}

                          <div className="flex-1">
                            <div className="flex items-start justify-between gap-2">
                              <p className="text-white font-medium">{s.sentence}</p>
                              {!s.isCorrect && (
                                <button
                                  onClick={() => handleEditSentence(i)}
                                  className="p-1.5 bg-white/10 hover:bg-white/20 rounded-lg transition"
                                  title="Sửa và nộp lại"
                                >
                                  <Edit3 className="w-4 h-4 text-white/70" />
                                </button>
                              )}
                            </div>

                            {!s.isCorrect && s.correctedSentence && (
                              <p className="text-green-300 text-sm mt-1 flex items-center gap-1">
                                <Check className="w-4 h-4" /> {s.correctedSentence}
                              </p>
                            )}

                            {s.vietnameseTranslation && (
                              <p className="text-white/60 text-sm mt-1">🇻🇳 {s.vietnameseTranslation}</p>
                            )}

                            {/* Validation errors */}
                            {!s.hasTargetWord && (
                              <p className="text-orange-400 text-sm mt-1">⚠️ Câu không chứa từ "{selectedImage.word}"</p>
                            )}
                            {s.isDuplicate && (
                              <p className="text-orange-400 text-sm mt-1">⚠️ Câu bị trùng lặp</p>
                            )}

                            {/* Grammar errors */}
                            {s.errors && s.errors.length > 0 && (
                              <div className="mt-2 space-y-2">
                                {s.errors.map((e, j) => (
                                  <div key={j} className="text-sm bg-red-500/20 rounded-lg p-2">
                                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                                      <span className="px-2 py-0.5 bg-red-500/30 text-red-300 rounded text-xs font-medium">
                                        {getErrorTypeLabel(e.type)}
                                      </span>
                                      {(e.errorWord || e.errorPosition) && (
                                        <span className="text-white/50 text-xs">
                                          {e.errorWord && <span className="text-orange-300">"{e.errorWord}"</span>}
                                          {e.errorPosition && <span> - {e.errorPosition}</span>}
                                        </span>
                                      )}
                                    </div>
                                    {e.errorMessage && (
                                      <p className="text-red-300 text-xs mb-1">❌ {e.errorMessage}</p>
                                    )}
                                    <div className="flex items-center gap-2">
                                      <span className="text-red-300 line-through">{e.original || e.errorWord}</span>
                                      <span className="text-white/40">→</span>
                                      <span className="text-green-300 font-medium">{e.corrected}</span>
                                    </div>
                                    {e.explanationVi && (
                                      <p className="text-white/60 text-xs mt-1 italic">💡 {e.explanationVi}</p>
                                    )}
                                  </div>
                                ))}
                              </div>
                            )}

                            {/* Grammar rule for this sentence */}
                            {s.grammarRuleVi && (
                              <div className="mt-2 p-2 bg-blue-500/20 rounded-lg">
                                <p className="text-blue-300 text-xs">📖 Quy tắc: {s.grammarRuleVi}</p>
                              </div>
                            )}

                            {/* Encouragement message */}
                            {s.encouragement && (
                              <div className={`mt-2 p-2 rounded-lg ${s.isCorrect ? "bg-green-500/20" : "bg-yellow-500/20"}`}>
                                <p className={`text-sm ${s.isCorrect ? "text-green-300" : "text-yellow-300"}`}>
                                  💬 {s.encouragement}
                                </p>
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Summary */}
              <div className="bg-white/10 backdrop-blur rounded-2xl p-6">
                <h3 className="text-lg font-bold text-white mb-4">📊 Tổng kết</h3>

                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div className="bg-green-500/20 rounded-xl p-4 text-center">
                    <p className="text-3xl font-bold text-green-400">{correctCount}</p>
                    <p className="text-white/70 text-sm">Câu đúng ✅</p>
                  </div>
                  <div className="bg-red-500/20 rounded-xl p-4 text-center">
                    <p className="text-3xl font-bold text-red-400">{wrongCount}</p>
                    <p className="text-white/70 text-sm">Câu sai ❌</p>
                  </div>
                </div>

                {/* Common Errors Summary */}
                {errorSummary.length > 0 && (
                  <div className="mb-4">
                    <p className="text-white/80 font-medium mb-2">📋 Danh sách lỗi phổ biến:</p>
                    <div className="space-y-2">
                      {errorSummary.map((err, i) => (
                        <div key={i} className="p-3 bg-orange-500/10 border border-orange-500/30 rounded-lg">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-orange-300 font-medium">{getErrorTypeLabel(err.type)}</span>
                            <span className="text-orange-400 text-sm font-bold">{err.count}x</span>
                          </div>
                          <div className="text-white/60 text-xs mb-1">
                            {err.examples.map((ex, j) => (
                              <span key={j} className="mr-2">• {ex}</span>
                            ))}
                          </div>
                          <p className="text-yellow-300 text-xs flex items-center gap-1">
                            <Lightbulb className="w-3 h-3" />
                            {getErrorSuggestion(err.type)}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {wrongCount > 0 && (
                  <div className="mb-4 p-3 bg-yellow-500/20 border border-yellow-500/30 rounded-xl">
                    <p className="text-yellow-300 text-sm flex items-center gap-2">
                      <Lightbulb className="w-4 h-4" />
                      Bạn có thể sửa các câu sai bằng cách nhấn nút ✏️ và nộp lại
                    </p>
                  </div>
                )}

                {correctCount === 4 && (
                  <div className="mb-4 p-3 bg-green-500/20 border border-green-500/30 rounded-xl text-center">
                    <p className="text-green-300 font-bold">🎉 Xuất sắc! Tất cả 4 câu đều đúng ngữ pháp!</p>
                  </div>
                )}

                {saved ? (
                  <div className="text-center py-4">
                    <div className="w-16 h-16 mx-auto mb-3 bg-gradient-to-br from-green-500 to-emerald-500 rounded-full flex items-center justify-center">
                      <Check className="w-8 h-8 text-white" />
                    </div>
                    <p className="text-green-300 font-bold">✅ Đã lưu kết quả học tập!</p>
                  </div>
                ) : (
                  <button
                    onClick={handleSave}
                    disabled={isLoading}
                    className="w-full py-4 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-xl font-medium disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                    Lưu kết quả
                  </button>
                )}
              </div>

              {/* Learn new word */}
              <button
                onClick={handleReset}
                className="w-full py-4 bg-gradient-to-r from-pink-500 to-violet-500 text-white rounded-xl font-medium flex items-center justify-center gap-2"
              >
                <RefreshCw className="w-5 h-5" /> Học từ mới
              </button>
            </motion.div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
