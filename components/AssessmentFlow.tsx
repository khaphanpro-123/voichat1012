"use client";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft, Sparkles } from "lucide-react";
import { surveyQuestions, likertOptions } from "@/lib/assessmentData";

interface AssessmentFlowProps {
  onComplete: (answers: Record<number, number>) => void;
}

export default function AssessmentFlow({ onComplete }: AssessmentFlowProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [direction, setDirection] = useState(1); // 1 for forward, -1 for backward

  const currentQuestion = surveyQuestions[currentIndex];
  const progress = ((currentIndex + 1) / surveyQuestions.length) * 100;

  const handleAnswer = (value: number) => {
    const newAnswers = { ...answers, [currentQuestion.id]: value };
    setAnswers(newAnswers);

    // Auto-advance after short delay
    setTimeout(() => {
      if (currentIndex < surveyQuestions.length - 1) {
        setDirection(1);
        setCurrentIndex(currentIndex + 1);
      } else {
        // Assessment complete
        onComplete(newAnswers);
      }
    }, 300);
  };

  const handleBack = () => {
    if (currentIndex > 0) {
      setDirection(-1);
      setCurrentIndex(currentIndex - 1);
    }
  };

  const slideVariants = {
    enter: (direction: number) => ({
      x: direction > 0 ? 300 : -300,
      opacity: 0,
    }),
    center: {
      x: 0,
      opacity: 1,
    },
    exit: (direction: number) => ({
      x: direction > 0 ? -300 : 300,
      opacity: 0,
    }),
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-teal-50 via-emerald-50 to-green-50 flex items-center justify-center p-4">
      <div className="w-full max-w-2xl">
        {/* Progress Bar */}
        <div className="mb-8">
          <div className="flex justify-between text-sm text-gray-600 mb-2">
            <span className="font-medium">Question {currentIndex + 1} of {surveyQuestions.length}</span>
            <span className="font-semibold text-teal-600">{Math.round(progress)}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
            <motion.div
              className="bg-gradient-to-r from-teal-500 to-emerald-500 h-2 rounded-full"
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.5, ease: "easeOut" }}
            />
          </div>
        </div>

        {/* Main Card */}
        <motion.div
          className="bg-white rounded-3xl shadow-2xl p-8 md:p-12"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          {/* Back Button */}
          {currentIndex > 0 && (
            <button
              onClick={handleBack}
              className="flex items-center gap-2 text-gray-600 hover:text-teal-600 mb-6 transition"
            >
              <ChevronLeft className="w-5 h-5" />
              <span className="font-medium">Back</span>
            </button>
          )}

          {/* Category Badge */}
          <div className="flex items-center gap-2 mb-4">
            <Sparkles className="w-5 h-5 text-teal-500" />
            <span className="text-sm font-semibold text-teal-600 uppercase tracking-wide">
              {currentQuestion.category}
            </span>
          </div>

          {/* Question */}
          <AnimatePresence mode="wait" custom={direction}>
            <motion.div
              key={currentQuestion.id}
              custom={direction}
              variants={slideVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.3, ease: "easeInOut" }}
            >
              <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-8">
                {currentQuestion.text}
              </h2>

              {/* Answer Options */}
              <div className="space-y-3">
                {likertOptions.map((option) => (
                  <motion.button
                    key={option.value}
                    onClick={() => handleAnswer(option.value)}
                    className={`w-full p-5 rounded-2xl border-2 transition-all text-left ${
                      answers[currentQuestion.id] === option.value
                        ? "border-teal-500 bg-teal-50 shadow-lg"
                        : "border-gray-200 bg-white hover:border-teal-300 hover:bg-teal-50/50"
                    }`}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <div className="flex items-center gap-4">
                      <div className="text-3xl">{option.emoji}</div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-lg font-semibold text-gray-900">
                            {option.label}
                          </span>
                        </div>
                      </div>
                      <div
                        className={`w-8 h-8 rounded-full border-2 flex items-center justify-center ${
                          answers[currentQuestion.id] === option.value
                            ? "border-teal-500 bg-teal-500"
                            : "border-gray-300"
                        }`}
                      >
                        {answers[currentQuestion.id] === option.value && (
                          <motion.div
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            className="w-3 h-3 bg-white rounded-full"
                          />
                        )}
                      </div>
                    </div>
                  </motion.button>
                ))}
              </div>
            </motion.div>
          </AnimatePresence>
        </motion.div>

        {/* Helper Text */}
        <p className="text-center text-sm text-gray-500 mt-6">
          Select an option to continue automatically
        </p>
      </div>
    </div>
  );
}
