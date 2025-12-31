"use client";
import { useState } from "react";
import { motion } from "framer-motion";
import { Mic, Volume2, CheckCircle, XCircle, Loader } from "lucide-react";
import { useSpeechRecognition } from "@/hooks/useSpeechRecognition";
import { useTextToSpeech } from "@/hooks/useTextToSpeech";

interface PronunciationError {
  type: string;
  target: string;
  user: string;
}

interface PronunciationResult {
  score: number;
  errors: PronunciationError[];
  suggestions: string[];
}

const practiceWords = [
  "Xin chào",
  "Cảm ơn",
  "Tôi đi chợ",
  "Học tiếng Việt",
  "Lập trình viên",
  "Xử lý ngôn ngữ tự nhiên",
];

export default function PronunciationPractice() {
  const [currentWord, setCurrentWord] = useState(practiceWords[0]);
  const [result, setResult] = useState<PronunciationResult | null>(null);
  const [isScoring, setIsScoring] = useState(false);

  const { isListening, transcript, toggleListening, resetTranscript } =
    useSpeechRecognition();
  const { speak, isSpeaking } = useTextToSpeech();

  const handlePlayTarget = () => {
    speak(currentWord);
  };

  const handleStartRecording = () => {
    resetTranscript();
    setResult(null);
    toggleListening();
  };

  const handleScore = async () => {
    if (!transcript) return;

    setIsScoring(true);
    try {
      const res = await fetch("/api/score-pronunciation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text_target: currentWord,
          text_user: transcript,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setResult({
          score: data.score,
          errors: data.errors || [],
          suggestions: data.suggestions || [],
        });
      }
    } catch (error) {
      console.error("Scoring error:", error);
    } finally {
      setIsScoring(false);
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 90) return "text-green-600";
    if (score >= 70) return "text-yellow-600";
    return "text-red-600";
  };

  const getScoreBg = (score: number) => {
    if (score >= 90) return "bg-green-100 border-green-300";
    if (score >= 70) return "bg-yellow-100 border-yellow-300";
    return "bg-red-100 border-red-300";
  };

  return (
    <div className="max-w-2xl mx-auto p-6">
      <h1 className="text-3xl font-bold text-gray-900 mb-8">
        Pronunciation Practice
      </h1>

      {/* Word Selection */}
      <div className="bg-white rounded-3xl shadow-lg p-6 mb-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          Select a word to practice:
        </h2>
        <div className="flex flex-wrap gap-3">
          {practiceWords.map((word) => (
            <button
              key={word}
              onClick={() => {
                setCurrentWord(word);
                setResult(null);
                resetTranscript();
              }}
              className={`px-4 py-2 rounded-xl font-medium transition ${
                currentWord === word
                  ? "bg-teal-500 text-white shadow-lg"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              {word}
            </button>
          ))}
        </div>
      </div>

      {/* Practice Area */}
      <div className="bg-white rounded-3xl shadow-lg p-8 mb-6">
        <div className="text-center mb-8">
          <p className="text-sm text-gray-600 mb-2">Target pronunciation:</p>
          <h2 className="text-4xl font-bold text-gray-900 mb-4">{currentWord}</h2>
          <button
            onClick={handlePlayTarget}
            disabled={isSpeaking}
            className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition disabled:opacity-50"
          >
            <Volume2 className="w-5 h-5" />
            {isSpeaking ? "Playing..." : "Listen"}
          </button>
        </div>

        {/* Recording */}
        <div className="text-center mb-6">
          <button
            onClick={handleStartRecording}
            className={`w-20 h-20 rounded-full flex items-center justify-center transition ${
              isListening
                ? "bg-red-500 animate-pulse"
                : "bg-teal-500 hover:bg-teal-600"
            }`}
          >
            <Mic className="w-10 h-10 text-white" />
          </button>
          <p className="text-sm text-gray-600 mt-3">
            {isListening ? "Recording... Click to stop" : "Click to record"}
          </p>
        </div>

        {/* Transcript */}
        {transcript && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-gray-50 rounded-xl p-4 mb-4"
          >
            <p className="text-sm text-gray-600 mb-1">You said:</p>
            <p className="text-xl font-semibold text-gray-900">{transcript}</p>
          </motion.div>
        )}

        {/* Score Button */}
        {transcript && !result && (
          <button
            onClick={handleScore}
            disabled={isScoring}
            className="w-full px-6 py-4 bg-gradient-to-r from-teal-500 to-emerald-600 text-white font-bold rounded-xl hover:shadow-xl transition disabled:opacity-50"
          >
            {isScoring ? (
              <Loader className="w-5 h-5 animate-spin mx-auto" />
            ) : (
              "Score My Pronunciation"
            )}
          </button>
        )}
      </div>

      {/* Results */}
      {result && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-3xl shadow-lg p-8"
        >
          <h3 className="text-2xl font-bold text-gray-900 mb-6">Results</h3>

          {/* Score */}
          <div
            className={`rounded-2xl p-6 mb-6 border-2 ${getScoreBg(result.score)}`}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Your Score</p>
                <p className={`text-5xl font-bold ${getScoreColor(result.score)}`}>
                  {result.score}
                </p>
              </div>
              {result.score >= 90 ? (
                <CheckCircle className="w-16 h-16 text-green-600" />
              ) : (
                <XCircle className="w-16 h-16 text-red-600" />
              )}
            </div>
          </div>

          {/* Errors */}
          {result.errors.length > 0 && (
            <div className="mb-6">
              <h4 className="font-bold text-gray-900 mb-3">Errors Found:</h4>
              <div className="space-y-2">
                {result.errors.map((error, index) => (
                  <div
                    key={index}
                    className="bg-red-50 border border-red-200 rounded-xl p-4"
                  >
                    <p className="text-sm font-semibold text-red-700 mb-1">
                      {error.type.replace("_", " ").toUpperCase()}
                    </p>
                    <p className="text-sm text-gray-700">
                      Target: <span className="font-bold">{error.target}</span> →
                      You said: <span className="font-bold">{error.user}</span>
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Suggestions */}
          {result.suggestions.length > 0 && (
            <div>
              <h4 className="font-bold text-gray-900 mb-3">Suggestions:</h4>
              <ul className="space-y-2">
                {result.suggestions.map((suggestion, index) => (
                  <li
                    key={index}
                    className="flex items-start gap-3 bg-blue-50 border border-blue-200 rounded-xl p-4"
                  >
                    <span className="text-blue-600 font-bold">{index + 1}.</span>
                    <span className="text-gray-700">{suggestion}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </motion.div>
      )}
    </div>
  );
}
