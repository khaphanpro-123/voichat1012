"use client";
import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Send,
  Mic,
  Settings,
  Volume2,
  Languages,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  MicOff,
  Database,
  Brain,
  BarChart3,
} from "lucide-react";
import { useChat } from "@/hooks/useChat";
import { useTextToSpeech } from "@/hooks/useTextToSpeech";
import { useSpeechRecognition } from "@/hooks/useSpeechRecognition";

export default function ChatScreen() {
  const [inputText, setInputText] = useState("");
  const [autoCorrectEnabled, setAutoCorrectEnabled] = useState(true);
  const [expandedCorrections, setExpandedCorrections] = useState<Set<string>>(new Set());
  const [showTranslations, setShowTranslations] = useState<Set<string>>(new Set());
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Custom hooks
  const { messages, isTyping, sendMessage } = useChat();
  const { speak, stop, isSpeaking } = useTextToSpeech();
  const {
    isListening,
    transcript,
    interimTranscript,
    toggleListening,
    resetTranscript,
    isSupported: isSpeechSupported,
  } = useSpeechRecognition();

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Update input with speech recognition transcript
  useEffect(() => {
    if (transcript) {
      setInputText(transcript + interimTranscript);
    }
  }, [transcript, interimTranscript]);

  const toggleCorrection = (messageId: string) => {
    setExpandedCorrections((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(messageId)) {
        newSet.delete(messageId);
      } else {
        newSet.add(messageId);
      }
      return newSet;
    });
  };

  const toggleTranslation = (messageId: string) => {
    setShowTranslations((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(messageId)) {
        newSet.delete(messageId);
      } else {
        newSet.add(messageId);
      }
      return newSet;
    });
  };

  const handleSend = async () => {
    if (!inputText.trim()) return;

    await sendMessage(inputText);
    setInputText("");
    resetTranscript();
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleMicClick = () => {
    if (isListening) {
      toggleListening();
    } else {
      resetTranscript();
      setInputText("");
      toggleListening();
    }
  };

  const handlePlayAudio = (text: string) => {
    if (isSpeaking) {
      stop();
    } else {
      speak(text);
    }
  };

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-900">General Chat</h2>
          <p className="text-sm text-gray-600">Practice Vietnamese conversation</p>
        </div>
        <div className="flex items-center gap-4">
          {/* Auto-Correct Toggle */}
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-600">Auto-Corrections</span>
            <button
              onClick={() => setAutoCorrectEnabled(!autoCorrectEnabled)}
              className={`relative w-12 h-6 rounded-full transition-colors ${
                autoCorrectEnabled ? "bg-teal-500" : "bg-gray-300"
              }`}
            >
              <motion.div
                className="absolute top-1 left-1 w-4 h-4 bg-white rounded-full shadow-md"
                animate={{ x: autoCorrectEnabled ? 24 : 0 }}
                transition={{ type: "spring", stiffness: 500, damping: 30 }}
              />
            </button>
          </div>
          <button className="p-2 hover:bg-gray-100 rounded-lg transition">
            <Settings className="w-5 h-5 text-gray-600" />
          </button>
        </div>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-6 space-y-4">
        <AnimatePresence>
          {messages.map((message) => (
            <motion.div
              key={message.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className={`flex ${message.type === "user" ? "justify-end" : "justify-start"}`}
            >
              <div className={`max-w-2xl ${message.type === "user" ? "w-auto" : "w-full"}`}>
                {/* Message Bubble */}
                <div
                  className={`rounded-2xl px-5 py-3 ${
                    message.type === "user"
                      ? "bg-gradient-to-r from-teal-500 to-emerald-600 text-white"
                      : "bg-white border border-gray-200 text-gray-900"
                  }`}
                >
                  <div className="flex items-start gap-2">
                    <p className="flex-1">{message.text}</p>
                    {message.hasCorrection && autoCorrectEnabled && (
                      <button
                        onClick={() => toggleCorrection(message.id)}
                        className="flex-shrink-0"
                      >
                        <AlertCircle className="w-5 h-5 text-yellow-300" />
                      </button>
                    )}
                  </div>
                </div>

                {/* AI Message Actions */}
                {message.type === "ai" && (
                  <div className="flex flex-wrap items-center gap-2 mt-2 ml-2">
                    <button
                      onClick={() => handlePlayAudio(message.text)}
                      className={`flex items-center gap-1 px-3 py-1 text-sm rounded-lg transition ${
                        isSpeaking
                          ? "text-teal-600 bg-teal-50"
                          : "text-gray-600 hover:text-teal-600 hover:bg-teal-50"
                      }`}
                    >
                      <Volume2 className="w-4 h-4" />
                      <span>{isSpeaking ? "Stop Audio" : "Play Audio"}</span>
                    </button>
                    {message.bilingualResponse && (
                      <button 
                        onClick={() => toggleTranslation(message.id)}
                        className="flex items-center gap-1 px-3 py-1 text-sm text-gray-600 hover:text-teal-600 hover:bg-teal-50 rounded-lg transition"
                      >
                        <Languages className="w-4 h-4" />
                        <span>{showTranslations.has(message.id) ? "Hide Translation" : "Show Translation"}</span>
                      </button>
                    )}
                    
                    {/* Intent & Confidence Display */}
                    {message.intent && (
                      <div className="flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded-full">
                        <span>🎯 {message.intent}</span>
                        {message.confidence && (
                          <span className="font-semibold">({message.confidence}%)</span>
                        )}
                      </div>
                    )}

                    {/* Document Results Indicator */}
                    {message.documentResults && message.documentResults.length > 0 && (
                      <div className="flex items-center gap-1 px-2 py-1 bg-green-100 text-green-700 text-xs rounded-full">
                        <span>📚 Found {message.documentResults.length} docs</span>
                      </div>
                    )}

                    {/* Data Source Analysis */}
                    {message.sourceAnalysis && (
                      <div className="flex items-center gap-1 px-2 py-1 bg-purple-100 text-purple-700 text-xs rounded-full">
                        <Database className="w-3 h-3" />
                        <span>{message.sourceAnalysis.userDocumentPercentage}% User Data</span>
                      </div>
                    )}

                    {/* SLA Metadata - Recasting Indicator */}
                    {message.slaMetadata?.recastUsed && (
                      <div className="flex items-center gap-1 px-2 py-1 bg-teal-100 text-teal-700 text-xs rounded-full">
                        <span>🔄 Recasting</span>
                      </div>
                    )}

                    {/* SLA Level Indicator */}
                    {message.slaMetadata?.learnerLevel && (
                      <div className="flex items-center gap-1 px-2 py-1 bg-orange-100 text-orange-700 text-xs rounded-full">
                        <span>📊 {message.slaMetadata.learnerLevel}</span>
                      </div>
                    )}
                  </div>
                )}

                {/* Bilingual Translation */}
                {message.type === "ai" && message.bilingualResponse && showTranslations.has(message.id) && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    className="mt-3 bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-blue-200 rounded-2xl p-4"
                  >
                    <div className="flex items-center gap-2 mb-3">
                      <Languages className="w-5 h-5 text-blue-600" />
                      <h4 className="font-bold text-gray-900">Bilingual Translation</h4>
                      <button
                        onClick={() => toggleTranslation(message.id)}
                        className="ml-auto"
                      >
                        <ChevronUp className="w-5 h-5 text-gray-600" />
                      </button>
                    </div>
                    
                    <div className="space-y-3">
                      <div>
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-xs font-semibold text-gray-600 uppercase">🇻🇳 Tiếng Việt:</span>
                        </div>
                        <p className="text-gray-800 bg-white p-3 rounded-lg border border-blue-200 leading-relaxed">
                          {message.bilingualResponse.vietnamese}
                        </p>
                      </div>
                      
                      <div>
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-xs font-semibold text-gray-600 uppercase">🇺🇸 English:</span>
                        </div>
                        <p className="text-gray-800 bg-white p-3 rounded-lg border border-blue-200 leading-relaxed italic">
                          {message.bilingualResponse.english}
                        </p>
                      </div>
                    </div>
                  </motion.div>
                )}

                {/* Data Source Analysis */}
                {message.type === "ai" && message.sourceAnalysis && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    className="mt-3 bg-gradient-to-r from-purple-50 to-pink-50 border-2 border-purple-200 rounded-2xl p-4"
                  >
                    <div className="flex items-center gap-2 mb-3">
                      <BarChart3 className="w-5 h-5 text-purple-600" />
                      <h4 className="font-bold text-gray-900">Data Source Analysis</h4>
                    </div>
                    
                    <div className="space-y-3">
                      {/* Percentage Bars */}
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Database className="w-4 h-4 text-green-600" />
                            <span className="text-sm font-medium text-gray-700">Your Documents</span>
                          </div>
                          <span className="text-sm font-bold text-green-600">
                            {message.sourceAnalysis.userDocumentPercentage}%
                          </span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div
                            className="bg-green-500 h-2 rounded-full transition-all duration-500"
                            style={{ width: `${message.sourceAnalysis.userDocumentPercentage}%` }}
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Brain className="w-4 h-4 text-blue-600" />
                            <span className="text-sm font-medium text-gray-700">AI Knowledge</span>
                          </div>
                          <span className="text-sm font-bold text-blue-600">
                            {message.sourceAnalysis.externalSourcePercentage}%
                          </span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div
                            className="bg-blue-500 h-2 rounded-full transition-all duration-500"
                            style={{ width: `${message.sourceAnalysis.externalSourcePercentage}%` }}
                          />
                        </div>
                      </div>

                      {/* Detailed Breakdown */}
                      <div className="grid grid-cols-2 gap-3 mt-4">
                        <div className="bg-white p-3 rounded-lg border border-purple-200 text-center">
                          <div className="text-lg font-bold text-green-600">
                            {message.sourceAnalysis.totalDocumentsFound}
                          </div>
                          <div className="text-xs text-gray-600">Documents Found</div>
                        </div>
                        <div className="bg-white p-3 rounded-lg border border-purple-200 text-center">
                          <div className="text-lg font-bold text-blue-600">
                            {message.sourceAnalysis.totalVocabularyFound}
                          </div>
                          <div className="text-xs text-gray-600">Vocabulary Found</div>
                        </div>
                      </div>

                      {/* Recommendation */}
                      {message.sourceAnalysis.userDocumentPercentage < 30 && (
                        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mt-3">
                          <div className="flex items-center gap-2 mb-1">
                            <AlertCircle className="w-4 h-4 text-yellow-600" />
                            <span className="text-sm font-semibold text-yellow-800">Recommendation</span>
                          </div>
                          <p className="text-xs text-yellow-700">
                            Upload more documents to get more personalized responses based on your learning materials.
                          </p>
                        </div>
                      )}
                    </div>
                  </motion.div>
                )}

                {/* Document Search Results */}
                {message.type === "ai" && message.documentResults && message.documentResults.length > 0 && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    className="mt-3 bg-gradient-to-r from-green-50 to-emerald-50 border-2 border-green-200 rounded-2xl p-4"
                  >
                    <div className="flex items-center gap-2 mb-3">
                      <div className="w-5 h-5 text-green-600">📚</div>
                      <h4 className="font-bold text-gray-900">Related Documents Found</h4>
                    </div>
                    
                    <div className="space-y-2">
                      {message.documentResults.slice(0, 3).map((result, index) => (
                        <div key={index} className="bg-white p-3 rounded-lg border border-green-200">
                          <p className="text-sm text-gray-700 leading-relaxed">
                            {result}
                          </p>
                        </div>
                      ))}
                      {message.documentResults.length > 3 && (
                        <p className="text-xs text-gray-500 italic">
                          ... and {message.documentResults.length - 3} more results
                        </p>
                      )}
                    </div>
                  </motion.div>
                )}

                {/* Enhanced Correction Popup */}
                {message.hasCorrection && 
                 autoCorrectEnabled && 
                 expandedCorrections.has(message.id) && 
                 message.correction && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="mt-3 bg-gradient-to-r from-yellow-50 to-orange-50 border-2 border-yellow-200 rounded-2xl p-4"
                  >
                    <div className="flex items-center gap-2 mb-3">
                      <AlertCircle className="w-5 h-5 text-yellow-600" />
                      <h4 className="font-bold text-gray-900">Grammar Correction</h4>
                      <button
                        onClick={() => toggleCorrection(message.id)}
                        className="ml-auto"
                      >
                        <ChevronUp className="w-5 h-5 text-gray-600" />
                      </button>
                    </div>
                    
                    <div className="space-y-4">
                      <div>
                        <p className="text-xs font-semibold text-gray-600 uppercase mb-1">
                          🔴 Original:
                        </p>
                        <p className="text-red-600 font-medium line-through bg-red-50 p-2 rounded">
                          {message.correction.original}
                        </p>
                      </div>
                      
                      <div>
                        <p className="text-xs font-semibold text-gray-600 uppercase mb-1">
                          ✅ Corrected:
                        </p>
                        <p className="text-green-600 font-bold text-lg bg-green-50 p-2 rounded">
                          {message.correction.corrected}
                        </p>
                      </div>

                      {/* Detailed Error Analysis */}
                      {message.correction.errors && message.correction.errors.length > 0 && (
                        <div>
                          <p className="text-xs font-semibold text-gray-600 uppercase mb-2">
                            🔍 Detailed Errors:
                          </p>
                          <div className="space-y-2">
                            {message.correction.errors.map((error, index) => (
                              <div key={index} className="bg-white p-3 rounded-lg border border-gray-200">
                                <div className="flex items-center gap-2 mb-1">
                                  <span className="px-2 py-1 bg-red-100 text-red-700 text-xs rounded-full font-medium">
                                    {error.type}
                                  </span>
                                  <span className="text-xs text-gray-500">Position {error.position}</span>
                                </div>
                                <div className="flex items-center gap-2 text-sm">
                                  <span className="text-red-600 line-through">{error.original}</span>
                                  <span className="text-gray-400">→</span>
                                  <span className="text-green-600 font-semibold">{error.corrected}</span>
                                </div>
                                <p className="text-xs text-gray-600 mt-1 italic">
                                  {error.explanation}
                                </p>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                      
                      <div>
                        <p className="text-xs font-semibold text-gray-600 uppercase mb-1">
                          💡 Explanation:
                        </p>
                        <p className="text-gray-700 text-sm leading-relaxed bg-blue-50 p-3 rounded">
                          {message.correction.explanation}
                        </p>
                      </div>
                    </div>
                  </motion.div>
                )}
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        {/* Typing Indicator */}
        {isTyping && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex justify-start"
          >
            <div className="bg-white border border-gray-200 rounded-2xl px-5 py-3">
              <div className="flex items-center gap-2">
                <div className="flex gap-1">
                  <motion.div
                    className="w-2 h-2 bg-gray-400 rounded-full"
                    animate={{ y: [0, -8, 0] }}
                    transition={{ duration: 0.6, repeat: Infinity, delay: 0 }}
                  />
                  <motion.div
                    className="w-2 h-2 bg-gray-400 rounded-full"
                    animate={{ y: [0, -8, 0] }}
                    transition={{ duration: 0.6, repeat: Infinity, delay: 0.2 }}
                  />
                  <motion.div
                    className="w-2 h-2 bg-gray-400 rounded-full"
                    animate={{ y: [0, -8, 0] }}
                    transition={{ duration: 0.6, repeat: Infinity, delay: 0.4 }}
                  />
                </div>
                <span className="text-sm text-gray-600">AI is typing...</span>
              </div>
            </div>
          </motion.div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="bg-white border-t border-gray-200 p-4">
        {/* Listening Indicator */}
        {isListening && (
          <div className="max-w-4xl mx-auto mb-3">
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-center gap-3 px-4 py-2 bg-red-50 border border-red-200 rounded-xl"
            >
              <motion.div
                animate={{ scale: [1, 1.2, 1] }}
                transition={{ duration: 1, repeat: Infinity }}
                className="w-3 h-3 bg-red-500 rounded-full"
              />
              <span className="text-sm font-medium text-red-700">
                Listening... Speak in Vietnamese
              </span>
              {interimTranscript && (
                <span className="text-sm text-gray-600 italic">
                  "{interimTranscript}"
                </span>
              )}
            </motion.div>
          </div>
        )}

        <div className="max-w-4xl mx-auto flex items-end gap-3">
          {/* Text Input */}
          <div className="flex-1 bg-gray-100 rounded-2xl px-4 py-3 focus-within:ring-2 focus-within:ring-teal-500">
            <textarea
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Type your message in Vietnamese..."
              className="w-full bg-transparent resize-none outline-none text-gray-900 placeholder-gray-500"
              rows={1}
            />
          </div>

          {/* Microphone Button */}
          <motion.button
            onClick={handleMicClick}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            animate={isListening ? { scale: [1, 1.1, 1] } : {}}
            transition={isListening ? { duration: 1, repeat: Infinity } : {}}
            className={`w-12 h-12 rounded-full flex items-center justify-center shadow-lg hover:shadow-xl transition ${
              isListening
                ? "bg-gradient-to-r from-red-500 to-pink-600 text-white"
                : "bg-gradient-to-r from-teal-500 to-emerald-600 text-white"
            }`}
            title={
              !isSpeechSupported
                ? "Speech recognition not supported"
                : isListening
                ? "Stop listening"
                : "Start voice input"
            }
            disabled={!isSpeechSupported}
          >
            {isListening ? <MicOff className="w-6 h-6" /> : <Mic className="w-6 h-6" />}
          </motion.button>

          {/* Send Button */}
          <motion.button
            onClick={handleSend}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            disabled={!inputText.trim()}
            className={`w-12 h-12 rounded-full flex items-center justify-center shadow-lg transition ${
              inputText.trim()
                ? "bg-gradient-to-r from-teal-500 to-emerald-600 text-white hover:shadow-xl"
                : "bg-gray-300 text-gray-500 cursor-not-allowed"
            }`}
          >
            <Send className="w-5 h-5" />
          </motion.button>
        </div>
      </div>
    </div>
  );
}
