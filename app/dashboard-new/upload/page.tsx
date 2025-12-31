'use client';

import { useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import DashboardLayout from '@/components/DashboardLayout';
import { 
  Upload, FileText, CheckCircle, Loader, AlertCircle, 
  BookOpen, ArrowRight, Sparkles 
} from 'lucide-react';

interface ExtractedVocab {
  word: string;
  meaning: string;
  type: string;
  example: string;
}

type Step = 'upload' | 'processing' | 'preview' | 'saving' | 'done';

export default function UploadPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const userId = (session?.user as any)?.id || 'anonymous';

  const [file, setFile] = useState<File | null>(null);
  const [step, setStep] = useState<Step>('upload');
  const [error, setError] = useState<string | null>(null);
  const [extractedText, setExtractedText] = useState('');
  const [vocabulary, setVocabulary] = useState<ExtractedVocab[]>([]);
  const [selectedWords, setSelectedWords] = useState<string[]>([]);
  const [savedCount, setSavedCount] = useState(0);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setError(null);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      setFile(e.dataTransfer.files[0]);
      setError(null);
    }
  };

  const processFile = async () => {
    if (!file) return;

    setStep('processing');
    setError(null);

    try {
      // Step 1: Upload and OCR
      const formData = new FormData();
      formData.append('file', file);

      const ocrRes = await fetch('/api/upload-ocr', {
        method: 'POST',
        body: formData,
      });

      const ocrData = await ocrRes.json();
      if (!ocrData.success) {
        throw new Error(ocrData.message || 'Không thể đọc file');
      }

      setExtractedText(ocrData.text);

      // Step 2: Extract vocabulary automatically
      const extractRes = await fetch('/api/analyze-text', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          text: ocrData.text, 
          userId,
          action: 'extract_vocabulary'
        }),
      });

      const extractData = await extractRes.json();
      
      if (extractData.success && extractData.analysis?.vocabulary) {
        setVocabulary(extractData.analysis.vocabulary);
        setSelectedWords(extractData.analysis.vocabulary.map((v: ExtractedVocab) => v.word));
      } else if (ocrData.vocabulary && ocrData.vocabulary.length > 0) {
        // Fallback to OCR vocabulary
        const fallbackVocab = ocrData.vocabulary.map((word: string) => ({
          word,
          meaning: '',
          type: 'unknown',
          example: ''
        }));
        setVocabulary(fallbackVocab);
        setSelectedWords(ocrData.vocabulary);
      } else {
        throw new Error('Không tìm thấy từ vựng trong tài liệu');
      }

      setStep('preview');
    } catch (err: any) {
      console.error('Process error:', err);
      setError(err.message || 'Lỗi xử lý file');
      setStep('upload');
    }
  };

  const toggleWord = (word: string) => {
    setSelectedWords(prev =>
      prev.includes(word) ? prev.filter(w => w !== word) : [...prev, word]
    );
  };

  const saveAndGoToVocabulary = async () => {
    if (selectedWords.length === 0) return;

    setStep('saving');
    setError(null);

    try {
      // Generate flashcards for selected words
      const res = await fetch('/api/generate-flashcard', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          words: selectedWords, 
          userId,
          sourceText: extractedText.slice(0, 500) // Context for better generation
        }),
      });

      const data = await res.json();
      
      if (data.success) {
        setSavedCount(data.flashcards?.length || selectedWords.length);
        setStep('done');
        
        // Auto redirect after 2 seconds
        setTimeout(() => {
          router.push('/dashboard-new/vocabulary');
        }, 2000);
      } else {
        throw new Error(data.message || 'Lỗi lưu từ vựng');
      }
    } catch (err: any) {
      console.error('Save error:', err);
      setError(err.message);
      setStep('preview');
    }
  };

  return (
    <DashboardLayout>
      <div className="p-6 md:p-8 max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
            <Upload className="w-8 h-8 text-teal-600" />
            Upload tài liệu
          </h1>
          <p className="text-gray-600 mt-2">
            Tải lên file PDF, hình ảnh hoặc Word để trích xuất từ vựng tự động
          </p>
        </div>

        {/* Progress Steps */}
        <div className="flex items-center justify-center gap-2 mb-8">
          {['upload', 'processing', 'preview', 'saving', 'done'].map((s, i) => (
            <div key={s} className="flex items-center">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                step === s ? 'bg-teal-600 text-white' :
                ['upload', 'processing', 'preview', 'saving', 'done'].indexOf(step) > i 
                  ? 'bg-teal-100 text-teal-600' 
                  : 'bg-gray-100 text-gray-400'
              }`}>
                {i + 1}
              </div>
              {i < 4 && <div className={`w-8 h-0.5 ${
                ['upload', 'processing', 'preview', 'saving', 'done'].indexOf(step) > i 
                  ? 'bg-teal-300' : 'bg-gray-200'
              }`} />}
            </div>
          ))}
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl flex items-center gap-3 text-red-700">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            <p>{error}</p>
          </div>
        )}

        <AnimatePresence mode="wait">
          {/* Step 1: Upload */}
          {step === 'upload' && (
            <motion.div
              key="upload"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="bg-white rounded-2xl shadow-lg p-8"
            >
              <div
                onDrop={handleDrop}
                onDragOver={(e) => e.preventDefault()}
                className="border-2 border-dashed border-gray-300 rounded-2xl p-12 text-center hover:border-teal-500 transition cursor-pointer"
              >
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
                    Kéo thả file hoặc click để chọn
                  </p>
                  <p className="text-sm text-gray-500">
                    PDF, PNG, JPG, DOCX, TXT (Tối đa 10MB)
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
                        {(file.size / 1024).toFixed(1)} KB
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={processFile}
                    className="px-6 py-3 bg-teal-600 text-white font-semibold rounded-xl hover:bg-teal-700 transition flex items-center gap-2"
                  >
                    <Sparkles className="w-5 h-5" />
                    Trích xuất từ vựng
                  </button>
                </motion.div>
              )}
            </motion.div>
          )}

          {/* Step 2: Processing */}
          {step === 'processing' && (
            <motion.div
              key="processing"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="bg-white rounded-2xl shadow-lg p-12 text-center"
            >
              <Loader className="w-16 h-16 text-teal-600 mx-auto mb-6 animate-spin" />
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                Đang xử lý tài liệu...
              </h2>
              <p className="text-gray-600">
                Đang đọc và trích xuất từ vựng từ file của bạn
              </p>
            </motion.div>
          )}

          {/* Step 3: Preview & Select */}
          {step === 'preview' && (
            <motion.div
              key="preview"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="bg-white rounded-2xl shadow-lg p-8"
            >
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                Chọn từ vựng muốn học
              </h2>
              <p className="text-gray-600 mb-6">
                Đã tìm thấy {vocabulary.length} từ. Chọn những từ bạn muốn thêm vào danh sách học.
              </p>

              <div className="flex flex-wrap gap-3 mb-6 max-h-[400px] overflow-y-auto p-2">
                {vocabulary.map((vocab) => (
                  <button
                    key={vocab.word}
                    onClick={() => toggleWord(vocab.word)}
                    className={`px-4 py-2 rounded-xl font-medium transition ${
                      selectedWords.includes(vocab.word)
                        ? 'bg-teal-500 text-white shadow-md'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {vocab.word}
                    {vocab.meaning && (
                      <span className="text-xs ml-2 opacity-75">
                        ({vocab.meaning})
                      </span>
                    )}
                  </button>
                ))}
              </div>

              <div className="flex items-center justify-between pt-4 border-t">
                <p className="text-gray-600">
                  Đã chọn: <span className="font-bold text-teal-600">{selectedWords.length}</span> từ
                </p>
                <button
                  onClick={saveAndGoToVocabulary}
                  disabled={selectedWords.length === 0}
                  className="px-6 py-3 bg-teal-600 text-white font-semibold rounded-xl hover:bg-teal-700 transition disabled:opacity-50 flex items-center gap-2"
                >
                  Lưu và học ngay
                  <ArrowRight className="w-5 h-5" />
                </button>
              </div>
            </motion.div>
          )}

          {/* Step 4: Saving */}
          {step === 'saving' && (
            <motion.div
              key="saving"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="bg-white rounded-2xl shadow-lg p-12 text-center"
            >
              <Loader className="w-16 h-16 text-teal-600 mx-auto mb-6 animate-spin" />
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                Đang tạo flashcards...
              </h2>
              <p className="text-gray-600">
                Đang tạo nghĩa, ví dụ và hình ảnh cho {selectedWords.length} từ
              </p>
            </motion.div>
          )}

          {/* Step 5: Done */}
          {step === 'done' && (
            <motion.div
              key="done"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-white rounded-2xl shadow-lg p-12 text-center"
            >
              <CheckCircle className="w-20 h-20 text-green-500 mx-auto mb-6" />
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                Hoàn thành! 🎉
              </h2>
              <p className="text-gray-600 mb-6">
                Đã thêm {savedCount} từ vựng mới vào danh sách học của bạn
              </p>
              <button
                onClick={() => router.push('/dashboard-new/vocabulary')}
                className="px-8 py-4 bg-teal-600 text-white font-semibold rounded-xl hover:bg-teal-700 transition flex items-center gap-2 mx-auto"
              >
                <BookOpen className="w-5 h-5" />
                Đi đến trang Từ vựng
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </DashboardLayout>
  );
}
