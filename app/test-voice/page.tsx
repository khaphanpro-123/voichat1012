"use client";
import { useState } from "react";
import { motion } from "framer-motion";
import {
  Mic,
  Volume2,
  Play,
  Square,
  Loader,
  CheckCircle,
  XCircle,
  Headphones,
  MessageSquare,
} from "lucide-react";
import { useVoiceRecorder } from "@/hooks/useVoiceRecorder";
import { useSpeechRecognition } from "@/hooks/useSpeechRecognition";

export default function TestVoicePage() {
  const [testMode, setTestMode] = useState<'pronunciation' | 'content-extraction' | 'speaking-assessment'>('pronunciation');
  const [targetText, setTargetText] = useState("Xin chào, tôi tên là Minh. Tôi đang học tiếng Việt.");
  const [analysisResult, setAnalysisResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  // Voice recording
  const voiceRecorder = useVoiceRecorder({
    maxDuration: 60,
    onRecordingComplete: async (audioBlob, audioBase64) => {
      await analyzeVoice(audioBase64);
    },
    onError: (error) => {
      console.error('Voice recording error:', error);
    }
  });

  // Speech recognition
  const speechRecognition = useSpeechRecognition();

  // Analyze voice based on test mode
  const analyzeVoice = async (audioBase64: string) => {
    setLoading(true);
    try {
      const response = await fetch('/api/voice-analysis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: testMode === 'pronunciation' ? 'analyze-pronunciation' : 
                  testMode === 'content-extraction' ? 'extract-content' : 'speaking-assessment',
          audioBase64: audioBase64.split(',')[1],
          targetText: testMode === 'pronunciation' ? targetText : undefined,
          userLevel: 1
        })
      });

      const data = await response.json();
      if (data.success) {
        setAnalysisResult(data);
      }
    } catch (error) {
      console.error('Voice analysis error:', error);
    } finally {
      setLoading(false);
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center justify-center gap-3 mb-4"
          >
            <Mic className="w-8 h-8 text-blue-600" />
            <h1 className="text-4xl font-bold text-gray-900">Voice Analysis Test</h1>
          </motion.div>
          <p className="text-gray-600 text-lg">
            Test các tính năng phân tích voice mới 
          </p>
        </div>

        {/* Test Mode Selector */}
        <div className="bg-white rounded-2xl shadow-lg p-6 mb-8">
          <h3 className="text-lg font-bold text-gray-900 mb-4">Chọn chế độ test:</h3>
          <div className="grid md:grid-cols-3 gap-4">
            <button
              onClick={() => setTestMode('pronunciation')}
              className={`p-4 rounded-xl border-2 transition text-left ${
                testMode === 'pronunciation'
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-200 hover:border-blue-300'
              }`}
            >
              <div className="flex items-center gap-2 mb-2">
                <Headphones className="w-5 h-5 text-blue-600" />
                <div className="font-bold text-blue-600">Pronunciation Analysis</div>
              </div>
              <div className="text-sm text-gray-600">Phân tích phát âm so với văn bản mục tiêu</div>
            </button>

            <button
              onClick={() => setTestMode('content-extraction')}
              className={`p-4 rounded-xl border-2 transition text-left ${
                testMode === 'content-extraction'
                  ? 'border-green-500 bg-green-50'
                  : 'border-gray-200 hover:border-green-300'
              }`}
            >
              <div className="flex items-center gap-2 mb-2">
                <Volume2 className="w-5 h-5 text-green-600" />
                <div className="font-bold text-green-600">Content Extraction</div>
              </div>
              <div className="text-sm text-gray-600">Trích xuất nội dung từ audio</div>
            </button>

            <button
              onClick={() => setTestMode('speaking-assessment')}
              className={`p-4 rounded-xl border-2 transition text-left ${
                testMode === 'speaking-assessment'
                  ? 'border-purple-500 bg-purple-50'
                  : 'border-gray-200 hover:border-purple-300'
              }`}
            >
              <div className="flex items-center gap-2 mb-2">
                <MessageSquare className="w-5 h-5 text-purple-600" />
                <div className="font-bold text-purple-600">Speaking Assessment</div>
              </div>
              <div className="text-sm text-gray-600">Đánh giá khả năng nói tổng thể</div>
            </button>
          </div>
        </div>

        {/* Target Text (for pronunciation mode) */}
        {testMode === 'pronunciation' && (
          <div className="bg-white rounded-2xl shadow-lg p-6 mb-8">
            <h3 className="text-lg font-bold text-gray-900 mb-4">Văn bản mục tiêu:</h3>
            <div className="space-y-4">
              <textarea
                value={targetText}
                onChange={(e) => setTargetText(e.target.value)}
                className="w-full p-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                rows={3}
                placeholder="Nhập văn bản để luyện phát âm..."
              />
              <button
                onClick={() => speakText(targetText)}
                className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition"
              >
                <Volume2 className="w-4 h-4 inline mr-2" />
                Nghe mẫu
              </button>
            </div>
          </div>
        )}

        {/* Voice Recording Section */}
        <div className="bg-white rounded-2xl shadow-lg p-8 mb-8">
          <h3 className="text-lg font-bold text-gray-900 mb-6 text-center">
            Ghi âm để test
          </h3>

          <div className="space-y-6">
            {/* Recording Controls */}
            <div className="text-center">
              <div className="flex items-center justify-center gap-4 mb-4">
                <button
                  onClick={voiceRecorder.toggleRecording}
                  disabled={loading}
                  className={`px-8 py-4 rounded-xl font-semibold transition ${
                    voiceRecorder.isRecording
                      ? 'bg-red-500 text-white hover:bg-red-600'
                      : 'bg-blue-500 text-white hover:bg-blue-600'
                  }`}
                >
                  {voiceRecorder.isRecording ? (
                    <>
                      <Square className="w-6 h-6 inline mr-2" />
                      Dừng ghi âm
                    </>
                  ) : (
                    <>
                      <Mic className="w-6 h-6 inline mr-2" />
                      Bắt đầu ghi âm
                    </>
                  )}
                </button>

                {voiceRecorder.audioUrl && (
                  <button
                    onClick={voiceRecorder.clearRecording}
                    className="px-6 py-3 bg-gray-500 text-white rounded-xl hover:bg-gray-600 transition"
                  >
                    Ghi lại
                  </button>
                )}
              </div>

              {/* Recording Status */}
              {voiceRecorder.isRecording && (
                <div className="space-y-3">
                  <div className="flex items-center justify-center gap-2">
                    <div className="w-4 h-4 bg-red-500 rounded-full animate-pulse"></div>
                    <span className="text-red-600 font-medium text-lg">
                      Đang ghi âm... {voiceRecorder.formattedTime}
                    </span>
                  </div>
                  <div className="w-full max-w-md mx-auto bg-gray-200 rounded-full h-3">
                    <div 
                      className="bg-red-500 h-3 rounded-full transition-all duration-1000"
                      style={{ width: `${(voiceRecorder.recordingTime / 60) * 100}%` }}
                    ></div>
                  </div>
                </div>
              )}

              {/* Audio Playback */}
              {voiceRecorder.audioUrl && (
                <div className="space-y-3">
                  <audio
                    src={voiceRecorder.audioUrl}
                    controls
                    className="w-full max-w-md mx-auto"
                  />
                  <p className="text-sm text-gray-600">
                    Thời gian ghi âm: {voiceRecorder.formattedTime}
                  </p>
                </div>
              )}
            </div>

            {/* Speech Recognition Test */}
            <div className="border-t pt-6">
              <h4 className="font-semibold text-gray-700 mb-4 text-center">
                Test Speech Recognition (Real-time)
              </h4>
              
              <div className="text-center space-y-4">
                <button
                  onClick={speechRecognition.toggleListening}
                  className={`px-6 py-3 rounded-xl font-semibold transition ${
                    speechRecognition.isListening
                      ? 'bg-red-500 text-white hover:bg-red-600'
                      : 'bg-green-500 text-white hover:bg-green-600'
                  }`}
                >
                  {speechRecognition.isListening ? (
                    <>
                      <Square className="w-5 h-5 inline mr-2" />
                      Dừng nghe
                    </>
                  ) : (
                    <>
                      <Mic className="w-5 h-5 inline mr-2" />
                      Bắt đầu nghe
                    </>
                  )}
                </button>

                {speechRecognition.isListening && (
                  <div className="flex items-center justify-center gap-2">
                    <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
                    <span className="text-green-600 font-medium">Đang nghe...</span>
                  </div>
                )}

                {speechRecognition.transcript && (
                  <div className="bg-gray-50 p-4 rounded-lg max-w-2xl mx-auto">
                    <p className="text-gray-800">
                      <strong>Đã nhận dạng:</strong> {speechRecognition.transcript}
                    </p>
                    {speechRecognition.interimTranscript && (
                      <p className="text-gray-500 italic mt-2">
                        <strong>Đang nghe:</strong> {speechRecognition.interimTranscript}
                      </p>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Loading */}
        {loading && (
          <div className="bg-white rounded-2xl shadow-lg p-8 text-center">
            <Loader className="w-12 h-12 animate-spin text-blue-500 mx-auto mb-4" />
            <p className="text-gray-600 text-lg">Đang phân tích voice...</p>
          </div>
        )}

        {/* Analysis Results */}
        {analysisResult && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-2xl shadow-lg p-8"
          >
            <h3 className="text-xl font-bold text-gray-900 mb-6">Kết quả phân tích</h3>
            
            {/* Scores (for pronunciation and speaking assessment) */}
            {(analysisResult.pronunciationScore !== undefined || analysisResult.contentMatch !== undefined) && (
              <div className="grid md:grid-cols-2 gap-6 mb-6">
                {analysisResult.pronunciationScore !== undefined && (
                  <div className="bg-gradient-to-r from-green-50 to-emerald-50 p-6 rounded-lg text-center">
                    <div className="text-3xl font-bold text-green-600 mb-2">
                      {analysisResult.pronunciationScore}%
                    </div>
                    <div className="text-gray-600">Điểm phát âm</div>
                  </div>
                )}
                
                {analysisResult.contentMatch !== undefined && (
                  <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-6 rounded-lg text-center">
                    <div className="text-3xl font-bold text-blue-600 mb-2">
                      {analysisResult.contentMatch}%
                    </div>
                    <div className="text-gray-600">Khớp nội dung</div>
                  </div>
                )}
              </div>
            )}

            {/* Transcription */}
            {analysisResult.transcription && (
              <div className="mb-6">
                <h4 className="font-semibold text-gray-700 mb-3">Văn bản đã nhận dạng:</h4>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <p className="text-gray-800 italic">"{analysisResult.transcription}"</p>
                </div>
              </div>
            )}

            {/* Content Extraction Results */}
            {analysisResult.mainTopics && (
              <div className="mb-6">
                <h4 className="font-semibold text-gray-700 mb-3">Nội dung trích xuất:</h4>
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <h5 className="font-medium text-gray-600 mb-2">Chủ đề chính:</h5>
                    <div className="flex flex-wrap gap-2">
                      {analysisResult.mainTopics.map((topic: string, index: number) => (
                        <span key={index} className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm">
                          {topic}
                        </span>
                      ))}
                    </div>
                  </div>
                  
                  {analysisResult.keyPhrases && (
                    <div>
                      <h5 className="font-medium text-gray-600 mb-2">Cụm từ quan trọng:</h5>
                      <div className="flex flex-wrap gap-2">
                        {analysisResult.keyPhrases.map((phrase: string, index: number) => (
                          <span key={index} className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm">
                            {phrase}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Feedback */}
            {analysisResult.feedback && (
              <div className="mb-6">
                <h4 className="font-semibold text-gray-700 mb-3">Phản hồi:</h4>
                <div className="space-y-2">
                  {analysisResult.feedback.map((item: string, index: number) => (
                    <div key={index} className="flex items-start gap-2">
                      <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                      <span className="text-gray-700">{item}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Corrections */}
            {analysisResult.corrections && (
              <div className="mb-6">
                <h4 className="font-semibold text-gray-700 mb-3">Cần cải thiện:</h4>
                <div className="space-y-3">
                  {analysisResult.corrections.pronunciation?.length > 0 && (
                    <div>
                      <span className="text-sm font-medium text-purple-600">Phát âm:</span>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {analysisResult.corrections.pronunciation.map((word: string, i: number) => (
                          <span 
                            key={i} 
                            className="px-2 py-1 bg-purple-100 text-purple-700 text-sm rounded cursor-pointer hover:bg-purple-200 transition"
                            onClick={() => speakText(word)}
                          >
                            {word}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {analysisResult.corrections.grammar?.length > 0 && (
                    <div>
                      <span className="text-sm font-medium text-red-600">Ngữ pháp:</span>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {analysisResult.corrections.grammar.map((error: string, i: number) => (
                          <span key={i} className="px-2 py-1 bg-red-100 text-red-700 text-sm rounded">
                            {error}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {analysisResult.corrections.vocabulary?.length > 0 && (
                    <div>
                      <span className="text-sm font-medium text-blue-600">Từ vựng:</span>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {analysisResult.corrections.vocabulary.map((word: string, i: number) => (
                          <span key={i} className="px-2 py-1 bg-blue-100 text-blue-700 text-sm rounded">
                            {word}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Suggestions */}
            {analysisResult.suggestions && (
              <div>
                <h4 className="font-semibold text-gray-700 mb-3">Gợi ý cải thiện:</h4>
                <div className="space-y-2">
                  {analysisResult.suggestions.map((suggestion: string, index: number) => (
                    <div key={index} className="flex items-start gap-2">
                      <CheckCircle className="w-4 h-4 text-yellow-500 mt-0.5 flex-shrink-0" />
                      <span className="text-gray-700">{suggestion}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </motion.div>
        )}
      </div>
    </div>
  );
}