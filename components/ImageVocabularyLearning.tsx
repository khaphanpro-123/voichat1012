"use client";

import { useState, useRef, useCallback } from "react";
import { useSession } from "next-auth/react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Upload, Camera, Image as ImageIcon, Send, Check, X, Volume2,
  BookOpen, AlertCircle, Loader2, ChevronRight, Save, RefreshCw,
  Sparkles, Languages, PenLine, CheckCircle2, XCircle
} from "lucide-react";
import DashboardLayout from "./DashboardLayout";

interface MainObject {
  english: string;
  vietnamese: string;
  partOfSpeech: string;
  pronunciation: string;
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

interface SampleSentence {
  english: string;
  vietnamese: string;
  type: string;
  structure: {
    pattern: string;
    explanation: string;
    explanationVi: string;
  };
}

type Step = "upload" | "identify" | "guess" | "sentences" | "checking" | "samples" | "results";

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
  const [userGuess, setUserGuess] = useState("");
  const [guessResult, setGuessResult] = useState<{ isCorrect: boolean; message: string } | null>(null);
  const [sentences, setSentences] = useState<string[]>(["", "", "", ""]);
  const [checkedSentences, setCheckedSentences] = useState<SentenceCheck[]>([]);
  const [sampleSentences, setSampleSentences] = useState<SampleSentence[]>([]);
  const [savedData, setSavedData] = useState<{ vocabulary: number; structures: number; errors: number } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

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

  // Step 1: Identify image
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
          setMainObject(data.data.mainObject);
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
        body: JSON.stringify({ action: "identifyFromDescription", description, userId })
      });
      const data = await res.json();
      
      if (data.success && data.data.mainObject) {
        setMainObject(data.data.mainObject);
        setNeedsDescription(false);
        setStep("guess");
      } else {
        setError(data.message || "Không thể xác định đối tượng");
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  // Step 2: Check guess
  const handleGuessSubmit = async () => {
    if (!userGuess.trim() || !mainObject) return;
    setIsLoading(true);
    try {
      const res = await fetch("/api/image-vocabulary-learning", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "checkGuess", guess: userGuess, correctWord: mainObject.english, userId })
      });
      const data = await res.json();
      
      if (data.success) {
        setGuessResult(data.data);
        setTimeout(() => setStep("sentences"), 1500);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  // Step 4: Check sentences
  const handleCheckSentences = async () => {
    if (!mainObject) return;
    const validSentences = sentences.filter(s => s.trim());
    if (validSentences.length === 0) {
      setError("Vui lòng viết ít nhất 1 câu");
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

    // Generate sample sentences
    await generateSamples(validSentences);
  };

  // Step 5: Generate sample sentences
  const generateSamples = async (userSentences: string[]) => {
    if (!mainObject) return;
    setIsLoading(true);
    try {
      const res = await fetch("/api/image-vocabulary-learning", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "generateSamples", word: mainObject.english, userSentences, userId })
      });
      const data = await res.json();
      
      if (data.success && data.data.sampleSentences) {
        setSampleSentences(data.data.sampleSentences);
      }
    } catch (err) {
      console.error("Generate samples error:", err);
    } finally {
      setIsLoading(false);
      setStep("samples");
    }
  };

  // Step 7: Save all data
  const handleSaveAll = async () => {
    if (!mainObject) return;
    setIsLoading(true);
    try {
      // Collect all structures
      const structures = [
        ...checkedSentences.map(s => ({ pattern: s.structure.pattern, explanation: s.structure.explanation, example: s.sentence })),
        ...sampleSentences.map(s => ({ pattern: s.structure.pattern, explanation: s.structure.explanation, example: s.english }))
      ];

      // Collect all errors
      const errors = checkedSentences
        .filter(s => !s.isCorrect)
        .flatMap(s => s.errors.map(e => ({
          original: e.original,
          corrected: e.corrected,
          type: e.type,
          explanation: e.explanation
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
        setStep("results");
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  // Reset and start over
  const handleReset = () => {
    setStep("upload");
    setImagePreview(null);
    setImageBase64(null);
    setMainObject(null);
    setNeedsDescription(false);
    setDescription("");
    setUserGuess("");
    setGuessResult(null);
    setSentences(["", "", "", ""]);
    setCheckedSentences([]);
    setSampleSentences([]);
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
            <p className="text-white/60 text-sm mt-1">Chọn ảnh → Đoán từ → Viết câu → Học cấu trúc</p>
          </div>

          {/* Progress */}
          <div className="flex items-center justify-center gap-2 mb-6">
            {["upload", "guess", "sentences", "results"].map((s, i) => (
              <div key={s} className="flex items-center">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                  step === s || (i === 0 && step === "identify") || (i === 2 && (step === "checking" || step === "samples"))
                    ? "bg-pink-500 text-white"
                    : i < ["upload", "guess", "sentences", "results"].indexOf(step) || step === "results"
                    ? "bg-green-500 text-white"
                    : "bg-white/20 text-white/50"
                }`}>
                  {i + 1}
                </div>
                {i < 3 && <ChevronRight className="w-4 h-4 text-white/30 mx-1" />}
              </div>
            ))}
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
              <h2 className="text-xl font-bold text-white mb-2">Chọn hình ảnh</h2>
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
                  <p className="text-white/70">Đang phân tích hình ảnh...</p>
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

          {/* Step 2: Guess */}
          {step === "guess" && mainObject && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="bg-white/10 backdrop-blur rounded-2xl p-6">
              {imagePreview && (
                <img src={imagePreview} alt="Preview" className="w-full max-h-48 object-contain rounded-xl mb-4" />
              )}
              
              <div className="text-center mb-6">
                <h2 className="text-xl font-bold text-white mb-2">Đây là gì?</h2>
                <p className="text-white/60">Nhập từ tiếng Anh cho đối tượng trong ảnh</p>
              </div>

              <div className="flex gap-2 mb-4">
                <input
                  type="text"
                  value={userGuess}
                  onChange={(e) => setUserGuess(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleGuessSubmit()}
                  placeholder="Nhập từ tiếng Anh..."
                  className="flex-1 bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-white text-lg"
                  disabled={!!guessResult}
                />
                <button 
                  onClick={handleGuessSubmit} 
                  disabled={isLoading || !!guessResult}
                  className="px-6 py-3 bg-pink-500 text-white rounded-xl disabled:opacity-50"
                >
                  {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Check className="w-5 h-5" />}
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
                  <div className="mt-2 flex items-center gap-4">
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
                </motion.div>
              )}
            </motion.div>
          )}

          {/* Step 3: Write sentences */}
          {step === "sentences" && mainObject && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="bg-white/10 backdrop-blur rounded-2xl p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-pink-500/20 rounded-lg">
                  <PenLine className="w-5 h-5 text-pink-400" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-white">Viết 4 câu với từ "{mainObject.english}"</h2>
                  <p className="text-white/60 text-sm">Thử các dạng câu khác nhau: khẳng định, phủ định, câu hỏi...</p>
                </div>
              </div>

              <div className="space-y-3 mb-6">
                {sentences.map((s, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <span className="text-white/40 w-6">{i + 1}.</span>
                    <input
                      type="text"
                      value={s}
                      onChange={(e) => {
                        const newSentences = [...sentences];
                        newSentences[i] = e.target.value;
                        setSentences(newSentences);
                      }}
                      placeholder={`Câu ${i + 1}...`}
                      className="flex-1 bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-white"
                    />
                  </div>
                ))}
              </div>

              <button
                onClick={handleCheckSentences}
                disabled={isLoading || sentences.every(s => !s.trim())}
                className="w-full py-4 bg-gradient-to-r from-pink-500 to-violet-500 text-white rounded-xl font-medium disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Check className="w-5 h-5" />}
                Kiểm tra câu
              </button>
            </motion.div>
          )}

          {/* Step 4: Checking sentences */}
          {step === "checking" && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="bg-white/10 backdrop-blur rounded-2xl p-6 text-center">
              <Loader2 className="w-12 h-12 text-pink-400 animate-spin mx-auto mb-4" />
              <h2 className="text-xl font-bold text-white mb-2">Đang kiểm tra câu...</h2>
              <p className="text-white/60">Phân tích ngữ pháp, chính tả và cách dùng từ</p>
            </motion.div>
          )}

          {/* Step 5-6: Show results and samples */}
          {step === "samples" && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
              {/* Checked sentences */}
              <div className="bg-white/10 backdrop-blur rounded-2xl p-6">
                <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-green-400" /> Kết quả kiểm tra
                </h3>
                <div className="space-y-4">
                  {checkedSentences.map((s, i) => (
                    <div key={i} className={`p-4 rounded-xl ${s.isCorrect ? "bg-green-500/10 border border-green-500/30" : "bg-red-500/10 border border-red-500/30"}`}>
                      <div className="flex items-start gap-2">
                        {s.isCorrect ? <CheckCircle2 className="w-5 h-5 text-green-400 mt-0.5" /> : <XCircle className="w-5 h-5 text-red-400 mt-0.5" />}
                        <div className="flex-1">
                          <p className="text-white font-medium">{s.sentence}</p>
                          {!s.isCorrect && (
                            <p className="text-green-300 text-sm mt-1">✓ {s.correctedSentence}</p>
                          )}
                          <p className="text-white/60 text-sm mt-1">🇻🇳 {s.vietnameseTranslation}</p>
                          
                          {/* Errors */}
                          {s.errors && s.errors.length > 0 && (
                            <div className="mt-2 space-y-1">
                              {s.errors.map((e, j) => (
                                <div key={j} className="text-sm bg-red-500/20 rounded px-2 py-1">
                                  <span className="text-red-300">{e.original}</span>
                                  <span className="text-white/40 mx-1">→</span>
                                  <span className="text-green-300">{e.corrected}</span>
                                  <span className="text-white/50 ml-2">({e.explanationVi})</span>
                                </div>
                              ))}
                            </div>
                          )}
                          
                          {/* Structure */}
                          <div className="mt-2 text-sm bg-purple-500/20 rounded px-2 py-1">
                            <span className="text-purple-300 font-mono">{s.structure.pattern}</span>
                            <span className="text-white/50 ml-2">- {s.structure.explanationVi}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Sample sentences */}
              {sampleSentences.length > 0 && (
                <div className="bg-white/10 backdrop-blur rounded-2xl p-6">
                  <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-yellow-400" /> Câu mẫu bổ sung
                  </h3>
                  <div className="space-y-3">
                    {sampleSentences.map((s, i) => (
                      <div key={i} className="p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-xl">
                        <div className="flex items-center gap-2">
                          <span className="text-xs bg-yellow-500/30 text-yellow-300 px-2 py-0.5 rounded">{s.type}</span>
                          <button onClick={() => speak(s.english)} className="p-1 hover:bg-white/10 rounded">
                            <Volume2 className="w-4 h-4 text-white/60" />
                          </button>
                        </div>
                        <p className="text-white font-medium mt-1">{s.english}</p>
                        <p className="text-white/60 text-sm">🇻🇳 {s.vietnamese}</p>
                        <div className="mt-1 text-sm">
                          <span className="text-purple-300 font-mono">{s.structure.pattern}</span>
                          <span className="text-white/50 ml-2">- {s.structure.explanationVi}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Save button */}
              <button
                onClick={handleSaveAll}
                disabled={isLoading}
                className="w-full py-4 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-xl font-medium disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                Lưu kết quả học tập
              </button>
            </motion.div>
          )}

          {/* Step 8: Final results */}
          {step === "results" && savedData && (
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="bg-white/10 backdrop-blur rounded-2xl p-8 text-center">
              <div className="w-20 h-20 mx-auto mb-4 bg-gradient-to-br from-green-500 to-emerald-500 rounded-full flex items-center justify-center">
                <Check className="w-10 h-10 text-white" />
              </div>
              <h2 className="text-2xl font-bold text-white mb-2">🎉 Hoàn thành!</h2>
              <p className="text-white/60 mb-6">Dữ liệu học tập đã được lưu</p>

              <div className="grid grid-cols-3 gap-4 mb-6">
                <div className="bg-green-500/20 rounded-xl p-4">
                  <BookOpen className="w-6 h-6 text-green-400 mx-auto mb-1" />
                  <p className="text-2xl font-bold text-white">{savedData.vocabulary}</p>
                  <p className="text-white/60 text-sm">Từ vựng</p>
                </div>
                <div className="bg-purple-500/20 rounded-xl p-4">
                  <Languages className="w-6 h-6 text-purple-400 mx-auto mb-1" />
                  <p className="text-2xl font-bold text-white">{savedData.structures}</p>
                  <p className="text-white/60 text-sm">Cấu trúc</p>
                </div>
                <div className="bg-orange-500/20 rounded-xl p-4">
                  <AlertCircle className="w-6 h-6 text-orange-400 mx-auto mb-1" />
                  <p className="text-2xl font-bold text-white">{savedData.errors}</p>
                  <p className="text-white/60 text-sm">Lỗi sai</p>
                </div>
              </div>

              <button
                onClick={handleReset}
                className="px-8 py-4 bg-gradient-to-r from-pink-500 to-violet-500 text-white rounded-xl font-medium flex items-center gap-2 mx-auto"
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
