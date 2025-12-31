'use client';

import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Upload,
  Send,
  Image as ImageIcon,
  CheckCircle,
  AlertCircle,
  Lightbulb,
  RotateCcw,
  Sparkles,
  BookOpen,
  Target
} from 'lucide-react';

interface ImageAnalysis {
  description: string;
  objects: string[];
  suggestedVocabulary: string[];
  questions: string[];
  scene: string;
}

interface FeedbackResult {
  score: number;
  feedback: string;
  corrections: Array<{ original: string; corrected: string; explanation: string }>;
  suggestions: string[];
  encouragement: string;
}

interface Message {
  id: string;
  role: 'system' | 'user' | 'ai';
  text: string;
  type?: 'question' | 'feedback' | 'hint';
}

export default function ImageDescribe() {
  const [step, setStep] = useState<'upload' | 'describe' | 'result'>('upload');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageBase64, setImageBase64] = useState<string>('');
  const [imageAnalysis, setImageAnalysis] = useState<ImageAnalysis | null>(null);
  const [userDescription, setUserDescription] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [feedback, setFeedback] = useState<FeedbackResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [level, setLevel] = useState<'A1' | 'A2' | 'B1' | 'B2'>('A2');
  const [showHints, setShowHints] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Handle image upload
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImageFile(file);
    setLoading(true);

    const reader = new FileReader();
    reader.onload = async (event) => {
      const base64Full = event.target?.result as string;
      setImagePreview(base64Full);
      
      // Extract base64 data (remove prefix)
      const base64Data = base64Full.split(',')[1];
      setImageBase64(base64Data);

      // Analyze image with Gemini
      try {
        const response = await fetch('/api/image-describe', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'analyze',
            imageBase64: base64Data,
            level
          })
        });

        const data = await response.json();

        if (data.success) {
          setImageAnalysis(data.analysis);
          setMessages([{
            id: '1',
            role: 'ai',
            text: data.firstQuestion || "What do you see in this picture? Try to describe it in English!",
            type: 'question'
          }]);
          setStep('describe');
        } else {
          alert(data.message || 'Failed to analyze image');
        }
      } catch (error) {
        console.error('Analysis error:', error);
        alert('Failed to analyze image. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    reader.readAsDataURL(file);
  };

  // Submit description
  const submitDescription = async () => {
    if (!userDescription.trim() || !imageBase64) return;

    setLoading(true);

    // Add user message
    setMessages(prev => [...prev, {
      id: Date.now().toString(),
      role: 'user',
      text: userDescription
    }]);

    try {
      const response = await fetch('/api/image-describe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'check',
          imageBase64,
          userDescription,
          imageAnalysis,
          level
        })
      });

      const data = await response.json();

      if (data.success) {
        setFeedback(data);
        
        // Add AI feedback message
        setMessages(prev => [...prev, {
          id: (Date.now() + 1).toString(),
          role: 'ai',
          text: data.feedback,
          type: 'feedback'
        }]);

        setStep('result');
      }
    } catch (error) {
      console.error('Check error:', error);
    } finally {
      setLoading(false);
    }
  };

  // Reset
  const reset = () => {
    setStep('upload');
    setImageFile(null);
    setImagePreview(null);
    setImageBase64('');
    setImageAnalysis(null);
    setUserDescription('');
    setMessages([]);
    setFeedback(null);
    setShowHints(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Try again with same image
  const tryAgain = () => {
    setStep('describe');
    setUserDescription('');
    setFeedback(null);
    setMessages([{
      id: '1',
      role: 'ai',
      text: imageAnalysis?.questions[0] || "Try describing the image again!",
      type: 'question'
    }]);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-900 via-teal-900 to-cyan-900 p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-3 mb-4">
            <div className="w-12 h-12 bg-gradient-to-r from-emerald-500 to-teal-500 rounded-full flex items-center justify-center">
              <ImageIcon className="w-6 h-6 text-white" />
            </div>
            <h1 className="text-3xl font-bold text-white">Image Describe</h1>
          </div>
          <p className="text-white/60">Upload an image and practice describing it in English</p>
        </div>

        {/* Level Selector */}
        <div className="flex justify-center gap-2 mb-8">
          {(['A1', 'A2', 'B1', 'B2'] as const).map((l) => (
            <button
              key={l}
              onClick={() => setLevel(l)}
              className={`px-4 py-2 rounded-lg font-medium transition ${
                level === l
                  ? 'bg-emerald-500 text-white'
                  : 'bg-white/10 text-white/70 hover:bg-white/20'
              }`}
            >
              {l}
            </button>
          ))}
        </div>

        <AnimatePresence mode="wait">
          {/* Step 1: Upload */}
          {step === 'upload' && (
            <motion.div
              key="upload"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="bg-white/10 backdrop-blur-lg rounded-3xl p-8 border border-white/20"
            >
              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-white/30 rounded-2xl p-12 text-center cursor-pointer hover:border-emerald-400 transition"
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="hidden"
                />

                {loading ? (
                  <div className="flex flex-col items-center gap-4">
                    <div className="w-16 h-16 border-4 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin" />
                    <p className="text-white/80">Analyzing image with Gemini AI...</p>
                  </div>
                ) : (
                  <>
                    <Upload className="w-16 h-16 text-white/40 mx-auto mb-4" />
                    <p className="text-xl font-semibold text-white mb-2">
                      Upload an Image
                    </p>
                    <p className="text-white/60">
                      Click or drag an image to start practicing
                    </p>
                  </>
                )}
              </div>
            </motion.div>
          )}

          {/* Step 2: Describe */}
          {step === 'describe' && imagePreview && (
            <motion.div
              key="describe"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="grid lg:grid-cols-2 gap-6"
            >
              {/* Left: Image */}
              <div className="space-y-4">
                <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-4 border border-white/20">
                  <img
                    src={imagePreview}
                    alt="Uploaded"
                    className="w-full rounded-xl"
                  />
                </div>

                {/* Hints */}
                {imageAnalysis && (
                  <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-4 border border-white/20">
                    <button
                      onClick={() => setShowHints(!showHints)}
                      className="flex items-center gap-2 text-yellow-400 font-medium mb-3"
                    >
                      <Lightbulb className="w-5 h-5" />
                      {showHints ? 'Hide Hints' : 'Show Hints'}
                    </button>

                    <AnimatePresence>
                      {showHints && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          className="space-y-3"
                        >
                          <div>
                            <p className="text-white/60 text-sm mb-2">Objects in image:</p>
                            <div className="flex flex-wrap gap-2">
                              {imageAnalysis.objects.map((obj, i) => (
                                <span key={i} className="px-3 py-1 bg-emerald-500/20 text-emerald-300 rounded-full text-sm">
                                  {obj}
                                </span>
                              ))}
                            </div>
                          </div>

                          <div>
                            <p className="text-white/60 text-sm mb-2">Useful vocabulary:</p>
                            <div className="flex flex-wrap gap-2">
                              {imageAnalysis.suggestedVocabulary.map((word, i) => (
                                <span key={i} className="px-3 py-1 bg-blue-500/20 text-blue-300 rounded-full text-sm">
                                  {word}
                                </span>
                              ))}
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                )}
              </div>

              {/* Right: Chat */}
              <div className="bg-white/10 backdrop-blur-lg rounded-2xl border border-white/20 flex flex-col h-[500px]">
                {/* Messages */}
                <div className="flex-1 p-4 overflow-y-auto space-y-4">
                  {messages.map((msg) => (
                    <div
                      key={msg.id}
                      className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                    >
                      <div className={`max-w-[85%] rounded-2xl px-4 py-3 ${
                        msg.role === 'user'
                          ? 'bg-emerald-500 text-white'
                          : 'bg-white/20 text-white'
                      }`}>
                        {msg.type === 'question' && (
                          <div className="flex items-center gap-2 mb-1 text-yellow-300 text-sm">
                            <Target className="w-4 h-4" />
                            Question
                          </div>
                        )}
                        <p>{msg.text}</p>
                      </div>
                    </div>
                  ))}

                  {loading && (
                    <div className="flex justify-start">
                      <div className="bg-white/20 rounded-2xl px-4 py-3">
                        <div className="flex gap-1">
                          {[0, 1, 2].map(i => (
                            <motion.div
                              key={i}
                              className="w-2 h-2 bg-white/60 rounded-full"
                              animate={{ y: [0, -8, 0] }}
                              transition={{ duration: 0.6, repeat: Infinity, delay: i * 0.2 }}
                            />
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Input */}
                <div className="p-4 border-t border-white/10">
                  <div className="flex gap-3">
                    <textarea
                      value={userDescription}
                      onChange={(e) => setUserDescription(e.target.value)}
                      placeholder="Describe what you see in English..."
                      className="flex-1 bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-white placeholder-white/40 resize-none"
                      rows={3}
                      disabled={loading}
                    />
                    <button
                      onClick={submitDescription}
                      disabled={!userDescription.trim() || loading}
                      className="px-6 bg-emerald-500 text-white rounded-xl hover:bg-emerald-600 transition disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <Send className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {/* Step 3: Result */}
          {step === 'result' && feedback && (
            <motion.div
              key="result"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-6"
            >
              {/* Score Card */}
              <div className="bg-white/10 backdrop-blur-lg rounded-3xl p-8 border border-white/20 text-center">
                <div className="w-32 h-32 mx-auto mb-6 relative">
                  <svg className="w-full h-full transform -rotate-90">
                    <circle
                      cx="64"
                      cy="64"
                      r="56"
                      stroke="rgba(255,255,255,0.1)"
                      strokeWidth="12"
                      fill="none"
                    />
                    <circle
                      cx="64"
                      cy="64"
                      r="56"
                      stroke={feedback.score >= 70 ? '#10b981' : feedback.score >= 50 ? '#f59e0b' : '#ef4444'}
                      strokeWidth="12"
                      fill="none"
                      strokeDasharray={`${(feedback.score / 100) * 352} 352`}
                      strokeLinecap="round"
                    />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-4xl font-bold text-white">{feedback.score}</span>
                  </div>
                </div>

                <h2 className="text-2xl font-bold text-white mb-2">
                  {feedback.score >= 80 ? 'Excellent! 🎉' : 
                   feedback.score >= 60 ? 'Good job! 👍' : 
                   'Keep practicing! 💪'}
                </h2>
                <p className="text-white/60">{feedback.encouragement}</p>
              </div>

              {/* Feedback Details */}
              <div className="grid md:grid-cols-2 gap-6">
                {/* Your Description */}
                <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 border border-white/20">
                  <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                    <BookOpen className="w-5 h-5 text-blue-400" />
                    Your Description
                  </h3>
                  <p className="text-white/80 bg-white/5 p-4 rounded-xl">
                    "{userDescription}"
                  </p>
                </div>

                {/* AI Feedback */}
                <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 border border-white/20">
                  <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-purple-400" />
                    Feedback
                  </h3>
                  <p className="text-white/80">{feedback.feedback}</p>
                </div>
              </div>

              {/* Corrections */}
              {feedback.corrections.length > 0 && (
                <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 border border-white/20">
                  <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                    <AlertCircle className="w-5 h-5 text-yellow-400" />
                    Corrections
                  </h3>
                  <div className="space-y-3">
                    {feedback.corrections.map((c, i) => (
                      <div key={i} className="bg-white/5 p-4 rounded-xl">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="line-through text-red-400">{c.original}</span>
                          <span className="text-white/40">→</span>
                          <span className="text-green-400 font-medium">{c.corrected}</span>
                        </div>
                        <p className="text-white/60 text-sm">{c.explanation}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Suggestions */}
              {feedback.suggestions.length > 0 && (
                <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 border border-white/20">
                  <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                    <Lightbulb className="w-5 h-5 text-yellow-400" />
                    Suggestions
                  </h3>
                  <ul className="space-y-2">
                    {feedback.suggestions.map((s, i) => (
                      <li key={i} className="flex items-start gap-2 text-white/80">
                        <CheckCircle className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5" />
                        {s}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Actions */}
              <div className="flex justify-center gap-4">
                <button
                  onClick={tryAgain}
                  className="px-6 py-3 bg-white/10 text-white rounded-xl hover:bg-white/20 transition flex items-center gap-2"
                >
                  <RotateCcw className="w-5 h-5" />
                  Try Again
                </button>
                <button
                  onClick={reset}
                  className="px-6 py-3 bg-emerald-500 text-white rounded-xl hover:bg-emerald-600 transition flex items-center gap-2"
                >
                  <Upload className="w-5 h-5" />
                  New Image
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
