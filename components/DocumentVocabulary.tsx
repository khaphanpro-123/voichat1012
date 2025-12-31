'use client';

import React, { useState, useRef } from 'react';
import { Upload, FileText, Loader, Volume2, BookOpen, RogeIcon, BookOpen, RotateCcw, Sparkles } from 'lucide-react';

interface VocabularyWord {
  english: string;
  vietnamese: string;
  pronunciation: string;
  partOfSpeech: string;
  definition: string;
  example: string;
  exampleVi: string;
  difficulty: 'easy' | 'medium' | 'hard';
  imagePrompt: string;
  imageUrl?: string;
  imageLoading?: boolean;
  imageError?: string;
}

export default function DocumentVocabulary() {
  const [file, setFile] = useState<File | null>(null);
  const [extractedText, setExtractedText] = useState('');
  const [vocabulary, setVocabulary] = useState<VocabularyWord[]>([]);
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<'upload' | 'extracting' | 'vocabulary'>('upload');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const speak = (text: string) => {
    if ('speechSynthesis' in window) {
      const u = new SpeechSynthesisUtterance(text);
      u.lang = 'en-US';
      u.rate = 0.85;
      speechSynthesis.speak(u);
    }
  };

  const [error, setError] = useState<string | null>(null);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    setFile(selectedFile);
    setLoading(true);
    setStep('extracting');
    setError(null);

    // Step 1: OCR - Extract text from file
    const formData = new FormData();
    formData.append('file', selectedFile);
    formData.append('userId', 'anonymous');

    try {
      console.log('Step 1: OCR processing...');
      const ocrRes = await fetch('/api/upload-ocr', { method: 'POST', body: formData });
      const ocrData = await ocrRes.json();

      if (ocrData.success && ocrData.text) {
        setExtractedText(ocrData.text);
        console.log('OCR success, text length:', ocrData.text.length);

        // Step 2: Extract vocabulary automatically
        console.log('Step 2: Extracting vocabulary...');
        const vocabRes = await fetch('/api/document-vocabulary', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'extract', text: ocrData.text, count: 10 })
        });
        const vocabData = await vocabRes.json();

        if (vocabData.success && vocabData.vocabulary?.length > 0) {
          setVocabulary(vocabData.vocabulary);
          setStep('vocabulary');
          console.log('Vocabulary extracted:', vocabData.vocabulary.length, 'words');
        } else {
          setError(vocabData.message || 'Không thể trích xuất từ vựng');
          setStep('upload');
        }
      } else {
        setError(ocrData.message || 'Không thể đọc nội dung file');
        setStep('upload');
      }
    } catch (err) {
      console.error('Error:', err);
      setError('Lỗi xử lý file. Vui lòng thử lại.');
      setStep('upload');
    } finally {
      setLoading(false);
    }
  };

  const generateImage = async (index: number) => {
    const word = vocabulary[index];
    if (!word || word.imageUrl) return;

    // Set loading state
    setVocabulary(prev => prev.map((v, i) => i === index ? { ...v, imageLoading: true } : v));

    try {
      const res = await fetch('/api/document-vocabulary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'generate-image', word: word.english, imagePrompt: word.imagePrompt })
      });
      const data = await res.json();

      if (data.success && data.imageUrl) {
        setVocabulary(prev => prev.map((v, i) => 
          i === index ? { ...v, imageUrl: data.imageUrl, imageLoading: false } : v
        ));
      } else {
        // Show error but don't block
        setVocabulary(prev => prev.map((v, i) => 
          i === index ? { ...v, imageLoading: false, imageError: data.message || 'Lỗi tạo ảnh' } : v
        ));
      }
    } catch {
      setVocabulary(prev => prev.map((v, i) => 
        i === index ? { ...v, imageLoading: false, imageError: 'Lỗi kết nối' } : v
      ));
    }
  };

  const generateAllImages = async () => {
    for (let i = 0; i < vocabulary.length; i++) {
      if (!vocabulary[i].imageUrl) {
        await generateImage(i);
      }
    }
  };

  const reset = () => {
    setFile(null);
    setExtractedText('');
    setVocabulary([]);
    setStep('upload');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };


  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-indigo-900 p-4">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-2xl font-bold text-white text-center mb-6">
          📄 Học Từ Vựng Từ Tài Liệu
        </h1>
        <p className="text-white/60 text-center mb-8">
          Upload PDF/Word/Ảnh → OCR → Trích xuất từ vựng → Tạo hình ảnh minh họa
        </p>

        {/* Error Display */}
        {error && (
          <div className="mb-6 bg-red-500/20 border border-red-500/50 rounded-xl p-4 max-w-xl mx-auto">
            <p className="text-red-300 text-center">{error}</p>
          </div>
        )}

        {/* Upload Step */}
        {step === 'upload' && (
          <div onClick={() => fileInputRef.current?.click()}
            className="bg-white/10 border-2 border-dashed border-white/30 rounded-2xl p-16 text-center cursor-pointer hover:border-purple-400 transition max-w-xl mx-auto">
            <input ref={fileInputRef} type="file" accept=".pdf,.docx,.png,.jpg,.jpeg" onChange={handleFileUpload} className="hidden" />
            <Upload className="w-12 h-12 text-white/50 mx-auto mb-4" />
            <p className="text-white text-lg">Tải lên tài liệu tiếng Anh</p>
            <p className="text-white/50 text-sm mt-2">PDF, Word, hoặc Ảnh</p>
          </div>
        )}

        {/* Extracting Step */}
        {step === 'extracting' && (
          <div className="bg-white/10 rounded-2xl p-16 text-center max-w-xl mx-auto">
            <Loader className="w-12 h-12 text-purple-400 mx-auto mb-4 animate-spin" />
            <p className="text-white text-lg">Đang xử lý...</p>
            <p className="text-white/50 text-sm mt-2">OCR → Trích xuất từ vựng tự động</p>
          </div>
        )}

        {/* Vocabulary Step */}
        {step === 'vocabulary' && (
          <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div className="flex items-center gap-3">
                <FileText className="w-6 h-6 text-purple-400" />
                <span className="text-white font-medium">{file?.name}</span>
              </div>
              <div className="flex gap-3">
                <button onClick={generateAllImages}
                  className="px-4 py-2 bg-gradient-to-r from-pink-500 to-purple-500 text-white rounded-lg hover:opacity-90 transition flex items-center gap-2">
                  <Sparkles className="w-4 h-4" /> Tạo tất cả hình ảnh
                </button>
                <button onClick={reset}
                  className="px-4 py-2 bg-white/10 text-white rounded-lg hover:bg-white/20 transition flex items-center gap-2">
                  <RotateCcw className="w-4 h-4" /> File mới
                </button>
              </div>
            </div>

            {/* Extracted Text Preview */}
            {extractedText && (
              <div className="bg-white/5 rounded-xl p-4">
                <h3 className="text-white/60 text-sm mb-2">Nội dung trích xuất:</h3>
                <p className="text-white/80 text-sm line-clamp-3">{extractedText.substring(0, 300)}...</p>
              </div>
            )}

            {/* Vocabulary Grid */}
            <div className="grid md:grid-cols-2 gap-6">
              {vocabulary.map((word, index) => (
                <div key={index} className="bg-white/10 rounded-2xl overflow-hidden">
                  {/* Image Section */}
                  <div className="aspect-video bg-white/5 relative">
                    {word.imageUrl ? (
                      <img src={word.imageUrl} alt={word.english} className="w-full h-full object-cover" />
                    ) : word.imageLoading ? (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <Loader className="w-8 h-8 text-purple-400 animate-spin" />
                        <span className="text-white/50 text-xs ml-2">Đang tạo với DALL-E...</span>
                      </div>
                    ) : word.imageError ? (
                      <div className="absolute inset-0 flex flex-col items-center justify-center bg-red-500/10">
                        <span className="text-red-300 text-xs text-center px-4">{word.imageError}</span>
                        <button onClick={() => generateImage(index)} className="mt-2 text-white/50 text-xs hover:text-white">
                          Thử lại
                        </button>
                      </div>
                    ) : (
                      <button onClick={() => generateImage(index)}
                        className="absolute inset-0 flex flex-col items-center justify-center hover:bg-white/5 transition">
                        <ImageIcon className="w-8 h-8 text-white/30 mb-2" />
                        <span className="text-white/50 text-sm">Click để tạo hình ảnh (DALL-E)</span>
                      </button>
                    )}
                  </div>

                  {/* Content */}
                  <div className="p-4">
                    <div className="flex items-center justify-between mb-2">
                      <div>
                        <span className="text-white font-bold text-xl">{word.english}</span>
                        <span className="text-blue-300 text-sm ml-2">{word.pronunciation}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-0.5 rounded text-xs ${
                          word.difficulty === 'easy' ? 'bg-green-500/20 text-green-300' :
                          word.difficulty === 'medium' ? 'bg-yellow-500/20 text-yellow-300' :
                          'bg-red-500/20 text-red-300'
                        }`}>
                          {word.difficulty}
                        </span>
                        <button onClick={() => speak(word.english)} className="p-2 hover:bg-white/10 rounded-lg">
                          <Volume2 className="w-4 h-4 text-blue-400" />
                        </button>
                      </div>
                    </div>

                    <p className="text-purple-300 mb-1">{word.vietnamese}</p>
                    <p className="text-white/50 text-xs mb-3">({word.partOfSpeech}) {word.definition}</p>

                    <div className="bg-white/5 rounded-lg p-3">
                      <p className="text-white/80 text-sm">"{word.example}"</p>
                      <p className="text-white/50 text-xs mt-1">{word.exampleVi}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
