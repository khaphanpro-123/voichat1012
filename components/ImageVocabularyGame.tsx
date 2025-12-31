'use client';

import React, { useState, useRef, useCallback } from 'react';
import { 
  Upload, Image as ImageIcon, Sparkles, CheckCircle, XCircle, 
  ArrowRight, RefreshCw, Trophy, Target, BookOpen, Lightbulb,
  Send, Loader2, Camera
} from 'lucide-react';

interface AnalysisResult {
  topic: string;
  context: string;
  keywords: string[];
}

interface CompareResult {
  correct: string[];
  missing: string[];
  incorrect: string[];
  score: number;
  feedback: string;
}

interface SuggestionResult {
  focus_topics: string[];
  learning_suggestions: string[];
  next_lesson: string;
}

type GameStep = 'upload' | 'analyzing' | 'guess' | 'result' | 'suggestion';

export default function ImageVocabularyGame({ userId = 'anonymous' }: { userId?: string }) {
  const [step, setStep] = useState<GameStep>('upload');
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [ocrText, setOcrText] = useState('');
  const [detectedObjects, setDetectedObjects] = useState<string[]>([]);
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [systemVocab, setSystemVocab] = useState<string[]>([]);
  const [userInput, setUserInput] = useState('');
  const [userVocab, setUserVocab] = useState<string[]>([]);
  const [compareResult, setCompareResult] = useState<CompareResult | null>(null);
  const [suggestion, setSuggestion] = useState<SuggestionResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [provider, setProvider] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImageUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      setImageUrl(event.target?.result as string);
    };
    reader.readAsDataURL(file);
  }, []);

  // Step 1 & 2: Analyze image and generate vocabulary
  const analyzeImage = async () => {
    if (!imageUrl) return;
    setLoading(true);
    setStep('analyzing');

    try {
      // First: Analyze image meaning
      const analyzeRes = await fetch('/api/image-vocabulary-game', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'analyzeImage',
          userId,
          detectedObjects,
          ocrText,
          language: 'vi'
        })
      });
      const analyzeData = await analyzeRes.json();
      
      if (!analyzeData.success) throw new Error(analyzeData.message);
      setAnalysis(analyzeData.data);
      setProvider(analyzeData.provider);

      // Second: Generate vocabulary
      const vocabRes = await fetch('/api/image-vocabulary-game', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'generateVocabulary',
          userId,
          topic: analyzeData.data.topic,
          context: analyzeData.data.context
        })
      });
      const vocabData = await vocabRes.json();
      
      if (vocabData.success && vocabData.data?.vocabulary) {
        setSystemVocab(vocabData.data.vocabulary);
      }

      setStep('guess');
    } catch (error) {
      console.error('Analyze error:', error);
      alert('Lỗi phân tích ảnh. Vui lòng thử lại.');
      setStep('upload');
    } finally {
      setLoading(false);
    }
  };

  // Add word to user vocabulary
  const addWord = () => {
    const word = userInput.trim().toLowerCase();
    if (word && !userVocab.includes(word)) {
      setUserVocab([...userVocab, word]);
      setUserInput('');
    }
  };

  const removeWord = (word: string) => {
    setUserVocab(userVocab.filter(w => w !== word));
  };

  // Step 3: Compare vocabulary
  const submitGuess = async () => {
    if (userVocab.length === 0) {
      alert('Vui lòng nhập ít nhất 1 từ vựng!');
      return;
    }
    setLoading(true);

    try {
      const res = await fetch('/api/image-vocabulary-game', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'compareVocabulary',
          userId,
          systemVocabulary: systemVocab,
          userVocabulary: userVocab
        })
      });
      const data = await res.json();
      
      if (!data.success) throw new Error(data.message);
      setCompareResult(data.data);
      setStep('result');
    } catch (error) {
      console.error('Compare error:', error);
      alert('Lỗi so sánh từ vựng');
    } finally {
      setLoading(false);
    }
  };

  // Step 4: Get suggestions
  const getSuggestions = async () => {
    if (!compareResult) return;
    setLoading(true);

    try {
      const res = await fetch('/api/image-vocabulary-game', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'suggestNext',
          userId,
          score: compareResult.score,
          weakVocabulary: compareResult.missing,
          context: analysis?.context || ''
        })
      });
      const data = await res.json();
      
      if (data.success) {
        setSuggestion(data.data);
        setStep('suggestion');
      }
    } catch (error) {
      console.error('Suggestion error:', error);
    } finally {
      setLoading(false);
    }
  };

  // Reset game
  const resetGame = () => {
    setStep('upload');
    setImageUrl(null);
    setOcrText('');
    setDetectedObjects([]);
    setAnalysis(null);
    setSystemVocab([]);
    setUserInput('');
    setUserVocab([]);
    setCompareResult(null);
    setSuggestion(null);
  };

  const getScoreColor = (score: number) => {
    if (score >= 0.8) return 'text-green-400';
    if (score >= 0.5) return 'text-yellow-400';
    return 'text-red-400';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-900 p-4">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold text-white flex items-center justify-center gap-2">
            <ImageIcon className="w-7 h-7 text-pink-400" />
            Đoán Từ Vựng Qua Ảnh
          </h1>
          <p className="text-white/60 text-sm mt-1">
            Nhìn ảnh → Đoán từ vựng → Học từ mới
          </p>
          {provider && (
            <span className="text-xs text-white/40 mt-1 block">AI: {provider}</span>
          )}
        </div>

        {/* Step 1: Upload */}
        {step === 'upload' && (
          <div className="bg-white/10 backdrop-blur rounded-2xl p-6 border border-white/20">
            <div 
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-white/30 rounded-xl p-8 text-center cursor-pointer hover:border-pink-400 transition"
            >
              {imageUrl ? (
                <img src={imageUrl} alt="Uploaded" className="max-h-64 mx-auto rounded-lg" />
              ) : (
                <>
                  <Upload className="w-12 h-12 text-white/40 mx-auto mb-3" />
                  <p className="text-white/60">Click để tải ảnh lên</p>
                  <p className="text-white/40 text-sm mt-1">PNG, JPG, WEBP</p>
                </>
              )}
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleImageUpload}
              className="hidden"
            />

            {imageUrl && (
              <>
                {/* Optional: OCR text input */}
                <div className="mt-4">
                  <label className="text-white/60 text-sm block mb-2">
                    Văn bản trong ảnh (nếu có):
                  </label>
                  <input
                    type="text"
                    value={ocrText}
                    onChange={(e) => setOcrText(e.target.value)}
                    placeholder="Nhập text đọc được từ ảnh..."
                    className="w-full bg-white/5 border border-white/20 rounded-lg px-4 py-2 text-white placeholder-white/40"
                  />
                </div>

                {/* Optional: Detected objects */}
                <div className="mt-4">
                  <label className="text-white/60 text-sm block mb-2">
                    Đối tượng trong ảnh (cách nhau bởi dấu phẩy):
                  </label>
                  <input
                    type="text"
                    value={detectedObjects.join(', ')}
                    onChange={(e) => setDetectedObjects(e.target.value.split(',').map(s => s.trim()).filter(Boolean))}
                    placeholder="person, car, tree..."
                    className="w-full bg-white/5 border border-white/20 rounded-lg px-4 py-2 text-white placeholder-white/40"
                  />
                </div>

                <button
                  onClick={analyzeImage}
                  className="w-full mt-4 py-3 bg-gradient-to-r from-pink-500 to-purple-500 text-white rounded-xl font-medium flex items-center justify-center gap-2 hover:opacity-90 transition"
                >
                  <Sparkles className="w-5 h-5" />
                  Phân tích ảnh
                </button>
              </>
            )}
          </div>
        )}

        {/* Step: Analyzing */}
        {step === 'analyzing' && (
          <div className="bg-white/10 backdrop-blur rounded-2xl p-8 border border-white/20 text-center">
            <Loader2 className="w-12 h-12 text-pink-400 animate-spin mx-auto mb-4" />
            <p className="text-white text-lg">Đang phân tích ảnh...</p>
            <p className="text-white/60 text-sm mt-2">Đang nhận diện nội dung và tạo từ vựng</p>
          </div>
        )}

        {/* Step 2: Guess vocabulary */}
        {step === 'guess' && analysis && (
          <div className="space-y-4">
            {/* Image preview */}
            <div className="bg-white/10 backdrop-blur rounded-2xl p-4 border border-white/20">
              {imageUrl && (
                <img src={imageUrl} alt="Game" className="max-h-48 mx-auto rounded-lg mb-4" />
              )}
              <div className="text-center">
                <h3 className="text-white font-semibold">{analysis.topic}</h3>
                <p className="text-white/60 text-sm mt-1">{analysis.context}</p>
              </div>
            </div>

            {/* Input vocabulary */}
            <div className="bg-white/10 backdrop-blur rounded-2xl p-4 border border-white/20">
              <h3 className="text-white font-medium mb-3 flex items-center gap-2">
                <Target className="w-5 h-5 text-yellow-400" />
                Nhập từ vựng bạn nghĩ liên quan đến ảnh:
              </h3>
              
              <div className="flex gap-2 mb-3">
                <input
                  type="text"
                  value={userInput}
                  onChange={(e) => setUserInput(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && addWord()}
                  placeholder="Nhập từ vựng..."
                  className="flex-1 bg-white/5 border border-white/20 rounded-lg px-4 py-2 text-white placeholder-white/40"
                />
                <button
                  onClick={addWord}
                  className="px-4 py-2 bg-pink-500 text-white rounded-lg hover:bg-pink-600 transition"
                >
                  <Send className="w-5 h-5" />
                </button>
              </div>

              {/* User vocabulary tags */}
              <div className="flex flex-wrap gap-2 min-h-[40px]">
                {userVocab.map((word, i) => (
                  <span
                    key={i}
                    onClick={() => removeWord(word)}
                    className="px-3 py-1 bg-purple-500/30 text-purple-200 rounded-full text-sm cursor-pointer hover:bg-red-500/30 transition"
                  >
                    {word} ×
                  </span>
                ))}
                {userVocab.length === 0 && (
                  <span className="text-white/40 text-sm">Chưa có từ nào...</span>
                )}
              </div>

              <button
                onClick={submitGuess}
                disabled={loading || userVocab.length === 0}
                className="w-full mt-4 py-3 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-xl font-medium flex items-center justify-center gap-2 hover:opacity-90 transition disabled:opacity-50"
              >
                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <CheckCircle className="w-5 h-5" />}
                Kiểm tra kết quả
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Result */}
        {step === 'result' && compareResult && (
          <div className="space-y-4">
            {/* Score */}
            <div className="bg-white/10 backdrop-blur rounded-2xl p-6 border border-white/20 text-center">
              <Trophy className={`w-16 h-16 mx-auto mb-3 ${getScoreColor(compareResult.score)}`} />
              <h2 className={`text-4xl font-bold ${getScoreColor(compareResult.score)}`}>
                {Math.round(compareResult.score * 100)}%
              </h2>
              <p className="text-white/60 mt-2">{compareResult.feedback}</p>
            </div>

            {/* Correct words */}
            {compareResult.correct.length > 0 && (
              <div className="bg-green-500/20 rounded-xl p-4 border border-green-500/30">
                <h3 className="text-green-400 font-medium flex items-center gap-2 mb-2">
                  <CheckCircle className="w-5 h-5" /> Đúng ({compareResult.correct.length})
                </h3>
                <div className="flex flex-wrap gap-2">
                  {compareResult.correct.map((w, i) => (
                    <span key={i} className="px-3 py-1 bg-green-500/30 text-green-200 rounded-full text-sm">{w}</span>
                  ))}
                </div>
              </div>
            )}

            {/* Missing words */}
            {compareResult.missing.length > 0 && (
              <div className="bg-yellow-500/20 rounded-xl p-4 border border-yellow-500/30">
                <h3 className="text-yellow-400 font-medium flex items-center gap-2 mb-2">
                  <Lightbulb className="w-5 h-5" /> Còn thiếu ({compareResult.missing.length})
                </h3>
                <div className="flex flex-wrap gap-2">
                  {compareResult.missing.map((w, i) => (
                    <span key={i} className="px-3 py-1 bg-yellow-500/30 text-yellow-200 rounded-full text-sm">{w}</span>
                  ))}
                </div>
              </div>
            )}

            {/* Incorrect words */}
            {compareResult.incorrect.length > 0 && (
              <div className="bg-red-500/20 rounded-xl p-4 border border-red-500/30">
                <h3 className="text-red-400 font-medium flex items-center gap-2 mb-2">
                  <XCircle className="w-5 h-5" /> Không liên quan ({compareResult.incorrect.length})
                </h3>
                <div className="flex flex-wrap gap-2">
                  {compareResult.incorrect.map((w, i) => (
                    <span key={i} className="px-3 py-1 bg-red-500/30 text-red-200 rounded-full text-sm">{w}</span>
                  ))}
                </div>
              </div>
            )}

            {/* System vocabulary reveal */}
            <div className="bg-white/10 rounded-xl p-4 border border-white/20">
              <h3 className="text-white font-medium flex items-center gap-2 mb-2">
                <BookOpen className="w-5 h-5 text-blue-400" /> Từ vựng chuẩn
              </h3>
              <div className="flex flex-wrap gap-2">
                {systemVocab.map((w, i) => (
                  <span key={i} className="px-3 py-1 bg-blue-500/30 text-blue-200 rounded-full text-sm">{w}</span>
                ))}
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-3">
              <button
                onClick={getSuggestions}
                disabled={loading}
                className="flex-1 py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-xl font-medium flex items-center justify-center gap-2 hover:opacity-90 transition"
              >
                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <ArrowRight className="w-5 h-5" />}
                Gợi ý học tiếp
              </button>
              <button
                onClick={resetGame}
                className="px-4 py-3 bg-white/10 text-white rounded-xl hover:bg-white/20 transition"
              >
                <RefreshCw className="w-5 h-5" />
              </button>
            </div>
          </div>
        )}

        {/* Step 4: Suggestions */}
        {step === 'suggestion' && suggestion && (
          <div className="space-y-4">
            <div className="bg-gradient-to-br from-purple-500/20 to-pink-500/20 rounded-2xl p-6 border border-purple-500/30">
              <h2 className="text-white text-xl font-bold flex items-center gap-2 mb-4">
                <Lightbulb className="w-6 h-6 text-yellow-400" />
                Gợi ý học tập
              </h2>

              {/* Focus topics */}
              <div className="mb-4">
                <h3 className="text-white/80 text-sm font-medium mb-2">Chủ đề cần tập trung:</h3>
                <div className="flex flex-wrap gap-2">
                  {suggestion.focus_topics.map((t, i) => (
                    <span key={i} className="px-3 py-1 bg-purple-500/40 text-purple-200 rounded-full text-sm">{t}</span>
                  ))}
                </div>
              </div>

              {/* Suggestions */}
              <div className="mb-4">
                <h3 className="text-white/80 text-sm font-medium mb-2">Đề xuất:</h3>
                <ul className="space-y-2">
                  {suggestion.learning_suggestions.map((s, i) => (
                    <li key={i} className="text-white/70 text-sm flex items-start gap-2">
                      <span className="text-pink-400">•</span> {s}
                    </li>
                  ))}
                </ul>
              </div>

              {/* Next lesson */}
              <div className="bg-white/10 rounded-xl p-4">
                <h3 className="text-white/80 text-sm font-medium mb-1">Bài học tiếp theo:</h3>
                <p className="text-white font-semibold">{suggestion.next_lesson}</p>
              </div>
            </div>

            <button
              onClick={resetGame}
              className="w-full py-3 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-xl font-medium flex items-center justify-center gap-2 hover:opacity-90 transition"
            >
              <Camera className="w-5 h-5" />
              Chơi lại với ảnh mới
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
