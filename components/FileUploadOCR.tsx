"use client";
import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  Upload, FileText, CheckCircle, Loader, Download, BookOpen, AlertCircle,
  RefreshCw, ArrowRight, Volume2, VolumeX, Trash2, Clock, File, Brain, Sparkles, ListChecks
} from "lucide-react";

interface ProcessStep {
  id: number;
  title: string;
  description: string;
  icon: any;
  status: "pending" | "processing" | "completed" | "error";
}

interface OCRResult {
  fileId: string;
  filename: string;
  text: string;
  chunks: string[];
  vocabulary: string[];
  stats: { totalWords: number; uniqueWords: number; sentences: number; metadataRemoved?: number };
  logs?: ExtractionLog[];
}

interface ExtractionLog {
  step: string;
  data: any;
  timestamp: number;
}

interface Flashcard {
  id: string;
  word: string;
  vietnamese: string;
  pronunciation: string;
  partOfSpeech: string;
  exampleEn: string;
  exampleVi: string;
  level: string;
  tags: string[];
}

interface UploadedDocument {
  _id: string;
  fileName: string;
  fileType: string;
  fileSize: number;
  uploadDate: string;
  metadata?: { originalName: string; uploadedAt: string; };
}

export default function FileUploadOCR() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const userId = (session?.user as any)?.id;

  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [ocrResult, setOcrResult] = useState<OCRResult | null>(null);
  const [selectedWords, setSelectedWords] = useState<string[]>([]);
  const [flashcards, setFlashcards] = useState<Flashcard[]>([]);
  const [step, setStep] = useState<"upload" | "processing" | "review" | "flashcards">("upload");
  const [error, setError] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [playingWord, setPlayingWord] = useState<string | null>(null);
  const [uploadedDocuments, setUploadedDocuments] = useState<UploadedDocument[]>([]);
  const [isLoadingDocs, setIsLoadingDocs] = useState(false);
  const [isDeletingDoc, setIsDeletingDoc] = useState<string | null>(null);
  const [showDebugLogs, setShowDebugLogs] = useState(false);
  const [extractionLogs, setExtractionLogs] = useState<ExtractionLog[]>([]);
  
  // 3-step processing state
  const [processSteps, setProcessSteps] = useState<ProcessStep[]>([
    { id: 1, title: "Phân tích ngữ cảnh", description: "Đang phân tích nội dung văn bản...", icon: Brain, status: "pending" },
    { id: 2, title: "Trích lọc từ vựng", description: "Đang trích xuất cụm từ theo ngữ cảnh...", icon: ListChecks, status: "pending" },
    { id: 3, title: "Tạo Flashcards", description: "Đang tạo flashcards từ từ vựng...", icon: Sparkles, status: "pending" },
  ]);

  const trackProgress = (activity: string) => {
    if (!userId) return;
    fetch("/api/user-progress", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, activity }),
    }).catch(() => {});
  };

  useEffect(() => {
    if (status === "unauthenticated") router.push("/auth/login");
  }, [status, router]);

  useEffect(() => {
    const fetchDocuments = async () => {
      if (!userId) return;
      setIsLoadingDocs(true);
      try {
        const res = await fetch(`/api/documents?userId=${userId}`);
        const data = await res.json();
        if (data.success) setUploadedDocuments(data.documents);
      } catch (error) {
        console.error("Error fetching documents:", error);
      } finally {
        setIsLoadingDocs(false);
      }
    };
    fetchDocuments();
  }, [userId]);

  const updateStepStatus = (stepId: number, status: ProcessStep["status"]) => {
    setProcessSteps(prev => prev.map(s => s.id === stepId ? { ...s, status } : s));
  };

  const resetSteps = () => {
    setProcessSteps(prev => prev.map(s => ({ ...s, status: "pending" as const })));
  };

  const handleDeleteDocument = async (docId: string) => {
    if (!confirm("Bạn có chắc muốn xóa tài liệu này?")) return;
    setIsDeletingDoc(docId);
    try {
      const res = await fetch(`/api/documents?id=${docId}`, { method: "DELETE" });
      const data = await res.json();
      if (data.success) setUploadedDocuments(prev => prev.filter(doc => doc._id !== docId));
      else setError("Không thể xóa tài liệu");
    } catch (error) {
      setError("Lỗi khi xóa tài liệu");
    } finally {
      setIsDeletingDoc(null);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
    return (bytes / (1024 * 1024)).toFixed(1) + " MB";
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("vi-VN", {
      day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit",
    });
  };

  const speakWord = (word: string) => {
    if (playingWord === word) { window.speechSynthesis.cancel(); setPlayingWord(null); return; }
    window.speechSynthesis.cancel();
    if ('speechSynthesis' in window) {
      setPlayingWord(word);
      const utterance = new SpeechSynthesisUtterance(word);
      utterance.lang = 'en-US'; utterance.rate = 0.8;
      utterance.onend = () => setPlayingWord(null);
      utterance.onerror = () => setPlayingWord(null);
      window.speechSynthesis.speak(utterance);
    }
  };

  const resetAll = () => {
    setFile(null); setOcrResult(null); setSelectedWords([]); setFlashcards([]);
    setStep("upload"); setError(null); resetSteps();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      // Check file size (max 5MB for Vercel)
      if (selectedFile.size > 5 * 1024 * 1024) {
        setError("File quá lớn. Vui lòng chọn file nhỏ hơn 5MB.");
        return;
      }
      setFile(selectedFile);
      setError(null);
    }
  };

  const handleUpload = async () => {
    if (!file || !userId) {
      setError(!userId ? "Vui lòng đăng nhập để upload tài liệu" : "Vui lòng chọn file");
      return;
    }

    setIsUploading(true);
    setError(null);
    setStep("processing");
    resetSteps();

    try {
      // STEP 1: Upload & Context Analysis
      updateStepStatus(1, "processing");
      const formData = new FormData();
      formData.append("file", file);
      formData.append("userId", userId);
      formData.append("debug", "true"); // Enable debug logging

      const ocrRes = await fetch("/api/upload-ocr", { method: "POST", body: formData });
      const ocrData = await ocrRes.json();
      
      // Store extraction logs for debugging
      if (ocrData.logs) {
        setExtractionLogs(ocrData.logs);
      }
      
      if (!ocrRes.ok || !ocrData.success) {
        updateStepStatus(1, "error");
        throw new Error(ocrData.message || "Upload failed");
      }
      updateStepStatus(1, "completed");
      
      // Log stats for debugging
      console.log("[FileUploadOCR] Upload stats:", ocrData.stats);

      // STEP 2: Extract Vocabulary with AI
      updateStepStatus(2, "processing");
      const analyzeRes = await fetch("/api/analyze-text", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: ocrData.text, userId, action: "extract_vocabulary" }),
      });
      const analyzeData = await analyzeRes.json();
      
      // Log analysis results
      console.log("[FileUploadOCR] Analysis result:", {
        provider: analyzeData.provider,
        model: analyzeData.model,
        vocabCount: analyzeData.analysis?.vocabulary?.length,
        stats: analyzeData.analysis?.preprocessStats,
      });
      
      let vocabList: string[] = [];
      if (analyzeData.success && analyzeData.analysis?.vocabulary) {
        vocabList = analyzeData.analysis.vocabulary;
      } else {
        vocabList = ocrData.vocabulary || [];
      }
      vocabList = vocabList.filter((w: string) => w && w.trim().length > 1);
      
      if (vocabList.length === 0) {
        updateStepStatus(2, "error");
        throw new Error("Không tìm thấy từ vựng trong tài liệu. Có thể file chỉ chứa metadata hoặc hình ảnh.");
      }
      updateStepStatus(2, "completed");

      // STEP 3: Prepare for Flashcard Generation
      updateStepStatus(3, "processing");
      await new Promise(r => setTimeout(r, 500)); // Brief delay for UX
      updateStepStatus(3, "completed");

      setOcrResult({
        ...ocrData,
        vocabulary: vocabList,
        stats: {
          totalWords: analyzeData.analysis?.total_words || ocrData.stats?.totalWords || vocabList.length,
          uniqueWords: analyzeData.analysis?.unique_words || ocrData.stats?.uniqueWords || vocabList.length,
          sentences: ocrData.stats?.sentences || 1,
          metadataRemoved: ocrData.stats?.metadataRemoved || 0,
        },
        logs: ocrData.logs,
      });
      setSelectedWords(vocabList);
      setStep("review");
      trackProgress("documentUpload");

      // Refresh documents list
      const docsRes = await fetch(`/api/documents?userId=${userId}`);
      const docsData = await docsRes.json();
      if (docsData.success) setUploadedDocuments(docsData.documents);

    } catch (error: any) {
      console.error("Upload error:", error);
      setError(error.message || "Lỗi xử lý tài liệu");
      setStep("upload");
    } finally {
      setIsUploading(false);
    }
  };

  const toggleWord = (word: string) => {
    setSelectedWords(prev => prev.includes(word) ? prev.filter(w => w !== word) : [...prev, word]);
  };

  const selectAll = () => { if (ocrResult) setSelectedWords(ocrResult.vocabulary); };
  const deselectAll = () => { setSelectedWords([]); };

  const generateFlashcards = async () => {
    if (selectedWords.length === 0) return;
    setIsGenerating(true);
    setError(null);
    try {
      const res = await fetch("/api/generate-flashcard", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ words: selectedWords, userId }),
      });
      const data = await res.json();
      if (data.success) {
        setFlashcards(data.flashcards);
        setStep("flashcards");
        for (let i = 0; i < data.flashcards.length; i++) trackProgress("vocabularyLearned");
      } else {
        setError(data.message || "Lỗi tạo flashcard");
      }
    } catch (error) {
      setError("Lỗi kết nối. Vui lòng thử lại.");
    } finally {
      setIsGenerating(false);
    }
  };

  // Processing Step Component
  const ProcessingStepItem = ({ step: s }: { step: ProcessStep }) => {
    const Icon = s.icon;
    return (
      <div className={`flex items-center gap-4 p-4 rounded-xl transition-all ${
        s.status === "processing" ? "bg-blue-50 border-2 border-blue-300" :
        s.status === "completed" ? "bg-green-50 border-2 border-green-300" :
        s.status === "error" ? "bg-red-50 border-2 border-red-300" :
        "bg-gray-50 border-2 border-gray-200"
      }`}>
        <div className={`p-3 rounded-full ${
          s.status === "processing" ? "bg-blue-500 text-white" :
          s.status === "completed" ? "bg-green-500 text-white" :
          s.status === "error" ? "bg-red-500 text-white" :
          "bg-gray-300 text-gray-600"
        }`}>
          {s.status === "processing" ? (
            <Loader className="w-6 h-6 animate-spin" />
          ) : s.status === "completed" ? (
            <CheckCircle className="w-6 h-6" />
          ) : s.status === "error" ? (
            <AlertCircle className="w-6 h-6" />
          ) : (
            <Icon className="w-6 h-6" />
          )}
        </div>
        <div className="flex-1">
          <h3 className={`font-bold ${
            s.status === "processing" ? "text-blue-700" :
            s.status === "completed" ? "text-green-700" :
            s.status === "error" ? "text-red-700" :
            "text-gray-500"
          }`}>
            Bước {s.id}: {s.title}
          </h3>
          <p className="text-sm text-gray-600">{s.description}</p>
        </div>
        {s.status === "completed" && <span className="text-green-600 font-semibold">✓ Hoàn thành</span>}
        {s.status === "error" && <span className="text-red-600 font-semibold">✗ Lỗi</span>}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 p-6">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-4xl font-bold text-gray-900">📚 Document to Flashcards</h1>
          {step !== "upload" && step !== "processing" && (
            <button onClick={resetAll} className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 transition">
              <RefreshCw className="w-5 h-5" /> Upload file mới
            </button>
          )}
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl flex items-center gap-3 text-red-700">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            <p>{error}</p>
          </div>
        )}

        <AnimatePresence mode="wait">
          {/* PROCESSING STEP - Show 3 steps */}
          {step === "processing" && (
            <motion.div key="processing" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="space-y-6">
              <div className="bg-white rounded-3xl shadow-xl p-8">
                <h2 className="text-2xl font-bold text-gray-900 mb-6 text-center">🔄 Đang xử lý tài liệu...</h2>
                <div className="space-y-4">
                  {processSteps.map(s => <ProcessingStepItem key={s.id} step={s} />)}
                </div>
                <p className="text-center text-gray-500 mt-6">Vui lòng đợi trong giây lát...</p>
              </div>
            </motion.div>
          )}

          {/* UPLOAD STEP */}
          {step === "upload" && (
            <motion.div key="upload" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="space-y-6">
              {uploadedDocuments.length > 0 && (
                <div className="bg-white rounded-3xl shadow-xl p-6">
                  <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                    <FileText className="w-5 h-5 text-teal-600" /> Tài liệu đã upload ({uploadedDocuments.length})
                  </h2>
                  <div className="space-y-3 max-h-[300px] overflow-y-auto">
                    {isLoadingDocs ? (
                      <div className="flex items-center justify-center py-8"><Loader className="w-6 h-6 animate-spin text-teal-500" /></div>
                    ) : uploadedDocuments.map(doc => (
                      <div key={doc._id} className="flex items-center justify-between p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition">
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-teal-100 rounded-lg"><File className="w-5 h-5 text-teal-600" /></div>
                          <div>
                            <p className="font-medium text-gray-900 truncate max-w-[300px]">{doc.fileName || doc.metadata?.originalName}</p>
                            <div className="flex items-center gap-3 text-sm text-gray-500">
                              <span>{formatFileSize(doc.fileSize)}</span>
                              <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{formatDate(doc.uploadDate)}</span>
                            </div>
                          </div>
                        </div>
                        <button onClick={() => handleDeleteDocument(doc._id)} disabled={isDeletingDoc === doc._id} className="p-2 text-red-500 hover:bg-red-100 rounded-lg transition disabled:opacity-50">
                          {isDeletingDoc === doc._id ? <Loader className="w-5 h-5 animate-spin" /> : <Trash2 className="w-5 h-5" />}
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="bg-white rounded-3xl shadow-xl p-8">
                <h2 className="text-2xl font-bold text-gray-900 mb-6">Upload Document</h2>
                <div className="border-2 border-dashed border-gray-300 rounded-2xl p-12 text-center hover:border-teal-500 transition">
                  <input type="file" accept=".pdf,.png,.jpg,.jpeg,.docx,.txt" onChange={handleFileChange} className="hidden" id="file-upload" />
                  <label htmlFor="file-upload" className="cursor-pointer">
                    <Upload className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                    <p className="text-lg font-semibold text-gray-700 mb-2">Click to upload or drag and drop</p>
                    <p className="text-sm text-gray-500">PDF, PNG, JPG, DOCX, TXT (Max 5MB)</p>
                  </label>
                </div>
                {file && (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-6 flex items-center justify-between bg-teal-50 p-4 rounded-xl">
                    <div className="flex items-center gap-3">
                      <FileText className="w-6 h-6 text-teal-600" />
                      <div>
                        <p className="font-semibold text-gray-900">{file.name}</p>
                        <p className="text-sm text-gray-600">{formatFileSize(file.size)}</p>
                      </div>
                    </div>
                    <button onClick={handleUpload} disabled={isUploading} className="px-6 py-3 bg-gradient-to-r from-teal-500 to-emerald-600 text-white font-semibold rounded-xl hover:shadow-lg transition disabled:opacity-50 flex items-center gap-2">
                      {isUploading ? <><Loader className="w-5 h-5 animate-spin" /> Đang xử lý...</> : "Trích xuất từ vựng"}
                    </button>
                  </motion.div>
                )}
              </div>
            </motion.div>
          )}

          {/* REVIEW STEP */}
          {step === "review" && ocrResult && (
            <motion.div key="review" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="space-y-6">
              <div className="grid md:grid-cols-4 gap-4">
                <div className="bg-white rounded-2xl p-5 shadow-lg">
                  <p className="text-sm text-gray-600 mb-1">Total Words</p>
                  <p className="text-3xl font-bold text-teal-600">{ocrResult.stats.totalWords}</p>
                </div>
                <div className="bg-white rounded-2xl p-5 shadow-lg">
                  <p className="text-sm text-gray-600 mb-1">Từ vựng tìm thấy</p>
                  <p className="text-3xl font-bold text-blue-600">{ocrResult.vocabulary.length}</p>
                </div>
                <div className="bg-white rounded-2xl p-5 shadow-lg">
                  <p className="text-sm text-gray-600 mb-1">Đã chọn</p>
                  <p className="text-3xl font-bold text-purple-600">{selectedWords.length}</p>
                </div>
                <div className="bg-white rounded-2xl p-5 shadow-lg">
                  <p className="text-sm text-gray-600 mb-1">Metadata đã lọc</p>
                  <p className="text-3xl font-bold text-orange-600">{ocrResult.stats.metadataRemoved || 0}</p>
                </div>
              </div>

              {/* Debug Logs Toggle */}
              {extractionLogs.length > 0 && (
                <div className="bg-gray-50 rounded-2xl p-4">
                  <button 
                    onClick={() => setShowDebugLogs(!showDebugLogs)}
                    className="flex items-center gap-2 text-gray-700 font-medium hover:text-gray-900"
                  >
                    <Brain className="w-5 h-5" />
                    {showDebugLogs ? "Ẩn" : "Xem"} Debug Logs ({extractionLogs.length} bước)
                  </button>
                  
                  {showDebugLogs && (
                    <div className="mt-4 space-y-3 max-h-[400px] overflow-y-auto">
                      {extractionLogs.map((log, idx) => (
                        <div key={idx} className="bg-white rounded-xl p-4 border border-gray-200">
                          <div className="flex items-center justify-between mb-2">
                            <span className="font-bold text-gray-800">{log.step}</span>
                            <span className="text-xs text-gray-500">{log.timestamp}ms</span>
                          </div>
                          <pre className="text-xs bg-gray-100 p-3 rounded-lg overflow-x-auto text-gray-700">
                            {JSON.stringify(log.data, null, 2)}
                          </pre>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              <div className="bg-white rounded-3xl shadow-xl p-8">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-2xl font-bold text-gray-900">Chọn từ vựng để tạo Flashcards</h2>
                  <div className="flex gap-2">
                    <button onClick={selectAll} className="px-3 py-1.5 text-sm bg-teal-100 text-teal-700 rounded-lg hover:bg-teal-200">Chọn tất cả</button>
                    <button onClick={deselectAll} className="px-3 py-1.5 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200">Bỏ chọn</button>
                  </div>
                </div>
                <div className="flex flex-wrap gap-3 mb-6 max-h-[300px] overflow-y-auto p-2">
                  {ocrResult.vocabulary.map(word => (
                    <button key={word} onClick={() => toggleWord(word)} className={`px-4 py-2 rounded-xl font-medium transition ${selectedWords.includes(word) ? "bg-teal-500 text-white shadow-lg" : "bg-gray-100 text-gray-700 hover:bg-gray-200"}`}>
                      {word}
                    </button>
                  ))}
                </div>
                <button onClick={generateFlashcards} disabled={selectedWords.length === 0 || isGenerating} className="w-full px-6 py-4 bg-gradient-to-r from-teal-500 to-emerald-600 text-white text-lg font-bold rounded-xl hover:shadow-xl transition disabled:opacity-50 flex items-center justify-center gap-2">
                  {isGenerating ? <><Loader className="w-5 h-5 animate-spin" /> Đang tạo flashcards...</> : `Tạo ${selectedWords.length} Flashcards`}
                </button>
              </div>
            </motion.div>
          )}

          {/* FLASHCARDS STEP */}
          {step === "flashcards" && (
            <motion.div key="flashcards" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="space-y-6">
              <div className="bg-green-50 border border-green-200 rounded-2xl p-6 flex items-center gap-4">
                <CheckCircle className="w-10 h-10 text-green-500" />
                <div>
                  <h3 className="text-lg font-bold text-green-800">Đã tạo {flashcards.length} flashcards thành công!</h3>
                  <p className="text-green-600">Từ vựng đã được lưu vào danh sách học của bạn</p>
                </div>
                <button onClick={() => router.push("/dashboard-new/vocabulary")} className="ml-auto px-6 py-3 bg-green-600 text-white font-semibold rounded-xl hover:bg-green-700 transition flex items-center gap-2">
                  <BookOpen className="w-5 h-5" /> Đi đến Từ vựng <ArrowRight className="w-5 h-5" />
                </button>
              </div>
              <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold text-gray-900">Flashcards ({flashcards.length})</h2>
                <button onClick={() => window.open(`/api/generate-flashcard?userId=${userId}&format=csv`, "_blank")} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition">
                  <Download className="w-5 h-5" /> Export CSV
                </button>
              </div>
              <div className="grid md:grid-cols-2 gap-6">
                {flashcards.map(card => (
                  <motion.div key={card.id} initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="bg-white rounded-2xl shadow-lg p-6 hover:shadow-xl transition">
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="text-2xl font-bold text-gray-900">{card.word}</h3>
                          <button onClick={() => speakWord(card.word)} className={`p-2 rounded-full transition ${playingWord === card.word ? "bg-teal-500 text-white" : "bg-gray-100 text-gray-600 hover:bg-teal-100 hover:text-teal-600"}`}>
                            {playingWord === card.word ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                          </button>
                        </div>
                        <p className="text-blue-600 text-sm">{card.pronunciation}</p>
                        <p className="text-lg text-purple-600 font-medium">{card.vietnamese}</p>
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        <span className="px-3 py-1 bg-teal-100 text-teal-700 text-xs font-semibold rounded-full">{card.level}</span>
                        <span className="px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded">{card.partOfSpeech}</span>
                      </div>
                    </div>
                    <div className="bg-gray-50 rounded-xl p-3">
                      <div className="flex items-center justify-between mb-1">
                        <p className="text-sm font-semibold text-gray-600">Example:</p>
                        <button onClick={() => speakWord(card.exampleEn)} className="p-1 rounded-full bg-gray-200 text-gray-600 hover:bg-teal-100 hover:text-teal-600 transition">
                          <Volume2 className="w-3 h-3" />
                        </button>
                      </div>
                      <p className="text-gray-800">{card.exampleEn}</p>
                      <p className="text-gray-600 text-sm italic mt-1">{card.exampleVi}</p>
                    </div>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
