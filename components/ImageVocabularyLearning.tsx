"use client";

import { useState, useRef, useCallback } from "react";
import { useSession } from "next-auth/react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Upload, Camera, Image as ImageIcon, Send, Check, X, Volume2,
  BookOpen, AlertCircle, Loader2, ChevronRight, Save, RefreshCw,
  Sparkles, Languages, PenLine, CheckCircle2, XCircle, Lightbulb, Edit3
} from "lucide-react";
import DashboardLayout from "./DashboardLayout";

// Kho từ vựng theo chủ đề
const VOCABULARY_DATABASE: Record<string, { english: string; vietnamese: string; category: string }[]> = {
  animals: [
    { english: "dog", vietnamese: "con chó", category: "animals" },
    { english: "cat", vietnamese: "con mèo", category: "animals" },
    { english: "bird", vietnamese: "con chim", category: "animals" },
    { english: "fish", vietnamese: "con cá", category: "animals" },
    { english: "elephant", vietnamese: "con voi", category: "animals" },
    { english: "lion", vietnamese: "con sư tử", category: "animals" },
    { english: "tiger", vietnamese: "con hổ", category: "animals" },
    { english: "rabbit", vietnamese: "con thỏ", category: "animals" },
    { english: "horse", vietnamese: "con ngựa", category: "animals" },
    { english: "cow", vietnamese: "con bò", category: "animals" },
  ],
  objects: [
    { english: "table", vietnamese: "cái bàn", category: "objects" },
    { english: "chair", vietnamese: "cái ghế", category: "objects" },
    { english: "book", vietnamese: "quyển sách", category: "objects" },
    { english: "phone", vietnamese: "điện thoại", category: "objects" },
    { english: "computer", vietnamese: "máy tính", category: "objects" },
    { english: "lamp", vietnamese: "đèn", category: "objects" },
    { english: "clock", vietnamese: "đồng hồ", category: "objects" },
    { english: "bag", vietnamese: "cái túi", category: "objects" },
    { english: "pen", vietnamese: "cây bút", category: "objects" },
    { english: "cup", vietnamese: "cái cốc", category: "objects" },
  ],
  food: [
    { english: "apple", vietnamese: "quả táo", category: "food" },
    { english: "banana", vietnamese: "quả chuối", category: "food" },
    { english: "orange", vietnamese: "quả cam", category: "food" },
    { english: "bread", vietnamese: "bánh mì", category: "food" },
    { english: "rice", vietnamese: "cơm", category: "food" },
  ],
};

interface MainObject {
  english: string;
  vietnamese: string;
  partOfSpeech: string;
  pronunciation: string;
  category?: string;
}

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
  }>;
  vietnameseTranslation: string;
  structure: {
    pattern: string;
    explanation: string;
    explanationVi: string;
  };
}

type Step = "upload" | "identify" | "guess" | "sentences" | "checking" | "results";

export default function ImageVocabularyLearning() {
  const { data: session } = useSession();
  const userId = (session?.user as any)?.id || "anonymous";

  // State
  const [step, setStep] = useState<Step>("upload");
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageBase64, setImageBase64] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Learning data
  const [mainObject, setMainObject] = useState<MainObject | null>(null);
  const [needsDescription, setNeedsDescription] = useState(false);
  const [description, setDescription] = useState("");
  
  // Step 2: Guess with retry limit
  const [userGuess, setUserGuess] = useState("");
  const [guessAttempts, setGuessAttempts] = useState(0);
  const [guessResult, setGuessResult] = useState<{ isCorrect: boolean; message: string } | null>(null);
  const [showHint, setShowHint] = useState(false);
  
  // Step 3-4: Sentences
  const [sentences, setSentences] = useState<string[]>(["", "", "", ""]);
  const [checkedSentences, setCheckedSentences] = useState<SentenceCheck[]>([]);
  const [editingSentence, setEditingSentence] = useState<number | null>(null);
  const [editedSentence, setEditedSentence] = useState("");
  
  // Results
  const [savedData, setSavedData] = useState<{ vocabulary: number; structures: number; errors: number } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Find word in vocabulary database
  const findInDatabase = (word: string): { english: string; vietnamese: string; category: string } | null => {
    const normalizedWord = word.toLowerCase().trim();
    for (const category of Object.values(VOCABULARY_DATABASE)) {
      const found = category.find(v => v.english.toLowerCase() === normalizedWord);
      if (found) return found;
    }
    return null;
  };

  // Handle image upload
  const handleImageUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const base64 = event.target?.result as string;
      setImagePreview(base64);
      setImageBase64(base64);
      setStep("identify");
      identifyImage(base64);
    };
    reader.readAsDataURL(file);
  }, []);

  // Step 1: Identify image and match with database
  const identifyImage = async (base64: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/image-vocabulary-learning", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "identify", imageBase64: base64, userId })
      });
      const data = await res.json();
      
      if (data.success) {
        if (data.data.needsDescription) {
          setNeedsDescription(true);
        } else if (data.data.mainObject) {
          const obj = data.data.mainObject;
          // Check if word exists in database
          const dbMatch = findInDatabase(obj.english);
          if (dbMatch) {
            setMainObject({ ...obj, vietnamese: dbMatch.vietnamese, category: dbMatch.category });
          } else {
            setMainObject(obj);
          }
          setStep("guess");
        }
      } else {
        setError(data.message);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  // Step 1b: Identify from description
  const handleDescriptionSubmit = async () => {
    if (!description.trim()) return;
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/image-vocabulary-learning", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "identifyFromDescription", description: description.trim(), userId })
      });
      const data = await res.json();
      
      if (data.success && data.data?.mainObject) {
        const obj = data.data.mainObject;
        const dbMatch = findInDatabase(obj.english);
        if (dbMatch) {
          setMainObject({ ...obj, vietnamese: dbMatch.vietnamese, category: dbMatch.category });
        } else {
          setMainObject(obj);
        }
        setNeedsDescription(false);
        setStep("guess");
      } else {
        setMainObject({
          english: description.trim(),
          vietnamese: `(${description.trim()})`,
          partOfSpeech: "noun",
          pronunciation: ""
        });
        setNeedsDescription(false);
        setStep("guess");
      }
    } catch (err: any) {
      setMainObject({
        english: description.trim(),
        vietnamese: `(${description.trim()})`,
        partOfSpeech: "noun",
        pronunciation: ""
      });
      setNeedsDescription(false);
      setStep("guess");
    } finally {
      setIsLoading(false);
    }
  };

  // Step 2: Check guess with retry limit (max 3 attempts)
  const handleGuessSubmit = async () => {
    if (!userGuess.trim() || !mainObject) return;
    
    const isCorrect = userGuess.trim().toLowerCase() === mainObject.english.toLowerCase();
    const newAttempts = guessAttempts + 1;
    setGuessAttempts(newAttempts);
    
    if (isCorrect) {
      setGuessResult({ isCorrect: true, message: "🎉 Chính xác! Bạn đã đoán đúng!" });
      setTimeout(() => setStep("sentences"), 1500);
    } else {
      if (newAttempts >= 3) {
        // Show hint after 3 wrong attempts
        setShowHint(true);
        setGuessResult({ 
          isCorrect: false, 
          message: `❌ Sai ${newAttempts} lần. Đây là gợi ý: Từ bắt đầu bằng "${mainObject.english[0].toUpperCase()}" và có ${mainObject.english.length} chữ cái.`
        });
      } else {
        setGuessResult({ 
          isCorrect: false, 
          message: `❌ Chưa đúng! Còn ${3 - newAttempts} lần thử.`
        });
      }
      setUserGuess("");
    }
  };

  // Skip to answer (after 3 wrong attempts)
  const handleShowAnswer = () => {
    setGuessResult({ isCorrect: true, message: `Đáp án đúng là: ${mainObject?.english}` });
    setTimeout(() => setStep("sentences"), 1500);
  };

  // Step 3-4: Check sentences
  const handleCheckSentences = async () => {
    if (!mainObject) return;
    const validSentences = sentences.filter(s => s.trim());
    if (validSentences.length < 4) {
      setError("Vui lòng viết đủ 4 câu");
      return;
    }

    setStep("checking");
    setIsLoading(true);
    const results: SentenceCheck[] = [];

    for (const sentence of validSentences) {
      try {
        const res = await fetch("/api/image-vocabulary-learning", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "checkSentence", sentence, targetWord: mainObject.english, userId })
        });
        const data = await res.json();
        if (data.success) {
          results.push({ sentence, ...data.data });
        }
      } catch (err) {
        console.error("Check sentence error:", err);
      }
    }

    setCheckedSentences(results);
    setIsLoading(false);
    setStep("results");
  };

  // Edit and resubmit a sentence
  const handleEditSentence = (index: number) => {
    setEditingSentence(index);
    setEditedSentence(checkedSentences[index].sentence);
  };

  const handleResubmitSentence = async () => {
    if (editingSentence === null || !mainObject || !editedSentence.trim()) return;
    
    setIsLoading(true);
    try {
      const res = await fetch("/api/image-vocabulary-learning", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "checkSentence", sentence: editedSentence, targetWord: mainObject.english, userId })
      });
      const data = await res.json();
      
      if (data.success) {
        const newChecked = [...checkedSentences];
        newChecked[editingSentence] = { sentence: editedSentence, ...data.data };
        setCheckedSentences(newChecked);
      }
    } catch (err) {
      console.error("Recheck error:", err);
    } finally {
      setIsLoading(false);
      setEditingSentence(null);
      setEditedSentence("");
    }
  };

  // Save all data
  const handleSaveAll = async () => {
    if (!mainObject) return;
    setIsLoading(true);
    try {
      const structures = checkedSentences
        .filter(s => s.structure?.pattern)
        .map(s => ({ pattern: s.structure.pattern, explanation: s.structure.explanation || "", example: s.sentence }));

      const errors = checkedSentences
        .filter(s => !s.isCorrect && s.errors?.length > 0)
        .flatMap(s => s.errors.map(e => ({
          original: e.original || "",
          corrected: e.corrected || "",
          type: e.type || "unknown",
          explanation: e.explanation || ""
        })));

      const res = await fetch("/api/image-vocabulary-learning", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "saveAll",
          userId,
          vocabulary: { word: mainObject.english, meaning: mainObject.vietnamese, partOfSpeech: mainObject.partOfSpeech },
          structures,
          errors
        })
      });
      const data = await res.json();
      
      if (data.success) {
        setSavedData(data.saved);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  // Reset
  const handleReset = () => {
    setStep("upload");
    setImagePreview(null);
    setImageBase64(null);
    setMainObject(null);
    setNeedsDescription(false);
    setDescription("");
    setUserGuess("");
    setGuessAttempts(0);
    setGuessResult(null);
    setShowHint(false);
    setSentences(["", "", "", ""]);
    setCheckedSentences([]);
    setEditingSentence(null);
    setEditedSentence("");
    setSavedData(null);
    setError(null);
  };

  // Speak text
  const speak = (text: string) => {
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "en-US";
    utterance.rate = 0.9;
    window.speechSynthesis.speak(utterance);
  };

  // Check if all sentences are correct
  const allSentencesCorrect = checkedSentences.length === 4 && checkedSentences.every(s => s.isCorrect);

  return (
    <DashboardLayout>
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-indigo-900 to-slate-900 p-4">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="text-center mb-6">
            <h1 className="text-2xl font-bold text-white flex items-center justify-center gap-2">
              <ImageIcon className="w-6 h-6 text-pink-400" />
              Học từ vựng qua hình ảnh
            </h1>
            <p className="text-white/60 text-sm mt-1">Chọn ảnh → Đoán từ → Viết câu → Kiểm tra ngữ pháp</p>
          </div>

          {/* Progress - 4 steps */}
          <div className="flex items-center justify-center gap-2 mb-6">
            {[
              { id: "upload", label: "Chọn ảnh" },
              { id: "guess", label: "Đoán từ" },
              { id: "sentences", label: "Viết câu" },
              { id: "results", label: "Kết quả" }
            ].map((s, i) => {
              const isActive = step === s.id || (s.id === "upload" && step === "identify") || (s.id === "sentences" && step === "checking");
              const isPast = ["upload", "guess", "sentences", "results"].indexOf(step) > i || step === "results";
              return (
                <div key={s.id} className="flex items-center">
                  <div className="flex flex-col items-center">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold transition-all ${
                      isActive ? "bg-pink-500 text-white scale-110" : isPast ? "bg-green-500 text-white" : "bg-white/20 text-white/50"
                    }`}>
                      {isPast && !isActive ? <Check className="w-5 h-5" /> : i + 1}
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
              <AlertCircle className="w-5 h-5 text-red-400" />
              <p className="text-red-300 text-sm">{error}</p>
              <button onClick={() => setError(null)} className="ml-auto"><X className="w-4 h-4 text-red-400" /></button>
            </div>
          )}

          {/* Step 1: Upload */}
          {step === "upload" && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="bg-white/10 backdrop-blur rounded-2xl p-8 text-center">
              <div className="w-24 h-24 mx-auto mb-4 bg-gradient-to-br from-pink-500 to-violet-500 rounded-full flex items-center justify-center">
                <Camera className="w-12 h-12 text-white" />
              </div>
              <h2 className="text-xl font-bold text-white mb-2">Bước 1: Chọn hình ảnh</h2>
              <p className="text-white/60 mb-6">Tải lên hình ảnh có đối tượng bạn muốn học từ vựng</p>
              
              <input type="file" ref={fileInputRef} accept="image/*" onChange={handleImageUpload} className="hidden" />
              <button
                onClick={() => fileInputRef.current?.click()}
                className="px-8 py-4 bg-gradient-to-r from-pink-500 to-violet-500 text-white rounded-xl font-medium hover:opacity-90 flex items-center gap-2 mx-auto"
              >
                <Upload className="w-5 h-5" /> Tải ảnh lên
              </button>
            </motion.div>
          )}

          {/* Step 1b: Identifying / Description needed */}
          {step === "identify" && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="bg-white/10 backdrop-blur rounded-2xl p-6">
              {imagePreview && (
                <img src={imagePreview} alt="Preview" className="w-full max-h-64 object-contain rounded-xl mb-4" />
              )}
              
              {isLoading && (
                <div className="text-center py-8">
                  <Loader2 className="w-10 h-10 text-pink-400 animate-spin mx-auto mb-2" />
                  <p className="text-white/70">Đang nhận diện đối tượng trong ảnh...</p>
                  <p className="text-white/50 text-sm">Đối chiếu với kho từ vựng...</p>
                </div>
              )}

              {needsDescription && !isLoading && (
                <div className="mt-4">
                  <p className="text-white/70 mb-2">Vui lòng mô tả đối tượng chính trong ảnh:</p>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="Ví dụ: con chó, cái bàn, quả táo..."
                      className="flex-1 bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-white"
                    />
                    <button onClick={handleDescriptionSubmit} className="px-6 py-3 bg-pink-500 text-white rounded-xl">
                      <Send className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              )}
            </motion.div>
          )}

          {/* Step 2: Guess with retry limit */}
          {step === "guess" && mainObject && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="bg-white/10 backdrop-blur rounded-2xl p-6">
              {imagePreview && (
                <img src={imagePreview} alt="Preview" className="w-full max-h-48 object-contain rounded-xl mb-4" />
              )}
              
              <div className="text-center mb-6">
                <h2 className="text-xl font-bold text-white mb-2">Bước 2: Đây là gì?</h2>
                <p className="text-white/60">Nhập từ tiếng Anh cho đối tượng trong ảnh</p>
                {guessAttempts > 0 && !guessResult?.isCorrect && (
                  <p className="text-orange-400 text-sm mt-1">Số lần thử: {guessAttempts}/3</p>
                )}
              </div>

              <div className="flex gap-2 mb-4">
                <input
                  type="text"
                  value={userGuess}
                  onChange={(e) => setUserGuess(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && !guessResult?.isCorrect && handleGuessSubmit()}
                  placeholder="Nhập từ tiếng Anh..."
                  className="flex-1 bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-white text-lg"
                  disabled={guessResult?.isCorrect}
                />
                <button 
                  onClick={handleGuessSubmit} 
                  disabled={isLoading || guessResult?.isCorrect || !userGuess.trim()}
                  className="px-6 py-3 bg-pink-500 text-white rounded-xl disabled:opacity-50"
                >
                  <Check className="w-5 h-5" />
                </button>
              </div>

              {guessResult && (
                <motion.div 
                  initial={{ opacity: 0, y: 10 }} 
                  animate={{ opacity: 1, y: 0 }}
                  className={`p-4 rounded-xl ${guessResult.isCorrect ? "bg-green-500/20 border border-green-500/50" : "bg-orange-500/20 border border-orange-500/50"}`}
                >
                  <p className={`font-medium ${guessResult.isCorrect ? "text-green-300" : "text-orange-300"}`}>
                    {guessResult.message}
                  </p>
                  
                  {guessResult.isCorrect && (
                    <div className="mt-3 flex items-center gap-4">
                      <div>
                        <span className="text-white/60 text-sm">English:</span>
                        <span className="text-white font-bold ml-2">{mainObject.english}</span>
                        <button onClick={() => speak(mainObject.english)} className="ml-2 p-1 hover:bg-white/10 rounded">
                          <Volume2 className="w-4 h-4 text-white/60" />
                        </button>
                      </div>
                      <div>
                        <span className="text-white/60 text-sm">Vietnamese:</span>
                        <span className="text-green-300 font-bold ml-2">{mainObject.vietnamese}</span>
                      </div>
                    </div>
                  )}
                </motion.div>
              )}

              {/* Show answer button after 3 wrong attempts */}
              {showHint && !guessResult?.isCorrect && (
                <div className="mt-4 p-4 bg-yellow-500/20 border border-yellow-500/50 rounded-xl">
                  <div className="flex items-center gap-2 mb-2">
                    <Lightbulb className="w-5 h-5 text-yellow-400" />
                    <span className="text-yellow-300 font-medium">Bạn đã thử 3 lần</span>
                  </div>
                  <button
                    onClick={handleShowAnswer}
                    className="w-full py-3 bg-yellow-500 text-white rounded-xl font-medium hover:bg-yellow-600"
                  >
                    Xem đáp án và tiếp tục
                  </button>
                </div>
              )}
            </motion.div>
          )}

          {/* Step 3: Write 4 sentences */}
          {step === "sentences" && mainObject && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="bg-white/10 backdrop-blur rounded-2xl p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-pink-500/20 rounded-lg">
                  <PenLine className="w-5 h-5 text-pink-400" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-white">Bước 3: Viết 4 câu với từ "{mainObject.english}"</h2>
                  <p className="text-white/60 text-sm">Viết 4 câu khác nhau có chứa từ vừa học</p>
                </div>
              </div>

              <div className="mb-4 p-3 bg-blue-500/20 border border-blue-500/30 rounded-xl">
                <p className="text-blue-300 text-sm">
                  💡 Gợi ý: Thử viết câu khẳng định, phủ định, câu hỏi, hoặc câu với các thì khác nhau
                </p>
              </div>

              <div className="space-y-3 mb-6">
                {sentences.map((s, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <span className="text-white/40 w-6 text-center">{i + 1}.</span>
                    <input
                      type="text"
                      value={s}
                      onChange={(e) => {
                        const newSentences = [...sentences];
                        newSentences[i] = e.target.value;
                        setSentences(newSentences);
                      }}
                      placeholder={`Câu ${i + 1} với từ "${mainObject.english}"...`}
                      className="flex-1 bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-white focus:border-pink-500 transition"
                    />
                  </div>
                ))}
              </div>

              <button
                onClick={handleCheckSentences}
                disabled={isLoading || sentences.filter(s => s.trim()).length < 4}
                className="w-full py-4 bg-gradient-to-r from-pink-500 to-violet-500 text-white rounded-xl font-medium disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Check className="w-5 h-5" />}
                Kiểm tra ngữ pháp
              </button>
              
              {sentences.filter(s => s.trim()).length < 4 && (
                <p className="text-orange-400 text-sm text-center mt-2">
                  Còn thiếu {4 - sentences.filter(s => s.trim()).length} câu
                </p>
              )}
            </motion.div>
          )}

          {/* Step 4: Checking */}
          {step === "checking" && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="bg-white/10 backdrop-blur rounded-2xl p-6 text-center">
              <Loader2 className="w-12 h-12 text-pink-400 animate-spin mx-auto mb-4" />
              <h2 className="text-xl font-bold text-white mb-2">Bước 4: Đang kiểm tra ngữ pháp...</h2>
              <p className="text-white/60">AI đang phân tích từng câu của bạn</p>
            </motion.div>
          )}

          {/* Step 4 Results: Show checked sentences */}
          {step === "results" && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
              {/* Checked sentences with edit option */}
              <div className="bg-white/10 backdrop-blur rounded-2xl p-6">
                <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-green-400" /> Kết quả kiểm tra ngữ pháp
                </h3>
                
                <div className="space-y-4">
                  {checkedSentences.map((s, i) => (
                    <div key={i} className={`p-4 rounded-xl transition-all ${
                      s.isCorrect 
                        ? "bg-green-500/10 border border-green-500/30" 
                        : "bg-red-500/10 border border-red-500/30"
                    }`}>
                      {/* Editing mode */}
                      {editingSentence === i ? (
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
                              onClick={() => { setEditingSentence(null); setEditedSentence(""); }}
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
                            
                            {/* Corrected sentence */}
                            {!s.isCorrect && s.correctedSentence && (
                              <p className="text-green-300 text-sm mt-1 flex items-center gap-1">
                                <Check className="w-4 h-4" /> {s.correctedSentence}
                              </p>
                            )}
                            
                            {/* Vietnamese translation */}
                            {s.vietnameseTranslation && (
                              <p className="text-white/60 text-sm mt-1">🇻🇳 {s.vietnameseTranslation}</p>
                            )}
                            
                            {/* Errors detail */}
                            {s.errors && s.errors.length > 0 && (
                              <div className="mt-2 space-y-1">
                                {s.errors.map((e, j) => (
                                  <div key={j} className="text-sm bg-red-500/20 rounded px-2 py-1">
                                    <span className="text-red-300 line-through">{e.original}</span>
                                    <span className="text-white/40 mx-1">→</span>
                                    <span className="text-green-300">{e.corrected}</span>
                                    {e.explanationVi && <span className="text-white/50 ml-2">({e.explanationVi})</span>}
                                  </div>
                                ))}
                              </div>
                            )}
                            
                            {/* Structure */}
                            {s.structure && s.structure.pattern && (
                              <div className="mt-2 text-sm bg-purple-500/20 rounded px-2 py-1 inline-block">
                                <span className="text-purple-300 font-mono">{s.structure.pattern}</span>
                                {s.structure.explanationVi && <span className="text-white/50 ml-2">- {s.structure.explanationVi}</span>}
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Summary and Save */}
              <div className="bg-white/10 backdrop-blur rounded-2xl p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-bold text-white">Tổng kết</h3>
                  <div className="flex items-center gap-4 text-sm">
                    <span className="text-green-400">✓ {checkedSentences.filter(s => s.isCorrect).length} đúng</span>
                    <span className="text-red-400">✗ {checkedSentences.filter(s => !s.isCorrect).length} sai</span>
                  </div>
                </div>

                {!allSentencesCorrect && (
                  <div className="mb-4 p-3 bg-yellow-500/20 border border-yellow-500/30 rounded-xl">
                    <p className="text-yellow-300 text-sm flex items-center gap-2">
                      <Lightbulb className="w-4 h-4" />
                      Bạn có thể sửa các câu sai bằng cách nhấn nút ✏️ và nộp lại
                    </p>
                  </div>
                )}

                {savedData ? (
                  <div className="text-center py-4">
                    <div className="w-16 h-16 mx-auto mb-3 bg-gradient-to-br from-green-500 to-emerald-500 rounded-full flex items-center justify-center">
                      <Check className="w-8 h-8 text-white" />
                    </div>
                    <p className="text-green-300 font-bold mb-2">🎉 Đã lưu thành công!</p>
                    <div className="flex justify-center gap-6 text-sm">
                      <span className="text-white/70">{savedData.vocabulary} từ vựng</span>
                      <span className="text-white/70">{savedData.structures} cấu trúc</span>
                      <span className="text-white/70">{savedData.errors} lỗi sai</span>
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={handleSaveAll}
                    disabled={isLoading}
                    className="w-full py-4 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-xl font-medium disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                    Lưu kết quả học tập
                  </button>
                )}
              </div>

              {/* Learn new word button */}
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
