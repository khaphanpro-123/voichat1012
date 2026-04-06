"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useSession } from "next-auth/react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Mic, MicOff, Volume2, VolumeX, Settings, Send, BookOpen, 
  Languages, ChevronDown, ChevronUp, Sparkles, Save, List,
  X, Check, AlertCircle, Loader2, Square
} from "lucide-react";
import DashboardLayout from "./DashboardLayout";
import { useVoiceChat } from "@/contexts/VoiceChatContext";

interface VocabularyItem {
  word: string;
  meaning: string;
  partOfSpeech: string;
  example: string;
}

interface StructureItem {
  pattern: string;
  meaning: string;
  example: string;
}

interface GrammarStructure {
  pattern: string;
  explanation: string;
  explanationVi: string;
  components?: Array<{ part: string; role: string; roleVi: string }>;
}

interface EnhancedResponse {
  english: string;
  vietnamese: string;
  grammarStructure?: GrammarStructure;
  vocabulary: VocabularyItem[];
  structures: StructureItem[];
}

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
  enhancedResponse?: EnhancedResponse;
}

export default function VoiceChatEnhanced() {
  const { data: session } = useSession();
  const userId = (session?.user as any)?.id || "anonymous";

  // State
  const [messages, setMessages] = useState<Message[]>([]);
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentTranscript, setCurrentTranscript] = useState("");
  const [textInput, setTextInput] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSupported, setIsSupported] = useState(true);
  
  // UI State
  const [showSettings, setShowSettings] = useState(false);
  const [showSavedPanel, setShowSavedPanel] = useState(false);
  const [expandedMessages, setExpandedMessages] = useState<Set<string>>(new Set());
  const [savedVocabulary, setSavedVocabulary] = useState<any[]>([]);
  const [savedStructures, setSavedStructures] = useState<any[]>([]);
  const [saveNotification, setSaveNotification] = useState<string | null>(null); // New: save notification
  
  // Settings
  const [level, setLevel] = useState("A2");
  const [autoSpeak, setAutoSpeak] = useState(true);
  const [speakingSpeed, setSpeakingSpeed] = useState(0.9);
  const [autoSave, setAutoSave] = useState(true);
  const [voiceAccent, setVoiceAccent] = useState<"US" | "UK">("US"); // US or UK accent

  // Refs
  const recognitionRef = useRef<any>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const finalTranscriptRef = useRef("");

  // Sync state to global VoiceChat context (for mini player)
  const { setVoiceSession } = useVoiceChat();
  useEffect(() => {
    const active = isListening || isSpeaking || isProcessing || messages.length > 0;
    const lastMsg = messages.filter(m => m.role === "assistant").slice(-1)[0];
    setVoiceSession(active ? {
      active: true,
      listening: isListening,
      speaking: isSpeaking,
      processing: isProcessing,
      lastText: lastMsg?.content?.slice(0, 80) || "",
    } : null);
  }, [isListening, isSpeaking, isProcessing, messages, setVoiceSession]);

  // Stop entire session
  const stopConversation = useCallback(() => {
    recognitionRef.current?.stop();
    window.speechSynthesis?.cancel();
    setMessages([]);
    setIsListening(false);
    setIsSpeaking(false);
    setIsProcessing(false);
    setCurrentTranscript("");
    setVoiceSession(null);
  }, [setVoiceSession]);

  // Initialize Speech Recognition
  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) { 
      setIsSupported(false); 
      return; 
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = false;
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
      const finalText = finalTranscriptRef.current.trim();
      if (finalText) {
        sendMessage(finalText);
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
    };
    
    recognition.onerror = (event: any) => {
      if (event.error === "not-allowed") {
        setError("Vui lòng cho phép truy cập microphone");
      }
      setIsListening(false);
    };
    
    recognitionRef.current = recognition;
    return () => { recognition.stop(); };
  }, []);

  // Auto scroll
  useEffect(() => { 
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }); 
  }, [messages]);

  // Start session on mount
  useEffect(() => {
    startSession();
    loadSavedItems();
  }, []);

  const startSession = async () => {
    try {
      const res = await fetch("/api/voice-chat-enhanced", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "start", userId, level })
      });
      const data = await res.json();
      if (data.success) {
        const msg: Message = { 
          id: Date.now().toString(), 
          role: "assistant", 
          content: data.response.english,
          timestamp: new Date(),
          enhancedResponse: data.response
        };
        setMessages([msg]);
        if (autoSpeak) speakEnhanced(data.response);
      }
    } catch (err) { 
      console.error("Start error:", err); 
    }
  };

  const loadSavedItems = async () => {
    try {
      const res = await fetch("/api/voice-chat-enhanced", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "getSaved", userId })
      });
      const data = await res.json();
      if (data.success) {
        setSavedVocabulary(data.vocabulary || []);
        setSavedStructures(data.structures || []);
      }
    } catch (err) {
      console.error("Load saved error:", err);
    }
  };


  // Speak English only with selected accent (US or UK)
  const speakEnhanced = useCallback((response: EnhancedResponse) => {
    if (isSpeaking) return;
    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(response.english);
    utterance.lang = voiceAccent === "UK" ? "en-GB" : "en-US";
    utterance.rate = speakingSpeed;
    
    const voices = window.speechSynthesis.getVoices();
    // Find voice matching accent
    const targetLang = voiceAccent === "UK" ? "en-GB" : "en-US";
    const voice = voices.find(v => v.lang === targetLang) || 
                  voices.find(v => v.lang.startsWith("en"));
    if (voice) utterance.voice = voice;
    
    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);
    
    window.speechSynthesis.speak(utterance);
  }, [isSpeaking, speakingSpeed, voiceAccent]);

  const speakSingle = (text: string) => {
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = voiceAccent === "UK" ? "en-GB" : "en-US";
    utterance.rate = speakingSpeed;
    
    const voices = window.speechSynthesis.getVoices();
    const targetLang = voiceAccent === "UK" ? "en-GB" : "en-US";
    const voice = voices.find(v => v.lang === targetLang) || 
                  voices.find(v => v.lang.startsWith("en"));
    if (voice) utterance.voice = voice;
    
    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    
    window.speechSynthesis.speak(utterance);
  };

  const stopSpeaking = () => { 
    window.speechSynthesis.cancel(); 
    setIsSpeaking(false); 
  };

  const startListening = () => {
    if (!isSupported) { 
      setError("Trình duyệt không hỗ trợ. Vui lòng dùng Chrome."); 
      return; 
    }
    stopSpeaking();
    finalTranscriptRef.current = "";
    setCurrentTranscript("");
    try { 
      recognitionRef.current?.start(); 
    } catch (err) { 
      console.error("Start error:", err); 
    }
  };

  const stopListening = () => {
    recognitionRef.current?.stop();
  };

  const sendMessage = async (text: string) => {
    if (!text.trim() || isProcessing) return;
    setIsProcessing(true);
    setCurrentTranscript("");

    const userMsg: Message = { 
      id: Date.now().toString(), 
      role: "user", 
      content: text, 
      timestamp: new Date() 
    };
    setMessages(prev => [...prev, userMsg]);
    setTextInput("");

    try {
      const history = messages.map(m => ({ role: m.role, content: m.content }));
      const res = await fetch("/api/voice-chat-enhanced", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          action: "chat", 
          message: text, 
          conversationHistory: history, 
          level, 
          userId,
          autoSave
        })
      });

      const data = await res.json();
      if (data.success) {
        const assistantMsg: Message = {
          id: (Date.now() + 1).toString(), 
          role: "assistant", 
          content: data.response.english,
          timestamp: new Date(),
          enhancedResponse: data.response
        };
        setMessages(prev => [...prev, assistantMsg]);
        
        // Auto-expand new message
        setExpandedMessages(prev => new Set([...prev, assistantMsg.id]));
        
        if (autoSpeak) speakEnhanced(data.response);
        
        // Refresh saved items and show notification
        if (autoSave) {
          const vocabCount = data.response.vocabulary?.length || 0;
          const structCount = data.response.structures?.length || 0;
          if (vocabCount > 0 || structCount > 0) {
            setSaveNotification(`✅ Đã lưu ${vocabCount} từ vựng, ${structCount} cấu trúc`);
            setTimeout(() => setSaveNotification(null), 3000);
          }
          setTimeout(loadSavedItems, 1000);
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
    if (textInput.trim()) sendMessage(textInput.trim());
  };

  const toggleExpand = (id: string) => {
    setExpandedMessages(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) newSet.delete(id);
      else newSet.add(id);
      return newSet;
    });
  };

  // Render message with enhanced features
  const renderMessage = (msg: Message) => {
    const isExpanded = expandedMessages.has(msg.id);
    const enhanced = msg.enhancedResponse;

    return (
      <motion.div 
        key={msg.id}
        initial={{ opacity: 0, y: 16, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ type: "spring", stiffness: 300, damping: 25 }}
        className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
      >
        <div className={`max-w-[90%] ${msg.role === "user" ? "" : "w-full"}`}>
          {/* Main bubble */}
          <div className={`rounded-2xl p-4 ${
            msg.role === "user" 
              ? "bg-gradient-to-r from-pink-500 to-violet-500 text-white shadow-lg shadow-pink-500/20" 
              : "bg-white/10 text-white border border-white/10"
          }`}>
            {msg.role === "assistant" ? (
              <motion.p
                className="text-lg"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.4, delay: 0.1 }}
              >
                {msg.content}
              </motion.p>
            ) : (
              <p className="text-lg">{msg.content}</p>
            )}
            
            {/* Vietnamese translation for assistant */}
            {msg.role === "assistant" && enhanced?.vietnamese && (
              <motion.p
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="text-white/70 mt-2 pt-2 border-t border-white/20 italic"
              >
                🇻🇳 {enhanced.vietnamese}
              </motion.p>
            )}
          </div>

          {/* Action buttons for assistant messages */}
          {msg.role === "assistant" && enhanced && (
            <div className="flex flex-wrap items-center gap-2 mt-2 ml-2">
              {/* Play English */}
              <button 
                onClick={() => speakSingle(enhanced.english)}
                className="flex items-center gap-1 px-3 py-1.5 bg-white/10 text-white/80 rounded-lg text-sm hover:bg-white/20"
              >
                <Volume2 className="w-4 h-4" /> 🔊
              </button>
              
              {/* Expand/Collapse details */}
              <button 
                onClick={() => toggleExpand(msg.id)}
                className="flex items-center gap-1 px-3 py-1.5 bg-blue-500/30 text-blue-300 rounded-lg text-sm hover:bg-blue-500/40"
              >
                <Sparkles className="w-4 h-4" />
                {isExpanded ? "Ẩn" : "Chi tiết"}
                {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </button>
            </div>
          )}

          {/* Expanded details - Compact version */}
          <AnimatePresence>
            {msg.role === "assistant" && enhanced && isExpanded && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3"
              >
                {/* Grammar Structure - Compact */}
                {enhanced.grammarStructure && (
                  <div className="bg-purple-500/20 border border-purple-500/30 rounded-xl p-3">
                    <div className="flex items-center gap-2 mb-2">
                      <Languages className="w-4 h-4 text-purple-400" />
                      <h4 className="font-bold text-purple-300 text-sm">Ngữ pháp</h4>
                    </div>
                    <p className="text-lg font-mono text-white mb-1">{enhanced.grammarStructure.pattern}</p>
                    <p className="text-white/70 text-xs">{enhanced.grammarStructure.explanation}</p>
                    <p className="text-white/50 text-xs">🇻🇳 {enhanced.grammarStructure.explanationVi}</p>
                  </div>
                )}

                {/* Vocabulary - Compact */}
                {enhanced.vocabulary && enhanced.vocabulary.length > 0 && (
                  <div className="bg-green-500/20 border border-green-500/30 rounded-xl p-3">
                    <div className="flex items-center gap-2 mb-2">
                      <BookOpen className="w-4 h-4 text-green-400" />
                      <h4 className="font-bold text-green-300 text-sm">Từ vựng</h4>
                      {autoSave && <span className="text-xs bg-green-500/30 px-1.5 py-0.5 rounded text-green-300">✓</span>}
                    </div>
                    <div className="space-y-1.5">
                      {enhanced.vocabulary.map((v, i) => (
                        <div key={i} className="flex items-center gap-2 bg-white/5 rounded-lg px-2 py-1.5">
                          <button 
                            onClick={() => speakSingle(v.word)}
                            className="p-1 hover:bg-white/20 rounded"
                          >
                            <Volume2 className="w-3 h-3 text-white/60" />
                          </button>
                          <span className="font-bold text-white text-sm">{v.word}</span>
                          <span className="text-white/40 text-xs">({v.partOfSpeech})</span>
                          <span className="text-green-300 text-sm">= {v.meaning}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    );
  };


  return (
    <DashboardLayout>
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex flex-col">
        {/* Header */}
        <div className="bg-black/20 backdrop-blur-sm border-b border-white/10 px-4 py-3">
          <div className="max-w-4xl mx-auto flex items-center justify-between">
            <div>
              <h1 className="text-xl font-bold text-white flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-yellow-400" />
                English Voice Chat
              </h1>
              <p className="text-white/60 text-sm">Học tiếng Anh qua hội thoại với AI</p>
            </div>
            <div className="flex items-center gap-2">
              <button 
                onClick={() => setShowSavedPanel(!showSavedPanel)}
                className="p-2 bg-white/10 text-white/80 rounded-lg hover:bg-white/20 relative"
              >
                <List className="w-5 h-5" />
                {savedVocabulary.length > 0 && (
                  <span className="absolute -top-1 -right-1 w-4 h-4 bg-green-500 text-white text-xs rounded-full flex items-center justify-center">
                    {savedVocabulary.length}
                  </span>
                )}
              </button>
              <button 
                onClick={() => setShowSettings(!showSettings)}
                className="p-2 bg-white/10 text-white/80 rounded-lg hover:bg-white/20"
              >
                <Settings className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="max-w-4xl mx-auto px-4 mt-4">
            <div className="bg-red-500/20 border border-red-500/50 rounded-xl p-3 flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-red-400" />
              <p className="text-red-300 text-sm">{error}</p>
              <button onClick={() => setError(null)} className="ml-auto">
                <X className="w-4 h-4 text-red-400" />
              </button>
            </div>
          </div>
        )}

        {/* Save Notification */}
        <AnimatePresence>
          {saveNotification && (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="max-w-4xl mx-auto px-4 mt-4"
            >
              <div className="bg-green-500/20 border border-green-500/50 rounded-xl p-3 flex items-center gap-2">
                <Check className="w-5 h-5 text-green-400" />
                <p className="text-green-300 text-sm">{saveNotification}</p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Settings Panel */}
        <AnimatePresence>
          {showSettings && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="max-w-4xl mx-auto px-4 mt-4"
            >
              <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/20">
                <h3 className="font-bold text-white mb-4">⚙️ Cài đặt</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <label className="text-white/70 text-sm">Trình độ</label>
                    <select 
                      value={level} 
                      onChange={(e) => setLevel(e.target.value)}
                      className="w-full mt-1 bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white"
                    >
                      <option value="A1">A1 - Beginner</option>
                      <option value="A2">A2 - Elementary</option>
                      <option value="B1">B1 - Intermediate</option>
                      <option value="B2">B2 - Upper Int.</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-white/70 text-sm">Giọng đọc</label>
                    <div className="flex gap-2 mt-1">
                      <button
                        onClick={() => setVoiceAccent("US")}
                        className={`flex-1 py-2 rounded-lg text-sm font-medium transition ${
                          voiceAccent === "US" 
                            ? "bg-blue-500 text-white" 
                            : "bg-white/10 text-white/70 hover:bg-white/20"
                        }`}
                      >
                        🇺🇸 Mỹ
                      </button>
                      <button
                        onClick={() => setVoiceAccent("UK")}
                        className={`flex-1 py-2 rounded-lg text-sm font-medium transition ${
                          voiceAccent === "UK" 
                            ? "bg-blue-500 text-white" 
                            : "bg-white/10 text-white/70 hover:bg-white/20"
                        }`}
                      >
                        🇬🇧 Anh
                      </button>
                    </div>
                  </div>
                  <div>
                    <label className="text-white/70 text-sm">Tốc độ: {speakingSpeed}x</label>
                    <input 
                      type="range" 
                      min="0.5" 
                      max="1.5" 
                      step="0.1"
                      value={speakingSpeed}
                      onChange={(e) => setSpeakingSpeed(parseFloat(e.target.value))}
                      className="w-full mt-2"
                    />
                  </div>
                  <div className="flex flex-col gap-2">
                    <label className="flex items-center gap-2 text-white/70 text-sm cursor-pointer">
                      <input 
                        type="checkbox" 
                        checked={autoSpeak} 
                        onChange={(e) => setAutoSpeak(e.target.checked)}
                        className="rounded"
                      />
                      Tự động phát âm
                    </label>
                    <label className="flex items-center gap-2 text-white/70 text-sm cursor-pointer">
                      <input 
                        type="checkbox" 
                        checked={autoSave} 
                        onChange={(e) => setAutoSave(e.target.checked)}
                        className="rounded"
                      />
                      Tự động lưu từ vựng
                    </label>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Saved Panel */}
        <AnimatePresence>
          {showSavedPanel && (
            <motion.div
              initial={{ opacity: 0, x: 300 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 300 }}
              className="fixed right-0 top-0 h-full w-80 bg-slate-900/95 backdrop-blur-sm border-l border-white/10 z-50 overflow-y-auto"
            >
              <div className="p-4">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-bold text-white">📚 Từ vựng đã lưu</h3>
                  <button onClick={() => setShowSavedPanel(false)}>
                    <X className="w-5 h-5 text-white/60" />
                  </button>
                </div>

                {/* Vocabulary */}
                <div>
                  <h4 className="text-green-400 font-medium mb-2 flex items-center gap-2">
                    <BookOpen className="w-4 h-4" /> Từ vựng ({savedVocabulary.length})
                  </h4>
                  <div className="space-y-2 max-h-[70vh] overflow-y-auto">
                    {savedVocabulary.length === 0 ? (
                      <p className="text-white/40 text-sm">Chưa có từ vựng nào</p>
                    ) : (
                      savedVocabulary.slice(0, 30).map((v, i) => (
                        <div key={i} className="bg-white/5 rounded-lg p-2 flex items-center gap-2">
                          <button 
                            onClick={() => speakSingle(v.word)}
                            className="p-1 hover:bg-white/10 rounded"
                          >
                            <Volume2 className="w-3 h-3 text-white/40" />
                          </button>
                          <span className="text-white font-medium">{v.word}</span>
                          <span className="text-green-400 text-sm">= {v.meaning}</span>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 max-w-4xl mx-auto w-full">
          <div className="space-y-4">
            {messages.map(renderMessage)}
            
            {isProcessing && (
              <div className="flex justify-start">
                <div className="bg-white/10 rounded-2xl px-4 py-3">
                  <div className="flex items-center gap-2">
                    <Loader2 className="w-5 h-5 text-white/70 animate-spin" />
                    <span className="text-white/70">Đang xử lý...</span>
                  </div>
                </div>
              </div>
            )}
            
            <div ref={messagesEndRef} />
          </div>
        </div>

        {/* Input Area */}
        <div className="bg-black/20 backdrop-blur-sm border-t border-white/10 p-4">
          <div className="max-w-4xl mx-auto">
            {/* Transcript */}
            {currentTranscript && (
              <div className="mb-3 bg-white/10 rounded-xl p-3 text-center">
                <p className="text-white">{currentTranscript}</p>
              </div>
            )}

            {/* Status */}
            <p className="text-white/60 text-sm text-center mb-3">
              {isListening ? "🎤 Đang nghe... (tự động gửi khi bạn ngừng nói)" 
                : isSpeaking ? "🔊 Đang phát âm thanh..."
                : "Nhấn mic để nói hoặc gõ tin nhắn"}
            </p>

            {/* Controls */}
            <div className="flex items-center justify-center gap-4 mb-4">
              {/* Mic button with ripple effect */}
              <div className="relative">
                {isListening && (
                  <>
                    <span className="absolute inset-0 rounded-full bg-red-500/30 animate-ping" />
                    <span className="absolute inset-[-8px] rounded-full bg-red-500/15 animate-ping" style={{ animationDelay: "0.2s" }} />
                  </>
                )}
                <motion.button 
                  onClick={isListening ? stopListening : startListening} 
                  disabled={isProcessing || isSpeaking} 
                  whileTap={{ scale: 0.9 }}
                  whileHover={{ scale: 1.05 }}
                  animate={isListening ? { boxShadow: ["0 0 0 0 rgba(239,68,68,0.4)", "0 0 0 20px rgba(239,68,68,0)"] } : {}}
                  transition={isListening ? { duration: 1, repeat: Infinity } : {}}
                  className={`relative w-16 h-16 rounded-full flex items-center justify-center shadow-lg transition-all ${
                    isListening 
                      ? "bg-red-500 ring-4 ring-red-500/40" 
                      : "bg-gradient-to-br from-pink-500 to-violet-500 hover:from-pink-400 hover:to-violet-400"
                  } ${(isProcessing || isSpeaking) ? "opacity-50 cursor-not-allowed" : ""}`}
                >
                  {isListening ? <MicOff className="w-7 h-7 text-white" /> : <Mic className="w-7 h-7 text-white" />}
                </motion.button>
              </div>
              
              <button 
                onClick={isSpeaking ? stopSpeaking : () => messages.length > 0 && messages[messages.length - 1].enhancedResponse && speakEnhanced(messages[messages.length - 1].enhancedResponse!)}
                className="p-3 bg-white/10 text-white/80 rounded-full hover:bg-white/20 transition-colors"
              >
                {isSpeaking ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
              </button>

              {/* Stop conversation button */}
              {messages.length > 0 && (
                <motion.button
                  onClick={stopConversation}
                  whileTap={{ scale: 0.9 }}
                  whileHover={{ scale: 1.05 }}
                  className="p-3 bg-red-500/20 text-red-400 rounded-full hover:bg-red-500/30 border border-red-500/30 transition-colors"
                  title="Stop conversation"
                >
                  <Square className="w-5 h-5" />
                </motion.button>
              )}
            </div>

            {/* Text input */}
            <form onSubmit={handleTextSubmit} className="flex gap-2">
              <input 
                type="text" 
                value={textInput} 
                onChange={(e) => setTextInput(e.target.value)}
                placeholder="Hoặc gõ tin nhắn bằng tiếng Anh..."
                className="flex-1 bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-white placeholder-white/40"
              />
              <button 
                type="submit" 
                disabled={!textInput.trim() || isProcessing}
                className="px-6 py-3 bg-gradient-to-r from-pink-500 to-violet-500 text-white rounded-xl disabled:opacity-50 flex items-center gap-2"
              >
                <Send className="w-5 h-5" />
              </button>
            </form>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
