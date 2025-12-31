"use client";
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Volume2,
  VolumeX,
  RotateCcw,
  RefreshCw,
  Play,
  Languages,
  Eye,
  EyeOff,
} from "lucide-react";
import ImageWithFallback from "./ImageWithFallback";

interface FlashCardData {
  _id: string;
  word: string;
  type: string;
  meaning: string;
  example: string;
  exampleTranslation: string;
  level: string;
  category: string;
  imageUrl?: string;
  imagePrompt?: string;
}

interface EnhancedFlashCardProps {
  vocabulary: FlashCardData;
  onNext?: () => void;
  onPrevious?: () => void;
  onRate?: (rating: number) => void;
  showControls?: boolean;
}

export default function EnhancedFlashCard({
  vocabulary,
  onNext,
  onPrevious,
  onRate,
  showControls = true,
}: EnhancedFlashCardProps) {
  const [isFlipped, setIsFlipped] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [showTranslation, setShowTranslation] = useState(false);
  const [highlightedExample, setHighlightedExample] = useState("");

  useEffect(() => {
    // Highlight the vocabulary word in the example sentence
    if (vocabulary.example && vocabulary.word) {
      const regex = new RegExp(`(${vocabulary.word})`, 'gi');
      const highlighted = vocabulary.example.replace(
        regex,
        '<mark class="bg-yellow-200 px-1 rounded font-semibold">$1</mark>'
      );
      setHighlightedExample(highlighted);
    }
  }, [vocabulary.word, vocabulary.example]);

  const speakText = (text: string, lang: string = 'vi-VN') => {
    if (isPlaying) {
      window.speechSynthesis.cancel();
      setIsPlaying(false);
      return;
    }

    if ('speechSynthesis' in window) {
      setIsPlaying(true);
      
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = lang;
      utterance.rate = lang === 'vi-VN' ? 0.8 : 0.9;
      utterance.pitch = 1.0;
      
      utterance.onend = () => {
        setIsPlaying(false);
      };
      
      utterance.onerror = () => {
        setIsPlaying(false);
      };

      window.speechSynthesis.speak(utterance);
    }
  };

  const regenerateImage = async () => {
    try {
      const response = await fetch('/api/generate-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          word: vocabulary.word,
          meaning: vocabulary.meaning,
          type: vocabulary.type,
          example: vocabulary.example
        })
      });

      const data = await response.json();
      if (data.success) {
        vocabulary.imageUrl = data.imageUrl;
      }
    } catch (error) {
      console.error('Error regenerating image:', error);
    }
  };

  const getLevelColor = (level: string) => {
    switch (level.toLowerCase()) {
      case 'beginner':
        return 'bg-green-100 text-green-700 border-green-200';
      case 'intermediate':
        return 'bg-yellow-100 text-yellow-700 border-yellow-200';
      case 'advanced':
        return 'bg-red-100 text-red-700 border-red-200';
      default:
        return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      {/* Main Card */}
      <motion.div
        className="relative w-full h-[600px] perspective-1000"
        style={{ perspective: '1000px' }}
      >
        <motion.div
          className="relative w-full h-full transition-transform duration-700 preserve-3d cursor-pointer"
          style={{
            transformStyle: 'preserve-3d',
            transform: isFlipped ? 'rotateY(180deg)' : 'rotateY(0deg)'
          }}
          onClick={() => setIsFlipped(!isFlipped)}
        >
          {/* Front Side */}
          <div className="absolute inset-0 w-full h-full backface-hidden">
            <div className="bg-white rounded-3xl shadow-2xl border-4 border-blue-200 h-full flex flex-col overflow-hidden">
              {/* Header */}
              <div className="bg-gradient-to-r from-blue-500 to-purple-600 text-white p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`px-3 py-1 rounded-full text-xs font-semibold border ${getLevelColor(vocabulary.level)}`}>
                      {vocabulary.level}
                    </div>
                    <span className="px-3 py-1 bg-white bg-opacity-20 rounded-full text-xs font-semibold">
                      {vocabulary.type}
                    </span>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      speakText(vocabulary.word);
                    }}
                    className="p-2 bg-white bg-opacity-20 rounded-full hover:bg-opacity-30 transition"
                  >
                    {isPlaying ? (
                      <VolumeX className="w-5 h-5" />
                    ) : (
                      <Volume2 className="w-5 h-5" />
                    )}
                  </button>
                </div>
              </div>

              {/* Image Section */}
              <div className="relative flex-1 bg-gradient-to-br from-blue-50 to-purple-50">
                <ImageWithFallback
                  src={vocabulary.imageUrl}
                  alt={vocabulary.word}
                  word={vocabulary.word}
                  meaning={vocabulary.meaning}
                  className="w-full h-full"
                  onImageRegenerate={regenerateImage}
                />

                {/* Word Overlay */}
                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black via-black/50 to-transparent p-6">
                  <h1 className="text-4xl font-bold text-white mb-2 text-center">
                    {vocabulary.word}
                  </h1>
                  <p className="text-white/80 text-center text-lg">
                    Nhấn để xem nghĩa
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Back Side */}
          <div 
            className="absolute inset-0 w-full h-full backface-hidden"
            style={{ transform: 'rotateY(180deg)' }}
          >
            <div className="bg-white rounded-3xl shadow-2xl border-4 border-green-200 h-full flex flex-col">
              {/* Header */}
              <div className="bg-gradient-to-r from-green-500 to-teal-600 text-white p-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-bold">{vocabulary.word}</h2>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowTranslation(!showTranslation);
                      }}
                      className="p-2 bg-white bg-opacity-20 rounded-full hover:bg-opacity-30 transition"
                      title="Toggle translation"
                    >
                      {showTranslation ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        speakText(vocabulary.word);
                      }}
                      className="p-2 bg-white bg-opacity-20 rounded-full hover:bg-opacity-30 transition"
                    >
                      <Volume2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>

              {/* Content */}
              <div className="flex-1 p-6 space-y-6">
                {/* Meaning */}
                <div className="text-center">
                  <h3 className="text-2xl font-bold text-gray-900 mb-2">
                    {vocabulary.meaning}
                  </h3>
                  <div className="flex items-center justify-center gap-2">
                    <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm font-medium">
                      {vocabulary.type}
                    </span>
                    <span className="px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-sm font-medium">
                      {vocabulary.category}
                    </span>
                  </div>
                </div>

                {/* Example Section */}
                <div className="bg-gray-50 rounded-2xl p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="font-bold text-gray-700 flex items-center gap-2">
                      <Languages className="w-5 h-5" />
                      Ví dụ trong câu
                    </h4>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        speakText(vocabulary.example);
                      }}
                      className="p-2 bg-blue-100 text-blue-600 rounded-full hover:bg-blue-200 transition"
                    >
                      <Play className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Vietnamese Example with Highlighted Word */}
                  <div className="mb-4">
                    <p className="text-lg text-gray-800 leading-relaxed">
                      <span 
                        dangerouslySetInnerHTML={{ __html: highlightedExample }}
                      />
                    </p>
                    <p className="text-sm text-gray-500 mt-1">
                      (Từ được highlight trong câu)
                    </p>
                  </div>

                  {/* Translation Toggle */}
                  <AnimatePresence>
                    {showTranslation && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="border-t border-gray-200 pt-4"
                      >
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-medium text-gray-600">
                            🇺🇸 English Translation:
                          </span>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              speakText(vocabulary.exampleTranslation, 'en-US');
                            }}
                            className="p-1 bg-gray-200 text-gray-600 rounded-full hover:bg-gray-300 transition"
                          >
                            <Play className="w-3 h-3" />
                          </button>
                        </div>
                        <p className="text-gray-700 italic">
                          "{vocabulary.exampleTranslation}"
                        </p>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* Flip Instruction */}
                <div className="text-center">
                  <p className="text-gray-500 text-sm">
                    Nhấn để quay lại mặt trước
                  </p>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </motion.div>

      {/* Controls */}
      {showControls && (
        <div className="mt-6 flex items-center justify-center gap-4">
          {onPrevious && (
            <button
              onClick={onPrevious}
              className="px-6 py-3 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 transition font-medium"
            >
              ← Trước
            </button>
          )}
          
          <button
            onClick={() => setIsFlipped(!isFlipped)}
            className="px-6 py-3 bg-blue-500 text-white rounded-xl hover:bg-blue-600 transition font-medium flex items-center gap-2"
          >
            <RotateCcw className="w-4 h-4" />
            {isFlipped ? 'Xem từ' : 'Xem nghĩa'}
          </button>

          {onNext && (
            <button
              onClick={onNext}
              className="px-6 py-3 bg-blue-500 text-white rounded-xl hover:bg-blue-600 transition font-medium"
            >
              Tiếp →
            </button>
          )}
        </div>
      )}

      {/* Rating Controls */}
      {onRate && isFlipped && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-6 bg-white rounded-2xl shadow-lg p-6"
        >
          <h3 className="text-lg font-bold text-gray-900 mb-4 text-center">
            Đánh giá độ khó của từ này:
          </h3>
          <div className="flex justify-center gap-3">
            <button
              onClick={() => onRate(1)}
              className="px-6 py-3 bg-red-500 text-white rounded-xl hover:bg-red-600 transition font-medium"
            >
              😰 Rất khó
            </button>
            <button
              onClick={() => onRate(3)}
              className="px-6 py-3 bg-yellow-500 text-white rounded-xl hover:bg-yellow-600 transition font-medium"
            >
              🤔 Bình thường
            </button>
            <button
              onClick={() => onRate(5)}
              className="px-6 py-3 bg-green-500 text-white rounded-xl hover:bg-green-600 transition font-medium"
            >
              😊 Dễ
            </button>
          </div>
        </motion.div>
      )}
    </div>
  );
}