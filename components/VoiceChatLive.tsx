"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useSession } from "next-auth/react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Mic, MicOff, Volume2, VolumeX, Settings, X, Send, AlertCircle,
  MessageSquare, Target, Play, RotateCcw, BookOpen, Loader2
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

interface PronunciationFeedback {
  score: number;
  errors: string[];
  correctedText?: string;
}

interface GrammarCheck {
  hasErrors: boolean;
  correctedSentence: string;
  errors: Array<{
    original: string;
    corrected: string;
    explanation: string;
    explanationVi: string;
  }>;
}

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
  grammarFeedback?: { hasErrors: boolean; suggestion?: string; vietnameseHint?: string };
  pronunciationFeedback?: PronunciationFeedback;
  targetSentence?: string; // For pronunciation mode
}

type AppMode = "chat" | "pronunciation";

export default function VoiceChatLive() {
  const { data: session } = useSession();
  const router = useRouter();
  const [mode, setMode] = useState<AppMode>("chat");
  const [messages, setMessages] = useState<Message[]>([]);
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentTranscript, setCurrentTranscript] = useState("");
  const [textInput, setTextInput] = useState("");
  const [showSettings, setShowSettings] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isSupported, setIsSupported] = useState(true);
  
  // Pronunciation mode specific
  const [targetSentence, setTargetSentence] = useState("");
  const [practiceStep, setPracticeStep] = useState<"input" | "listen" | "result">("input");
  const [grammarCheck, setGrammarCheck] = useState<GrammarCheck | null>(null);
  const [isCheckingGrammar, setIsCheckingGrammar] = useState(false);
  const [showVocabPrompt, setShowVocabPrompt] = useState(false);
  const [isExtractingVocab, setIsExtractingVocab] = useState(false);
  const [extractedWords, setExtractedWords] = useState<string[]>([]);
  
  // Settings
  const [level, setLevel] = useState<string>("A2");
  const [autoSpeak, setAutoSpeak] = useState(true);
  const [speakingSpeed, setSpeakingSpeed] = useState<number>(1.0);
  const [showVietnamese, setShowVietnamese] = useState(true);

  const recognitionRef = useRef<any>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const silenceTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const finalTranscriptRef = useRef("");
  const userId = (session?.user as any)?.id || "anonymous";
  
  // Session tracking
  const sessionStartTimeRef = useRef<Date>(new Date());
  const grammarErrorsRef = useRef<Array<{ original: string; corrected: string; errorType: string; explanation: string; explanationVi?: string }>>([]);
  const pronunciationErrorsRef = useRef<Array<{ word: string; userPronunciation: string; correctPronunciation: string; feedback: string }>>([]);

  // Track user progress
  const trackProgress = async (activity: string, mistake?: { type: string; original: string; corrected: string; explanation: string }) => {
    if (userId === "anonymous") return;
    
    try {
      // Track activity
      await fetch("/api/user-progress", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, activity }),
      });
      
      // Track mistake if provided
      if (mistake) {
        await fetch("/api/user-progress", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userId, mistake }),
        });
      }
    } catch (err) {
      console.error("Track progress error:", err);
    }
  };

  // Save learning session to database
  const saveLearningSession = async (sessionType: "voice_chat" | "pronunciation") => {
    if (userId === "anonymous" || messages.length < 2) return;
    
    try {
      const endTime = new Date();
      const duration = Math.round((endTime.getTime() - sessionStartTimeRef.current.getTime()) / 1000);
      
      // Calculate scores based on errors
      const totalGrammarErrors = grammarErrorsRef.current.length;
      const totalPronErrors = pronunciationErrorsRef.current.length;
      const userMsgCount = messages.filter(m => m.role === "user").length;
      
      const grammarScore = userMsgCount > 0 
        ? Math.max(0, 100 - (totalGrammarErrors / userMsgCount) * 20) 
        : 100;
      const pronunciationScore = userMsgCount > 0 
        ? Math.max(0, 100 - (totalPronErrors / userMsgCount) * 20) 
        : 100;
      const overallScore = Math.round((grammarScore + pronunciationScore) / 2);
      
      // Prepare session data
      const sessionData = {
        userId,
        sessionType,
        startTime: sessionStartTimeRef.current,
        endTime,
        duration,
        overallScore,
        grammarScore: Math.round(grammarScore),
        pronunciationScore: Math.round(pronunciationScore),
        fluencyScore: Math.round(overallScore),
        grammarErrors: grammarErrorsRef.current,
        pronunciationErrors: pronunciationErrorsRef.current,
        messages: messages.map(m => ({
          role: m.role,
          content: m.content,
          timestamp: m.timestamp,
          hasError: m.grammarFeedback?.hasErrors || false
        })),
        totalMessages: messages.length,
        userMessages: userMsgCount,
        wordsSpoken: messages.filter(m => m.role === "user").reduce((sum, m) => sum + m.content.split(" ").length, 0),
        level,
        areasToImprove: totalGrammarErrors > 0 ? ["Ngữ pháp"] : [],
        strengths: totalGrammarErrors === 0 ? ["Ngữ pháp tốt"] : []
      };
      
      await fetch("/api/learning-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(sessionData),
      });
      
      console.log("Session saved successfully");
    } catch (err) {
      console.error("Save session error:", err);
    }
  };

  // Initialize Speech Recognition - Fixed duplicate issue
  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) { setIsSupported(false); return; }

    const recognition = new SpeechRecognition();
    recognition.continuous = false; // Changed to false to avoid duplicates
    recognition.interimResults = true;
    recognition.lang = "en-US";

    recognition.onstart = () => { 
      setIsListening(true); 
      setError(null);
      finalTranscriptRef.current = "";
      setCurrentTranscript("");
    };
    
    recognition.onend = () => {
      setIsListening(false);
      if (silenceTimeoutRef.current) {
        clearTimeout(silenceTimeoutRef.current);
        silenceTimeoutRef.current = null;
      }
      // Send the final transcript
      const finalText = finalTranscriptRef.current.trim();
      if (finalText) {
        if (mode === "pronunciation" && targetSentence) {
          checkPronunciation(finalText);
        } else if (mode === "chat") {
          sendChatMessage(finalText);
        }
      }
    };
    
    recognition.onresult = (event: any) => {
      let interim = "";
      let final = "";
      
      for (let i = 0; i < event.results.length; i++) {
        const result = event.results[i];
        if (result.isFinal) {
          final += result[0].transcript;
        } else {
          interim += result[0].transcript;
        }
      }
      
      if (final) {
        finalTranscriptRef.current = final;
        setCurrentTranscript(final);
      } else if (interim) {
        setCurrentTranscript(interim);
      }
      
      // Auto-stop after silence (for chat mode)
      if (mode === "chat" && final) {
        if (silenceTimeoutRef.current) clearTimeout(silenceTimeoutRef.current);
        silenceTimeoutRef.current = setTimeout(() => {
          recognition.stop();
        }, 1500);
      }
    };
    
    recognition.onerror = (event: any) => {
      if (event.error === "not-allowed") setError("Vui lòng cho phép truy cập microphone");
      setIsListening(false);
    };
    
    recognitionRef.current = recognition;
    return () => { recognition.stop(); };
  }, [mode, targetSentence]);

  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);
  
  // Save session when mode changes or component unmounts
  useEffect(() => {
    return () => {
      // Save session on unmount
      if (messages.length > 2) {
        saveLearningSession(mode === "chat" ? "voice_chat" : "pronunciation");
      }
    };
  }, []);
  
  useEffect(() => { 
    // Save previous session before switching mode
    if (messages.length > 2) {
      saveLearningSession(mode === "chat" ? "pronunciation" : "voice_chat");
    }
    
    // Reset for new session
    setMessages([]);
    setPracticeStep("input");
    setTargetSentence("");
    sessionStartTimeRef.current = new Date();
    grammarErrorsRef.current = [];
    pronunciationErrorsRef.current = [];
    
    if (mode === "chat") startChatSession();
  }, [mode]);

  const startChatSession = async () => {
    try {
      const res = await fetch("/api/voice-chat-live", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "start", userId, level, pronunciationMode: false })
      });
      const data = await res.json();
      if (data.success) {
        const msg: Message = { id: Date.now().toString(), role: "assistant", content: data.response, timestamp: new Date() };
        setMessages([msg]);
        if (autoSpeak) speak(data.response);
      } else if (data.needApiKey) {
        setError("Vui lòng cấu hình API key trong Settings");
      }
    } catch (err) { console.error("Start error:", err); }
  };

  const speak = useCallback((text: string) => {
    if (!text || isSpeaking) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "en-US";
    utterance.rate = speakingSpeed;
    const voices = window.speechSynthesis.getVoices();
    const englishVoice = voices.find(v => v.lang === "en-US" && (v.name.includes("Google") || v.name.includes("Samantha"))) || voices.find(v => v.lang.startsWith("en"));
    if (englishVoice) utterance.voice = englishVoice;
    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);
    window.speechSynthesis.speak(utterance);
  }, [isSpeaking, speakingSpeed]);

  const stopSpeaking = () => { window.speechSynthesis.cancel(); setIsSpeaking(false); };

  const startListening = () => {
    if (!isSupported) { setError("Trình duyệt không hỗ trợ. Vui lòng dùng Chrome."); return; }
    stopSpeaking();
    finalTranscriptRef.current = "";
    setCurrentTranscript("");
    try { recognitionRef.current?.start(); } catch (err) { console.error("Start error:", err); }
  };

  const stopListening = () => {
    recognitionRef.current?.stop();
  };

  // Chat mode: Send message to AI
  const sendChatMessage = async (text: string) => {
    if (!text.trim() || isProcessing) return;
    setIsProcessing(true);
    setCurrentTranscript("");

    const userMsg: Message = { id: Date.now().toString(), role: "user", content: text, timestamp: new Date() };
    setMessages(prev => [...prev, userMsg]);
    setTextInput("");

    try {
      const history = messages.map(m => ({ role: m.role, content: m.content }));
      const res = await fetch("/api/voice-chat-live", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "chat", message: text, conversationHistory: history, level, userId, pronunciationMode: false })
      });

      const data = await res.json();
      if (data.success) {
        const assistantMsg: Message = {
          id: (Date.now() + 1).toString(), role: "assistant", content: data.response, timestamp: new Date(),
          grammarFeedback: data.grammarFeedback
        };
        setMessages(prev => [...prev, assistantMsg]);
        if (autoSpeak) speak(data.response);
        
        // Track chat session
        trackProgress("chatSession");
        
        // Track grammar mistake if any
        if (data.grammarFeedback?.hasErrors && data.grammarFeedback?.suggestion) {
          // Add to session errors ref
          grammarErrorsRef.current.push({
            original: text,
            corrected: data.grammarFeedback.suggestion,
            errorType: "grammar",
            explanation: data.grammarFeedback.vietnameseHint || "Lỗi ngữ pháp",
            explanationVi: data.grammarFeedback.vietnameseHint
          });
          
          trackProgress("chatSession", {
            type: "grammar",
            original: text,
            corrected: data.grammarFeedback.suggestion,
            explanation: data.grammarFeedback.vietnameseHint || "Lỗi ngữ pháp",
          });
        }
      } else {
        setError(data.message);
      }
    } catch (err) {
      setError("Không thể kết nối. Vui lòng thử lại.");
    } finally {
      setIsProcessing(false);
    }
  };

  // Pronunciation mode: Check user's pronunciation against target
  const checkPronunciation = async (spokenText: string) => {
    if (!targetSentence.trim()) return;
    setIsProcessing(true);
    setPracticeStep("result");

    const userMsg: Message = { 
      id: Date.now().toString(), role: "user", content: spokenText, 
      timestamp: new Date(), targetSentence 
    };
    setMessages(prev => [...prev, userMsg]);

    try {
      const res = await fetch("/api/voice-chat-live", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          action: "checkPronunciation", 
          spokenText, 
          targetSentence, 
          userId 
        })
      });

      const data = await res.json();
      if (data.success) {
        const feedbackMsg: Message = {
          id: (Date.now() + 1).toString(), role: "assistant", content: data.feedback,
          timestamp: new Date(), pronunciationFeedback: data.pronunciationFeedback
        };
        setMessages(prev => [...prev, feedbackMsg]);
        if (autoSpeak) speak(data.feedback);
        
        // Track pronunciation practice
        trackProgress("pronunciationPractice");
        
        // Track pronunciation errors if any
        if (data.pronunciationFeedback?.errors?.length > 0) {
          // Add to session errors ref
          pronunciationErrorsRef.current.push({
            word: targetSentence,
            userPronunciation: spokenText,
            correctPronunciation: targetSentence,
            feedback: data.pronunciationFeedback.errors.join(", ")
          });
          
          trackProgress("pronunciationPractice", {
            type: "pronunciation",
            original: spokenText,
            corrected: targetSentence,
            explanation: data.pronunciationFeedback.errors.join(", "),
          });
        }
      } else {
        setError(data.message);
      }
    } catch (err) {
      setError("Không thể kết nối. Vui lòng thử lại.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleTextSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (textInput.trim()) sendChatMessage(textInput.trim());
  };

  const startPronunciationPractice = () => {
    if (!targetSentence.trim()) return;
    checkGrammarBeforePractice();
  };

  const resetPronunciationPractice = () => {
    setPracticeStep("input");
    setTargetSentence("");
    setCurrentTranscript("");
    setGrammarCheck(null);
    setShowVocabPrompt(false);
    setExtractedWords([]);
  };

  // Check grammar before starting pronunciation practice
  const checkGrammarBeforePractice = async () => {
    if (!targetSentence.trim()) return;
    
    setIsCheckingGrammar(true);
    setGrammarCheck(null);
    
    try {
      const res = await fetch("/api/voice-chat-live", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          action: "checkGrammar", 
          sentence: targetSentence,
          userId 
        })
      });
      
      const data = await res.json();
      if (data.success) {
        setGrammarCheck(data.grammarCheck);
        
        // Track grammar mistakes if any
        if (data.grammarCheck.hasErrors && data.grammarCheck.errors?.length > 0) {
          for (const err of data.grammarCheck.errors) {
            trackProgress("pronunciationPractice", {
              type: "grammar",
              original: err.original,
              corrected: err.corrected,
              explanation: err.explanationVi || err.explanation,
            });
          }
        }
        
        // If no errors, show vocab extraction prompt
        if (!data.grammarCheck.hasErrors) {
          setShowVocabPrompt(true);
        }
      } else {
        // If API fails, show vocab prompt anyway
        setShowVocabPrompt(true);
      }
    } catch (err) {
      console.error("Grammar check error:", err);
      // If error, show vocab prompt anyway
      setShowVocabPrompt(true);
    } finally {
      setIsCheckingGrammar(false);
    }
  };

  // Use corrected sentence
  const useCorrectedSentence = () => {
    if (grammarCheck?.correctedSentence) {
      setTargetSentence(grammarCheck.correctedSentence);
      setGrammarCheck(null);
      setShowVocabPrompt(true); // Show vocab extraction prompt
    }
  };

  // Proceed with original sentence anyway
  const proceedWithOriginal = () => {
    setGrammarCheck(null);
    setShowVocabPrompt(true); // Show vocab extraction prompt
  };

  // Extract vocabulary from sentence and save
  const extractVocabulary = async () => {
    if (!targetSentence.trim()) return;
    
    setIsExtractingVocab(true);
    
    // Lưu cả câu như một cụm từ thay vì tách từ đơn lẻ
    // Điều này giúp người học hiểu ngữ cảnh tốt hơn
    const wordsToSave = [targetSentence.trim()];
    setExtractedWords(wordsToSave);
    
    try {
      // Call API to generate flashcards
      const res = await fetch("/api/generate-flashcard", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ words: wordsToSave, userId })
      });
      
      const data = await res.json();
      if (data.success) {
        // Hiển thị thông báo thành công và tiếp tục luyện phát âm
        setShowVocabPrompt(false);
        setSuccessMessage(`✅ Đã lưu câu vào từ vựng!`);
        setTimeout(() => {
          setSuccessMessage(null);
          startPracticeAfterVocab();
        }, 1500);
      } else {
        setError(data.message || "Không thể lưu từ vựng");
        setShowVocabPrompt(false);
        startPracticeAfterVocab();
      }
    } catch (err) {
      console.error("Extract vocab error:", err);
      setError("Lỗi khi lưu từ vựng");
      setShowVocabPrompt(false);
      startPracticeAfterVocab();
    } finally {
      setIsExtractingVocab(false);
    }
  };

  // Skip vocabulary extraction and start practice
  const skipVocabExtraction = () => {
    setShowVocabPrompt(false);
    startPracticeAfterVocab();
  };

  // Start practice after vocab prompt
  const startPracticeAfterVocab = () => {
    setPracticeStep("listen");
    speak(targetSentence);
  };

  const getScoreColor = (score: number) => {
    if (score >= 90) return "text-green-400";
    if (score >= 70) return "text-yellow-400";
    return "text-red-400";
  };

  // Render Chat Mode UI
  const renderChatMode = () => (
    <>
      {/* Messages */}
      <div className="flex-1 overflow-y-auto space-y-4 mb-4">
        {messages.map((msg) => (
          <div key={msg.id} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
            <div className={`max-w-[85%] rounded-2xl p-4 ${
              msg.role === "user" ? "bg-pink-500 text-white" : "bg-white/10 text-white"
            }`}>
              <p>{msg.content}</p>
              {msg.grammarFeedback?.hasErrors && showVietnamese && (
                <div className="mt-2 pt-2 border-t border-white/20 text-xs">
                  <p className="text-yellow-300">📝 {msg.grammarFeedback.suggestion}</p>
                  {msg.grammarFeedback.vietnameseHint && (
                    <p className="text-white/60 mt-1">{msg.grammarFeedback.vietnameseHint}</p>
                  )}
                </div>
              )}
            </div>
          </div>
        ))}
        {isProcessing && (
          <div className="flex justify-start">
            <div className="bg-white/10 rounded-2xl p-4">
              <div className="flex gap-1">
                <span className="w-2 h-2 bg-white/60 rounded-full animate-bounce" />
                <span className="w-2 h-2 bg-white/60 rounded-full animate-bounce" style={{ animationDelay: "0.1s" }} />
                <span className="w-2 h-2 bg-white/60 rounded-full animate-bounce" style={{ animationDelay: "0.2s" }} />
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Voice Input */}
      <div className="flex flex-col items-center gap-4 py-4">
        {currentTranscript && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} 
            className="bg-white/10 rounded-2xl p-4 max-w-md text-center w-full">
            <p className="text-white">{currentTranscript}</p>
          </motion.div>
        )}
        <p className="text-white/60 text-sm">
          {isListening ? "🎤 Đang nghe... (tự động gửi khi bạn ngừng nói)" 
            : isSpeaking ? "🔊 Đang phát âm thanh..."
            : "Nhấn mic để nói hoặc gõ tin nhắn"}
        </p>
        <div className="flex items-center gap-4">
          <motion.button 
            onClick={isListening ? stopListening : startListening} 
            disabled={isProcessing || isSpeaking} 
            whileTap={{ scale: 0.95 }}
            className={`w-16 h-16 rounded-full flex items-center justify-center shadow-lg ${
              isListening ? "bg-red-500 ring-4 ring-red-500/30" : "bg-gradient-to-br from-pink-500 to-violet-500"
            } ${(isProcessing || isSpeaking) ? "opacity-50" : ""}`}>
            {isListening ? <MicOff className="w-7 h-7 text-white" /> : <Mic className="w-7 h-7 text-white" />}
          </motion.button>
          <button onClick={() => isSpeaking ? stopSpeaking() : messages.length > 0 && speak(messages[messages.length - 1].content)}
            className="p-3 bg-white/10 text-white/80 rounded-full hover:bg-white/20">
            {isSpeaking ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
          </button>
        </div>
        {/* Text input option */}
        <form onSubmit={handleTextSubmit} className="flex gap-2 w-full max-w-md mt-2">
          <input type="text" value={textInput} onChange={(e) => setTextInput(e.target.value)}
            placeholder="Hoặc gõ tin nhắn..."
            className="flex-1 bg-white/10 border border-white/20 rounded-xl px-4 py-2 text-white text-sm placeholder-white/40" />
          <button type="submit" disabled={!textInput.trim() || isProcessing}
            className="px-4 py-2 bg-pink-500 text-white rounded-xl disabled:opacity-50">
            <Send className="w-4 h-4" />
          </button>
        </form>
      </div>
    </>
  );

  // Render Pronunciation Mode UI (like ELSA Speak)
  const renderPronunciationMode = () => (
    <div className="flex-1 flex flex-col">
      {practiceStep === "input" && (
        <div className="flex-1 flex flex-col items-center justify-center gap-6 p-4">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-white mb-2">🎯 Luyện phát âm</h2>
            <p className="text-white/60">Nhập câu bạn muốn luyện phát âm</p>
          </div>
          <div className="w-full max-w-md">
            <textarea
              value={targetSentence}
              onChange={(e) => { setTargetSentence(e.target.value); setGrammarCheck(null); }}
              placeholder="Ví dụ: Hello, how are you today?"
              className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-white placeholder-white/40 min-h-[100px] resize-none"
            />
            
            {/* Grammar Check Results */}
            {grammarCheck && grammarCheck.hasErrors && (
              <motion.div 
                initial={{ opacity: 0, y: -10 }} 
                animate={{ opacity: 1, y: 0 }}
                className="mt-4 bg-yellow-500/20 border border-yellow-500/50 rounded-xl p-4"
              >
                <div className="flex items-center gap-2 mb-3">
                  <AlertCircle className="w-5 h-5 text-yellow-400" />
                  <h3 className="text-yellow-300 font-bold">Phát hiện lỗi ngữ pháp!</h3>
                </div>
                
                {/* Show errors */}
                <div className="space-y-3 mb-4">
                  {grammarCheck.errors.map((err, idx) => (
                    <div key={idx} className="bg-white/10 rounded-lg p-3">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-red-400 line-through">{err.original}</span>
                        <span className="text-white/40">→</span>
                        <span className="text-green-400 font-bold">{err.corrected}</span>
                      </div>
                      <p className="text-white/70 text-sm">{err.explanation}</p>
                      <p className="text-white/50 text-xs mt-1">🇻🇳 {err.explanationVi}</p>
                    </div>
                  ))}
                </div>
                
                {/* Corrected sentence */}
                <div className="bg-green-500/20 border border-green-500/50 rounded-lg p-3 mb-4">
                  <p className="text-white/60 text-xs mb-1">Câu đúng:</p>
                  <p className="text-green-300 font-bold text-lg">{grammarCheck.correctedSentence}</p>
                </div>
                
                {/* Action buttons */}
                <div className="flex gap-2">
                  <button
                    onClick={useCorrectedSentence}
                    className="flex-1 py-2 bg-green-500 text-white rounded-lg font-medium hover:bg-green-600"
                  >
                    ✓ Dùng câu đúng
                  </button>
                  <button
                    onClick={proceedWithOriginal}
                    className="flex-1 py-2 bg-white/10 text-white/70 rounded-lg font-medium hover:bg-white/20"
                  >
                    Giữ nguyên
                  </button>
                </div>
              </motion.div>
            )}

            {/* Vocabulary Extraction Prompt */}
            {showVocabPrompt && !grammarCheck?.hasErrors && (
              <motion.div 
                initial={{ opacity: 0, y: -10 }} 
                animate={{ opacity: 1, y: 0 }}
                className="mt-4 bg-blue-500/20 border border-blue-500/50 rounded-xl p-4"
              >
                <div className="flex items-center gap-2 mb-3">
                  <BookOpen className="w-5 h-5 text-blue-400" />
                  <h3 className="text-blue-300 font-bold">Lưu câu vào từ vựng?</h3>
                </div>
                
                <p className="text-white/70 text-sm mb-4">
                  Bạn có muốn lưu câu này vào danh sách học không? Học theo cụm từ/câu giúp bạn nhớ ngữ cảnh tốt hơn.
                </p>
                
                {/* Preview sentence */}
                <div className="bg-white/10 rounded-lg p-3 mb-4">
                  <p className="text-white font-medium">&quot;{targetSentence}&quot;</p>
                </div>
                
                {/* Action buttons */}
                <div className="flex gap-2">
                  <button
                    onClick={extractVocabulary}
                    disabled={isExtractingVocab}
                    className="flex-1 py-2 bg-blue-500 text-white rounded-lg font-medium hover:bg-blue-600 disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {isExtractingVocab ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Đang lưu...
                      </>
                    ) : (
                      <>
                        <BookOpen className="w-4 h-4" />
                        Lưu câu
                      </>
                    )}
                  </button>
                  <button
                    onClick={skipVocabExtraction}
                    disabled={isExtractingVocab}
                    className="flex-1 py-2 bg-white/10 text-white/70 rounded-lg font-medium hover:bg-white/20 disabled:opacity-50"
                  >
                    Bỏ qua
                  </button>
                </div>
              </motion.div>
            )}
            
            <button
              onClick={startPronunciationPractice}
              disabled={!targetSentence.trim() || isCheckingGrammar}
              className="w-full mt-4 py-4 bg-gradient-to-r from-teal-500 to-emerald-500 text-white rounded-xl font-medium disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {isCheckingGrammar ? (
                <>
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Đang kiểm tra ngữ pháp...
                </>
              ) : (
                <>
                  <Play className="w-5 h-5" /> Bắt đầu luyện tập
                </>
              )}
            </button>
          </div>
          {/* Quick suggestions */}
          <div className="w-full max-w-md">
            <p className="text-white/40 text-sm mb-2">Gợi ý:</p>
            <div className="flex flex-wrap gap-2">
              {["Hello, nice to meet you!", "How are you doing today?", "I love learning English.", "The weather is beautiful."].map((s) => (
                <button key={s} onClick={() => { setTargetSentence(s); setGrammarCheck(null); }}
                  className="px-3 py-1.5 bg-white/10 text-white/70 rounded-lg text-sm hover:bg-white/20">
                  {s}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {practiceStep === "listen" && (
        <div className="flex-1 flex flex-col items-center justify-center gap-6 p-4">
          <div className="text-center">
            <h2 className="text-xl font-bold text-white mb-4">📖 Nghe và lặp lại</h2>
            <div className="bg-white/10 rounded-2xl p-6 max-w-md">
              <p className="text-2xl text-white font-medium">{targetSentence}</p>
            </div>
          </div>
          
          {currentTranscript && (
            <div className="bg-teal-500/20 border border-teal-500/50 rounded-2xl p-4 max-w-md w-full">
              <p className="text-white text-center">{currentTranscript}</p>
            </div>
          )}

          <div className="flex flex-col items-center gap-4">
            <p className="text-white/60 text-sm">
              {isSpeaking ? "🔊 Đang phát âm mẫu..." 
                : isListening ? "🎤 Đang nghe bạn nói..."
                : "Nhấn mic để nói theo"}
            </p>
            <div className="flex items-center gap-4">
              <button onClick={() => speak(targetSentence)} disabled={isSpeaking || isListening}
                className="p-4 bg-white/10 text-white rounded-full hover:bg-white/20 disabled:opacity-50">
                <Volume2 className="w-6 h-6" />
              </button>
              <motion.button 
                onClick={isListening ? stopListening : startListening} 
                disabled={isProcessing || isSpeaking} 
                whileTap={{ scale: 0.95 }}
                className={`w-20 h-20 rounded-full flex items-center justify-center shadow-lg ${
                  isListening ? "bg-red-500 ring-4 ring-red-500/30" : "bg-gradient-to-br from-teal-500 to-emerald-500"
                } ${(isProcessing || isSpeaking) ? "opacity-50" : ""}`}>
                {isListening ? <MicOff className="w-8 h-8 text-white" /> : <Mic className="w-8 h-8 text-white" />}
              </motion.button>
              <button onClick={resetPronunciationPractice}
                className="p-4 bg-white/10 text-white rounded-full hover:bg-white/20">
                <RotateCcw className="w-6 h-6" />
              </button>
            </div>
          </div>
        </div>
      )}

      {practiceStep === "result" && (
        <div className="flex-1 overflow-y-auto p-4">
          {/* Results */}
          <div className="space-y-4">
            {messages.map((msg) => (
              <div key={msg.id} className={`${msg.role === "user" ? "" : ""}`}>
                {msg.role === "user" && msg.targetSentence && (
                  <div className="bg-white/5 rounded-xl p-4 mb-2">
                    <p className="text-white/60 text-sm mb-1">Câu mẫu:</p>
                    <p className="text-white font-medium">{msg.targetSentence}</p>
                  </div>
                )}
                <div className={`rounded-2xl p-4 ${
                  msg.role === "user" ? "bg-teal-500 text-white" : "bg-white/10 text-white"
                }`}>
                  {msg.role === "user" && <p className="text-white/70 text-sm mb-1">Bạn nói:</p>}
                  <p>{msg.content}</p>
                  
                  {msg.pronunciationFeedback && (
                    <div className="mt-4 pt-4 border-t border-white/20">
                      <div className="flex items-center gap-3 mb-3">
                        <span className="text-white/60">Điểm:</span>
                        <span className={`text-3xl font-bold ${getScoreColor(msg.pronunciationFeedback.score)}`}>
                          {msg.pronunciationFeedback.score}/100
                        </span>
                      </div>
                      {msg.pronunciationFeedback.errors.length > 0 && (
                        <div className="space-y-2">
                          <p className="text-white/60 text-sm">Cần cải thiện:</p>
                          {msg.pronunciationFeedback.errors.map((err, idx) => (
                            <p key={idx} className="text-orange-300 text-sm">⚠️ {err}</p>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ))}
            {isProcessing && (
              <div className="bg-white/10 rounded-2xl p-4">
                <div className="flex gap-1">
                  <span className="w-2 h-2 bg-white/60 rounded-full animate-bounce" />
                  <span className="w-2 h-2 bg-white/60 rounded-full animate-bounce" style={{ animationDelay: "0.1s" }} />
                  <span className="w-2 h-2 bg-white/60 rounded-full animate-bounce" style={{ animationDelay: "0.2s" }} />
                </div>
              </div>
            )}
          </div>
          
          {/* Try again button */}
          <div className="flex gap-3 mt-6">
            <button onClick={() => setPracticeStep("listen")}
              className="flex-1 py-3 bg-teal-500 text-white rounded-xl font-medium flex items-center justify-center gap-2">
              <RotateCcw className="w-5 h-5" /> Thử lại
            </button>
            <button onClick={resetPronunciationPractice}
              className="flex-1 py-3 bg-white/10 text-white rounded-xl font-medium">
              Câu mới
            </button>
          </div>
        </div>
      )}
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-900 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-white/10">
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-full flex items-center justify-center text-xl ${
            mode === "chat" ? "bg-gradient-to-br from-pink-500 to-violet-500" : "bg-gradient-to-br from-teal-500 to-emerald-500"
          }`}>
            {mode === "chat" ? "🎓" : "🎯"}
          </div>
          <div>
            <h1 className="text-white font-bold">
              {mode === "chat" ? "L2-BRAIN" : "Luyện phát âm"}
            </h1>
            <p className="text-white/60 text-xs">
              {mode === "chat" 
                ? `Xin chào, ${session?.user?.name || session?.user?.email?.split("@")[0] || "bạn"}!` 
                : "Luyện phát âm"}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/dashboard-new" className="p-2 bg-white/10 rounded-lg hover:bg-white/20 text-white/60 text-sm">
            Trang chủ
          </Link>
          <button onClick={() => setShowSettings(!showSettings)}
            className="p-2 bg-white/10 text-white/60 rounded-lg hover:bg-white/20">
            <Settings className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Mode Tabs */}
      <div className="flex gap-2 p-4 border-b border-white/10">
        <button onClick={() => setMode("chat")}
          className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-medium transition ${
            mode === "chat" ? "bg-gradient-to-r from-pink-500 to-violet-500 text-white" : "bg-white/10 text-white/60 hover:bg-white/20"
          }`}>
          <MessageSquare className="w-5 h-5" /> Trò chuyện
        </button>
        <button onClick={() => setMode("pronunciation")}
          className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-medium transition ${
            mode === "pronunciation" ? "bg-gradient-to-r from-teal-500 to-emerald-500 text-white" : "bg-white/10 text-white/60 hover:bg-white/20"
          }`}>
          <Target className="w-5 h-5" /> Luyện phát âm
        </button>
      </div>

      {/* Error */}
      {error && (
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}
          className="mx-4 mt-4 bg-red-500/20 border border-red-500/50 rounded-xl p-3 flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-red-400" />
          <p className="text-red-300 text-sm flex-1">{error}</p>
          <button onClick={() => setError(null)}><X className="w-4 h-4 text-red-400" /></button>
        </motion.div>
      )}

      {/* Success Message */}
      {successMessage && (
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}
          className="mx-4 mt-4 bg-green-500/20 border border-green-500/50 rounded-xl p-3 flex items-center gap-3">
          <BookOpen className="w-5 h-5 text-green-400" />
          <p className="text-green-300 text-sm flex-1">{successMessage}</p>
        </motion.div>
      )}

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {mode === "chat" ? renderChatMode() : renderPronunciationMode()}
      </div>

      {/* Settings Modal */}
      <AnimatePresence>
        {showSettings && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setShowSettings(false)}>
            <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} exit={{ scale: 0.9 }}
              onClick={(e) => e.stopPropagation()} className="bg-slate-800 rounded-2xl p-6 w-full max-w-sm">
              <h2 className="text-xl font-bold text-white mb-4">Cài đặt</h2>
              <div className="space-y-4">
                <div>
                  <label className="text-white/80 text-sm mb-2 block">Trình độ</label>
                  <div className="grid grid-cols-3 gap-2">
                    {["A1", "A2", "B1", "B2", "C1", "C2"].map((l) => (
                      <button key={l} onClick={() => setLevel(l)}
                        className={`py-2 rounded-lg text-sm ${level === l ? "bg-pink-500 text-white" : "bg-white/10 text-white/60"}`}>
                        {l}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="text-white/80 text-sm mb-2 block">Tốc độ nói: {speakingSpeed}x</label>
                  <input type="range" min="0.5" max="1.5" step="0.1" value={speakingSpeed}
                    onChange={(e) => setSpeakingSpeed(parseFloat(e.target.value))} className="w-full" />
                </div>
                <label className="flex items-center justify-between">
                  <span className="text-white/80">Tự động phát âm</span>
                  <button onClick={() => setAutoSpeak(!autoSpeak)}
                    className={`w-12 h-6 rounded-full ${autoSpeak ? "bg-pink-500" : "bg-white/20"}`}>
                    <div className={`w-5 h-5 bg-white rounded-full transition-transform ${autoSpeak ? "translate-x-6" : "translate-x-0.5"}`} />
                  </button>
                </label>
                <label className="flex items-center justify-between">
                  <span className="text-white/80">Gợi ý tiếng Việt</span>
                  <button onClick={() => setShowVietnamese(!showVietnamese)}
                    className={`w-12 h-6 rounded-full ${showVietnamese ? "bg-pink-500" : "bg-white/20"}`}>
                    <div className={`w-5 h-5 bg-white rounded-full transition-transform ${showVietnamese ? "translate-x-6" : "translate-x-0.5"}`} />
                  </button>
                </label>
              </div>
              <button onClick={() => setShowSettings(false)} className="mt-6 w-full py-3 bg-pink-500 text-white rounded-xl">
                Đóng
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
