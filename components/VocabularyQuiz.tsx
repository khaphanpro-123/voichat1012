"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Volume2, Trophy, CheckCircle, XCircle, ArrowRight } from "lucide-react";

interface QuizQuestion {
  word: { word: string; meaning: string; example: string };
  type: "multiple_choice" | "fill_blank" | "word_order";
  question: string;
  options?: string[];
  correctAnswer: string;
  blankedSentence?: string;
  words?: string[];
}

interface VocabularyQuizProps {
  questions: QuizQuestion[];
  onExit: () => void;
  onComplete: (score: number) => void;
  speakWord: (word: string) => void;
}

export default function VocabularyQuiz({ questions, onExit, onComplete, speakWord }: VocabularyQuizProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [userAnswer, setUserAnswer] = useState("");
  const [selectedWords, setSelectedWords] = useState<string[]>([]);
  const [showResult, setShowResult] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);

  const currentQ = questions[currentIndex];

  const checkAnswer = () => {
    if (showResult) return;
    
    let answer = "";
    let correct = false;
    
    if (currentQ.type === "multiple_choice") {
      answer = userAnswer;
      correct = answer === currentQ.correctAnswer;
    } else if (currentQ.type === "fill_blank") {
      answer = userAnswer.trim();
      correct = answer.toLowerCase() === currentQ.correctAnswer.toLowerCase();
    } else if (currentQ.type === "word_order") {
      answer = selectedWords.join(" ");
      const userSentence = answer.toLowerCase().replace(/[.,!?]/g, "").trim();
      const correctSentence = currentQ.correctAnswer.toLowerCase().replace(/[.,!?]/g, "").trim();
      correct = userSentence === correctSentence;
    }
    
    setIsCorrect(correct);
    setShowResult(true);
    if (correct) setScore(prev => prev + 1);
    
    setTimeout(() => {
      if (currentIndex < questions.length - 1) {
        setCurrentIndex(prev => prev + 1);
        setUserAnswer("");
        setSelectedWords([]);
        setShowResult(false);
      } else {
        onComplete(correct ? score + 1 : score);
      }
    }, 1500);
  };

  const handleWordClick = (word: string, index: number) => {
    if (showResult) return;
    setSelectedWords(prev => [...prev, word]);
  };

  const handleRemoveWord = (index: number) => {
    if (showResult) return;
    setSelectedWords(prev => prev.filter((_, i) => i !== index));
  };

  const progress = ((currentIndex + 1) / questions.length) * 100;

  return (
    <div className="max-w-3xl mx-auto p-6">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="bg-white rounded-3xl shadow-xl p-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <span className="font-bold text-gray-700">Câu {currentIndex + 1}/{questions.length}</span>
          <span className="font-bold text-teal-600 flex items-center gap-1">
            <Trophy className="w-5 h-5" />{score}
          </span>
        </div>
        
        {/* Progress */}
        <div className="w-full bg-gray-200 rounded-full h-2 mb-8">
          <div className="bg-teal-500 h-2 rounded-full transition-all" style={{ width: `${progress}%` }} />
        </div>

        {/* Question */}
        <div className="mb-8">
          <p className="text-gray-600 mb-3">{currentQ.question}</p>
          
          {currentQ.type === "multiple_choice" && (
            <>
              <div className="text-center mb-6">
                <h2 className="text-4xl font-bold text-gray-900 mb-2">{currentQ.word.word}</h2>
                <button onClick={() => speakWord(currentQ.word.word)} className="p-2 bg-teal-100 text-teal-600 rounded-full">
                  <Volume2 className="w-5 h-5" />
                </button>
              </div>
              
              <div className="grid gap-3">
                {currentQ.options?.map((option, idx) => {
                  const selected = userAnswer === option;
                  const correct = option === currentQ.correctAnswer;
                  return (
                    <button
                      key={idx}
                      onClick={() => { setUserAnswer(option); if (!showResult) checkAnswer(); }}
                      disabled={showResult}
                      className={`w-full p-4 rounded-xl text-left font-medium transition ${
                        showResult
                          ? correct
                            ? "bg-green-100 border-2 border-green-500"
                            : selected
                            ? "bg-red-100 border-2 border-red-500"
                            : "bg-gray-100"
                          : "bg-gray-100 hover:bg-teal-50 border-2 border-transparent"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span>{option}</span>
                        {showResult && correct && <CheckCircle className="w-5 h-5 text-green-500" />}
                        {showResult && selected && !correct && <XCircle className="w-5 h-5 text-red-500" />}
                      </div>
                    </button>
                  );
                })}
              </div>
            </>
          )}

          {currentQ.type === "fill_blank" && (
            <>
              <div className="bg-gray-50 rounded-xl p-4 mb-4">
                <p className="text-lg text-gray-800">{currentQ.blankedSentence}</p>
              </div>
              
              <div className="flex gap-2">
                <input
                  type="text"
                  value={userAnswer}
                  onChange={(e) => setUserAnswer(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && checkAnswer()}
                  placeholder="Nhập từ vào đây..."
                  disabled={showResult}
                  className="flex-1 px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-teal-500 focus:outline-none"
                  autoFocus
                />
                <button
                  onClick={checkAnswer}
                  disabled={!userAnswer.trim() || showResult}
                  className="px-6 py-3 bg-teal-500 text-white rounded-xl hover:bg-teal-600 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ArrowRight className="w-5 h-5" />
                </button>
              </div>
              
              {showResult && (
                <div className={`mt-4 p-4 rounded-xl ${isCorrect ? "bg-green-50 border border-green-200" : "bg-red-50 border border-red-200"}`}>
                  <p className={`font-medium ${isCorrect ? "text-green-700" : "text-red-700"}`}>
                    {isCorrect ? "✓ Chính xác!" : `✗ Đáp án đúng: ${currentQ.correctAnswer}`}
                  </p>
                </div>
              )}
            </>
          )}

          {currentQ.type === "word_order" && (
            <>
              {/* Selected words area */}
              <div className="bg-gray-50 rounded-xl p-4 mb-4 min-h-[60px]">
                {selectedWords.length === 0 ? (
                  <p className="text-gray-400 text-center">Chọn các từ bên dưới để tạo câu</p>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {selectedWords.map((word, idx) => (
                      <button
                        key={idx}
                        onClick={() => handleRemoveWord(idx)}
                        className="px-3 py-2 bg-teal-500 text-white rounded-lg hover:bg-teal-600"
                      >
                        {word}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              
              {/* Available words */}
              <div className="flex flex-wrap gap-2 mb-4">
                {currentQ.words?.map((word, idx) => {
                  const used = selectedWords.includes(word);
                  return (
                    <button
                      key={idx}
                      onClick={() => !used && handleWordClick(word, idx)}
                      disabled={used || showResult}
                      className={`px-3 py-2 rounded-lg font-medium transition ${
                        used ? "bg-gray-200 text-gray-400 cursor-not-allowed" : "bg-white border-2 border-gray-200 hover:border-teal-500"
                      }`}
                    >
                      {word}
                    </button>
                  );
                })}
              </div>
              
              <button
                onClick={checkAnswer}
                disabled={selectedWords.length === 0 || showResult}
                className="w-full py-3 bg-teal-500 text-white rounded-xl hover:bg-teal-600 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
              >
                Kiểm tra
              </button>
              
              {showResult && (
                <div className={`mt-4 p-4 rounded-xl ${isCorrect ? "bg-green-50 border border-green-200" : "bg-red-50 border border-red-200"}`}>
                  <p className={`font-medium ${isCorrect ? "text-green-700" : "text-red-700"}`}>
                    {isCorrect ? "✓ Chính xác!" : `✗ Đáp án đúng: ${currentQ.correctAnswer}`}
                  </p>
                </div>
              )}
            </>
          )}
        </div>

        <button onClick={onExit} className="w-full py-3 text-gray-500 hover:text-gray-700">
          Thoát Quiz
        </button>
      </motion.div>
    </div>
  );
}
