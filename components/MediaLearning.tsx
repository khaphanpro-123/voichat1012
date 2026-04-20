"use client";
import { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Video,
  Music,
  Volume2,
  CheckCircle,
  XCircle,
  Loader,
  RotateCcw,
  Headphones,
  Mic,
  Award,
  Play,
  Pause,
  Square,
  MicOff,
  Lightbulb,
} from "lucide-react";
import { useVoiceRecorder } from "@/hooks/useVoiceRecorder";

// Simplified interface for pronunciation comparison system
interface PronunciationComparison {
  pronunciationScore: number;
  fluencyScore: number;
  overallScore: number;
  userTranscript: string;
  pronunciationErrors: Array<{
    word: string;
    issue: string;
    correction: string;
  }>;
  strengths: string[];
  suggestions: string[];
}

// Vision Analysis Interface
interface VisionAnalysis {
  objects: string[];
  actions: string[];
  scene: string;
  people_description: string;
  caption: string;
  emotions?: string[];
  colors?: string[];
  text_in_image?: string[];
}

// User Response Comparison Interface
interface UserResponseComparison {
  score: number;
  mistakes: string;
  correction: string;
  followup: string;
  accuracy_details: {
    objects_mentioned: string[];
    objects_missed: string[];
    objects_incorrect: string[];
    actions_correct: string[];
    actions_missed: string[];
  };
}

export default function MediaLearning() {
  const [step, setStep] = useState<'upload' | 'processing' | 'vision-analysis' | 'user-response' | 'comparison' | 'practice' | 'results'>('upload');
  const [mediaFile, setMediaFile] = useState<File | null>(null);
  const [mediaPreview, setMediaPreview] = useState<string | null>(null);
  const [mediaType, setMediaType] = useState<'video' | 'audio' | 'image'>('image');
  const [visionAnalysis, setVisionAnalysis] = useState<VisionAnalysis | null>(null);
  const [userResponse, setUserResponse] = useState<string>('');
  const [responseComparison, setResponseComparison] = useState<UserResponseComparison | null>(null);
  const [originalTranscript, setOriginalTranscript] = useState<string>('');
  const [userRecording, setUserRecording] = useState<string | null>(null);
  const [comparisonResult, setComparisonResult] = useState<PronunciationComparison | null>(null);

  const [loading, setLoading] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);

  // Voice recording for pronunciation comparison
  const voiceRecorder = useVoiceRecorder({
    maxDuration: 60,
    onRecordingComplete: async (audioBlob, audioBase64) => {
      setUserRecording(audioBase64);
      await compareWithOriginal(audioBase64);
    },
    onError: (error) => {
      console.error('Voice recording error:', error);
    }
  });

  const handleMediaUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setMediaFile(file);
      setMediaPreview(URL.createObjectURL(file));
      
      if (file.type.startsWith('image/')) {
        setMediaType('image');
      } else if (file.type.startsWith('video/')) {
        setMediaType('video');
      } else {
        setMediaType('audio');
      }
    }
  };

  const processMedia = async () => {
    if (!mediaFile) return;

    setLoading(true);
    setStep('processing');
    
    try {
      const reader = new FileReader();
      reader.onload = async (e) => {
        const base64 = e.target?.result as string;
        const mediaBase64 = base64.split(',')[1];

        if (mediaType === 'image') {
          // Use Vision Engine for image analysis
          const response = await fetch('/api/media-learning', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              action: 'analyze-image',
              imageBase64: mediaBase64,
              userId: 'anonymous'
            })
          });

          const data = await response.json();

          if (data.success) {
            setVisionAnalysis(data.visionAnalysis);
            setStep('vision-analysis');
          }
        } else if (mediaType === 'video') {
          // Use Vision Engine for video analysis (frames + audio)
          const response = await fetch('/api/media-learning', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              action: 'analyze-video',
              videoBase64: mediaBase64,
              userId: 'anonymous'
            })
          });

          const data = await response.json();

          if (data.success) {
            setVisionAnalysis(data.combinedAnalysis);
            setOriginalTranscript(data.audioTranscript);
            setStep('vision-analysis');
          }
        } else {
          // Audio only - transcribe
          const response = await fetch('/api/media-learning', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              action: 'transcribe',
              audioBase64: mediaBase64,
              userId: 'anonymous'
            })
          });

          const data = await response.json();

          if (data.success) {
            setOriginalTranscript(data.transcript);
            setStep('practice');
          }
        }
      };

      reader.readAsDataURL(mediaFile);
    } catch (error) {
      console.error('Media processing error:', error);
    } finally {
      setLoading(false);
    }
  };

  const submitUserResponse = async () => {
    if (!userResponse.trim() || !visionAnalysis) return;

    setLoading(true);
    setStep('comparison');

    try {
      const response = await fetch('/api/media-learning', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'compare-user-response',
          userMessage: userResponse,
          visionAnalysis,
          userId: 'anonymous'
        })
      });

      const data = await response.json();

      if (data.success) {
        setResponseComparison(data);
        setStep('results');
      }
    } catch (error) {
      console.error('Response comparison error:', error);
    } finally {
      setLoading(false);
    }
  };



  const resetSession = () => {
    setStep('upload');
    setMediaFile(null);
    setMediaPreview(null);
    setVisionAnalysis(null);
    setUserResponse('');
    setResponseComparison(null);
    setOriginalTranscript('');
    setUserRecording(null);
    setComparisonResult(null);
    voiceRecorder.clearRecording();
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

  // Compare user recording with original video audio
  const compareWithOriginal = async (userAudioBase64: string) => {
    if (!mediaFile || !originalTranscript) return;

    setLoading(true);
    setStep('comparison');

    try {
      // Get original media base64
      const reader = new FileReader();
      const originalBase64Promise = new Promise<string>((resolve) => {
        reader.onload = (e) => {
          const base64 = e.target?.result as string;
          resolve(base64.split(',')[1]);
        };
        reader.readAsDataURL(mediaFile);
      });
      
      const originalMediaBase64 = await originalBase64Promise;

      const response = await fetch('/api/media-learning', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'compare-pronunciation',
          originalAudio: originalMediaBase64,
          userAudio: userAudioBase64.split(',')[1],
          originalTranscript,
          userId: 'anonymous'
        })
      });

      const data = await response.json();

      if (data.success) {
        setComparisonResult(data);
        setStep('results');
      }
    } catch (error) {
      console.error('Comparison error:', error);
    } finally {
      setLoading(false);
    }
  };







  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600 bg-green-100';
    if (score >= 60) return 'text-yellow-600 bg-yellow-100';
    return 'text-red-600 bg-red-100';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-50 p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center justify-center gap-3 mb-4"
          >
            <Video className="w-8 h-8 text-green-600" />
            <h1 className="text-4xl font-bold text-gray-900">Media Learning với Vision Engine</h1>
          </motion.div>
          <p className="text-gray-600 text-lg">
            Học tiếng Việt từ Ảnh/Video với công nghệ Vision Engine 
          </p>
        </div>



        <AnimatePresence mode="wait">
          {/* Step 1: Upload Media */}
          {step === 'upload' && (
            <motion.div
              key="upload"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="bg-white rounded-3xl shadow-xl p-8"
            >
              <h2 className="text-2xl font-bold text-gray-900 mb-6 text-center">
                Upload Ảnh/Video để Luyện Mô Tả với Vision Engine
              </h2>
              
              <div className="text-center mb-6">
                <p className="text-gray-600 text-lg">
                  Tải lên ảnh hoặc video, hệ thống sẽ phân tích nội dung và so sánh với mô tả của bạn 
                </p>
              </div>
              
              <div 
                className="border-2 border-dashed border-green-300 rounded-2xl p-12 hover:border-green-500 transition cursor-pointer text-center"
                onClick={() => fileInputRef.current?.click()}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*,video/*,audio/*"
                  onChange={handleMediaUpload}
                  className="hidden"
                />
                
                {mediaPreview ? (
                  <div className="space-y-4">
                    {mediaType === 'image' ? (
                      <img
                        src={mediaPreview}
                        alt="Uploaded content"
                        className="max-w-md max-h-64 mx-auto rounded-lg shadow-lg object-contain"
                      />
                    ) : mediaType === 'video' ? (
                      <video
                        ref={videoRef}
                        src={mediaPreview}
                        className="max-w-md max-h-64 mx-auto rounded-lg shadow-lg"
                        controls
                      />
                    ) : (
                      <div className="flex flex-col items-center">
                        <Music className="w-24 h-24 text-green-500 mb-4" />
                        <audio
                          ref={audioRef}
                          src={mediaPreview}
                          controls
                          className="mb-4"
                        />
                      </div>
                    )}
                    <p className="text-gray-600">
                      {mediaType === 'image' ? 'Ảnh' : mediaType === 'video' ? 'Video' : 'Audio'} đã sẵn sàng để phân tích!
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="flex justify-center gap-4">
                      <div className="text-center">
                        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-2">
                          <Video className="w-8 h-8 text-green-600" />
                        </div>
                        <p className="text-sm text-gray-600">Ảnh</p>
                      </div>
                      <div className="text-center">
                        <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mb-2">
                          <Video className="w-8 h-8 text-blue-600" />
                        </div>
                        <p className="text-sm text-gray-600">Video</p>
                      </div>
                      <div className="text-center">
                        <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mb-2">
                          <Mic className="w-8 h-8 text-purple-600" />
                        </div>
                        <p className="text-sm text-gray-600">Audio</p>
                      </div>
                    </div>
                    <div>
                      <p className="text-lg font-semibold text-gray-700 mb-2">
                        Chọn Ảnh/Video/Audio để Phân Tích
                      </p>
                      <p className="text-gray-500">
                        Vision Engine sẽ phân tích nội dung và so sánh với mô tả của bạn
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {mediaPreview && (
                <div className="text-center mt-6">
                  <button
                    onClick={processMedia}
                    disabled={loading}
                    className="px-8 py-3 bg-gradient-to-r from-green-500 to-emerald-600 text-white font-semibold rounded-xl hover:shadow-lg transition disabled:opacity-50"
                  >
                    {loading ? (
                      <div className="flex items-center gap-2">
                        <Loader className="w-5 h-5 animate-spin" />
                        Đang phân tích âm thanh...
                      </div>
                    ) : (
                      mediaType === 'image' ? 'Phân tích ảnh với Vision Engine' :
                      mediaType === 'video' ? 'Phân tích video (Vision + Audio)' :
                      'Phân tích âm thanh'
                    )}
                  </button>
                </div>
              )}
            </motion.div>
          )}

          {/* Step 2: Processing */}
          {step === 'processing' && (
            <motion.div
              key="processing"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="bg-white rounded-3xl shadow-xl p-8 text-center"
            >
              <h2 className="text-2xl font-bold text-gray-900 mb-6">
                Vision Engine Đang Phân Tích...
              </h2>
              
              <div className="space-y-6">
                <Loader className="w-16 h-16 animate-spin text-green-500 mx-auto" />
                <div className="space-y-2">
                  {mediaType === 'image' && (
                    <>
                      <p className="text-gray-600"> Nhận diện vật thể trong ảnh</p>
                      <p className="text-gray-600"> Phân tích hành động và cảm xúc</p>
                      <p className="text-gray-600"> Xác định bối cảnh và địa điểm</p>
                      <p className="text-gray-600"> Tạo mô tả chi tiết bằng tiếng Việt</p>
                    </>
                  )}
                  {mediaType === 'video' && (
                    <>
                      <p className="text-gray-600"> Trích xuất frames từ video</p>
                      <p className="text-gray-600"> Phân tích nội dung hình ảnh</p>
                      <p className="text-gray-600"> Chuyển đổi audio thành văn bản</p>
                      <p className="text-gray-600"> Kết hợp phân tích vision + audio</p>
                    </>
                  )}
                  {mediaType === 'audio' && (
                    <>
                      <p className="text-gray-600"> Trích xuất âm thanh</p>
                      <p className="text-gray-600"> Chuyển đổi thành văn bản tiếng Việt</p>
                      <p className="text-gray-600"> Phân tích phát âm và ngữ điệu</p>
                      <p className="text-gray-600"> Chuẩn bị cho việc so sánh</p>
                    </>
                  )}
                </div>
              </div>
            </motion.div>
          )}

          {/* Step 3: Vision Analysis Results */}
          {step === 'vision-analysis' && visionAnalysis && (
            <motion.div
              key="vision-analysis"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6"
            >
              {/* Media Display */}
              <div className="bg-white rounded-2xl shadow-lg p-6">
                <h2 className="text-2xl font-bold text-gray-900 mb-6 text-center">
                  Kết Quả Phân Tích Vision Engine
                </h2>

                <div className="grid lg:grid-cols-2 gap-6">
                  {/* Original Media */}
                  <div>
                    <h3 className="font-bold text-gray-900 mb-4">
                      {mediaType === 'image' ? 'Ảnh gốc:' : 'Media gốc:'}
                    </h3>
                    {mediaPreview && (
                      <div className="space-y-4">
                        {mediaType === 'image' ? (
                          <img
                            src={mediaPreview}
                            alt="Analyzed content"
                            className="w-full rounded-lg shadow-md object-contain max-h-64"
                          />
                        ) : mediaType === 'video' ? (
                          <video
                            src={mediaPreview}
                            className="w-full rounded-lg shadow-md max-h-64"
                            controls
                          />
                        ) : (
                          <div className="text-center">
                            <Music className="w-16 h-16 text-green-500 mx-auto mb-4" />
                            <audio
                              src={mediaPreview}
                              controls
                              className="w-full"
                            />
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Vision Analysis Results */}
                  <div>
                    <h3 className="font-bold text-gray-900 mb-4">Phân tích AI:</h3>
                    <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-4 rounded-lg space-y-4">
                      
                      {/* AI Caption */}
                      <div>
                        <h4 className="font-semibold text-blue-800 mb-2"> Mô tả tổng quan:</h4>
                        <p className="text-blue-700 bg-white p-3 rounded-lg">
                          {visionAnalysis.caption}
                        </p>
                      </div>

                      {/* Objects */}
                      {visionAnalysis.objects.length > 0 && (
                        <div>
                          <h4 className="font-semibold text-blue-800 mb-2"> Vật thể nhận diện:</h4>
                          <div className="flex flex-wrap gap-2">
                            {visionAnalysis.objects.map((obj, index) => (
                              <span
                                key={index}
                                className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm"
                              >
                                {obj}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Actions */}
                      {visionAnalysis.actions.length > 0 && (
                        <div>
                          <h4 className="font-semibold text-blue-800 mb-2"> Hành động:</h4>
                          <div className="flex flex-wrap gap-2">
                            {visionAnalysis.actions.map((action, index) => (
                              <span
                                key={index}
                                className="px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-sm"
                              >
                                {action}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Scene */}
                      <div>
                        <h4 className="font-semibold text-blue-800 mb-2"> Bối cảnh:</h4>
                        <p className="text-blue-700 bg-white p-2 rounded text-sm">
                          {visionAnalysis.scene}
                        </p>
                      </div>

                      {/* People Description */}
                      {visionAnalysis.people_description && (
                        <div>
                          <h4 className="font-semibold text-blue-800 mb-2"> Mô tả người:</h4>
                          <p className="text-blue-700 bg-white p-2 rounded text-sm">
                            {visionAnalysis.people_description}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Audio Transcript for Video */}
                {mediaType === 'video' && originalTranscript && (
                  <div className="mt-6">
                    <h3 className="font-bold text-gray-900 mb-3"> Nội dung audio:</h3>
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <p className="text-gray-800">{originalTranscript}</p>
                    </div>
                  </div>
                )}

                {/* Next Step Button */}
                <div className="text-center mt-6">
                  <button
                    onClick={() => setStep('user-response')}
                    className="px-8 py-3 bg-gradient-to-r from-green-500 to-emerald-600 text-white font-semibold rounded-xl hover:shadow-lg transition"
                  >
                    Bây giờ hãy mô tả những gì bạn thấy
                  </button>
                </div>
              </div>
            </motion.div>
          )}

          {/* Step 4: User Response Input */}
          {step === 'user-response' && visionAnalysis && (
            <motion.div
              key="user-response"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6"
            >
              <div className="bg-white rounded-2xl shadow-lg p-8">
                <h2 className="text-2xl font-bold text-gray-900 mb-6 text-center">
                  Hãy Mô Tả Những Gì Bạn Thấy
                </h2>

                <div className="grid lg:grid-cols-2 gap-6">
                  {/* Media Reference */}
                  <div>
                    <h3 className="font-bold text-gray-900 mb-4">Tham khảo:</h3>
                    {mediaPreview && (
                      <div className="space-y-4">
                        {mediaType === 'image' ? (
                          <img
                            src={mediaPreview}
                            alt="Reference"
                            className="w-full rounded-lg shadow-md object-contain max-h-48"
                          />
                        ) : mediaType === 'video' ? (
                          <video
                            src={mediaPreview}
                            className="w-full rounded-lg shadow-md max-h-48"
                            controls
                          />
                        ) : (
                          <div className="text-center">
                            <Music className="w-12 h-12 text-green-500 mx-auto mb-2" />
                            <audio
                              src={mediaPreview}
                              controls
                              className="w-full"
                            />
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* User Input */}
                  <div>
                    <h3 className="font-bold text-gray-900 mb-4">Mô tả của bạn:</h3>
                    <div className="space-y-4">
                      <textarea
                        value={userResponse}
                        onChange={(e) => setUserResponse(e.target.value)}
                        placeholder={
                          mediaType === 'image' 
                            ? "Mô tả những gì bạn thấy trong ảnh này... (ví dụ: Tôi thấy một người đàn ông đang...)"
                            : "Mô tả nội dung video/audio này..."
                        }
                        className="w-full h-32 p-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent resize-none"
                      />
                      
                      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                        <h4 className="font-semibold text-yellow-800 mb-2"> Gợi ý:</h4>
                        <ul className="text-yellow-700 text-sm space-y-1">
                          <li>• Mô tả những vật thể bạn nhìn thấy</li>
                          <li>• Nói về hành động đang diễn ra</li>
                          <li>• Mô tả bối cảnh, địa điểm</li>
                          <li>• Sử dụng tiếng Việt đơn giản, rõ ràng</li>
                        </ul>
                      </div>

                      <button
                        onClick={submitUserResponse}
                        disabled={!userResponse.trim() || loading}
                        className="w-full px-6 py-3 bg-gradient-to-r from-blue-500 to-indigo-600 text-white font-semibold rounded-xl hover:shadow-lg transition disabled:opacity-50"
                      >
                        {loading ? (
                          <div className="flex items-center justify-center gap-2">
                            <Loader className="w-5 h-5 animate-spin" />
                            Đang so sánh...
                          </div>
                        ) : (
                          'Gửi để AI so sánh và chấm điểm'
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {/* Step 5: Comparison Processing */}
          {step === 'comparison' && (
            <motion.div
              key="comparison"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="bg-white rounded-3xl shadow-xl p-8 text-center"
            >
              <h2 className="text-2xl font-bold text-gray-900 mb-6">
                Đang So Sánh Với Vision Analysis...
              </h2>
              
              <div className="space-y-6">
                <Loader className="w-16 h-16 animate-spin text-blue-500 mx-auto" />
                <div className="space-y-2">
                  <p className="text-gray-600"> So sánh với kết quả Vision Engine</p>
                  <p className="text-gray-600"> Tính toán độ chính xác</p>
                  <p className="text-gray-600"> Xác định điểm đúng/sai</p>
                  <p className="text-gray-600"> Tạo phản hồi và gợi ý</p>
                </div>
              </div>
            </motion.div>
          )}

          {/* Step 6: Results */}
          {step === 'results' && responseComparison && visionAnalysis && (
            <motion.div
              key="results"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6"
            >
              {/* Comparison Results */}
              <div className="bg-white rounded-2xl shadow-lg p-8">
                <h2 className="text-2xl font-bold text-gray-900 mb-6 text-center">
                  Kết Quả So Sánh với Vision Engine
                </h2>

                {/* Score Display */}
                <div className="text-center mb-8">
                  <div className={`inline-flex items-center gap-3 px-8 py-4 rounded-2xl ${getScoreColor(responseComparison.score)}`}>
                    <Award className="w-8 h-8" />
                    <span className="text-3xl font-bold">
                      {responseComparison.score}% Chính Xác
                    </span>
                  </div>
                </div>

                {/* Comparison Details */}
                <div className="grid md:grid-cols-2 gap-6 mb-8">
                  {/* User Response */}
                  <div className="bg-blue-50 p-6 rounded-lg">
                    <h4 className="font-semibold text-blue-800 mb-3"> Mô tả của bạn:</h4>
                    <div className="bg-white p-4 rounded-lg">
                      <p className="text-gray-800">{userResponse}</p>
                    </div>
                  </div>

                  {/* AI Analysis */}
                  <div className="bg-green-50 p-6 rounded-lg">
                    <h4 className="font-semibold text-green-800 mb-3"> Phân tích AI:</h4>
                    <div className="bg-white p-4 rounded-lg">
                      <p className="text-gray-800">{visionAnalysis.caption}</p>
                    </div>
                  </div>
                </div>

                {/* Detailed Analysis */}
                <div className="space-y-6">
                  {/* Accuracy Details */}
                  <div className="bg-gray-50 p-6 rounded-lg">
                    <h4 className="font-semibold text-gray-800 mb-4"> Phân tích chi tiết:</h4>
                    
                    <div className="grid md:grid-cols-2 gap-4">
                      {/* Correct Objects */}
                      {responseComparison.accuracy_details.objects_mentioned.length > 0 && (
                        <div>
                          <h5 className="font-medium text-green-700 mb-2"> Vật thể đúng:</h5>
                          <div className="flex flex-wrap gap-2">
                            {responseComparison.accuracy_details.objects_mentioned.map((obj, index) => (
                              <span key={index} className="px-2 py-1 bg-green-100 text-green-700 text-sm rounded">
                                {obj}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Missed Objects */}
                      {responseComparison.accuracy_details.objects_missed.length > 0 && (
                        <div>
                          <h5 className="font-medium text-yellow-700 mb-2"> Vật thể bỏ sót:</h5>
                          <div className="flex flex-wrap gap-2">
                            {responseComparison.accuracy_details.objects_missed.map((obj, index) => (
                              <span key={index} className="px-2 py-1 bg-yellow-100 text-yellow-700 text-sm rounded">
                                {obj}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Incorrect Objects */}
                      {responseComparison.accuracy_details.objects_incorrect.length > 0 && (
                        <div>
                          <h5 className="font-medium text-red-700 mb-2"> Vật thể sai:</h5>
                          <div className="flex flex-wrap gap-2">
                            {responseComparison.accuracy_details.objects_incorrect.map((obj, index) => (
                              <span key={index} className="px-2 py-1 bg-red-100 text-red-700 text-sm rounded">
                                {obj}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Correct Actions */}
                      {responseComparison.accuracy_details.actions_correct.length > 0 && (
                        <div>
                          <h5 className="font-medium text-green-700 mb-2"> Hành động đúng:</h5>
                          <div className="flex flex-wrap gap-2">
                            {responseComparison.accuracy_details.actions_correct.map((action, index) => (
                              <span key={index} className="px-2 py-1 bg-green-100 text-green-700 text-sm rounded">
                                {action}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Mistakes and Corrections */}
                  {responseComparison.mistakes && (
                    <div className="bg-red-50 border border-red-200 rounded-lg p-6">
                      <h4 className="font-semibold text-red-800 mb-3"> Những điểm cần chú ý:</h4>
                      <p className="text-red-700 mb-4">{responseComparison.mistakes}</p>
                      
                      <h5 className="font-medium text-red-800 mb-2"> Câu mẫu chuẩn:</h5>
                      <div className="bg-white p-4 rounded-lg">
                        <p className="text-red-700 font-medium">{responseComparison.correction}</p>
                      </div>
                    </div>
                  )}

                  {/* Follow-up Question */}
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
                    <h4 className="font-semibold text-blue-800 mb-3"> Câu hỏi tiếp theo:</h4>
                    <p className="text-blue-700 text-lg">{responseComparison.followup}</p>
                    
                    <div className="mt-4">
                      <textarea
                        placeholder="Trả lời câu hỏi này để luyện tập thêm..."
                        className="w-full h-20 p-3 border border-blue-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                      />
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="text-center mt-8 space-x-4">
                  <button
                    onClick={() => {
                      setUserResponse('');
                      setStep('user-response');
                    }}
                    className="px-6 py-3 bg-blue-500 text-white rounded-xl hover:bg-blue-600 transition"
                  >
                    <Mic className="w-5 h-5 inline mr-2" />
                    Thử mô tả lại
                  </button>
                  {(mediaType === 'video' || mediaType === 'audio') && (
                    <button
                      onClick={() => setStep('practice')}
                      className="px-6 py-3 bg-purple-500 text-white rounded-xl hover:bg-purple-600 transition"
                    >
                      <Headphones className="w-5 h-5 inline mr-2" />
                      Luyện phát âm
                    </button>
                  )}
                  <button
                    onClick={resetSession}
                    className="px-6 py-3 bg-gray-500 text-white rounded-xl hover:bg-gray-600 transition"
                  >
                    <RotateCcw className="w-5 h-5 inline mr-2" />
                    Thử media khác
                  </button>
                </div>
              </div>
            </motion.div>
          )}

          {/* Step 7: Practice Recording (for video/audio) */}
          {step === 'practice' && originalTranscript && (
            <motion.div
              key="practice"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6"
            >
              {/* Original Media & Transcript */}
              <div className="grid lg:grid-cols-2 gap-6">
                <div className="bg-white rounded-2xl shadow-lg p-6">
                  <h3 className="font-bold text-gray-900 mb-4">Video/Audio gốc:</h3>
                  {mediaPreview && (
                    <div className="space-y-4">
                      {mediaType === 'video' ? (
                        <video
                          src={mediaPreview}
                          className="w-full rounded-lg shadow-md"
                          controls
                        />
                      ) : (
                        <div className="text-center">
                          <Music className="w-16 h-16 text-green-500 mx-auto mb-4" />
                          <audio
                            src={mediaPreview}
                            controls
                            className="w-full"
                          />
                        </div>
                      )}
                    </div>
                  )}
                </div>

                <div className="bg-white rounded-2xl shadow-lg p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-bold text-gray-900">Nội dung đã nhận dạng:</h3>
                    <button
                      onClick={() => speakText(originalTranscript)}
                      className="p-2 bg-green-100 text-green-600 rounded-full hover:bg-green-200 transition"
                    >
                      <Volume2 className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="bg-gray-50 p-4 rounded-lg max-h-64 overflow-y-auto">
                    <p className="text-gray-800 leading-relaxed">
                      {originalTranscript}
                    </p>
                  </div>
                </div>
              </div>

              {/* Voice Recording Section */}
              <div className="bg-white rounded-2xl shadow-lg p-8">
                <h3 className="text-xl font-bold text-gray-900 mb-6 text-center">
                  Ghi âm phát âm của bạn
                </h3>
                
                <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-6 rounded-xl border border-blue-200 mb-6">
                  <div className="text-center space-y-4">
                    <div className="flex items-center justify-center gap-4">
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
                </div>

                {/* Instructions */}
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
                  <h4 className="font-semibold text-yellow-800 mb-2">Hướng dẫn:</h4>
                  <ul className="text-yellow-700 text-sm space-y-1">
                    <li>• Nghe kỹ nội dung gốc từ video/audio</li>
                    <li>• Ghi âm phát âm lại nội dung đó một cách tự nhiên</li>
                    <li>• Hệ thống sẽ so sánh và chỉ ra những lỗi cần khắc phục</li>
                    <li>• Bạn có thể ghi âm lại nhiều lần để cải thiện</li>
                  </ul>
                </div>

                {/* Submit Button */}
                {voiceRecorder.audioUrl && (
                  <div className="text-center">
                    <p className="text-gray-600 mb-4">
                       Đã ghi âm xong! Hệ thống sẽ tự động so sánh với âm thanh gốc.
                    </p>
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {/* Step 4: Comparison Processing */}
          {step === 'comparison' && (
            <motion.div
              key="comparison"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="bg-white rounded-3xl shadow-xl p-8 text-center"
            >
              <h2 className="text-2xl font-bold text-gray-900 mb-6">
                Đang So Sánh Phát Âm...
              </h2>
              
              <div className="space-y-6">
                <Loader className="w-16 h-16 animate-spin text-blue-500 mx-auto" />
                <div className="space-y-2">
                  <p className="text-gray-600"> Phân tích âm thanh gốc</p>
                  <p className="text-gray-600"> Phân tích giọng nói của bạn</p>
                  <p className="text-gray-600"> So sánh phát âm và ngữ điệu</p>
                  <p className="text-gray-600"> Tạo báo cáo chi tiết</p>
                </div>
              </div>
            </motion.div>
          )}

          {/* Step 5: Results */}
          {step === 'results' && comparisonResult && (
            <motion.div
              key="results"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6"
            >
              {/* Pronunciation Comparison Results */}
              <div className="bg-white rounded-2xl shadow-lg p-8">
                <h2 className="text-2xl font-bold text-gray-900 mb-6 text-center">
                  Kết Quả So Sánh Phát Âm
                </h2>

                {/* Overall Scores */}
                <div className="grid md:grid-cols-3 gap-6 mb-8">
                  <div className="bg-gradient-to-r from-green-50 to-emerald-50 p-6 rounded-lg text-center">
                    <div className="text-3xl font-bold text-green-600 mb-2">
                      {comparisonResult.pronunciationScore}%
                    </div>
                    <div className="text-gray-600">Độ chính xác phát âm</div>
                  </div>
                  
                  <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-6 rounded-lg text-center">
                    <div className="text-3xl font-bold text-blue-600 mb-2">
                      {comparisonResult.fluencyScore}%
                    </div>
                    <div className="text-gray-600">Độ trôi chảy</div>
                  </div>
                  
                  <div className="bg-gradient-to-r from-purple-50 to-pink-50 p-6 rounded-lg text-center">
                    <div className="text-3xl font-bold text-purple-600 mb-2">
                      {comparisonResult.overallScore}%
                    </div>
                    <div className="text-gray-600">Điểm tổng thể</div>
                  </div>
                </div>

                {/* Audio Comparison */}
                <div className="grid md:grid-cols-2 gap-6 mb-8">
                  <div className="bg-gray-50 p-6 rounded-lg">
                    <h4 className="font-semibold text-gray-700 mb-3"> Âm thanh gốc:</h4>
                    {mediaPreview && (
                      <div className="space-y-3">
                        {mediaType === 'video' ? (
                          <video
                            src={mediaPreview}
                            className="w-full rounded-lg"
                            controls
                          />
                        ) : (
                          <audio
                            src={mediaPreview}
                            controls
                            className="w-full"
                          />
                        )}
                        <p className="text-sm text-gray-600">Nội dung gốc từ video/audio</p>
                      </div>
                    )}
                  </div>

                  <div className="bg-blue-50 p-6 rounded-lg">
                    <h4 className="font-semibold text-gray-700 mb-3"> Giọng nói của bạn:</h4>
                    {userRecording && (
                      <div className="space-y-3">
                        <audio
                          src={userRecording}
                          controls
                          className="w-full"
                        />
                        <p className="text-sm text-gray-600">Bản ghi âm của bạn</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Transcription Comparison */}
                <div className="grid md:grid-cols-2 gap-6 mb-8">
                  <div>
                    <h4 className="font-semibold text-gray-700 mb-3"> Văn bản gốc:</h4>
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <p className="text-gray-800">{originalTranscript}</p>
                    </div>
                  </div>

                  <div>
                    <h4 className="font-semibold text-gray-700 mb-3"> Văn bản từ giọng bạn:</h4>
                    <div className="bg-blue-50 p-4 rounded-lg">
                      <p className="text-gray-800">{comparisonResult.userTranscript}</p>
                    </div>
                  </div>
                </div>

                {/* Detailed Analysis */}
                <div className="space-y-6">
                  {/* Pronunciation Errors */}
                  {comparisonResult.pronunciationErrors && comparisonResult.pronunciationErrors.length > 0 && (
                    <div className="bg-red-50 border border-red-200 rounded-lg p-6">
                      <h4 className="font-semibold text-red-800 mb-3"> Lỗi phát âm cần khắc phục:</h4>
                      <div className="space-y-3">
                        {comparisonResult.pronunciationErrors.map((error: any, index: number) => (
                          <div key={index} className="bg-white p-4 rounded-lg">
                            <div className="flex items-center justify-between mb-2">
                              <span className="font-medium text-red-700">Từ: "{error.word}"</span>
                              <button
                                onClick={() => speakText(error.word)}
                                className="px-3 py-1 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition text-sm"
                              >
                                <Volume2 className="w-3 h-3 inline mr-1" />
                                Nghe đúng
                              </button>
                            </div>
                            <p className="text-red-600 text-sm">
                              <strong>Vấn đề:</strong> {error.issue}
                            </p>
                            <p className="text-red-600 text-sm">
                              <strong>Cách sửa:</strong> {error.correction}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Positive Feedback */}
                  {comparisonResult.strengths && comparisonResult.strengths.length > 0 && (
                    <div className="bg-green-50 border border-green-200 rounded-lg p-6">
                      <h4 className="font-semibold text-green-800 mb-3"> Điểm mạnh của bạn:</h4>
                      <div className="space-y-2">
                        {comparisonResult.strengths.map((strength: string, index: number) => (
                          <div key={index} className="flex items-start gap-2">
                            <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                            <span className="text-green-700">{strength}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Improvement Suggestions */}
                  {comparisonResult.suggestions && comparisonResult.suggestions.length > 0 && (
                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
                      <h4 className="font-semibold text-yellow-800 mb-3"> Gợi ý cải thiện:</h4>
                      <div className="space-y-2">
                        {comparisonResult.suggestions.map((suggestion: string, index: number) => (
                          <div key={index} className="flex items-start gap-2">
                            <Lightbulb className="w-4 h-4 text-yellow-500 mt-0.5 flex-shrink-0" />
                            <span className="text-yellow-700">{suggestion}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="text-center mt-8 space-x-4">
                  <button
                    onClick={() => setStep('practice')}
                    className="px-6 py-3 bg-blue-500 text-white rounded-xl hover:bg-blue-600 transition"
                  >
                    <Mic className="w-5 h-5 inline mr-2" />
                    Ghi âm lại
                  </button>
                  <button
                    onClick={resetSession}
                    className="px-6 py-3 bg-gray-500 text-white rounded-xl hover:bg-gray-600 transition"
                  >
                    <RotateCcw className="w-5 h-5 inline mr-2" />
                    Thử video khác
                  </button>
                </div>
              </div>
            </motion.div>
          )}

          {/* Step 5: Shadowing Mode */}
          {step === 'shadowing' && session && (
            <motion.div
              key="shadowing"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="bg-white rounded-2xl shadow-lg p-8"
            >
              <h2 className="text-2xl font-bold text-gray-900 mb-6 text-center">
                Shadowing Mode - Luyện Phát Âm
              </h2>

              {session.shadowingSegments.length > 0 && (
                <div className="space-y-6">
                  <div className="text-center">
                    <p className="text-gray-600 mb-4">
                      Đoạn {currentShadowingIndex + 1} / {session.shadowingSegments.length}
                    </p>
                    <div className="bg-gray-50 p-6 rounded-xl">
                      <p className="text-xl text-gray-800 mb-4">
                        {session.shadowingSegments[currentShadowingIndex]?.text}
                      </p>
                      <div className="flex justify-center gap-4">
                        <button
                          onClick={() => speakText(session.shadowingSegments[currentShadowingIndex]?.text)}
                          className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition"
                        >
                          <Volume2 className="w-4 h-4 inline mr-2" />
                          Nghe
                        </button>
                        <button className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition">
                          <Mic className="w-4 h-4 inline mr-2" />
                          Lặp lại
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-center gap-4">
                    <button
                      onClick={() => setCurrentShadowingIndex(Math.max(0, currentShadowingIndex - 1))}
                      disabled={currentShadowingIndex === 0}
                      className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition disabled:opacity-50"
                    >
                      Trước
                    </button>
                    <button
                      onClick={() => setCurrentShadowingIndex(Math.min(session.shadowingSegments.length - 1, currentShadowingIndex + 1))}
                      disabled={currentShadowingIndex === session.shadowingSegments.length - 1}
                      className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition disabled:opacity-50"
                    >
                      Tiếp
                    </button>
                  </div>
                </div>
              )}

              <div className="text-center mt-8 space-x-4">
                <button
                  onClick={() => {
                    extractMediaContent();
                    setStep('voice-practice');
                  }}
                  className="px-6 py-3 bg-blue-500 text-white rounded-xl hover:bg-blue-600 transition"
                >
                  <Mic className="w-5 h-5 inline mr-2" />
                  Luyện Phát Âm
                </button>
                <button
                  onClick={resetSession}
                  className="px-6 py-3 bg-gray-500 text-white rounded-xl hover:bg-gray-600 transition"
                >
                  <RotateCcw className="w-5 h-5 inline mr-2" />
                  Hoàn thành
                </button>
              </div>
            </motion.div>
          )}

          {/* Step 6: Simplified Listening */}
          {step === 'simplified-listening' && session && simplifiedListening && (
            <motion.div
              key="simplified-listening"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6"
            >
              {/* Simplified Content Display */}
              <div className="bg-white rounded-2xl shadow-lg p-8">
                <h2 className="text-2xl font-bold text-gray-900 mb-6 text-center">
                  Luyện Nghe Nội Dung Rút Gọn
                </h2>

                {/* Simplified Text with Audio */}
                <div className="bg-gradient-to-r from-green-50 to-emerald-50 p-6 rounded-xl border border-green-200 mb-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-bold text-gray-900">Nội dung đã rút gọn:</h3>
                    <button
                      onClick={() => speakText(session.simplifiedTranscript)}
                      className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition"
                    >
                      <Volume2 className="w-4 h-4 inline mr-2" />
                      Nghe nội dung rút gọn
                    </button>
                  </div>
                  <div className="bg-white p-4 rounded-lg">
                    <p className="text-gray-800 leading-relaxed text-lg">
                      {session.simplifiedTranscript}
                    </p>
                  </div>
                </div>

                {/* Simplified Listening Exercises */}
                <div className="space-y-8">
                  <h3 className="text-xl font-bold text-gray-900">Bài tập Nghe (Nội dung rút gọn):</h3>
                  
                  {/* Fill in the blanks */}
                  {simplifiedListening.listeningTasks.fillInBlanks.length > 0 && (
                    <div>
                      <h4 className="font-semibold text-gray-700 mb-4">1. Điền từ vào chỗ trống:</h4>
                      <div className="space-y-4">
                        {simplifiedListening.listeningTasks.fillInBlanks.map((task: any, index: number) => (
                          <div key={index} className="p-4 bg-gray-50 rounded-lg">
                            <p className="text-gray-800 mb-3">{task.sentence}</p>
                            <div className="flex flex-wrap gap-2">
                              {task.options.map((option: string, optIndex: number) => (
                                <button
                                  key={optIndex}
                                  onClick={() => {
                                    const newAnswers = [...simplifiedAnswers.fillInBlanks];
                                    newAnswers[index] = [option];
                                    setSimplifiedAnswers(prev => ({ ...prev, fillInBlanks: newAnswers }));
                                  }}
                                  className={`px-3 py-1 rounded-lg border transition ${
                                    simplifiedAnswers.fillInBlanks[index]?.[0] === option
                                      ? 'border-green-500 bg-green-100 text-green-700'
                                      : 'border-gray-300 hover:border-green-300'
                                  }`}
                                >
                                  {option}
                                </button>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Multiple choice */}
                  {simplifiedListening.listeningTasks.multipleChoice.length > 0 && (
                    <div>
                      <h4 className="font-semibold text-gray-700 mb-4">2. Trắc nghiệm:</h4>
                      <div className="space-y-4">
                        {simplifiedListening.listeningTasks.multipleChoice.map((task: any, index: number) => (
                          <div key={index} className="p-4 bg-gray-50 rounded-lg">
                            <p className="text-gray-800 font-medium mb-3">{task.question}</p>
                            <div className="space-y-2">
                              {task.options.map((option: string, optIndex: number) => (
                                <button
                                  key={optIndex}
                                  onClick={() => {
                                    const newAnswers = [...simplifiedAnswers.multipleChoice];
                                    newAnswers[index] = optIndex;
                                    setSimplifiedAnswers(prev => ({ ...prev, multipleChoice: newAnswers }));
                                  }}
                                  className={`w-full text-left p-3 rounded-lg border transition ${
                                    simplifiedAnswers.multipleChoice[index] === optIndex
                                      ? 'border-green-500 bg-green-100 text-green-700'
                                      : 'border-gray-300 hover:border-green-300'
                                  }`}
                                >
                                  {String.fromCharCode(65 + optIndex)}. {option}
                                </button>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Submit Button */}
                <div className="text-center mt-8">
                  <button
                    onClick={submitSimplifiedAnswers}
                    disabled={loading}
                    className="px-8 py-3 bg-gradient-to-r from-green-500 to-emerald-600 text-white font-semibold rounded-xl hover:shadow-lg transition disabled:opacity-50"
                  >
                    {loading ? (
                      <div className="flex items-center gap-2">
                        <Loader className="w-5 h-5 animate-spin" />
                        Đang chấm bài...
                      </div>
                    ) : (
                      'Nộp bài và xem kết quả'
                    )}
                  </button>
                </div>
              </div>

              {/* Simplified Results */}
              {simplifiedResults && (
                <div className="bg-white rounded-2xl shadow-lg p-8">
                  <h3 className="text-xl font-bold text-gray-900 mb-4">Kết quả Nghe Nội Dung Rút Gọn</h3>
                  
                  {/* Score */}
                  <div className="text-center mb-6">
                    <div className={`inline-flex items-center gap-3 px-6 py-3 rounded-2xl ${getScoreColor(simplifiedResults.score)}`}>
                      <Award className="w-6 h-6" />
                      <span className="text-2xl font-bold">
                        {simplifiedResults.score}% Điểm
                      </span>
                    </div>
                  </div>

                  {/* Detailed Feedback */}
                  <div className="grid md:grid-cols-2 gap-6">
                    <div>
                      <h4 className="font-semibold text-gray-700 mb-3">Chi tiết kết quả:</h4>
                      <div className="space-y-2">
                        {simplifiedResults.feedback.map((item: string, index: number) => (
                          <div key={index} className="flex items-center gap-2">
                            {item.startsWith('') ? (
                              <CheckCircle className="w-4 h-4 text-green-500" />
                            ) : (
                              <XCircle className="w-4 h-4 text-red-500" />
                            )}
                            <span className="text-gray-700">{item.substring(2)}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div>
                      <h4 className="font-semibold text-gray-700 mb-3">Gợi ý cải thiện:</h4>
                      <div className="space-y-2">
                        {simplifiedResults.recommendations.map((rec: string, index: number) => (
                          <div key={index} className="flex items-start gap-2">
                            <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 flex-shrink-0" />
                            <span className="text-gray-700">{rec}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="text-center mt-8 space-x-4">
                    <button
                      onClick={() => setStep('shadowing')}
                      className="px-6 py-3 bg-purple-500 text-white rounded-xl hover:bg-purple-600 transition"
                    >
                      <Headphones className="w-5 h-5 inline mr-2" />
                      Luyện Shadowing
                    </button>
                    <button
                      onClick={() => {
                        extractMediaContent();
                        setStep('voice-practice');
                      }}
                      className="px-6 py-3 bg-blue-500 text-white rounded-xl hover:bg-blue-600 transition"
                    >
                      <Mic className="w-5 h-5 inline mr-2" />
                      Luyện Phát Âm
                    </button>
                    <button
                      onClick={resetSession}
                      className="px-6 py-3 bg-gray-500 text-white rounded-xl hover:bg-gray-600 transition"
                    >
                      <RotateCcw className="w-5 h-5 inline mr-2" />
                      Hoàn thành
                    </button>
                  </div>
                </div>
              )}
            </motion.div>
          )}

          {/* Step 7: Voice Practice Mode */}
          {step === 'voice-practice' && session && (
            <motion.div
              key="voice-practice"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6"
            >
              {/* Practice Content */}
              <div className="bg-white rounded-2xl shadow-lg p-8">
                <h2 className="text-2xl font-bold text-gray-900 mb-6 text-center">
                  Luyện Phát Âm từ Nội dung Video/Audio
                </h2>

                {session.practiceSegments && session.practiceSegments.length > 0 && (
                  <div className="space-y-6">
                    {/* Current Practice Segment */}
                    <div className="text-center">
                      <p className="text-gray-600 mb-4">
                        Đoạn {currentPracticeIndex + 1} / {session.practiceSegments.length}
                      </p>
                      
                      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-6 rounded-xl border border-blue-200">
                        <div className="flex items-center justify-center gap-2 mb-3">
                          <span className="text-sm font-medium text-blue-600">
                            Độ khó: {session.practiceSegments[currentPracticeIndex]?.difficulty}/5
                          </span>
                          {session.practiceSegments[currentPracticeIndex]?.timeStart && (
                            <span className="text-sm text-gray-500">
                              ({session.practiceSegments[currentPracticeIndex]?.timeStart}s - {session.practiceSegments[currentPracticeIndex]?.timeEnd}s)
                            </span>
                          )}
                        </div>
                        
                        <p className="text-xl text-gray-800 mb-4 leading-relaxed">
                          {session.practiceSegments[currentPracticeIndex]?.text}
                        </p>
                        
                        <div className="flex justify-center gap-4 mb-4">
                          <button
                            onClick={() => speakText(session.practiceSegments[currentPracticeIndex]?.text)}
                            className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition"
                          >
                            <Volume2 className="w-4 h-4 inline mr-2" />
                            Nghe mẫu
                          </button>
                        </div>

                        {/* Voice Recording Controls */}
                        <div className="bg-white p-4 rounded-lg border">
                          <div className="text-center space-y-4">
                            <div className="flex items-center justify-center gap-4">
                              <button
                                onClick={voiceRecorder.toggleRecording}
                                disabled={loading}
                                className={`px-6 py-3 rounded-xl font-semibold transition ${
                                  voiceRecorder.isRecording
                                    ? 'bg-red-500 text-white hover:bg-red-600'
                                    : 'bg-blue-500 text-white hover:bg-blue-600'
                                }`}
                              >
                                {voiceRecorder.isRecording ? (
                                  <>
                                    <Square className="w-5 h-5 inline mr-2" />
                                    Dừng ghi âm
                                  </>
                                ) : (
                                  <>
                                    <Mic className="w-5 h-5 inline mr-2" />
                                    Bắt đầu ghi âm
                                  </>
                                )}
                              </button>

                              {voiceRecorder.audioUrl && (
                                <button
                                  onClick={voiceRecorder.clearRecording}
                                  className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition"
                                >
                                  Ghi lại
                                </button>
                              )}
                            </div>

                            {voiceRecorder.isRecording && (
                              <div className="flex items-center justify-center gap-2">
                                <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
                                <span className="text-red-600 font-medium">
                                  Đang ghi âm... {voiceRecorder.formattedTime}
                                </span>
                              </div>
                            )}

                            {voiceRecorder.audioUrl && (
                              <div className="space-y-3">
                                <audio
                                  src={voiceRecorder.audioUrl}
                                  controls
                                  className="w-full"
                                />
                                <p className="text-sm text-gray-600">
                                  Thời gian ghi âm: {voiceRecorder.formattedTime}
                                </p>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Navigation */}
                    <div className="flex justify-center gap-4">
                      <button
                        onClick={() => setCurrentPracticeIndex(Math.max(0, currentPracticeIndex - 1))}
                        disabled={currentPracticeIndex === 0}
                        className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition disabled:opacity-50"
                      >
                        Đoạn trước
                      </button>
                      <button
                        onClick={() => setCurrentPracticeIndex(Math.min((session.practiceSegments?.length || 1) - 1, currentPracticeIndex + 1))}
                        disabled={currentPracticeIndex === (session.practiceSegments?.length || 1) - 1}
                        className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition disabled:opacity-50"
                      >
                        Đoạn tiếp
                      </button>
                    </div>
                  </div>
                )}

                {/* Loading */}
                {loading && (
                  <div className="text-center py-8">
                    <Loader className="w-8 h-8 animate-spin text-blue-500 mx-auto mb-4" />
                    <p className="text-gray-600">Đang phân tích phát âm của bạn...</p>
                  </div>
                )}
              </div>

              {/* Voice Analysis Results */}
              {voiceAnalysis && (
                <div className="bg-white rounded-2xl shadow-lg p-6">
                  <h3 className="text-xl font-bold text-gray-900 mb-4">Kết quả phân tích phát âm</h3>
                  
                  <div className="grid md:grid-cols-2 gap-6">
                    {/* Scores */}
                    <div className="space-y-4">
                      <div className="bg-gradient-to-r from-green-50 to-emerald-50 p-4 rounded-lg">
                        <div className="flex items-center justify-between">
                          <span className="font-medium text-gray-700">Điểm phát âm:</span>
                          <span className={`text-2xl font-bold ${getScoreColor(voiceAnalysis.pronunciationScore).split(' ')[0]}`}>
                            {voiceAnalysis.pronunciationScore}%
                          </span>
                        </div>
                      </div>
                      
                      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-4 rounded-lg">
                        <div className="flex items-center justify-between">
                          <span className="font-medium text-gray-700">Khớp nội dung:</span>
                          <span className={`text-2xl font-bold ${getScoreColor(voiceAnalysis.contentMatch).split(' ')[0]}`}>
                            {voiceAnalysis.contentMatch}%
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Transcription */}
                    <div>
                      <h4 className="font-semibold text-gray-700 mb-2">Văn bản đã nhận dạng:</h4>
                      <div className="bg-gray-50 p-3 rounded-lg">
                        <p className="text-gray-800">{voiceAnalysis.transcription}</p>
                      </div>
                    </div>
                  </div>

                  {/* Feedback */}
                  <div className="mt-6 space-y-4">
                    <div>
                      <h4 className="font-semibold text-gray-700 mb-2">Phản hồi:</h4>
                      <div className="space-y-2">
                        {voiceAnalysis.feedback.map((item: string, index: number) => (
                          <div key={index} className="flex items-start gap-2">
                            <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                            <span className="text-gray-700">{item}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Corrections */}
                    {(voiceAnalysis.corrections.pronunciation.length > 0 || 
                      voiceAnalysis.corrections.grammar.length > 0 || 
                      voiceAnalysis.corrections.vocabulary.length > 0) && (
                      <div>
                        <h4 className="font-semibold text-gray-700 mb-2">Cần cải thiện:</h4>
                        <div className="space-y-2">
                          {voiceAnalysis.corrections.pronunciation.length > 0 && (
                            <div>
                              <span className="text-sm font-medium text-purple-600">Phát âm:</span>
                              <div className="flex flex-wrap gap-1 mt-1">
                                {voiceAnalysis.corrections.pronunciation.map((word: string, i: number) => (
                                  <span key={i} className="px-2 py-1 bg-purple-100 text-purple-700 text-sm rounded">
                                    {word}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}
                          
                          {voiceAnalysis.corrections.grammar.length > 0 && (
                            <div>
                              <span className="text-sm font-medium text-red-600">Ngữ pháp:</span>
                              <div className="flex flex-wrap gap-1 mt-1">
                                {voiceAnalysis.corrections.grammar.map((error: string, i: number) => (
                                  <span key={i} className="px-2 py-1 bg-red-100 text-red-700 text-sm rounded">
                                    {error}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}
                          
                          {voiceAnalysis.corrections.vocabulary.length > 0 && (
                            <div>
                              <span className="text-sm font-medium text-blue-600">Từ vựng:</span>
                              <div className="flex flex-wrap gap-1 mt-1">
                                {voiceAnalysis.corrections.vocabulary.map((word: string, i: number) => (
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
                    <div>
                      <h4 className="font-semibold text-gray-700 mb-2">Gợi ý cải thiện:</h4>
                      <div className="space-y-2">
                        {voiceAnalysis.suggestions.map((suggestion: string, index: number) => (
                          <div key={index} className="flex items-start gap-2">
                            <Lightbulb className="w-4 h-4 text-yellow-500 mt-0.5 flex-shrink-0" />
                            <span className="text-gray-700">{suggestion}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Additional Content Info */}
              {session.mainTopics && session.keyPhrases && (
                <div className="bg-white rounded-2xl shadow-lg p-6">
                  <h3 className="text-xl font-bold text-gray-900 mb-4">Nội dung chính từ media</h3>
                  
                  <div className="grid md:grid-cols-2 gap-6">
                    <div>
                      <h4 className="font-semibold text-gray-700 mb-3">Chủ đề chính:</h4>
                      <div className="flex flex-wrap gap-2">
                        {session.mainTopics.map((topic, index) => (
                          <span
                            key={index}
                            className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm"
                          >
                            {topic}
                          </span>
                        ))}
                      </div>
                    </div>
                    
                    <div>
                      <h4 className="font-semibold text-gray-700 mb-3">Cụm từ quan trọng:</h4>
                      <div className="flex flex-wrap gap-2">
                        {session.keyPhrases.map((phrase, index) => (
                          <span
                            key={index}
                            className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm cursor-pointer hover:bg-blue-200 transition"
                            onClick={() => speakText(phrase)}
                          >
                            {phrase}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="text-center space-x-4">
                <button
                  onClick={() => setStep('shadowing')}
                  className="px-6 py-3 bg-purple-500 text-white rounded-xl hover:bg-purple-600 transition"
                >
                  <Headphones className="w-5 h-5 inline mr-2" />
                  Chuyển sang Shadowing
                </button>
                <button
                  onClick={resetSession}
                  className="px-6 py-3 bg-gray-500 text-white rounded-xl hover:bg-gray-600 transition"
                >
                  <RotateCcw className="w-5 h-5 inline mr-2" />
                  Hoàn thành
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}