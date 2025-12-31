'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import {
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  Settings,
  Sparkles,
  Globe,
  BookOpen,
  RotateCcw,
  Save,
  History
} from 'lucide-react';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  audioUrl?: string;
  timestamp: Date;
  grammarCorrection?: {
    original: string;
    corrected: string;
    explanation: string;
    vietnameseExplanation?: string;
    errorType?: string;
  };
  slaMetadata?: {
    recastUsed: boolean;
    encouragement: string;
    vietnameseHint?: string;
    level: string;
  };
}

interface LearnerProfile {
  level: 'A1' | 'A2' | 'B1' | 'B2' | 'C1' | 'C2';
  vietnameseSupport: boolean;
  speakingSpeed: 'slow' | 'normal' | 'fast';
}

interface GrammarError {
  original: string;
  corrected: string;
  errorType: string;
  explanation: string;
}

export default function EnglishLiveChat() {
  const { data: session } = useSession();
  
  // State
  const [messages, setMessages] = useState<Message[]>([]);
  const [isListening, setIsListening] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [interimTranscript, setInterimTranscript] = useState('');
  const [sessionStarted, setSessionStarted] = useState(false);
  const [isSavingSession, setIsSavingSession] = useState(false);
  
  // Session tracking
  const [sessionStartTime, setSessionStartTime] = useState<Date | null>(null);
  const [grammarErrors, setGrammarErrors] = useState<GrammarError[]>([]);
  const [wordsSpoken, setWordsSpoken] = useState(0);
  
  // Learner profile
  const [profile, setProfile] = useState<LearnerProfile>({
    level: 'A2',
    vietnameseSupport: true,
    speakingSpeed: 'slow'
  });

  // Refs
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const recognitionRef = useRef<any>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Scroll to bottom
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Initialize speech recognition for real-time transcript
  useEffect(() => {
    if (typeof window !== 'undefined' && 'webkitSpeechRecognition' in window) {
      const SpeechRecognition = (window as any).webkitSpeechRecognition;
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = true;
      recognitionRef.current.interimResults = true;
      recognitionRef.current.lang = 'en-US';

      recognitionRef.current.onresult = (event: any) => {
        let interim = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          if (event.results[i].isFinal) {
            // Final result handled by audio recording
          } else {
            interim += event.results[i][0].transcript;
          }
        }
        setInterimTranscript(interim);
      };

      recognitionRef.current.onerror = (event: any) => {
        console.error('Speech recognition error:', event.error);
      };
    }

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, []);

  // Save learning session to database
  const saveLearningSession = async () => {
    if (!(session?.user as any)?.id || !sessionStartTime || messages.length < 2) return;
    
    setIsSavingSession(true);
    try {
      const endTime = new Date();
      const duration = Math.floor((endTime.getTime() - sessionStartTime.getTime()) / 1000);
      const userMessages = messages.filter(m => m.role === 'user');
      const totalWordsSpoken = userMessages.reduce((sum, m) => sum + m.text.split(' ').length, 0);
      
      // Calculate scores based on errors
      const grammarScore = Math.max(0, 100 - grammarErrors.length * 10);
      const pronunciationScore = 80; // Default, can be enhanced with actual pronunciation analysis
      const fluencyScore = Math.min(100, Math.floor((totalWordsSpoken / (duration / 60)) * 5)); // words per minute
      const overallScore = Math.round((grammarScore + pronunciationScore + fluencyScore) / 3);
      
      // Determine strengths and areas to improve
      const strengths: string[] = [];
      const areasToImprove: string[] = [];
      
      if (grammarScore >= 80) strengths.push('Ngữ pháp tốt');
      else areasToImprove.push('Cần cải thiện ngữ pháp');
      
      if (fluencyScore >= 60) strengths.push('Nói trôi chảy');
      else areasToImprove.push('Cần nói nhiều hơn');
      
      if (userMessages.length >= 5) strengths.push('Tích cực tham gia hội thoại');
      
      await fetch('/api/learning-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: (session?.user as any)?.id,
          sessionType: 'voice_chat',
          startTime: sessionStartTime,
          endTime,
          duration,
          overallScore,
          pronunciationScore,
          grammarScore,
          fluencyScore,
          pronunciationErrors: [],
          grammarErrors,
          learnedVocabulary: [],
          totalMessages: messages.length,
          userMessages: userMessages.length,
          wordsSpoken: totalWordsSpoken,
          strengths,
          areasToImprove,
          suggestions: areasToImprove.length > 0 
            ? ['Tiếp tục luyện tập hàng ngày', 'Chú ý các lỗi ngữ pháp thường gặp']
            : ['Tuyệt vời! Hãy thử các chủ đề khó hơn'],
          level: profile.level
        })
      });
      
      console.log('Learning session saved successfully');
    } catch (error) {
      console.error('Error saving learning session:', error);
    }
    setIsSavingSession(false);
  };

  // Start session
  const startSession = async () => {
    try {
      setSessionStartTime(new Date());
      setGrammarErrors([]);
      setWordsSpoken(0);
      
      const response = await fetch('/api/english-live-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'start',
          learnerProfile: {
            level: profile.level,
            vietnameseLevel: 'native',
            learningGoals: ['Daily conversation', 'Improve speaking'],
            commonMistakes: ['Articles', 'Verb tenses'],
            interests: ['Music', 'Travel'],
            conversationCount: messages.length
          },
          config: {
            enableRecasting: true,
            enableIPlusOne: true,
            enableVietnameseSupport: profile.vietnameseSupport,
            speakingSpeed: profile.speakingSpeed,
            correctionStyle: 'implicit'
          }
        })
      });

      const data = await response.json();
      
      if (data.success) {
        setSessionStarted(true);
        const welcomeMessage: Message = {
          id: Date.now().toString(),
          role: 'assistant',
          text: data.message,
          audioUrl: data.audioUrl,
          timestamp: new Date()
        };
        setMessages([welcomeMessage]);

        // Auto-play welcome message
        if (data.audioUrl) {
          playAudio(data.audioUrl);
        }
      }
    } catch (error) {
      console.error('Session start error:', error);
    }
  };

  // Start listening
  const startListening = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      mediaRecorderRef.current = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus'
      });
      
      audioChunksRef.current = [];

      mediaRecorderRef.current.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorderRef.current.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        await processAudio(audioBlob);
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorderRef.current.start(100);
      setIsListening(true);
      setInterimTranscript('');

      // Start speech recognition for real-time transcript
      if (recognitionRef.current) {
        recognitionRef.current.start();
      }

    } catch (error) {
      console.error('Microphone error:', error);
      alert('Please allow microphone access to use voice chat.');
    }
  };

  // Stop listening
  const stopListening = () => {
    if (mediaRecorderRef.current && isListening) {
      mediaRecorderRef.current.stop();
      setIsListening(false);
      setIsProcessing(true);

      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    }
  };

  // Process audio
  const processAudio = async (audioBlob: Blob) => {
    try {
      // Convert to base64
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64 = (reader.result as string).split(',')[1];

        const response = await fetch('/api/english-live-chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'voice',
            audioBase64: base64,
            conversationHistory: messages.map(m => ({
              role: m.role,
              content: m.text
            })),
            learnerProfile: {
              level: profile.level,
              vietnameseLevel: 'native',
              learningGoals: ['Daily conversation'],
              commonMistakes: ['Articles', 'Verb tenses'],
              interests: ['Music', 'Travel'],
              conversationCount: messages.length
            },
            config: {
              enableRecasting: true,
              enableIPlusOne: true,
              enableVietnameseSupport: profile.vietnameseSupport,
              speakingSpeed: profile.speakingSpeed,
              correctionStyle: 'implicit'
            }
          })
        });

        const data = await response.json();

        if (data.success) {
          // Add user message
          const userMessage: Message = {
            id: Date.now().toString(),
            role: 'user',
            text: data.transcription,
            timestamp: new Date(),
            grammarCorrection: data.grammarAnalysis?.hasErrors ? {
              original: data.grammarAnalysis.errors[0]?.original,
              corrected: data.grammarAnalysis.errors[0]?.corrected,
              explanation: data.grammarAnalysis.errors[0]?.explanation,
              vietnameseExplanation: data.grammarAnalysis.errors[0]?.vietnameseExplanation,
              errorType: data.grammarAnalysis.errors[0]?.errorType || 'grammar'
            } : undefined
          };

          // Collect grammar errors for session tracking
          if (data.grammarAnalysis?.hasErrors && data.grammarAnalysis.errors) {
            const newErrors = data.grammarAnalysis.errors.map((e: any) => ({
              original: e.original || '',
              corrected: e.corrected || '',
              errorType: e.errorType || 'grammar',
              explanation: e.explanation || ''
            }));
            setGrammarErrors(prev => [...prev, ...newErrors]);
          }
          
          // Track words spoken
          setWordsSpoken(prev => prev + data.transcription.split(' ').length);

          // Add AI response
          const aiMessage: Message = {
            id: (Date.now() + 1).toString(),
            role: 'assistant',
            text: data.response,
            audioUrl: data.audioUrl,
            timestamp: new Date(),
            slaMetadata: data.slaMetadata
          };

          setMessages(prev => [...prev, userMessage, aiMessage]);
          setInterimTranscript('');

          // Auto-play response
          if (data.audioUrl) {
            playAudio(data.audioUrl);
          }
        }

        setIsProcessing(false);
      };

      reader.readAsDataURL(audioBlob);
    } catch (error) {
      console.error('Audio processing error:', error);
      setIsProcessing(false);
    }
  };

  // Play audio
  const playAudio = (audioUrl: string) => {
    if (audioRef.current) {
      audioRef.current.pause();
    }

    audioRef.current = new Audio(audioUrl);
    audioRef.current.onplay = () => setIsSpeaking(true);
    audioRef.current.onended = () => setIsSpeaking(false);
    audioRef.current.onerror = () => setIsSpeaking(false);
    audioRef.current.play();
  };

  // Stop audio
  const stopAudio = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      setIsSpeaking(false);
    }
  };

  // Toggle listening
  const toggleListening = () => {
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  };

  // Reset conversation
  const resetConversation = async () => {
    // Save session before reset if there are messages
    if (sessionStarted && messages.length > 1) {
      await saveLearningSession();
    }
    
    setMessages([]);
    setSessionStarted(false);
    setInterimTranscript('');
    setSessionStartTime(null);
    setGrammarErrors([]);
    setWordsSpoken(0);
    stopAudio();
  };

  // Save session when leaving page
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (sessionStarted && messages.length > 1 && (session?.user as any)?.id) {
        // Use sendBeacon for reliable saving on page unload
        const endTime = new Date();
        const duration = sessionStartTime 
          ? Math.floor((endTime.getTime() - sessionStartTime.getTime()) / 1000) 
          : 0;
        const userMsgs = messages.filter(m => m.role === 'user');
        
        navigator.sendBeacon('/api/learning-session', JSON.stringify({
          userId: (session?.user as any)?.id,
          sessionType: 'voice_chat',
          startTime: sessionStartTime,
          endTime,
          duration,
          overallScore: Math.max(0, 100 - grammarErrors.length * 10),
          grammarErrors,
          totalMessages: messages.length,
          userMessages: userMsgs.length,
          wordsSpoken,
          level: profile.level
        }));
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [sessionStarted, messages, session, sessionStartTime, grammarErrors, wordsSpoken, profile.level]);

  // Level descriptions
  const levelDescriptions: Record<string, string> = {
    A1: 'Beginner - Người mới bắt đầu',
    A2: 'Elementary - Cơ bản',
    B1: 'Intermediate - Trung cấp',
    B2: 'Upper Intermediate - Trung cấp cao',
    C1: 'Advanced - Nâng cao',
    C2: 'Mastery - Thành thạo'
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 via-purple-900 to-indigo-900 flex flex-col">
      {/* Header */}
      <div className="bg-black/20 backdrop-blur-lg border-b border-white/10 px-6 py-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white">English Live Chat</h1>
              <p className="text-sm text-white/60">Luyện nói tiếng Anh tự nhiên</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Level Badge */}
            <div className="px-3 py-1 bg-white/10 rounded-full text-white text-sm">
              📊 {profile.level}
            </div>

            {/* Learning History Link */}
            <Link
              href="/dashboard-new/learning-history"
              className="p-2 hover:bg-white/10 rounded-lg transition text-white/80 hover:text-white"
              title="Xem lịch sử học tập"
            >
              <History className="w-5 h-5" />
            </Link>

            {/* Save Session Button */}
            {sessionStarted && messages.length > 1 && (
              <button
                onClick={saveLearningSession}
                disabled={isSavingSession}
                className="p-2 hover:bg-white/10 rounded-lg transition text-white/80 hover:text-white disabled:opacity-50"
                title="Lưu phiên học"
              >
                <Save className={`w-5 h-5 ${isSavingSession ? 'animate-pulse' : ''}`} />
              </button>
            )}

            {/* Settings Button */}
            <button
              onClick={() => setShowSettings(!showSettings)}
              className="p-2 hover:bg-white/10 rounded-lg transition text-white/80 hover:text-white"
            >
              <Settings className="w-5 h-5" />
            </button>

            {/* Reset Button */}
            <button
              onClick={resetConversation}
              className="p-2 hover:bg-white/10 rounded-lg transition text-white/80 hover:text-white"
            >
              <RotateCcw className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      {/* Settings Panel */}
      <AnimatePresence>
        {showSettings && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="bg-black/30 backdrop-blur-lg border-b border-white/10"
          >
            <div className="max-w-4xl mx-auto p-6 grid md:grid-cols-3 gap-6">
              {/* Level Selection */}
              <div>
                <label className="block text-white/80 text-sm mb-2">Trình độ / Level</label>
                <select
                  value={profile.level}
                  onChange={(e) => setProfile(p => ({ ...p, level: e.target.value as any }))}
                  className="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-2 text-white"
                >
                  {Object.entries(levelDescriptions).map(([level, desc]) => (
                    <option key={level} value={level} className="bg-gray-800">
                      {level} - {desc}
                    </option>
                  ))}
                </select>
              </div>

              {/* Speaking Speed */}
              <div>
                <label className="block text-white/80 text-sm mb-2">Tốc độ nói / Speed</label>
                <select
                  value={profile.speakingSpeed}
                  onChange={(e) => setProfile(p => ({ ...p, speakingSpeed: e.target.value as any }))}
                  className="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-2 text-white"
                >
                  <option value="slow" className="bg-gray-800">🐢 Chậm / Slow</option>
                  <option value="normal" className="bg-gray-800">🚶 Bình thường / Normal</option>
                  <option value="fast" className="bg-gray-800">🏃 Nhanh / Fast</option>
                </select>
              </div>

              {/* Vietnamese Support */}
              <div>
                <label className="block text-white/80 text-sm mb-2">Hỗ trợ tiếng Việt</label>
                <button
                  onClick={() => setProfile(p => ({ ...p, vietnameseSupport: !p.vietnameseSupport }))}
                  className={`w-full px-4 py-2 rounded-lg border transition ${
                    profile.vietnameseSupport
                      ? 'bg-green-500/20 border-green-500/50 text-green-400'
                      : 'bg-white/10 border-white/20 text-white/60'
                  }`}
                >
                  {profile.vietnameseSupport ? '✅ Bật' : '❌ Tắt'}
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Content */}
      <div className="flex-1 flex flex-col max-w-4xl mx-auto w-full p-6">
        {!sessionStarted ? (
          /* Start Screen */
          <div className="flex-1 flex items-center justify-center">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-center"
            >
              <div className="w-32 h-32 mx-auto mb-8 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center">
                <Globe className="w-16 h-16 text-white" />
              </div>
              
              <h2 className="text-3xl font-bold text-white mb-4">
                Ready to Practice English?
              </h2>
              <p className="text-white/60 mb-8 max-w-md mx-auto">
                Luyện nói tiếng Anh tự nhiên. Không cần lo lắng về lỗi sai - 
                hệ thống sẽ giúp bạn học qua hội thoại thực tế!
              </p>

              <button
                onClick={startSession}
                className="px-8 py-4 bg-gradient-to-r from-blue-500 to-purple-500 text-white font-semibold rounded-2xl hover:shadow-lg hover:shadow-purple-500/30 transition transform hover:scale-105"
              >
                <Mic className="w-5 h-5 inline mr-2" />
                Start Conversation
              </button>

              <p className="text-white/40 text-sm mt-4">
                Level: {profile.level} ({levelDescriptions[profile.level]})
              </p>
            </motion.div>
          </div>
        ) : (
          /* Chat Interface */
          <>
            {/* Messages */}
            <div className="flex-1 overflow-y-auto space-y-4 mb-6">
              <AnimatePresence>
                {messages.map((message) => (
                  <motion.div
                    key={message.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div className={`max-w-[80%] ${message.role === 'user' ? 'order-2' : 'order-1'}`}>
                      {/* Message Bubble */}
                      <div className={`rounded-2xl px-5 py-3 ${
                        message.role === 'user'
                          ? 'bg-blue-500 text-white'
                          : 'bg-white/10 backdrop-blur-lg text-white border border-white/20'
                      }`}>
                        <p>{message.text}</p>
                      </div>

                      {/* Audio Player for AI */}
                      {message.role === 'assistant' && message.audioUrl && (
                        <div className="mt-2 flex items-center gap-2">
                          <button
                            onClick={() => isSpeaking ? stopAudio() : playAudio(message.audioUrl!)}
                            className="p-2 bg-white/10 rounded-full hover:bg-white/20 transition"
                          >
                            {isSpeaking ? (
                              <VolumeX className="w-4 h-4 text-white" />
                            ) : (
                              <Volume2 className="w-4 h-4 text-white" />
                            )}
                          </button>
                          <span className="text-xs text-white/50">
                            {isSpeaking ? 'Playing...' : 'Play audio'}
                          </span>
                        </div>
                      )}

                      {/* Grammar Correction (for user messages) */}
                      {message.grammarCorrection && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          className="mt-2 p-3 bg-yellow-500/20 border border-yellow-500/30 rounded-xl"
                        >
                          <div className="flex items-center gap-2 mb-2">
                            <BookOpen className="w-4 h-4 text-yellow-400" />
                            <span className="text-yellow-400 text-sm font-medium">Learning Tip</span>
                          </div>
                          <p className="text-white/80 text-sm">
                            <span className="line-through text-red-400">{message.grammarCorrection.original}</span>
                            {' → '}
                            <span className="text-green-400 font-medium">{message.grammarCorrection.corrected}</span>
                          </p>
                          {message.grammarCorrection.vietnameseExplanation && profile.vietnameseSupport && (
                            <p className="text-white/60 text-xs mt-1">
                              💡 {message.grammarCorrection.vietnameseExplanation}
                            </p>
                          )}
                        </motion.div>
                      )}

                      {/* SLA Metadata */}
                      {message.slaMetadata && (
                        <div className="mt-2 flex flex-wrap gap-2">
                          {message.slaMetadata.recastUsed && (
                            <span className="px-2 py-1 bg-teal-500/20 text-teal-400 text-xs rounded-full">
                              🔄 Recasting
                            </span>
                          )}
                          {message.slaMetadata.vietnameseHint && profile.vietnameseSupport && (
                            <span className="px-2 py-1 bg-purple-500/20 text-purple-400 text-xs rounded-full">
                              🇻🇳 {message.slaMetadata.vietnameseHint}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>

              {/* Processing Indicator */}
              {isProcessing && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex justify-start"
                >
                  <div className="bg-white/10 backdrop-blur-lg rounded-2xl px-5 py-3 border border-white/20">
                    <div className="flex items-center gap-2">
                      <div className="flex gap-1">
                        <motion.div
                          className="w-2 h-2 bg-white/60 rounded-full"
                          animate={{ y: [0, -8, 0] }}
                          transition={{ duration: 0.6, repeat: Infinity, delay: 0 }}
                        />
                        <motion.div
                          className="w-2 h-2 bg-white/60 rounded-full"
                          animate={{ y: [0, -8, 0] }}
                          transition={{ duration: 0.6, repeat: Infinity, delay: 0.2 }}
                        />
                        <motion.div
                          className="w-2 h-2 bg-white/60 rounded-full"
                          animate={{ y: [0, -8, 0] }}
                          transition={{ duration: 0.6, repeat: Infinity, delay: 0.4 }}
                        />
                      </div>
                      <span className="text-white/60 text-sm">Processing...</span>
                    </div>
                  </div>
                </motion.div>
              )}

              {/* Interim Transcript */}
              {isListening && interimTranscript && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex justify-end"
                >
                  <div className="bg-blue-500/50 rounded-2xl px-5 py-3 max-w-[80%]">
                    <p className="text-white/80 italic">{interimTranscript}...</p>
                  </div>
                </motion.div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Voice Control */}
            <div className="flex flex-col items-center gap-4">
              {/* Listening Status */}
              {isListening && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex items-center gap-3 px-6 py-3 bg-red-500/20 border border-red-500/30 rounded-full"
                >
                  <motion.div
                    animate={{ scale: [1, 1.2, 1] }}
                    transition={{ duration: 1, repeat: Infinity }}
                    className="w-3 h-3 bg-red-500 rounded-full"
                  />
                  <span className="text-red-400 font-medium">Listening... Speak in English</span>
                </motion.div>
              )}

              {/* Main Mic Button */}
              <motion.button
                onClick={toggleListening}
                disabled={isProcessing}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                animate={isListening ? { scale: [1, 1.1, 1] } : {}}
                transition={isListening ? { duration: 1, repeat: Infinity } : {}}
                className={`w-20 h-20 rounded-full flex items-center justify-center shadow-2xl transition ${
                  isListening
                    ? 'bg-gradient-to-r from-red-500 to-pink-500 shadow-red-500/30'
                    : isProcessing
                    ? 'bg-gray-500 cursor-not-allowed'
                    : 'bg-gradient-to-r from-blue-500 to-purple-500 shadow-purple-500/30 hover:shadow-purple-500/50'
                }`}
              >
                {isListening ? (
                  <MicOff className="w-8 h-8 text-white" />
                ) : (
                  <Mic className="w-8 h-8 text-white" />
                )}
              </motion.button>

              <p className="text-white/40 text-sm">
                {isListening ? 'Tap to stop' : isProcessing ? 'Processing...' : 'Tap to speak'}
              </p>
            </div>
          </>
        )}
      </div>

      {/* Hidden Audio Element */}
      <audio ref={audioRef} className="hidden" />
    </div>
  );
}
