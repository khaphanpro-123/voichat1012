"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  AlertTriangle, Lightbulb, RefreshCw, ChevronDown, ChevronUp,
  BarChart3, Volume2, CheckCircle, XCircle, HelpCircle, Info, Trash2,
  Image as ImageIcon, Edit3, Send
} from "lucide-react";

// Types
interface ErrorExample {
  sentence: string;
  corrected: string;
  errorWord: string;
  errorMessage: string;
  explanation: string;
  _id?: string;
}

interface ErrorStat {
  errorType: string;
  count: number;
  examples: ErrorExample[];
}

const ERROR_TYPE_MAP: Record<string, { label: string; suggestion: string }> = {
  subject_verb_agreement: { label: "Hòa hợp chủ-vị", suggestion: "Ngôi 3 số ít (he/she/it) → động từ thêm -s/-es" },
  verb_form_after_attitude: { label: "Dạng động từ sau like/love", suggestion: "Sau like/love/hate dùng V-ing hoặc to V" },
  article: { label: "Mạo từ (a/an/the)", suggestion: "Danh từ đếm được số ít cần a/an/the" },
  capitalization: { label: "Viết hoa", suggestion: "Nhớ viết hoa 'I' và chữ cái đầu câu" },
  punctuation: { label: "Dấu câu", suggestion: "Câu kết thúc bằng dấu chấm (.)" },
  spelling: { label: "Chính tả", suggestion: "Đọc nhiều và ghi nhớ cách viết từ" },
  word_order: { label: "Trật tự từ", suggestion: "Ghi nhớ cấu trúc S + V + O" },
  tense: { label: "Thì động từ", suggestion: "Ôn lại các thì cơ bản và dấu hiệu nhận biết" },
  negation: { label: "Câu phủ định", suggestion: "He/She/It dùng doesn't, I/You/We/They dùng don't" },
  question_form: { label: "Câu hỏi", suggestion: "Câu hỏi Yes/No: Do/Does + S + V?" },
  preposition: { label: "Giới từ", suggestion: "Học các cụm giới từ thông dụng" },
  plural: { label: "Số ít/nhiều", suggestion: "Chú ý danh từ đếm được/không đếm được" },
  grammar: { label: "Ngữ pháp chung", suggestion: "Luyện tập thêm để cải thiện" },
  missing_verb: { label: "Thiếu động từ", suggestion: "Câu tiếng Anh cần có động từ" },
  parse_error: { label: "Lỗi hệ thống", suggestion: "Thử viết lại câu đơn giản hơn" },
};

export default function LearningHistory({ userId }: { userId: string }) {
  const [loading, setLoading] = useState(true);
  const [totalErrors, setTotalErrors] = useState(0);
  const [errorsByType, setErrorsByType] = useState<ErrorStat[]>([]);
  const [expandedError, setExpandedError] = useState<string | null>(null);
  const [showGuide, setShowGuide] = useState(false);
  const [clearing, setClearing] = useState(false);
  
  // Practice mode state
  const [practiceError, setPracticeError] = useState<{ type: string; index: number; example: ErrorExample } | null>(null);
  const [practiceInput, setPracticeInput] = useState("");
  const [practiceResult, setPracticeResult] = useState<"correct" | "wrong" | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    fetchErrors();
  }, [userId]);

  const fetchErrors = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/grammar-errors?userId=${userId}&limit=100`);
      const data = await res.json();
      if (data.success) {
        setTotalErrors(data.totalErrors || 0);
        setErrorsByType(data.errorsByType || []);
      }
    } catch (error) {
      console.error("Fetch errors:", error);
    }
    setLoading(false);
  };

  const handleClearAll = async () => {
    if (!confirm("Bạn có chắc muốn xóa tất cả lỗi đã ghi nhận?")) return;
    setClearing(true);
    try {
      await fetch("/api/grammar-errors", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, clearAll: true })
      });
      setTotalErrors(0);
      setErrorsByType([]);
    } catch (err) {
      console.error("Clear errors:", err);
    }
    setClearing(false);
  };

  const speak = (text: string) => {
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = "en-US";
    u.rate = 0.9;
    window.speechSynthesis.speak(u);
  };

  const getErrorLabel = (type: string) => ERROR_TYPE_MAP[type]?.label || type.replace(/_/g, " ");
  const getErrorSuggestion = (type: string) => ERROR_TYPE_MAP[type]?.suggestion || "Luyện tập thêm để cải thiện";

  // Normalize text for comparison (remove extra spaces, lowercase, trim)
  const normalizeText = (text: string) => {
    return text.toLowerCase().trim().replace(/\s+/g, " ").replace(/\s*([.,!?])\s*/g, "$1");
  };

  // Start practice mode for an error
  const startPractice = (errorType: string, index: number, example: ErrorExample) => {
    setPracticeError({ type: errorType, index, example });
    setPracticeInput("");
    setPracticeResult(null);
  };

  // Check practice answer
  const checkPracticeAnswer = async () => {
    if (!practiceError || !practiceInput.trim()) return;
    
    const userAnswer = normalizeText(practiceInput);
    const correctAnswer = normalizeText(practiceError.example.corrected);
    
    // Check if answer is correct (allow minor punctuation differences)
    const isCorrect = userAnswer === correctAnswer || 
      userAnswer.replace(/[.,!?]/g, "") === correctAnswer.replace(/[.,!?]/g, "");
    
    if (isCorrect) {
      setPracticeResult("correct");
      // Delete the error from database after 1.5s
      setDeleting(true);
      setTimeout(async () => {
        try {
          // Find and delete this specific error
          const res = await fetch("/api/grammar-errors", {
            method: "DELETE",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ 
              userId, 
              sentence: practiceError.example.sentence,
              errorType: practiceError.type
            })
          });
          
          if (res.ok) {
            // Update local state - remove this example
            setErrorsByType(prev => {
              const updated = prev.map(err => {
                if (err.errorType === practiceError.type) {
                  const newExamples = err.examples.filter((_, i) => i !== practiceError.index);
                  return { ...err, count: err.count - 1, examples: newExamples };
                }
                return err;
              }).filter(err => err.count > 0);
              return updated;
            });
            setTotalErrors(prev => prev - 1);
          }
        } catch (err) {
          console.error("Delete error:", err);
        }
        setDeleting(false);
        setPracticeError(null);
        setPracticeInput("");
        setPracticeResult(null);
      }, 1500);
    } else {
      setPracticeResult("wrong");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="text-center">
          <div className="animate-spin w-10 h-10 border-4 border-teal-500 border-t-transparent rounded-full mx-auto mb-4" />
          <p className="text-gray-500">Đang tải dữ liệu...</p>
        </div>
      </div>
    );
  }

  if (totalErrors === 0) {
    return (
      <div className="text-center p-12 bg-white rounded-2xl shadow-lg">
        <div className="w-20 h-20 mx-auto mb-4 bg-green-100 rounded-full flex items-center justify-center">
          <span className="text-4xl">🎉</span>
        </div>
        <h3 className="text-xl font-bold text-gray-700 mb-2">Chưa có lỗi nào được ghi nhận</h3>
        <p className="text-gray-500 mb-4">Bắt đầu học và viết câu để hệ thống ghi nhận lỗi tự động!</p>
        <a href="/dashboard-new/image-learning" className="inline-flex items-center gap-2 px-4 py-2 bg-teal-500 text-white rounded-lg hover:bg-teal-600">
          <ImageIcon className="w-4 h-4" /> Bắt đầu học ngay
        </a>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-orange-100 rounded-xl flex items-center justify-center">
            <AlertTriangle className="w-5 h-5 text-orange-600" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-800">Phân tích lỗi sai</h2>
            <p className="text-sm text-gray-500">Lỗi được tự động ghi nhận khi bạn viết câu</p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <button onClick={fetchErrors} className="p-2 hover:bg-gray-100 rounded-lg" title="Làm mới">
            <RefreshCw className="w-4 h-4 text-gray-500" />
          </button>
          <button onClick={() => setShowGuide(!showGuide)} className="p-2 hover:bg-gray-100 rounded-lg" title="Hướng dẫn">
            <HelpCircle className="w-4 h-4 text-gray-500" />
          </button>
          <button 
            onClick={handleClearAll} 
            disabled={clearing}
            className="p-2 hover:bg-red-50 rounded-lg text-red-500" 
            title="Xóa tất cả"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Guide Panel */}
      <AnimatePresence>
        {showGuide && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="bg-blue-50 border border-blue-200 rounded-xl overflow-hidden"
          >
            <div className="p-4">
              <div className="flex items-start gap-3">
                <Info className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-semibold text-blue-800 mb-2">Cách hệ thống hoạt động</h4>
                  <ul className="text-sm text-blue-700 space-y-1">
                    <li>• <strong>Tự động ghi nhận</strong>: Khi bạn viết câu sai trong phần học từ vựng, lỗi được lưu tự động</li>
                    <li>• <strong>Phân loại lỗi</strong>: Ngữ pháp (chia động từ, mạo từ, chính tả...)</li>
                    <li>• <strong>Sửa lỗi trực tiếp</strong>: Click "Sửa lỗi này" để luyện tập, sửa đúng thì lỗi sẽ biến mất</li>
                    <li>• <strong>Không cần lưu thủ công</strong>: Hệ thống tự động lưu khi kiểm tra câu</li>
                  </ul>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Summary Stats */}
      <div className="bg-white rounded-2xl p-6 shadow-lg">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-gray-800 flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-teal-600" />
            Tổng quan lỗi
          </h3>
          <span className="px-3 py-1 bg-orange-100 text-orange-600 rounded-full font-bold">
            {totalErrors} lỗi
          </span>
        </div>

        {/* Error Type Summary */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b-2 border-gray-200">
                <th className="text-left py-3 px-2 font-semibold text-gray-700">Loại lỗi</th>
                <th className="text-center py-3 px-2 font-semibold text-gray-700">Số lần</th>
                <th className="text-left py-3 px-2 font-semibold text-gray-700">Gợi ý khắc phục</th>
                <th className="text-center py-3 px-2 font-semibold text-gray-700"></th>
              </tr>
            </thead>
            <tbody>
              {errorsByType.map((err, i) => (
                <tr key={i} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="py-3 px-2">
                    <span className="font-medium text-gray-800">{getErrorLabel(err.errorType)}</span>
                  </td>
                  <td className="py-3 px-2 text-center">
                    <span className="px-2 py-1 bg-orange-100 text-orange-600 rounded-full font-bold">
                      {err.count}
                    </span>
                  </td>
                  <td className="py-3 px-2 text-gray-600 text-xs">{getErrorSuggestion(err.errorType)}</td>
                  <td className="py-3 px-2 text-center">
                    <button
                      onClick={() => setExpandedError(expandedError === err.errorType ? null : err.errorType)}
                      className="p-1 hover:bg-gray-100 rounded"
                    >
                      {expandedError === err.errorType ? (
                        <ChevronUp className="w-4 h-4 text-gray-400" />
                      ) : (
                        <ChevronDown className="w-4 h-4 text-gray-400" />
                      )}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Expanded Error Examples */}
        <AnimatePresence>
          {expandedError && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="border border-orange-200 rounded-xl overflow-hidden mt-4"
            >
              <div className="bg-orange-50 p-4">
                <h4 className="font-semibold text-orange-800 mb-3 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4" />
                  Ví dụ lỗi: {getErrorLabel(expandedError)}
                </h4>
                <div className="space-y-3">
                  {errorsByType.find(e => e.errorType === expandedError)?.examples.map((ex, i) => (
                    <div key={i} className="bg-white p-3 rounded-lg border border-orange-100">
                      {/* Practice mode for this error */}
                      {practiceError?.type === expandedError && practiceError?.index === i ? (
                        <div className="space-y-3">
                          <div className="flex items-center gap-2 mb-2">
                            <XCircle className="w-4 h-4 text-red-500" />
                            <span className="text-red-600">{ex.sentence}</span>
                          </div>
                          
                          {practiceResult === "correct" ? (
                            <div className="flex items-center gap-2 p-3 bg-green-50 rounded-lg border border-green-200">
                              <CheckCircle className="w-5 h-5 text-green-500" />
                              <span className="text-green-700 font-medium">
                                {deleting ? "Đang xóa lỗi khỏi hệ thống..." : "🎉 Chính xác! Lỗi này sẽ được xóa."}
                              </span>
                            </div>
                          ) : (
                            <>
                              <div className="flex gap-2">
                                <input
                                  type="text"
                                  value={practiceInput}
                                  onChange={(e) => {
                                    setPracticeInput(e.target.value);
                                    setPracticeResult(null);
                                  }}
                                  onKeyDown={(e) => e.key === "Enter" && checkPracticeAnswer()}
                                  placeholder="Viết lại câu đúng..."
                                  className={`flex-1 px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 ${
                                    practiceResult === "wrong" 
                                      ? "border-red-300 focus:ring-red-200" 
                                      : "border-gray-300 focus:ring-teal-200"
                                  }`}
                                  autoFocus
                                />
                                <button
                                  onClick={checkPracticeAnswer}
                                  className="px-4 py-2 bg-teal-500 text-white rounded-lg hover:bg-teal-600 flex items-center gap-1"
                                >
                                  <Send className="w-4 h-4" />
                                </button>
                              </div>
                              
                              {practiceResult === "wrong" && (
                                <div className="flex items-start gap-2 p-2 bg-red-50 rounded-lg">
                                  <XCircle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
                                  <div>
                                    <p className="text-sm text-red-600">Chưa đúng, thử lại nhé!</p>
                                    <p className="text-xs text-gray-500 mt-1">Gợi ý: {ex.corrected}</p>
                                  </div>
                                </div>
                              )}
                              
                              <button
                                onClick={() => {
                                  setPracticeError(null);
                                  setPracticeInput("");
                                  setPracticeResult(null);
                                }}
                                className="text-xs text-gray-500 hover:text-gray-700"
                              >
                                Hủy
                              </button>
                            </>
                          )}
                        </div>
                      ) : (
                        <>
                          <div className="flex items-center gap-2 mb-2">
                            <XCircle className="w-4 h-4 text-red-500" />
                            <span className="text-red-600 line-through">{ex.sentence}</span>
                          </div>
                          <div className="flex items-center gap-2 mb-2">
                            <CheckCircle className="w-4 h-4 text-green-500" />
                            <span className="text-green-600 font-medium">{ex.corrected}</span>
                            <button onClick={() => speak(ex.corrected)} className="p-1 hover:bg-gray-100 rounded">
                              <Volume2 className="w-4 h-4 text-blue-500" />
                            </button>
                          </div>
                          {ex.errorWord && (
                            <p className="text-xs text-orange-600 mb-1">
                              Từ sai: <span className="font-medium">"{ex.errorWord}"</span>
                            </p>
                          )}
                          {(ex.explanation || ex.errorMessage) && (
                            <div className="flex items-start gap-2 mt-2 p-2 bg-yellow-50 rounded">
                              <Lightbulb className="w-4 h-4 text-yellow-600 flex-shrink-0 mt-0.5" />
                              <p className="text-xs text-yellow-800">{ex.explanation || ex.errorMessage}</p>
                            </div>
                          )}
                          
                          {/* Practice button */}
                          <button
                            onClick={() => startPractice(expandedError, i, ex)}
                            className="mt-2 px-3 py-1.5 bg-teal-100 text-teal-700 rounded-lg text-sm hover:bg-teal-200 flex items-center gap-1"
                          >
                            <Edit3 className="w-3 h-3" />
                            Sửa lỗi này
                          </button>
                        </>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Improvement Tips */}
      {errorsByType.length > 0 && (
        <div className="bg-gradient-to-r from-teal-50 to-cyan-50 rounded-xl p-4 border border-teal-200">
          <h4 className="font-semibold text-teal-800 mb-2 flex items-center gap-2">
            <Lightbulb className="w-5 h-5 text-teal-600" />
            Gợi ý cải thiện
          </h4>
          <ul className="text-sm text-teal-700 space-y-1">
            {errorsByType.slice(0, 3).map((err, i) => (
              <li key={i}>• <strong>{getErrorLabel(err.errorType)}</strong>: {getErrorSuggestion(err.errorType)}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
