"use client";
import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  Upload,
  FileText,
  CheckCircle,
  Loader,
  Download,
  BookOpen,
  AlertCircle,
  RefreshCw,
  ArrowRight,
  Volume2,
  VolumeX,
  Trash2,
  Clock,
  File,
} from "lucide-react";

interface OCRResult {
  fileId: string;
  filename: string;
  text: string;
  chunks: string[];
  vocabulary: string[];
  stats: {
    totalWords: number;
    uniqueWords: number;
    sentences: number;
  };
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
  metadata?: {
    originalName: string;
    uploadedAt: string;
  };
}

export default function FileUploadOCR() {
  const { data: session, status } = useSession();
  const router = useRouter();
  
  // Get userId from session - wait for session to load
  const userId = (session?.user as any)?.id;
  
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [ocrResult, setOcrResult] = useState<OCRResult | null>(null);
  const [selectedWords, setSelectedWords] = useState<string[]>([]);
  const [flashcards, setFlashcards] = useState<Flashcard[]>([]);
  const [step, setStep] = useState<"upload" | "review" | "flashcards">("upload");
  const [error, setError] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [playingWord, setPlayingWord] = useState<string | null>(null);
  const [uploadedDocuments, setUploadedDocuments] = useState<UploadedDocument[]>([]);
  const [isLoadingDocs, setIsLoadingDocs] = useState(false);
  const [isDeletingDoc, setIsDeletingDoc] = useState<string | null>(null);

  // Track user progress
  const trackProgress = async (activity: string) => {
    if (!userId) return;
    try {
      await fetch("/api/user-progress", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, activity }),
      });
    } catch (err) {
      console.error("Track progress error:", err);
    }
  };

  // Redirect if not authenticated
  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/auth/login");
    }
  }, [status, router]);

  // Fetch uploaded documents
  useEffect(() => {
    const fetchDocuments = async () => {
      if (!userId) return;
      
      setIsLoadingDocs(true);
      try {
        const res = await fetch(`/api/documents?userId=${userId}`);
        const data = await res.json();
        if (data.success) {
          setUploadedDocuments(data.documents);
        }
      } catch (error) {
        console.error("Error fetching documents:", error);
      } finally {
        setIsLoadingDocs(false);
      }
    };

    fetchDocuments();
  }, [userId]);

  // Delete document
  const handleDeleteDocument = async (docId: string) => {
    if (!confirm("Bạn có chắc muốn xóa tài liệu này?")) return;
    
    setIsDeletingDoc(docId);
    try {
      const res = await fetch(`/api/documents?id=${docId}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (data.success) {
        setUploadedDocuments(prev => prev.filter(doc => doc._id !== docId));
      } else {
        setError("Không thể xóa tài liệu");
      }
    } catch (error) {
      console.error("Error deleting document:", error);
      setError("Lỗi khi xóa tài liệu");
    } finally {
      setIsDeletingDoc(null);
    }
  };

  // Format file size
  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
    return (bytes / (1024 * 1024)).toFixed(1) + " MB";
  };

  // Format date
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString("vi-VN", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // Speak word using Web Speech API
  const speakWord = (word: string) => {
    if (playingWord === word) {
      window.speechSynthesis.cancel();
      setPlayingWord(null);
      return;
    }

    window.speechSynthesis.cancel();
    
    if ('speechSynthesis' in window) {
      setPlayingWord(word);
      const utterance = new SpeechSynthesisUtterance(word);
      utterance.lang = 'en-US';
      utterance.rate = 0.8;
      utterance.pitch = 1.0;
      
      utterance.onend = () => setPlayingWord(null);
      utterance.onerror = () => setPlayingWord(null);
      
      window.speechSynthesis.speak(utterance);
    }
  };

  const resetAll = () => {
    setFile(null);
    setOcrResult(null);
    setSelectedWords([]);
    setFlashcards([]);
    setStep("upload");
    setError(null);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setError(null);
    }
  };

  const handleUpload = async () => {
    if (!file) return;
    
    // Check if user is authenticated
    if (!userId) {
      setError("Vui lòng đăng nhập để upload tài liệu");
      return;
    }

    setIsUploading(true);
    setError(null);
    const formData = new FormData();
    formData.append("file", file);
    formData.append("userId", userId); // Add userId to save document correctly

    try {
      // Step 1: Upload and OCR
      const ocrRes = await fetch("/api/upload-ocr", {
        method: "POST",
        body: formData,
      });

      const ocrData = await ocrRes.json();
      if (!ocrData.success) {
        throw new Error(ocrData.message || "OCR failed");
      }

      // Step 2: Analyze text with AI to extract vocabulary
      const analyzeRes = await fetch("/api/analyze-text", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          text: ocrData.text, 
          userId,
          action: "extract_vocabulary" 
        }),
      });

      const analyzeData = await analyzeRes.json();
      
      let vocabList: string[] = [];
      
      if (analyzeData.success && analyzeData.analysis?.vocabulary) {
        vocabList = analyzeData.analysis.vocabulary;
      } else {
        // Fallback to OCR vocabulary
        vocabList = ocrData.vocabulary;
      }

      // Filter out empty/invalid words
      vocabList = vocabList.filter((w: string) => w && w.trim().length > 1);

      if (vocabList.length === 0) {
        throw new Error("Không tìm thấy từ vựng trong tài liệu. Vui lòng thử file khác.");
      }

      setOcrResult({
        ...ocrData,
        vocabulary: vocabList,
        stats: {
          totalWords: analyzeData.analysis?.total_words || ocrData.stats?.totalWords || vocabList.length,
          uniqueWords: analyzeData.analysis?.unique_words || ocrData.stats?.uniqueWords || vocabList.length,
          sentences: ocrData.stats?.sentences || 1,
        },
      });
      
      // Auto-select all words
      setSelectedWords(vocabList);
      setStep("review");
      
      // Track document upload
      trackProgress("documentUpload");
      
      // Refresh uploaded documents list
      const docsRes = await fetch(`/api/documents?userId=${userId}`);
      const docsData = await docsRes.json();
      if (docsData.success) {
        setUploadedDocuments(docsData.documents);
      }
    } catch (error: any) {
      console.error("Upload error:", error);
      setError(error.message || "Lỗi xử lý tài liệu. Vui lòng kiểm tra API key trong Settings.");
    } finally {
      setIsUploading(false);
    }
  };

  const toggleWord = (word: string) => {
    setSelectedWords((prev) =>
      prev.includes(word) ? prev.filter((w) => w !== word) : [...prev, word]
    );
  };

  const selectAll = () => {
    if (ocrResult) {
      setSelectedWords(ocrResult.vocabulary);
    }
  };

  const deselectAll = () => {
    setSelectedWords([]);
  };

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
        
        // Track vocabulary learned (each flashcard = 1 vocabulary)
        for (let i = 0; i < data.flashcards.length; i++) {
          trackProgress("vocabularyLearned");
        }
      } else {
        setError(data.message || "Lỗi tạo flashcard. Vui lòng kiểm tra API key.");
      }
    } catch (error) {
      console.error("Flashcard generation error:", error);
      setError("Lỗi kết nối. Vui lòng thử lại.");
    } finally {
      setIsGenerating(false);
    }
  };

  const goToVocabulary = () => {
    router.push("/dashboard-new/vocabulary");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 p-6">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-4xl font-bold text-gray-900">
            📚 Document to Flashcards
          </h1>
          {step !== "upload" && (
            <button
              onClick={resetAll}
              className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 transition"
            >
              <RefreshCw className="w-5 h-5" />
              Upload file mới
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
          {step === "upload" && (
            <motion.div
              key="upload"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-6"
            >
              {/* Uploaded Documents List */}
              {uploadedDocuments.length > 0 && (
                <div className="bg-white rounded-3xl shadow-xl p-6">
                  <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                    <FileText className="w-5 h-5 text-teal-600" />
                    Tài liệu đã upload ({uploadedDocuments.length})
                  </h2>
                  <div className="space-y-3 max-h-[300px] overflow-y-auto">
                    {isLoadingDocs ? (
                      <div className="flex items-center justify-center py-8">
                        <Loader className="w-6 h-6 animate-spin text-teal-500" />
                        <span className="ml-2 text-gray-500">Đang tải...</span>
                      </div>
                    ) : (
                      uploadedDocuments.map((doc) => (
                        <div
                          key={doc._id}
                          className="flex items-center justify-between p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition"
                        >
                          <div className="flex items-center gap-3">
                            <div className="p-2 bg-teal-100 rounded-lg">
                              <File className="w-5 h-5 text-teal-600" />
                            </div>
                            <div>
                              <p className="font-medium text-gray-900 truncate max-w-[300px]">
                                {doc.fileName || doc.metadata?.originalName}
                              </p>
                              <div className="flex items-center gap-3 text-sm text-gray-500">
                                <span>{formatFileSize(doc.fileSize)}</span>
                                <span className="flex items-center gap-1">
                                  <Clock className="w-3 h-3" />
                                  {formatDate(doc.uploadDate)}
                                </span>
                              </div>
                            </div>
                          </div>
                          <button
                            onClick={() => handleDeleteDocument(doc._id)}
                            disabled={isDeletingDoc === doc._id}
                            className="p-2 text-red-500 hover:bg-red-100 rounded-lg transition disabled:opacity-50"
                            title="Xóa tài liệu"
                          >
                            {isDeletingDoc === doc._id ? (
                              <Loader className="w-5 h-5 animate-spin" />
                            ) : (
                              <Trash2 className="w-5 h-5" />
                            )}
                          </button>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}

              {/* Upload Form */}
              <div className="bg-white rounded-3xl shadow-xl p-8">
                <h2 className="text-2xl font-bold text-gray-900 mb-6">
                  Upload Document
                </h2>

              <div className="border-2 border-dashed border-gray-300 rounded-2xl p-12 text-center hover:border-teal-500 transition">
                <input
                  type="file"
                  accept=".pdf,.png,.jpg,.jpeg,.docx,.txt"
                  onChange={handleFileChange}
                  className="hidden"
                  id="file-upload"
                />
                <label htmlFor="file-upload" className="cursor-pointer">
                  <Upload className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                  <p className="text-lg font-semibold text-gray-700 mb-2">
                    Click to upload or drag and drop
                  </p>
                  <p className="text-sm text-gray-500">
                    PDF, PNG, JPG, DOCX, TXT (Max 10MB)
                  </p>
                </label>
              </div>

              {file && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="mt-6 flex items-center justify-between bg-teal-50 p-4 rounded-xl"
                >
                  <div className="flex items-center gap-3">
                    <FileText className="w-6 h-6 text-teal-600" />
                    <div>
                      <p className="font-semibold text-gray-900">{file.name}</p>
                      <p className="text-sm text-gray-600">
                        {(file.size / 1024).toFixed(2)} KB
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={handleUpload}
                    disabled={isUploading}
                    className="px-6 py-3 bg-gradient-to-r from-teal-500 to-emerald-600 text-white font-semibold rounded-xl hover:shadow-lg transition disabled:opacity-50 flex items-center gap-2"
                  >
                    {isUploading ? (
                      <>
                        <Loader className="w-5 h-5 animate-spin" />
                        Đang xử lý...
                      </>
                    ) : (
                      "Trích xuất từ vựng"
                    )}
                  </button>
                </motion.div>
              )}
              </div>
            </motion.div>
          )}

          {step === "review" && ocrResult && (
            <motion.div
              key="review"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-6"
            >
              {/* Stats */}
              <div className="grid md:grid-cols-3 gap-6">
                <div className="bg-white rounded-2xl p-6 shadow-lg">
                  <p className="text-sm text-gray-600 mb-1">Total Words</p>
                  <p className="text-3xl font-bold text-teal-600">
                    {ocrResult.stats.totalWords}
                  </p>
                </div>
                <div className="bg-white rounded-2xl p-6 shadow-lg">
                  <p className="text-sm text-gray-600 mb-1">Từ vựng tìm thấy</p>
                  <p className="text-3xl font-bold text-blue-600">
                    {ocrResult.vocabulary.length}
                  </p>
                </div>
                <div className="bg-white rounded-2xl p-6 shadow-lg">
                  <p className="text-sm text-gray-600 mb-1">Đã chọn</p>
                  <p className="text-3xl font-bold text-purple-600">
                    {selectedWords.length}
                  </p>
                </div>
              </div>

              {/* Vocabulary Selection */}
              <div className="bg-white rounded-3xl shadow-xl p-8">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-2xl font-bold text-gray-900">
                    Chọn từ vựng để tạo Flashcards
                  </h2>
                  <div className="flex gap-2">
                    <button
                      onClick={selectAll}
                      className="px-3 py-1.5 text-sm bg-teal-100 text-teal-700 rounded-lg hover:bg-teal-200"
                    >
                      Chọn tất cả
                    </button>
                    <button
                      onClick={deselectAll}
                      className="px-3 py-1.5 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
                    >
                      Bỏ chọn
                    </button>
                  </div>
                </div>

                {ocrResult.vocabulary.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <AlertCircle className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                    <p>Không tìm thấy từ vựng. Vui lòng thử file khác.</p>
                  </div>
                ) : (
                  <div className="flex flex-wrap gap-3 mb-6 max-h-[300px] overflow-y-auto p-2">
                    {ocrResult.vocabulary.map((word) => (
                      <button
                        key={word}
                        onClick={() => toggleWord(word)}
                        className={`px-4 py-2 rounded-xl font-medium transition ${
                          selectedWords.includes(word)
                            ? "bg-teal-500 text-white shadow-lg"
                            : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                        }`}
                      >
                        {word}
                      </button>
                    ))}
                  </div>
                )}

                <button
                  onClick={generateFlashcards}
                  disabled={selectedWords.length === 0 || isGenerating}
                  className="w-full px-6 py-4 bg-gradient-to-r from-teal-500 to-emerald-600 text-white text-lg font-bold rounded-xl hover:shadow-xl transition disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {isGenerating ? (
                    <>
                      <Loader className="w-5 h-5 animate-spin" />
                      Đang tạo flashcards...
                    </>
                  ) : (
                    `Tạo ${selectedWords.length} Flashcards`
                  )}
                </button>
              </div>
            </motion.div>
          )}

          {step === "flashcards" && (
            <motion.div
              key="flashcards"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-6"
            >
              {/* Success Banner */}
              <div className="bg-green-50 border border-green-200 rounded-2xl p-6 flex items-center gap-4">
                <CheckCircle className="w-10 h-10 text-green-500" />
                <div>
                  <h3 className="text-lg font-bold text-green-800">
                    Đã tạo {flashcards.length} flashcards thành công!
                  </h3>
                  <p className="text-green-600">
                    Từ vựng đã được lưu vào danh sách học của bạn
                  </p>
                </div>
                <button
                  onClick={goToVocabulary}
                  className="ml-auto px-6 py-3 bg-green-600 text-white font-semibold rounded-xl hover:bg-green-700 transition flex items-center gap-2"
                >
                  <BookOpen className="w-5 h-5" />
                  Đi đến Từ vựng
                  <ArrowRight className="w-5 h-5" />
                </button>
              </div>

              <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold text-gray-900">
                  Flashcards ({flashcards.length})
                </h2>
                <button
                  onClick={() => window.open(`/api/generate-flashcard?userId=${userId}&format=csv`, "_blank")}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition"
                >
                  <Download className="w-5 h-5" />
                  Export CSV
                </button>
              </div>

              <div className="grid md:grid-cols-2 gap-6">
                {flashcards.map((card) => (
                  <motion.div
                    key={card.id}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="bg-white rounded-2xl shadow-lg p-6 hover:shadow-xl transition"
                  >
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="text-2xl font-bold text-gray-900">
                            {card.word}
                          </h3>
                          <button
                            onClick={() => speakWord(card.word)}
                            className={`p-2 rounded-full transition ${
                              playingWord === card.word
                                ? "bg-teal-500 text-white"
                                : "bg-gray-100 text-gray-600 hover:bg-teal-100 hover:text-teal-600"
                            }`}
                            title="Phát âm"
                          >
                            {playingWord === card.word ? (
                              <VolumeX className="w-4 h-4" />
                            ) : (
                              <Volume2 className="w-4 h-4" />
                            )}
                          </button>
                        </div>
                        <p className="text-blue-600 text-sm">{card.pronunciation}</p>
                        <p className="text-lg text-purple-600 font-medium">{card.vietnamese}</p>
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        <span className="px-3 py-1 bg-teal-100 text-teal-700 text-xs font-semibold rounded-full">
                          {card.level}
                        </span>
                        <span className="px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded">
                          {card.partOfSpeech}
                        </span>
                      </div>
                    </div>

                    <div className="bg-gray-50 rounded-xl p-3">
                      <div className="flex items-center justify-between mb-1">
                        <p className="text-sm font-semibold text-gray-600">Example:</p>
                        <button
                          onClick={() => speakWord(card.exampleEn)}
                          className="p-1 rounded-full bg-gray-200 text-gray-600 hover:bg-teal-100 hover:text-teal-600 transition"
                          title="Phát âm câu ví dụ"
                        >
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
