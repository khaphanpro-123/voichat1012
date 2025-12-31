'use client';

import React, { useState, useRef } from 'react';
import { Upload, Volume2, RotateCcw, Target, BookOpen, Settings, AlertCircle, Cpu } from 'lucide-react';

interface VocabularyItem {
  word: string;
  ipa?: string;
  pronunciation?: string;
  meaning_vi?: string;
  vietnamese?: string;
  part_of_speech?: string;
  partOfSpeech?: string;
  example_sentence?: string;
  sentences?: string[];
}

interface DetectedObject {
  label: string;
  label_vi?: string;
  name?: string;
  vietnamese?: string;
  confidence: number;
  bbox?: number[];
  position?: string;
}

type ApiMode = 'nextjs' | 'python';

export default function ImageLearnEnglish() {
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [objects, setObjects] = useState<DetectedObject[]>([]);
  const [vocabulary, setVocabulary] = useState<VocabularyItem[]>([]);
  const [sentences, setSentences] = useState<string[]>([]);
  const [ocrTexts, setOcrTexts] = useState<string[]>([]);
  const [sceneDescription, setSceneDescription] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [usedModel, setUsedModel] = useState('');
  const [apiMode, setApiMode] = useState<ApiMode>('nextjs');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const PYTHON_API_URL = 'http://localhost:8000';

  const speak = (text: string) => {
    if ('speechSynthesis' in window) {
      speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(text);
      u.lang = 'en-US';
      u.rate = 0.85;
      speechSynthesis.speak(u);
    }
  };

  const getPartOfSpeechColor = (pos: string) => {
    const p = pos?.toLowerCase() || '';
    if (p.includes('noun')) return 'bg-blue-500/20 text-blue-300';
    if (p.includes('verb')) return 'bg-green-500/20 text-green-300';
    if (p.includes('adj')) return 'bg-purple-500/20 text-purple-300';
    if (p.includes('adv')) return 'bg-orange-500/20 text-orange-300';
    return 'bg-gray-500/20 text-gray-300';
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setLoading(true);
    setError(null);

    const reader = new FileReader();
    reader.onload = async (event) => {
      const base64Full = event.target?.result as string;
      setImagePreview(base64Full);

      try {
        if (apiMode === 'python') {
          // Call Python API (YOLO + OCR + GPT)
          const formData = new FormData();
          formData.append('file', file);

          const res = await fetch(`${PYTHON_API_URL}/api/analyze-image`, {
            method: 'POST',
            body: formData
          });
          const data = await res.json();

          if (data.success) {
            setObjects(data.detections?.objects || []);
            setVocabulary(data.vocabulary || []);
            setSentences(data.sentences || []);
            setOcrTexts(data.ocr_texts || []);
            setUsedModel('YOLO + OCR + GPT-4o');
          } else {
            setError(data.detail || 'Python API error');
          }
        } else {
          // Call Next.js API (Gemini/GPT-4o Vision)
          const base64Data = base64Full.split(',')[1];
          const res = await fetch('/api/image-learn-english', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ imageBase64: base64Data, userId: 'anonymous' })
          });
          const data = await res.json();

          if (data.success) {
            setObjects(data.objects || []);
            setVocabulary(data.vocabulary || []);
            setSceneDescription(data.sceneDescription || '');
            setUsedModel(data.model || 'Vision AI');
          } else {
            setError(data.message);
          }
        }
      } catch (err) {
        setError(apiMode === 'python' ? 'Không kết nối được Python API (port 8000)' : 'Lỗi kết nối');
      } finally {
        setLoading(false);
      }
    };
    reader.readAsDataURL(file);
  };

  const reset = () => {
    setImagePreview(null);
    setObjects([]);
    setVocabulary([]);
    setSentences([]);
    setOcrTexts([]);
    setSceneDescription('');
    setError(null);
    setUsedModel('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };


  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-900 p-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
          <div>
            <h1 className="text-2xl font-bold text-white">🎯 Visual Language Tutor</h1>
            <p className="text-white/60 text-sm">Upload ảnh → Học từ vựng tiếng Anh</p>
          </div>
          <div className="flex items-center gap-3">
            {/* API Mode Toggle */}
            <div className="flex bg-white/10 rounded-lg p-1">
              <button onClick={() => setApiMode('nextjs')}
                className={`px-3 py-1.5 rounded text-sm transition ${apiMode === 'nextjs' ? 'bg-blue-500 text-white' : 'text-white/60 hover:text-white'}`}>
                Vision AI
              </button>
              <button onClick={() => setApiMode('python')}
                className={`px-3 py-1.5 rounded text-sm transition flex items-center gap-1 ${apiMode === 'python' ? 'bg-green-500 text-white' : 'text-white/60 hover:text-white'}`}>
                <Cpu className="w-3 h-3" /> YOLO+OCR
              </button>
            </div>
            <a href="/dashboard-new/settings" className="p-2 bg-white/10 rounded-lg hover:bg-white/20 transition">
              <Settings className="w-5 h-5 text-white" />
            </a>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="mb-6 bg-red-500/20 border border-red-500/50 rounded-xl p-4 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0" />
            <p className="text-red-300">{error}</p>
          </div>
        )}

        {/* Upload */}
        {!imagePreview ? (
          <div onClick={() => fileInputRef.current?.click()}
            className="bg-white/10 border-2 border-dashed border-white/30 rounded-2xl p-16 text-center cursor-pointer hover:border-blue-400 transition">
            <input ref={fileInputRef} type="file" accept="image/*" onChange={handleUpload} className="hidden" />
            {loading ? (
              <div className="flex flex-col items-center gap-4">
                <div className="w-12 h-12 border-4 border-blue-500/30 border-t-blue-500 rounded-full animate-spin" />
                <p className="text-white">Đang phân tích với {apiMode === 'python' ? 'YOLO + OCR + GPT' : 'Vision AI'}...</p>
              </div>
            ) : (
              <>
                <Upload className="w-12 h-12 text-white/50 mx-auto mb-4" />
                <p className="text-white text-lg">Tải ảnh lên để học từ vựng</p>
                <p className="text-white/50 text-sm mt-2">
                  {apiMode === 'python' ? 'YOLO nhận dạng vật thể + OCR đọc text + GPT sinh từ vựng' : 'AI Vision phân tích và trích xuất từ vựng A2-B1'}
                </p>
              </>
            )}
          </div>
        ) : (
          <div className="space-y-6">
            {/* Image + Objects */}
            <div className="grid lg:grid-cols-2 gap-6">
              <div className="bg-white/10 rounded-xl p-4">
                <img src={imagePreview} alt="Uploaded" className="w-full rounded-lg mb-4" />
                {sceneDescription && <p className="text-white/80 text-sm bg-white/5 rounded-lg p-3">{sceneDescription}</p>}
                {usedModel && <p className="text-white/40 text-xs mt-2">Model: {usedModel}</p>}
                {ocrTexts.length > 0 && (
                  <div className="mt-3 bg-white/5 rounded-lg p-3">
                    <p className="text-white/60 text-xs mb-1">OCR Text:</p>
                    <p className="text-white/80 text-sm">{ocrTexts.join(' | ')}</p>
                  </div>
                )}
              </div>

              {/* Objects */}
              <div className="bg-white/10 rounded-xl p-4">
                <h2 className="text-white font-semibold mb-4 flex items-center gap-2">
                  <Target className="w-5 h-5 text-green-400" />
                  Vật thể nhận dạng ({objects.length})
                </h2>
                <div className="space-y-2 max-h-80 overflow-y-auto">
                  {objects.map((obj, i) => (
                    <div key={i} className="bg-white/5 rounded-lg p-3 flex items-center justify-between">
                      <div>
                        <p className="text-white font-medium">{obj.label || obj.name}</p>
                        <p className="text-white/60 text-sm">{obj.label_vi || obj.vietnamese}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-green-400 text-xs">{Math.round(obj.confidence * 100)}%</span>
                        <button onClick={() => speak(obj.label || obj.name || '')} className="p-2 hover:bg-white/10 rounded-lg">
                          <Volume2 className="w-4 h-4 text-blue-400" />
                        </button>
                      </div>
                    </div>
                  ))}
                  {objects.length === 0 && <p className="text-white/40 text-sm">Không phát hiện vật thể</p>}
                </div>
              </div>
            </div>


            {/* Vocabulary */}
            <div className="bg-white/10 rounded-xl p-4">
              <h2 className="text-white font-semibold mb-4 flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-yellow-400" />
                Từ vựng ({vocabulary.length})
              </h2>
              <div className="grid md:grid-cols-2 gap-4">
                {vocabulary.map((v, i) => (
                  <div key={i} className="bg-white/5 rounded-xl p-4">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-white font-bold text-lg">{v.word}</span>
                        <span className="text-blue-300 text-sm">{v.ipa || v.pronunciation}</span>
                        <span className={`px-2 py-0.5 rounded text-xs ${getPartOfSpeechColor(v.part_of_speech || v.partOfSpeech || '')}`}>
                          {v.part_of_speech || v.partOfSpeech}
                        </span>
                      </div>
                      <button onClick={() => speak(v.word)} className="p-2 hover:bg-white/10 rounded-lg">
                        <Volume2 className="w-4 h-4 text-blue-400" />
                      </button>
                    </div>
                    <p className="text-purple-300 mb-3">{v.meaning_vi || v.vietnamese}</p>
                    
                    {/* Example sentences */}
                    {v.example_sentence && (
                      <div className="bg-white/5 rounded-lg p-2 flex items-start justify-between gap-2">
                        <p className="text-white/80 text-sm flex-1">"{v.example_sentence}"</p>
                        <button onClick={() => speak(v.example_sentence || '')} className="p-1 hover:bg-white/10 rounded flex-shrink-0">
                          <Volume2 className="w-3 h-3 text-blue-400" />
                        </button>
                      </div>
                    )}
                    {v.sentences && v.sentences.map((s, j) => (
                      <div key={j} className="bg-white/5 rounded-lg p-2 flex items-start justify-between gap-2 mt-2">
                        <p className="text-white/80 text-sm flex-1">"{s}"</p>
                        <button onClick={() => speak(s)} className="p-1 hover:bg-white/10 rounded flex-shrink-0">
                          <Volume2 className="w-3 h-3 text-blue-400" />
                        </button>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            </div>

            {/* Generated Sentences (from Python API) */}
            {sentences.length > 0 && (
              <div className="bg-white/10 rounded-xl p-4">
                <h2 className="text-white font-semibold mb-4">📝 Câu mẫu về ảnh</h2>
                <div className="space-y-2">
                  {sentences.map((s, i) => (
                    <div key={i} className="bg-white/5 rounded-lg p-3 flex items-center justify-between">
                      <p className="text-white/80">{s}</p>
                      <button onClick={() => speak(s)} className="p-2 hover:bg-white/10 rounded-lg">
                        <Volume2 className="w-4 h-4 text-blue-400" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Reset */}
            <div className="text-center">
              <button onClick={reset} className="px-6 py-3 bg-blue-500 text-white rounded-xl hover:bg-blue-600 transition flex items-center gap-2 mx-auto">
                <RotateCcw className="w-5 h-5" /> Ảnh mới
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
