'use client';

import React, { useState, useRef } from 'react';
import { motion } from 'framer-motion';
import { Upload, Mic, Square, Loader, Zap, Cpu } from 'lucide-react';
import { useQwenVision } from '@/hooks/useQwenVision';
import { useWhisperWebGPU } from '@/hooks/useWhisperWebGPU';
import { useTextMatcher } from '@/hooks/useTextMatcher';
import { useVoiceRecorder } from '@/hooks/useVoiceRecorder';

export default function DebateModeWebGPU() {
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [visionResult, setVisionResult] = useState<any>(null);
  const [userResponse, setUserResponse] = useState('');
  const [score, setScore] = useState<any>(null);
  const [analyzing, setAnalyzing] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // WebGPU Hooks
  const qwen = useQwenVision();
  const whisper = useWhisperWebGPU();
  const matcher = useTextMatcher();

  // Voice Recorder
  const voiceRecorder = useVoiceRecorder({
    maxDuration: 60,
    onRecordingComplete: handleVoiceComplete,
    onError: (error) => console.error('Voice error:', error)
  });

  // Handle image upload and analysis
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImageFile(file);
    setAnalyzing(true);

    const reader = new FileReader();
    reader.onload = async (e) => {
      const base64 = e.target?.result as string;
      setImagePreview(base64);

      // Analyze with Qwen2-VL
      if (qwen.ready) {
        try {
          const result = await qwen.analyzeImage(base64);
          setVisionResult(result);
          console.log('Vision result:', result);
        } catch (error) {
          console.error('Vision analysis failed:', error);
        }
      }
      setAnalyzing(false);
    };
    reader.readAsDataURL(file);
  };

  // Handle voice recording complete
  async function handleVoiceComplete(audioBlob: Blob, audioBase64: string) {
    if (!whisper.ready || !visionResult) return;

    setAnalyzing(true);
    try {
      // Transcribe with Whisper
      const { text, confidence } = await whisper.transcribe(audioBlob);
      setUserResponse(text);
      console.log('Transcription:', text, 'Confidence:', confidence);

      // Score the response
      await scoreResponse(text);
    } catch (error) {
      console.error('Transcription failed:', error);
    } finally {
      setAnalyzing(false);
    }
  }

  // Score user response against vision result
  const scoreResponse = async (text: string) => {
    if (!visionResult || !matcher.ready) return;

    try {
      const referenceText = visionResult.description;
      const result = await matcher.compareTexts(referenceText, text);

      setScore(result);
      console.log('Score result:', result);
    } catch (error) {
      console.error('Scoring failed:', error);
    }
  };

  // Loading state - show model download progress
  const isLoading = qwen.loading || whisper.loading || matcher.loading;
  const allReady = qwen.ready && whisper.ready && matcher.ready;

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-purple-50 to-blue-50">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center"
        >
          <Cpu className="w-16 h-16 text-purple-600 mx-auto mb-4 animate-pulse" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            Loading AI Models...
          </h2>
          <p className="text-gray-600 mb-4">
            Downloading Qwen2-VL (~2GB) + Text Matcher (~100MB)
          </p>
          
          {qwen.loading && (
            <div className="w-96 mx-auto">
              <div className="bg-gray-200 rounded-full h-4 mb-2">
                <div 
                  className="bg-purple-600 h-4 rounded-full transition-all duration-300"
                  style={{ width: `${qwen.progress}%` }}
                />
              </div>
              <p className="text-sm text-gray-600">
                {qwen.progress.toFixed(1)}% - Vision Model
              </p>
            </div>
          )}

          <p className="text-xs text-gray-500 mt-4">
            First load may take 2-5 minutes. Models are cached for future use.
          </p>
        </motion.div>
      </div>
    );
  }

  // Error state
  if (qwen.error || whisper.error || matcher.error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 max-w-md">
          <h2 className="text-xl font-bold text-red-800 mb-2">
            ❌ WebGPU Not Available
          </h2>
          <p className="text-red-700 mb-4">
            {qwen.error || whisper.error || matcher.error}
          </p>
          <div className="text-sm text-gray-700">
            <p className="font-semibold mb-2">Requirements:</p>
            <ul className="list-disc list-inside space-y-1">
              <li>Chrome 123+ or Edge 123+</li>
              <li>WebGPU enabled (chrome://flags)</li>
              <li>GPU with WebGPU support</li>
            </ul>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50 p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-3 mb-4">
            <Zap className="w-8 h-8 text-purple-600" />
            <h1 className="text-4xl font-bold text-gray-900">
              WebGPU Debate Mode
            </h1>
          </div>
          <p className="text-gray-600 text-lg">
            🚀 100% Offline AI - No API Required
          </p>
          <div className="flex items-center justify-center gap-4 mt-2 text-sm text-gray-500">
            <span className="flex items-center gap-1">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              Qwen2-VL 2B
            </span>
            <span className="flex items-center gap-1">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              Whisper WebGPU
            </span>
            <span className="flex items-center gap-1">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              SBERT Matcher
            </span>
          </div>
        </div>

        {/* Image Upload Section */}
        <div className="bg-white rounded-3xl shadow-xl p-8 mb-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">
            1. Upload Image
          </h2>
          
          <div 
            className="border-2 border-dashed border-purple-300 rounded-2xl p-12 hover:border-purple-500 transition cursor-pointer text-center"
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
                {analyzing && (
                  <div className="flex items-center justify-center gap-2 text-purple-600">
                    <Loader className="w-5 h-5 animate-spin" />
                    <span>Analyzing with Qwen2-VL...</span>
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-4">
                <Upload className="w-16 h-16 text-purple-400 mx-auto" />
                <div>
                  <p className="text-lg font-semibold text-gray-700 mb-2">
                    Click to upload image
                  </p>
                  <p className="text-gray-500">
                    AI will analyze the image using Qwen2-VL
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Vision Result */}
        {visionResult && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-blue-50 border border-blue-200 rounded-2xl p-6 mb-6"
          >
            <h3 className="font-bold text-blue-900 mb-3">
              🤖 AI Vision Analysis:
            </h3>
            <p className="text-gray-800 mb-3">{visionResult.description}</p>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <strong className="text-blue-800">Objects:</strong>
                <div className="flex flex-wrap gap-1 mt-1">
                  {visionResult.objects.map((obj: string, i: number) => (
                    <span key={i} className="px-2 py-1 bg-blue-100 text-blue-700 rounded">
                      {obj}
                    </span>
                  ))}
                </div>
              </div>
              <div>
                <strong className="text-blue-800">Scene:</strong>
                <p className="text-gray-700 mt-1">{visionResult.scene}</p>
              </div>
            </div>
          </motion.div>
        )}

        {/* Voice Recording Section */}
        {visionResult && (
          <div className="bg-white rounded-3xl shadow-xl p-8 mb-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              2. Describe the Image
            </h2>
            
            <div className="text-center">
              <button
                onClick={voiceRecorder.toggleRecording}
                disabled={analyzing}
                className={`px-8 py-4 rounded-xl font-semibold text-white transition ${
                  voiceRecorder.isRecording
                    ? 'bg-red-500 hover:bg-red-600'
                    : 'bg-green-500 hover:bg-green-600'
                } disabled:opacity-50`}
              >
                {voiceRecorder.isRecording ? (
                  <>
                    <Square className="w-5 h-5 inline mr-2" />
                    Stop Recording ({voiceRecorder.formattedTime})
                  </>
                ) : (
                  <>
                    <Mic className="w-5 h-5 inline mr-2" />
                    Start Recording
                  </>
                )}
              </button>

              {voiceRecorder.audioUrl && (
                <div className="mt-4">
                  <audio src={voiceRecorder.audioUrl} controls className="mx-auto" />
                </div>
              )}
            </div>
          </div>
        )}

        {/* User Response */}
        {userResponse && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-green-50 border border-green-200 rounded-2xl p-6 mb-6"
          >
            <h3 className="font-bold text-green-900 mb-2">
              📝 Your Response:
            </h3>
            <p className="text-gray-800">{userResponse}</p>
          </motion.div>
        )}

        {/* Score Display */}
        {score && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-gradient-to-r from-yellow-50 to-orange-50 border border-yellow-200 rounded-2xl p-8"
          >
            <h3 className="text-2xl font-bold text-gray-900 mb-6 text-center">
              🎯 Your Score
            </h3>
            
            <div className="grid grid-cols-3 gap-6 mb-6">
              <div className="text-center">
                <div className="text-4xl font-bold text-purple-600 mb-2">
                  {score.totalScore}
                </div>
                <div className="text-sm text-gray-600">Total Score</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-blue-600 mb-2">
                  {score.contentScore}/60
                </div>
                <div className="text-sm text-gray-600">Content</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-green-600 mb-2">
                  {score.languageScore}/40
                </div>
                <div className="text-sm text-gray-600">Language</div>
              </div>
            </div>

            <div className="bg-white rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="font-semibold">Match Level:</span>
                <span className={`px-3 py-1 rounded-full text-sm font-semibold ${
                  score.match === 'MATCH' ? 'bg-green-100 text-green-800' :
                  score.match === 'PARTIAL' ? 'bg-yellow-100 text-yellow-800' :
                  'bg-red-100 text-red-800'
                }`}>
                  {score.match}
                </span>
              </div>
              <div className="text-sm text-gray-600">
                Similarity: {score.similarity}%
              </div>
            </div>
          </motion.div>
        )}

        {/* Footer Info */}
        <div className="mt-8 text-center text-sm text-gray-500">
          <p className="flex items-center justify-center gap-2">
            <Cpu className="w-4 h-4" />
            Running 100% offline with WebGPU acceleration
          </p>
          <p className="mt-1">
            No data sent to servers • Complete privacy • No API costs
          </p>
        </div>
      </div>
    </div>
  );
}
