"use client";
import React, { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Upload,
  MessageSquare,
  Mic,
  Send,
  Volume2,
  CheckCircle,
  Lightbulb,
  User,
  Bot,
  Loader,
  RotateCcw,
  TrendingUp,
  Square,
  StopCircle,
} from "lucide-react";
import { useVoiceRecorder } from "@/hooks/useVoiceRecorder";
import { useSpeechRecognition } from "@/hooks/useSpeechRecognition";

interface DebateSession {
  sessionId: string;
  imageAnalysis: any;
  visionData: any; // Vision data for alignment API
  vocabulary: string[];
  speakingTopic: string;
  conversation: Array<{
    role: 'ai' | 'user';
    message: string;
    corrections?: any;
  }>;
  currentLevel: number;
}

interface UserProgress {
  level: number;
  completedLessons: number;
  weakVocabulary: string[];
  pronunciationErrors: string[];
}

export default function DebateMode() {
  const [step, setStep] = useState<'upload' | 'session' | 'complete'>('upload');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [userLevel, setUserLevel] = useState(0);
  const [session, setSession] = useState<DebateSession | null>(null);
  const [currentResponse, setCurrentResponse] = useState('');
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState<UserProgress>({
    level: 0,
    completedLessons: 0,
    weakVocabulary: [],
    pronunciationErrors: []
  });
  const [inputMode, setInputMode] = useState<'text' | 'voice'>('text');
  const [recording, setRecording] = useState(false);
  const [transcribing, setTranscribing] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Voice recording for pronunciation analysis
  const voiceRecorder = useVoiceRecorder({
    maxDuration: 60,
    onRecordingComplete: async (_audioBlob, audioBase64) => {
      setRecording(false);
      setTranscribing(true);
      await analyzeSpeakingResponse(audioBase64);
      setTranscribing(false);
    },
    onError: (error) => {
      console.error('Voice recording error:', error);
      setRecording(false);
      setTranscribing(false);
    }
  });

  const levelDescriptions = {
    0: "Level 0 - Làm quen: Chào hỏi, giới thiệu, miêu tả đơn giản",
    1: "Level 1 - Hội thoại: Mua đồ, gọi món, hỏi đường", 
    2: "Level 2 - Thảo luận: Ý kiến, so sánh, kể lại",
    3: "Level 3 - Phân tích: Nêu lý do, giải thích, tranh luận"
  };

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setImageFile(file);
      setImagePreview(URL.createObjectURL(file));
    }
  };

  const startDebateSession = async () => {
    if (!imageFile) return;

    setLoading(true);
    
    try {
      const reader = new FileReader();
      reader.onload = async (e) => {
        const base64 = e.target?.result as string;
        const imageBase64 = base64.split(',')[1];

        const response = await fetch('/api/debate-mode', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'start',
            imageBase64,
            userLevel,
            userId: 'anonymous'
          })
        });

        const data = await response.json();

        if (data.success) {
          setSession({
            sessionId: data.sessionId,
            imageAnalysis: data.visionData, // Use visionData from backend
            visionData: data.visionData, // Store visionData for alignment API
            vocabulary: data.vocabulary,
            speakingTopic: data.speakingTopic,
            conversation: [{
              role: 'ai',
              message: data.firstQuestion
            }],
            currentLevel: userLevel
          });
          setStep('session');
        }
      };

      reader.readAsDataURL(imageFile);
    } catch (error) {
      console.error('Session start error:', error);
    } finally {
      setLoading(false);
    }
  };

  // Internal submit function (unified for text and voice)
  const submitResponseInternal = async (text: string) => {
    if (!text.trim() || !session) return;

    setLoading(true);

    try {
      // Get image base64 for context
      let imageBase64 = null;
      if (imageFile) {
        const reader = new FileReader();
        const base64Promise = new Promise<string>((resolve) => {
          reader.onload = (e) => {
            const base64 = e.target?.result as string;
            resolve(base64.split(',')[1]);
          };
          reader.readAsDataURL(imageFile);
        });
        imageBase64 = await base64Promise;
      }

      const response = await fetch('/api/debate-mode', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'respond',
          userResponse: text,
          sessionId: session.sessionId,
          sessionData: session,
          imageBase64,
          userLevel,
          userId: 'anonymous'
        })
      });

      const data = await response.json();

      if (data.success) {
        // Update conversation - preserve visionData and all session info
        const updatedSession = {
          ...session,
          visionData: session.visionData,
          imageAnalysis: session.imageAnalysis,
          conversation: [
            ...session.conversation,
            {
              role: 'user' as const,
              message: text,
              corrections: data.corrections,
              accuracyAssessment: data.accuracyAssessment
            },
            {
              role: 'ai' as const,
              message: data.nextQuestion
            }
          ]
        };

        setSession(updatedSession);
        setCurrentResponse('');

        // Update progress
        setProgress(prev => ({
          ...prev,
          weakVocabulary: [...prev.weakVocabulary, ...(data.corrections?.vocabulary || [])],
          pronunciationErrors: [...prev.pronunciationErrors, ...(data.corrections?.pronunciation || [])]
        }));

        // Auto-speak AI response if in voice mode
        if (inputMode === 'voice') {
          speakText(data.nextQuestion);
        }
      } else if (data.message?.includes('Rate limit') || data.message?.includes('quota')) {
        alert('⚠️ Đã đạt giới hạn API. Hệ thống đang sử dụng chế độ fallback.');
      }
    } catch (error) {
      console.error('Response submission error:', error);
      alert('❌ Có lỗi xảy ra. Vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  };

  // Public submit function for text input
  const submitResponse = async () => {
    await submitResponseInternal(currentResponse);
  };

  const resetSession = () => {
    setStep('upload');
    setSession(null);
    setImageFile(null);
    setImagePreview(null);
    setCurrentResponse('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const speakText = (text: string) => {
    if ('speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'vi-VN';
      utterance.rate = 0.8;
      window.speechSynthesis.speak(utterance);
    }
  };

  // Analyze user's speaking response
  const analyzeSpeakingResponse = async (audioBase64: string) => {
    if (!session) return;

    setLoading(true);
    try {
      // Transcribe audio using Whisper
      const transcribeResponse = await fetch('/api/speech/transcribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          audioBase64: audioBase64.split(',')[1],
          mode: 'audio'
        })
      });

      const transcribeData = await transcribeResponse.json();
      if (transcribeData.status === 'ok') {
        const transcription = transcribeData.transcript;
        setCurrentResponse(transcription);
        
        // Auto-submit the transcribed text
        await submitResponseInternal(transcription);
      }
    } catch (error) {
      console.error('Voice analysis error:', error);
    } finally {
      setLoading(false);
    }
  };

  // Handle voice recording
  const handleVoiceRecord = () => {
    if (!recording) {
      // Start recording
      voiceRecorder.startRecording();
      setRecording(true);
    } else {
      // Stop recording (will trigger onRecordingComplete)
      voiceRecorder.stopRecording();
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-red-50 p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center justify-center gap-3 mb-4"
          >
            <MessageSquare className="w-8 h-8 text-orange-600" />
            <h1 className="text-4xl font-bold text-gray-900">Debate Mode</h1>
          </motion.div>
          <p className="text-gray-600 text-lg">
            Luyện Speaking từ hình ảnh với phương pháp cá nhân hóa 🗣️✨
          </p>
        </div>

        {/* Level Selector */}
        <div className="bg-white rounded-2xl shadow-lg p-6 mb-8">
          <h3 className="text-lg font-bold text-gray-900 mb-4">Chọn Level của bạn:</h3>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
            {Object.entries(levelDescriptions).map(([level, description]) => (
              <button
                key={level}
                onClick={() => setUserLevel(parseInt(level))}
                className={`p-4 rounded-xl border-2 transition text-left ${
                  userLevel === parseInt(level)
                    ? 'border-orange-500 bg-orange-50'
                    : 'border-gray-200 hover:border-orange-300'
                }`}
              >
                <div className="font-bold text-orange-600 mb-2">Level {level}</div>
                <div className="text-sm text-gray-600">{description}</div>
              </button>
            ))}
          </div>
        </div>

        <AnimatePresence mode="wait">
          {/* Step 1: Upload Image */}
          {step === 'upload' && (
            <motion.div
              key="upload"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="bg-white rounded-3xl shadow-xl p-8"
            >
              <h2 className="text-2xl font-bold text-gray-900 mb-6 text-center">
                Upload Hình Ảnh Để Bắt Đầu Debate
              </h2>
              
              <div 
                className="border-2 border-dashed border-orange-300 rounded-2xl p-12 hover:border-orange-500 transition cursor-pointer text-center"
                onClick={() => fileInputRef.current?.click()}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="hidden"
                />
                
                {imagePreview ? (
                  <div className="space-y-4">
                    <img
                      src={imagePreview}
                      alt="Preview"
                      className="max-w-md max-h-64 mx-auto rounded-lg shadow-lg"
                    />
                    <p className="text-gray-600">Ảnh đã sẵn sàng để bắt đầu debate!</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <Upload className="w-16 h-16 text-orange-400 mx-auto" />
                    <div>
                      <p className="text-lg font-semibold text-gray-700 mb-2">
                        Chọn hình ảnh để tạo chủ đề speaking
                      </p>
                      <p className="text-gray-500">
                        Hệ thống sẽ phân tích ảnh và tạo cuộc hội thoại phù hợp với level của bạn
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {imagePreview && (
                <div className="text-center mt-6">
                  <button
                    onClick={startDebateSession}
                    disabled={loading}
                    className="px-8 py-3 bg-gradient-to-r from-orange-500 to-red-600 text-white font-semibold rounded-xl hover:shadow-lg transition disabled:opacity-50"
                  >
                    {loading ? (
                      <div className="flex items-center gap-2">
                        <Loader className="w-5 h-5 animate-spin" />
                        Đang phân tích ảnh...
                      </div>
                    ) : (
                      'Bắt đầu Debate Session'
                    )}
                  </button>
                </div>
              )}
            </motion.div>
          )}

          {/* Step 2: Debate Session */}
          {step === 'session' && session && (
            <motion.div
              key="session"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="grid lg:grid-cols-3 gap-6"
            >
              {/* Left Panel: Image & Info */}
              <div className="lg:col-span-1 space-y-6">
                {/* Image */}
                <div className="bg-white rounded-2xl shadow-lg p-4">
                  <h3 className="font-bold text-gray-900 mb-3">Hình ảnh của bạn:</h3>
                  {imagePreview && (
                    <img
                      src={imagePreview}
                      alt="Debate topic"
                      className="w-full rounded-lg shadow-md"
                    />
                  )}
                </div>

                {/* Speaking Topic */}
                <div className="bg-white rounded-2xl shadow-lg p-4">
                  <h3 className="font-bold text-gray-900 mb-3">Chủ đề Speaking:</h3>
                  <p className="text-gray-700 bg-orange-50 p-3 rounded-lg">
                    {session.speakingTopic}
                  </p>
                </div>

                {/* Vocabulary */}
                <div className="bg-white rounded-2xl shadow-lg p-4">
                  <h3 className="font-bold text-gray-900 mb-3">Từ vựng hữu ích:</h3>
                  <div className="flex flex-wrap gap-2">
                    {session.vocabulary.map((word, index) => (
                      <span
                        key={index}
                        className="px-3 py-1 bg-orange-100 text-orange-700 rounded-full text-sm cursor-pointer hover:bg-orange-200 transition"
                        onClick={() => speakText(word)}
                      >
                        {word}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              {/* Right Panel: Conversation */}
              <div className="lg:col-span-2">
                <div className="bg-white rounded-2xl shadow-lg h-full flex flex-col">
                  {/* Conversation Header */}
                  <div className="p-4 border-b border-gray-200">
                    <div className="flex items-center justify-between">
                      <h3 className="font-bold text-gray-900">Cuộc hội thoại</h3>
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-gray-600">Level {session.currentLevel}</span>
                        <button
                          onClick={resetSession}
                          className="p-2 text-gray-500 hover:text-orange-600 transition"
                        >
                          <RotateCcw className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Messages */}
                  <div className="flex-1 p-4 overflow-y-auto space-y-4 max-h-96">
                    {session.conversation.map((msg, index) => (
                      <div
                        key={index}
                        className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                      >
                        <div className={`max-w-xs lg:max-w-md ${msg.role === 'user' ? 'order-2' : 'order-1'}`}>
                          <div className={`flex items-center gap-2 mb-1 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                            {msg.role === 'ai' ? (
                              <Bot className="w-4 h-4 text-orange-600" />
                            ) : (
                              <User className="w-4 h-4 text-blue-600" />
                            )}
                            <span className="text-xs text-gray-500">
                              {msg.role === 'ai' ? 'AI Teacher' : 'Bạn'}
                            </span>
                          </div>
                          
                          <div className={`p-3 rounded-2xl ${
                            msg.role === 'user'
                              ? 'bg-blue-500 text-white'
                              : 'bg-gray-100 text-gray-900'
                          }`}>
                            <p>{msg.message}</p>
                            
                            {msg.role === 'ai' && (
                              <button
                                onClick={() => speakText(msg.message)}
                                className="mt-2 p-1 bg-white bg-opacity-20 rounded-full hover:bg-opacity-30 transition"
                              >
                                <Volume2 className="w-3 h-3" />
                              </button>
                            )}
                          </div>

                          {/* Accuracy Assessment */}
                          {(msg as any).accuracyAssessment && (
                            <div className="mt-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                              <div className="flex items-center gap-2 mb-2">
                                <div className={`w-3 h-3 rounded-full ${
                                  (msg as any).accuracyAssessment.isAccurate ? 'bg-green-500' : 'bg-orange-500'
                                }`}></div>
                                <span className="text-xs font-semibold text-blue-800">
                                  Độ chính xác với hình ảnh: {(msg as any).accuracyAssessment.score}%
                                </span>
                              </div>
                              <p className="text-xs text-blue-700">
                                {(msg as any).accuracyAssessment.feedback}
                              </p>
                            </div>
                          )}

                          {/* Corrections */}
                          {msg.corrections && (
                            <div className="mt-2 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                              <div className="text-xs font-semibold text-yellow-800 mb-2">Sửa lỗi:</div>
                              
                              {msg.corrections.grammar.length > 0 && (
                                <div className="mb-2">
                                  <span className="text-xs text-red-600">Ngữ pháp:</span>
                                  <div className="flex flex-wrap gap-1 mt-1">
                                    {msg.corrections.grammar.map((error: string, i: number) => (
                                      <span key={i} className="px-2 py-1 bg-red-100 text-red-700 text-xs rounded">
                                        {error}
                                      </span>
                                    ))}
                                  </div>
                                </div>
                              )}

                              {msg.corrections.vocabulary.length > 0 && (
                                <div className="mb-2">
                                  <span className="text-xs text-blue-600">Từ vựng:</span>
                                  <div className="flex flex-wrap gap-1 mt-1">
                                    {msg.corrections.vocabulary.map((word: string, i: number) => (
                                      <span key={i} className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded">
                                        {word}
                                      </span>
                                    ))}
                                  </div>
                                </div>
                              )}

                              {msg.corrections.pronunciation.length > 0 && (
                                <div>
                                  <span className="text-xs text-purple-600">Phát âm:</span>
                                  <div className="flex flex-wrap gap-1 mt-1">
                                    {msg.corrections.pronunciation.map((word: string, i: number) => (
                                      <span key={i} className="px-2 py-1 bg-purple-100 text-purple-700 text-xs rounded">
                                        {word}
                                      </span>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Input Area - Simplified */}
                  <div className="p-4 border-t border-gray-200">
                    {/* Mode Selector Tabs */}
                    <div className="flex gap-2 mb-4">
                      <button
                        onClick={() => setInputMode('text')}
                        className={`flex-1 px-4 py-3 rounded-xl font-semibold transition ${
                          inputMode === 'text'
                            ? 'bg-orange-500 text-white shadow-lg'
                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                        }`}
                      >
                        ✍️ Nhập Text
                      </button>
                      <button
                        onClick={() => setInputMode('voice')}
                        className={`flex-1 px-4 py-3 rounded-xl font-semibold transition ${
                          inputMode === 'voice'
                            ? 'bg-orange-500 text-white shadow-lg'
                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                        }`}
                      >
                        🎤 Ghi Âm
                      </button>
                    </div>

                    {/* Text Input Mode */}
                    {inputMode === 'text' && (
                      <div className="space-y-3">
                        <textarea
                          value={currentResponse}
                          onChange={(e) => setCurrentResponse(e.target.value)}
                          placeholder="Nhập câu trả lời của bạn..."
                          className="w-full p-4 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-orange-500 resize-none"
                          rows={4}
                          disabled={loading}
                        />
                        <button
                          onClick={submitResponse}
                          disabled={!currentResponse.trim() || loading}
                          className="w-full px-6 py-3 bg-orange-500 text-white rounded-xl font-semibold hover:bg-orange-600 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                        >
                          {loading ? (
                            <>
                              <Loader className="w-5 h-5 animate-spin" />
                              Đang xử lý...
                            </>
                          ) : (
                            <>
                              <Send className="w-5 h-5" />
                              Gửi câu trả lời
                            </>
                          )}
                        </button>
                      </div>
                    )}

                    {/* Voice Input Mode */}
                    {inputMode === 'voice' && (
                      <div className="space-y-4">
                        {/* Recording Status */}
                        {recording && (
                          <div className="p-4 bg-red-50 border-2 border-red-200 rounded-xl">
                            <div className="flex items-center justify-center gap-3 mb-3">
                              <div className="w-4 h-4 bg-red-500 rounded-full animate-pulse"></div>
                              <span className="text-red-700 font-semibold text-lg">
                                Đang ghi âm... {voiceRecorder.formattedTime}
                              </span>
                            </div>
                            <div className="w-full bg-red-200 rounded-full h-3">
                              <div 
                                className="bg-red-500 h-3 rounded-full transition-all"
                                style={{ width: `${(voiceRecorder.recordingTime / 60) * 100}%` }}
                              ></div>
                            </div>
                          </div>
                        )}

                        {/* Transcribing Status */}
                        {transcribing && (
                          <div className="p-4 bg-blue-50 border-2 border-blue-200 rounded-xl">
                            <div className="flex items-center justify-center gap-3">
                              <Loader className="w-5 h-5 animate-spin text-blue-600" />
                              <span className="text-blue-700 font-semibold">
                                Đang chuyển đổi giọng nói thành văn bản...
                              </span>
                            </div>
                          </div>
                        )}

                        {/* Audio Preview */}
                        {voiceRecorder.audioUrl && !recording && !transcribing && (
                          <div className="p-4 bg-green-50 border-2 border-green-200 rounded-xl">
                            <audio
                              src={voiceRecorder.audioUrl}
                              controls
                              className="w-full mb-2"
                            />
                            <p className="text-sm text-green-700 text-center">
                              ✅ Ghi âm hoàn tất! Đang xử lý...
                            </p>
                          </div>
                        )}

                        {/* Transcribed Text Display */}
                        {currentResponse && !recording && !transcribing && inputMode === 'voice' && (
                          <div className="p-4 bg-gray-50 border-2 border-gray-200 rounded-xl">
                            <p className="text-sm text-gray-600 mb-2">Văn bản đã nhận dạng:</p>
                            <p className="text-gray-900 font-medium italic">"{currentResponse}"</p>
                          </div>
                        )}

                        {/* Record Button */}
                        <button
                          onClick={handleVoiceRecord}
                          disabled={loading || transcribing}
                          className={`w-full px-6 py-4 rounded-xl font-semibold transition flex items-center justify-center gap-3 ${
                            recording
                              ? 'bg-red-500 text-white hover:bg-red-600'
                              : 'bg-orange-500 text-white hover:bg-orange-600'
                          } disabled:opacity-50 disabled:cursor-not-allowed`}
                        >
                          {recording ? (
                            <>
                              <StopCircle className="w-6 h-6" />
                              <span className="text-lg">Dừng & Gửi</span>
                            </>
                          ) : (
                            <>
                              <Mic className="w-6 h-6" />
                              <span className="text-lg">Bắt đầu ghi âm</span>
                            </>
                          )}
                        </button>

                        <p className="text-sm text-gray-500 text-center">
                          💡 Nhấn ghi âm, nói câu trả lời, rồi nhấn dừng. Hệ thống sẽ tự động phân tích!
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Progress Panel */}
        {progress.weakVocabulary.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-8 bg-white rounded-2xl shadow-lg p-6"
          >
            <div className="flex items-center gap-2 mb-4">
              <TrendingUp className="w-5 h-5 text-green-600" />
              <h3 className="font-bold text-gray-900">Tiến độ học tập</h3>
            </div>
            
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <h4 className="font-semibold text-gray-700 mb-2">Từ vựng cần luyện thêm:</h4>
                <div className="flex flex-wrap gap-2">
                  {progress.weakVocabulary.slice(0, 10).map((word, index) => (
                    <span
                      key={index}
                      className="px-3 py-1 bg-red-100 text-red-700 rounded-full text-sm"
                    >
                      {word}
                    </span>
                  ))}
                </div>
              </div>
              
              <div>
                <h4 className="font-semibold text-gray-700 mb-2">Phát âm cần chú ý:</h4>
                <div className="flex flex-wrap gap-2">
                  {progress.pronunciationErrors.slice(0, 10).map((word, index) => (
                    <span
                      key={index}
                      className="px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-sm cursor-pointer hover:bg-purple-200 transition"
                      onClick={() => speakText(word)}
                    >
                      {word}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}