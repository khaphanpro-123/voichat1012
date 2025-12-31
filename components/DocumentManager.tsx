"use client";
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Upload,
  FileText,
  Image as ImageIcon,
  Loader,
  BookOpen,
  Trash2,
  Eye,
  Calendar,
  HardDrive,
  Volume2,
  Grid3X3,
} from "lucide-react";
import VocabularyGrid from "./VocabularyGrid";
import VocabularyGridEnhanced from "./VocabularyGridEnhanced";

interface Document {
  _id: string;
  userId: string;
  fileName: string;
  fileType: string;
  fileSize: number;
  cloudinaryUrl: string;
  extractedText: string;
  metadata: {
    originalName: string;
    uploadedAt: string;
  };
  uploadDate: string;
}

interface ExtractedVocabulary {
  words: string[];
  stats: {
    totalWords: number;
    uniqueWords: number;
    sentences: number;
  };
}

export default function DocumentManager() {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [selectedDoc, setSelectedDoc] = useState<Document | null>(null);
  const [showUpload, setShowUpload] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [extractedVocab, setExtractedVocab] = useState<ExtractedVocabulary | null>(null);
  const [showVocabulary, setShowVocabulary] = useState(false);
  const [currentView, setCurrentView] = useState<'documents' | 'vocabulary'>('documents');

  useEffect(() => {
    fetchDocuments();
  }, []);

  const fetchDocuments = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/documents?userId=anonymous');
      const data = await response.json();
      
      if (data.success) {
        setDocuments(data.documents);
      }
    } catch (error) {
      console.error('Error fetching documents:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const handleUpload = async () => {
    if (!file) return;

    setUploading(true);
    const formData = new FormData();
    formData.append("file", file);
    formData.append("userId", "anonymous");

    try {
      const response = await fetch("/api/upload-ocr", {
        method: "POST",
        body: formData,
      });

      const data = await response.json();
      if (data.success) {
        await fetchDocuments(); // Refresh the list
        setFile(null);
        setShowUpload(false);
      }
    } catch (error) {
      console.error("Upload error:", error);
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (documentId: string) => {
    if (!confirm('Bạn có chắc chắn muốn xóa tài liệu này?')) return;

    try {
      const response = await fetch(`/api/documents?id=${documentId}`, {
        method: 'DELETE',
      });

      const data = await response.json();
      if (data.success) {
        await fetchDocuments(); // Refresh the list
        if (selectedDoc?._id === documentId) {
          setSelectedDoc(null);
        }
      }
    } catch (error) {
      console.error('Error deleting document:', error);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('vi-VN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const extractVocabularyFromText = (text: string): ExtractedVocabulary => {
    if (!text || text.trim() === '') {
      return { words: [], stats: { totalWords: 0, uniqueWords: 0, sentences: 0 } };
    }

    // Simple sentence chunking
    const sentences = text
      .split(/[.!?]+/)
      .map((s) => s.trim())
      .filter((s) => s.length > 0);

    // Extract potential vocabulary (words with 3+ characters)
    const words = text
      .split(/\s+/)
      .filter((w) => w.length >= 3 && /[\p{L}]/u.test(w))
      .map((w) => w.replace(/[.,;:!?]/g, ""));

    const uniqueWords = [...new Set(words)];

    return {
      words: uniqueWords.slice(0, 50), // Top 50 words
      stats: {
        totalWords: words.length,
        uniqueWords: uniqueWords.length,
        sentences: sentences.length,
      }
    };
  };

  const handleViewVocabulary = (doc: Document) => {
    setSelectedDoc(doc);
    setCurrentView('vocabulary');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 flex items-center justify-center">
        <div className="text-center">
          <Loader className="w-12 h-12 animate-spin text-teal-600 mx-auto mb-4" />
          <p className="text-gray-600">Đang tải tài liệu...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-4xl font-bold text-gray-900">
              📚 Quản lý Tài liệu
            </h1>
            <div className="flex gap-2 mt-4">
              <button
                onClick={() => setCurrentView('documents')}
                className={`px-4 py-2 rounded-lg transition flex items-center gap-2 ${
                  currentView === 'documents'
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                <FileText className="w-4 h-4" />
                Tài liệu
              </button>
              <button
                onClick={() => setCurrentView('vocabulary')}
                disabled={!extractedVocab}
                className={`px-4 py-2 rounded-lg transition flex items-center gap-2 ${
                  currentView === 'vocabulary'
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200 disabled:opacity-50'
                }`}
              >
                <Grid3X3 className="w-4 h-4" />
                Từ vựng
              </button>
              <a
                href="/vocabulary-learning"
                className="px-4 py-2 bg-gradient-to-r from-purple-500 to-pink-600 text-white rounded-lg hover:shadow-lg transition flex items-center gap-2"
              >
                <Volume2 className="w-4 h-4" />
                Học thông minh
              </a>
              <a
                href="/flashcard-study"
                className="px-4 py-2 bg-gradient-to-r from-orange-500 to-red-600 text-white rounded-lg hover:shadow-lg transition flex items-center gap-2"
              >
                🃏 Flashcard
              </a>
            </div>
          </div>
          <button
            onClick={() => setShowUpload(true)}
            className="px-6 py-3 bg-gradient-to-r from-teal-500 to-emerald-600 text-white font-semibold rounded-xl hover:shadow-lg transition"
          >
            <Upload className="w-5 h-5 inline mr-2" />
            Tải lên tài liệu
          </button>
        </div>

        {currentView === 'vocabulary' && selectedDoc ? (
          <VocabularyGridEnhanced
            documentId={selectedDoc._id}
            userId="anonymous"
            title={`Từ vựng từ tài liệu: ${selectedDoc.fileName}`}
          />
        ) : (
          <div className="grid lg:grid-cols-3 gap-6">
          {/* Documents List */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-3xl shadow-xl p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4">
                Tài liệu của bạn ({documents.length})
              </h2>
              
              {documents.length === 0 ? (
                <div className="text-center py-8">
                  <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500">Chưa có tài liệu nào</p>
                  <button
                    onClick={() => setShowUpload(true)}
                    className="mt-4 px-4 py-2 bg-teal-500 text-white rounded-lg hover:bg-teal-600 transition"
                  >
                    Tải lên tài liệu đầu tiên
                  </button>
                </div>
              ) : (
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {documents.map((doc) => (
                    <motion.div
                      key={doc._id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={`p-4 rounded-xl border-2 cursor-pointer transition ${
                        selectedDoc?._id === doc._id
                          ? 'border-teal-500 bg-teal-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                      onClick={() => setSelectedDoc(doc)}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            {doc.fileType.startsWith('image/') ? (
                              <ImageIcon className="w-5 h-5 text-blue-500" />
                            ) : (
                              <FileText className="w-5 h-5 text-gray-500" />
                            )}
                            <h3 className="font-semibold text-gray-900 text-sm truncate">
                              {doc.fileName}
                            </h3>
                          </div>
                          <div className="text-xs text-gray-500 space-y-1">
                            <div className="flex items-center gap-1">
                              <HardDrive className="w-3 h-3" />
                              {formatFileSize(doc.fileSize)}
                            </div>
                            <div className="flex items-center gap-1">
                              <Calendar className="w-3 h-3" />
                              {formatDate(doc.uploadDate)}
                            </div>
                          </div>
                        </div>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDelete(doc._id);
                          }}
                          className="p-1 text-red-500 hover:bg-red-50 rounded"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Document Details */}
          <div className="lg:col-span-2">
            {selectedDoc ? (
              <div className="bg-white rounded-3xl shadow-xl p-8">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-2xl font-bold text-gray-900">
                    {selectedDoc.fileName}
                  </h2>
                  <div className="flex gap-2">
                    <a
                      href={selectedDoc.cloudinaryUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition flex items-center gap-2"
                    >
                      <Eye className="w-4 h-4" />
                      Xem file gốc
                    </a>
                  </div>
                </div>

                <div className="grid md:grid-cols-3 gap-4 mb-6">
                  <div className="bg-gray-50 rounded-xl p-4">
                    <p className="text-sm text-gray-600 mb-1">Loại file</p>
                    <p className="font-semibold">{selectedDoc.fileType}</p>
                  </div>
                  <div className="bg-gray-50 rounded-xl p-4">
                    <p className="text-sm text-gray-600 mb-1">Kích thước</p>
                    <p className="font-semibold">{formatFileSize(selectedDoc.fileSize)}</p>
                  </div>
                  <div className="bg-gray-50 rounded-xl p-4">
                    <p className="text-sm text-gray-600 mb-1">Ngày tải lên</p>
                    <p className="font-semibold">{formatDate(selectedDoc.uploadDate)}</p>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="bg-gray-50 rounded-xl p-6">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-bold text-gray-900">
                        Nội dung đã trích xuất
                      </h3>
                      {selectedDoc.extractedText && (
                        <button
                          onClick={() => handleViewVocabulary(selectedDoc)}
                          className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition flex items-center gap-2"
                        >
                          <Volume2 className="w-4 h-4" />
                          Xem từ vựng với hình ảnh
                        </button>
                      )}
                    </div>
                    {selectedDoc.extractedText ? (
                      <div className="bg-white rounded-lg p-4 max-h-96 overflow-y-auto">
                        <pre className="whitespace-pre-wrap text-gray-700 text-sm">
                          {selectedDoc.extractedText}
                        </pre>
                      </div>
                    ) : (
                      <p className="text-gray-500 italic">
                        Không có nội dung text được trích xuất từ file này.
                      </p>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-white rounded-3xl shadow-xl p-8 text-center">
                <BookOpen className="w-24 h-24 text-gray-300 mx-auto mb-4" />
                <h2 className="text-2xl font-bold text-gray-900 mb-2">
                  Chọn một tài liệu
                </h2>
                <p className="text-gray-600">
                  Chọn một tài liệu từ danh sách bên trái để xem chi tiết và nội dung đã trích xuất.
                </p>
              </div>
            )}
          </div>
        </div>
        )}

        {/* Upload Modal */}
        <AnimatePresence>
          {showUpload && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
              onClick={() => setShowUpload(false)}
            >
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                className="bg-white rounded-3xl p-8 max-w-md w-full"
                onClick={(e) => e.stopPropagation()}
              >
                <h2 className="text-2xl font-bold text-gray-900 mb-6">
                  Tải lên tài liệu mới
                </h2>

                <div className="border-2 border-dashed border-gray-300 rounded-2xl p-8 text-center hover:border-teal-500 transition mb-6">
                  <input
                    type="file"
                    accept=".pdf,.png,.jpg,.jpeg,.docx"
                    onChange={handleFileChange}
                    className="hidden"
                    id="file-upload-modal"
                  />
                  <label htmlFor="file-upload-modal" className="cursor-pointer">
                    <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-lg font-semibold text-gray-700 mb-2">
                      Chọn file để tải lên
                    </p>
                    <p className="text-sm text-gray-500">
                      PDF, PNG, JPG, hoặc DOCX (Tối đa 10MB)
                    </p>
                  </label>
                </div>

                {file && (
                  <div className="bg-teal-50 rounded-xl p-4 mb-6">
                    <div className="flex items-center gap-3">
                      <FileText className="w-6 h-6 text-teal-600" />
                      <div>
                        <p className="font-semibold text-gray-900">{file.name}</p>
                        <p className="text-sm text-gray-600">
                          {formatFileSize(file.size)}
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                <div className="flex gap-3">
                  <button
                    onClick={() => setShowUpload(false)}
                    className="flex-1 px-4 py-3 border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 transition"
                  >
                    Hủy
                  </button>
                  <button
                    onClick={handleUpload}
                    disabled={!file || uploading}
                    className="flex-1 px-4 py-3 bg-gradient-to-r from-teal-500 to-emerald-600 text-white rounded-xl hover:shadow-lg transition disabled:opacity-50"
                  >
                    {uploading ? (
                      <Loader className="w-5 h-5 animate-spin mx-auto" />
                    ) : (
                      "Tải lên"
                    )}
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}