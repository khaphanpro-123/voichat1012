"use client";
import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Upload, FileText, CheckCircle, Loader, BookOpen, AlertCircle,
  RefreshCw, ArrowRight, ArrowLeft, Volume2, Trash2, Clock, File,
  Brain, Filter, Sparkles, Eye, EyeOff, ChevronDown, ChevronUp,
  Tag, Layers, Target, Lightbulb
} from "lucide-react";

interface ContextAnalysis {
  summary: string;
  domains: string[];
  themes: string[];
  sectionsLabeling: Array<{ section: string; label: string; reason: string }>;
  keyTheories: Array<{ term: string; definition: string }>;
  highDensitySegments: string[];
  excludePatterns: string[];
}

interface ExtractedPhrase {
  term: string;
  translation_vi: string;
  category: string;
  definition: string;
  example: string;
  source_span: string;
  confidence: number;
  tags: string[];
}

interface SmartFlashcard {
  id: string;
  front: string;
  back: string;
  extra: { tags: string[]; category: string; source_span: string };
  difficulty: number;
  review_hint: string;
  term: string;
  translation_vi: string;
  definition: string;
  example: string;
}

type Step = 'upload' | 'context' | 'phrases' | 'flashcards';

export default function SmartDocumentExtractor() {
  const { data: session } = useSession();
  const userId = (session?.user as any)?.id || 'anonymous';

  const [step, setStep] = useState<Step>('upload');
  const [file, setFile] = useState<File | null>(null);
  const [documentId, setDocumentId] = useState<string | null>(null);
  const [extractedText, setExtractedText] = useState<string>('');
  
  // Step 1: Context
  const [context, setContext] = useState<ContextAnalysis | null>(null);
  const [editableExcludePatterns, setEditableExcludePatterns] = useState<string[]>([]);
  
  // Step 2: Phrases
  const [phrases, setPhrases] = useState<ExtractedPhrase[]>([]);
  const [selectedPhrases, setSelectedPhrases] = useState<Set<string>>(new Set());
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  
  // Step 3: Flashcards
  const [flashcards, setFlashcards] = useState<SmartFlashcard[]>([]);
  
  // UI State
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['summary', 'themes']));

  const toggleSection = (section: string) => {
    setExpandedSections(prev => {
      const next = new Set(prev);
      if (next.has(section)) next.delete(section);
      else next.add(section);
      return next;
    });
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) {
      setFile(e.target.files[0]);
      setError(null);
    }
  };

  // Upload & OCR
  const handleUpload = async () => {
    if (!file) return;
    setIsLoading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("userId", userId);

      const res = await fetch("/api/upload-ocr", { method: "POST", body: formData });
      const data = await res.json();
      
      if (!data.success) throw new Error(data.message || "Upload failed");
      
      setDocumentId(data.documentId);
      setExtractedText(data.text);
      
      // Auto-proceed to context analysis
      await analyzeContext(data.text);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  // Step 1: Analyze Context
  const analyzeContext = async (text?: string) => {
    setIsLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/smart-extract", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: 'analyze-context',
          text: text || extractedText,
          documentId,
          userId
        })
      });
      
      const data = await res.json();
      if (!data.success) throw new Error(data.message);
      
      setContext(data.data.context);
      setEditableExcludePatterns(data.data.context.excludePatterns || []);
      setStep('context');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  // Step 2: Extract Phrases
  const extractPhrases = async () => {
    if (!context) return;
    setIsLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/smart-extract", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: 'extract-phrases',
          text: extractedText,
          documentId,
          userId,
          context: { ...context, excludePatterns: editableExcludePatterns }
        })
      });
      
      const data = await res.json();
      if (!data.success) throw new Error(data.message);
      
      setPhrases(data.data.phrases);
      setSelectedPhrases(new Set(data.data.phrases.map((p: ExtractedPhrase) => p.term)));
      setStep('phrases');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  // Step 3: Generate Flashcards
  const generateFlashcards = async () => {
    const selected = phrases.filter(p => selectedPhrases.has(p.term));
    if (selected.length === 0) return;
    
    setIsLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/smart-extract", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: 'generate-flashcards',
          phrases: selected,
          documentId,
          userId
        })
      });
      
      const data = await res.json();
      if (!data.success) throw new Error(data.message);
      
      setFlashcards(data.data.flashcards);
      setStep('flashcards');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const resetAll = () => {
    setStep('upload');
    setFile(null);
    setDocumentId(null);
    setExtractedText('');
    setContext(null);
    setPhrases([]);
    setSelectedPhrases(new Set());
    setFlashcards([]);
    setError(null);
  };

  const togglePhrase = (term: string) => {
    setSelectedPhrases(prev => {
      const next = new Set(prev);
      if (next.has(term)) next.delete(term);
      else next.add(term);
      return next;
    });
  };

  const selectAllPhrases = () => setSelectedPhrases(new Set(filteredPhrases.map(p => p.term)));
  const deselectAllPhrases = () => setSelectedPhrases(new Set());

  const categories = ['all', ...new Set(phrases.map(p => p.category))];
  const filteredPhrases = categoryFilter === 'all' 
    ? phrases 
    : phrases.filter(p => p.category === categoryFilter);

  const categoryColors: Record<string, string> = {
    theory: 'bg-purple-100 text-purple-700',
    model: 'bg-blue-100 text-blue-700',
    method: 'bg-green-100 text-green-700',
    tool: 'bg-orange-100 text-orange-700',
    process: 'bg-cyan-100 text-cyan-700',
    principle: 'bg-red-100 text-red-700',
    concept: 'bg-indigo-100 text-indigo-700',
    vocabulary: 'bg-teal-100 text-teal-700'
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
              <Brain className="w-8 h-8 text-indigo-600" />
              Smart Document Extractor
            </h1>
            <p className="text-gray-600 mt-1">Trích xuất từ vựng thông minh theo ngữ cảnh</p>
          </div>
          {step !== 'upload' && (
            <button onClick={resetAll} className="flex items-center gap-2 px-4 py-2 bg-gray-100 rounded-xl hover:bg-gray-200">
              <RefreshCw className="w-4 h-4" /> Bắt đầu lại
            </button>
          )}
        </div>

        {/* Progress Steps */}
        <div className="flex items-center justify-center gap-4 mb-8">
          {['upload', 'context', 'phrases', 'flashcards'].map((s, i) => (
            <div key={s} className="flex items-center">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold ${
                step === s ? 'bg-indigo-600 text-white' : 
                ['upload', 'context', 'phrases', 'flashcards'].indexOf(step) > i ? 'bg-green-500 text-white' : 'bg-gray-200 text-gray-500'
              }`}>
                {['upload', 'context', 'phrases', 'flashcards'].indexOf(step) > i ? '✓' : i + 1}
              </div>
              <span className={`ml-2 text-sm ${step === s ? 'text-indigo-600 font-semibold' : 'text-gray-500'}`}>
                {s === 'upload' ? 'Upload' : s === 'context' ? 'Ngữ cảnh' : s === 'phrases' ? 'Cụm từ' : 'Flashcards'}
              </span>
              {i < 3 && <div className="w-12 h-0.5 bg-gray-200 mx-4" />}
            </div>
          ))}
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl flex items-center gap-3 text-red-700">
            <AlertCircle className="w-5 h-5" />
            <p>{error}</p>
          </div>
        )}

        <AnimatePresence mode="wait">
          {/* Step 1: Upload */}
          {step === 'upload' && (
            <motion.div key="upload" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
              className="bg-white rounded-3xl shadow-xl p-8">
              <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
                <Upload className="w-6 h-6 text-indigo-600" /> Upload Document
              </h2>
              
              <div className="border-2 border-dashed border-gray-300 rounded-2xl p-12 text-center hover:border-indigo-500 transition cursor-pointer"
                onClick={() => document.getElementById('smart-file-upload')?.click()}>
                <input type="file" accept=".pdf,.png,.jpg,.jpeg,.docx,.txt" onChange={handleFileChange} className="hidden" id="smart-file-upload" />
                <Upload className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <p className="text-lg font-semibold text-gray-700 mb-2">Click để chọn file</p>
                <p className="text-sm text-gray-500">PDF, PNG, JPG, DOCX, TXT (Max 10MB)</p>
              </div>

              {file && (
                <div className="mt-6 flex items-center justify-between bg-indigo-50 p-4 rounded-xl">
                  <div className="flex items-center gap-3">
                    <FileText className="w-6 h-6 text-indigo-600" />
                    <div>
                      <p className="font-semibold">{file.name}</p>
                      <p className="text-sm text-gray-600">{(file.size / 1024).toFixed(1)} KB</p>
                    </div>
                  </div>
                  <button onClick={handleUpload} disabled={isLoading}
                    className="px-6 py-3 bg-indigo-600 text-white font-semibold rounded-xl hover:bg-indigo-700 disabled:opacity-50 flex items-center gap-2">
                    {isLoading ? <Loader className="w-5 h-5 animate-spin" /> : <Sparkles className="w-5 h-5" />}
                    {isLoading ? 'Đang xử lý...' : 'Phân tích thông minh'}
                  </button>
                </div>
              )}
            </motion.div>
          )}
