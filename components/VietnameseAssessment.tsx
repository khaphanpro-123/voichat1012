"use client";
import { useState } from "react";
import Link from "next/link";
import { calculatePlacement, type Answer, type PlacementResult } from "@/lib/calculatePlacement";
import { ChevronLeft, ChevronRight, CheckCircle, BookOpen, Target, Lightbulb } from "lucide-react";

const surveyQuestions = [
  // --- MOTIVATION ---
  { id: 1, category: "motivation", text: "I want to learn Vietnamese for travel purposes." },
  { id: 2, category: "motivation", text: "Learning Vietnamese will help my career or business." },
  { id: 3, category: "motivation", text: "I have Vietnamese family members or friends." },
  { id: 4, category: "motivation", text: "I'm interested in Vietnamese culture and history." },
  { id: 5, category: "motivation", text: "I enjoy learning new languages as a hobby." },
  // --- EXPERIENCE (Crucial for Leveling) ---
  { id: 6, category: "experience", text: "I have experience learning other Asian languages (tonal languages)." },
  { id: 7, category: "experience", text: "I can recognize and distinguish Vietnamese tones when listening." },
  { id: 8, category: "experience", text: "I already know basic Vietnamese greetings and numbers." },
  { id: 9, category: "experience", text: "I have taken Vietnamese classes before." },
  { id: 10, category: "experience", text: "I am familiar with the Vietnamese alphabet and pronunciation rules." },
  // --- STYLE (For Method Recommendation) ---
  { id: 11, category: "style", text: "I learn best through visual content (images, videos)." },
  { id: 12, category: "style", text: "I prefer learning through audio and repeating out loud." },
  { id: 13, category: "style", text: "I like to read texts and write down notes." },
  { id: 14, category: "style", text: "I learn better with interactive quizzes and gamified apps." },
  { id: 15, category: "style", text: "I prefer structured textbook lessons over free exploration." },
  // --- GOALS ---
  { id: 16, category: "goals", text: "My goal is conversational fluency for daily life." },
  { id: 17, category: "goals", text: "Reading Vietnamese literature/news is important to me." },
  { id: 18, category: "goals", text: "I want to consume Vietnamese media (movies, music) without subtitles." },
  { id: 19, category: "goals", text: "I need to learn how to write emails or texts in Vietnamese." },
  { id: 20, category: "goals", text: "I plan to take a Vietnamese proficiency test (VSL/IVPT)." },
  // --- TIME ---
  { id: 21, category: "time", text: "I can dedicate at least 30 minutes daily to learning." },
  { id: 22, category: "time", text: "I prefer short, micro-learning sessions (5-10 mins)." },
  { id: 23, category: "time", text: "I have time for intensive study sessions on weekends." },
  { id: 24, category: "time", text: "I can listen to podcasts during my commute." },
  { id: 25, category: "time", text: "I am willing to commit for at least 6 months." },
  // --- CHALLENGES ---
  { id: 26, category: "challenges", text: "Pronunciation and tones are my biggest fear." },
  { id: 27, category: "challenges", text: "I struggle with memorizing vocabulary." },
  { id: 28, category: "challenges", text: "Grammar structures confuse me." },
  { id: 29, category: "challenges", text: "I find it hard to stay motivated alone." },
  { id: 30, category: "challenges", text: "I don't have anyone to practice speaking with." },
];

const QUESTIONS_PER_PAGE = 5;
const TOTAL_PAGES = Math.ceil(surveyQuestions.length / QUESTIONS_PER_PAGE);

const LIKERT_OPTIONS = [
  { value: 1, label: "Strongly Disagree" },
  { value: 2, label: "Disagree" },
  { value: 3, label: "Neutral" },
  { value: 4, label: "Agree" },
  { value: 5, label: "Strongly Agree" },
];

const CATEGORY_TITLES = {
  motivation: "Motivation",
  experience: "Experience & Background",
  style: "Learning Style",
  goals: "Learning Goals",
  time: "Time Commitment",
  challenges: "Challenges",
};

export default function VietnameseAssessment() {
  const [currentPage, setCurrentPage] = useState(0);
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [result, setResult] = useState<PlacementResult | null>(null);
  const [showResult, setShowResult] = useState(false);

  const startIndex = currentPage * QUESTIONS_PER_PAGE;
  const endIndex = startIndex + QUESTIONS_PER_PAGE;
  const currentQuestions = surveyQuestions.slice(startIndex, endIndex);
  const currentCategory = currentQuestions[0]?.category || "";

  const handleAnswer = (questionId: number, value: number) => {
    setAnswers({ ...answers, [questionId]: value });
  };

  const isPageComplete = () => {
    return currentQuestions.every((q) => answers[q.id] !== undefined);
  };

  const handleNext = () => {
    if (currentPage < TOTAL_PAGES - 1) {
      setCurrentPage(currentPage + 1);
    }
  };

  const handlePrevious = () => {
    if (currentPage > 0) {
      setCurrentPage(currentPage - 1);
    }
  };

  const handleSubmit = () => {
    const answerArray: Answer[] = Object.entries(answers).map(([id, value]) => ({
      questionId: parseInt(id),
      value,
    }));

    const placementResult = calculatePlacement(answerArray);
    setResult(placementResult);
    setShowResult(true);
  };

  const handleRestart = () => {
    setAnswers({});
    setCurrentPage(0);
    setShowResult(false);
    setResult(null);
  };

  const progress = ((Object.keys(answers).length / surveyQuestions.length) * 100).toFixed(0);

  if (showResult && result) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 py-12 px-4">
        <div className="max-w-4xl mx-auto">
          <div className="bg-white rounded-3xl shadow-2xl p-8 md:p-12">
            {/* Header */}
            <div className="text-center mb-8">
              <div className="inline-flex items-center justify-center w-20 h-20 bg-green-100 rounded-full mb-4">
                <CheckCircle className="w-12 h-12 text-green-600" />
              </div>
              <h1 className="text-4xl font-bold text-gray-900 mb-2">Your Learning Plan</h1>
              <p className="text-gray-600">Based on your assessment results</p>
            </div>

            {/* Level Assignment */}
            <div className="bg-gradient-to-r from-blue-500 to-indigo-600 rounded-2xl p-8 text-white mb-8">
              <div className="flex items-center gap-3 mb-4">
                <BookOpen className="w-8 h-8" />
                <h2 className="text-2xl font-bold">Assigned Level</h2>
              </div>
              <div className="space-y-2">
                <p className="text-3xl font-extrabold">{result.level}</p>
                <p className="text-xl opacity-90">{result.levelRange}</p>
                <p className="text-sm opacity-75">Experience Score: {result.experienceAvg}/5.0</p>
              </div>
            </div>

            {/* Focus Areas */}
            <div className="mb-8">
              <div className="flex items-center gap-3 mb-4">
                <Target className="w-7 h-7 text-indigo-600" />
                <h3 className="text-2xl font-bold text-gray-900">Focus Areas</h3>
              </div>
              <div className="grid md:grid-cols-2 gap-3">
                {result.focus.map((item, index) => (
                  <div
                    key={index}
                    className="flex items-start gap-3 bg-indigo-50 rounded-xl p-4 border border-indigo-100"
                  >
                    <div className="flex-shrink-0 w-6 h-6 bg-indigo-600 text-white rounded-full flex items-center justify-center text-sm font-bold">
                      {index + 1}
                    </div>
                    <p className="text-gray-800 font-medium">{item}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Recommended Method */}
            <div className="mb-8">
              <div className="flex items-center gap-3 mb-4">
                <Lightbulb className="w-7 h-7 text-yellow-600" />
                <h3 className="text-2xl font-bold text-gray-900">Recommended Learning Method</h3>
              </div>
              <div className="bg-yellow-50 rounded-2xl p-6 border border-yellow-200">
                <div className="flex items-center gap-2 mb-3">
                  <span className="px-3 py-1 bg-yellow-200 text-yellow-800 rounded-full text-sm font-semibold">
                    {result.topStyle} Learner
                  </span>
                </div>
                <h4 className="text-xl font-bold text-gray-900 mb-2">{result.recommendedMethod}</h4>
                <p className="text-gray-700">{result.methodDescription}</p>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-4">
              <button
                onClick={handleRestart}
                className="flex-1 px-6 py-4 bg-gray-200 text-gray-800 rounded-xl font-semibold hover:bg-gray-300 transition"
              >
                Retake Assessment
              </button>
              <Link href="/auth/login" className="flex-1">
                <button
                  className="w-full px-6 py-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl font-semibold hover:from-blue-700 hover:to-indigo-700 transition shadow-lg"
                >
                  Start Learning Now
                </button>
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 py-12 px-4">
      <div className="max-w-3xl mx-auto">
        <div className="bg-white rounded-3xl shadow-2xl p-8 md:p-12">
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold text-gray-900 mb-2">
              Vietnamese Learning Assessment
            </h1>
            <p className="text-gray-600">
              Answer {surveyQuestions.length} questions to get your personalized learning plan
            </p>
          </div>

          {/* Progress Bar */}
          <div className="mb-8">
            <div className="flex justify-between text-sm text-gray-600 mb-2">
              <span>Progress</span>
              <span className="font-semibold">{progress}% Complete</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-3">
              <div
                className="bg-gradient-to-r from-blue-600 to-indigo-600 h-3 rounded-full transition-all duration-300"
                style={{ width: `${progress}%` }}
              ></div>
            </div>
            <div className="flex justify-between text-xs text-gray-500 mt-1">
              <span>Page {currentPage + 1} of {TOTAL_PAGES}</span>
              <span>{Object.keys(answers).length} / {surveyQuestions.length} answered</span>
            </div>
          </div>

          {/* Category Title */}
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-indigo-600">
              {CATEGORY_TITLES[currentCategory as keyof typeof CATEGORY_TITLES]}
            </h2>
          </div>

          {/* Questions */}
          <div className="space-y-6 mb-8">
            {currentQuestions.map((question, index) => (
              <div
                key={question.id}
                className="bg-gray-50 rounded-2xl p-6 border border-gray-200 hover:border-indigo-300 transition"
              >
                <p className="text-gray-800 font-medium mb-4">
                  <span className="text-indigo-600 font-bold">Q{startIndex + index + 1}.</span>{" "}
                  {question.text}
                </p>
                <div className="grid grid-cols-5 gap-2">
                  {LIKERT_OPTIONS.map((option) => (
                    <button
                      key={option.value}
                      onClick={() => handleAnswer(question.id, option.value)}
                      className={`p-3 rounded-xl border-2 transition-all ${
                        answers[question.id] === option.value
                          ? "border-indigo-600 bg-indigo-600 text-white shadow-lg scale-105"
                          : "border-gray-300 bg-white text-gray-700 hover:border-indigo-400 hover:bg-indigo-50"
                      }`}
                    >
                      <div className="text-2xl font-bold mb-1">{option.value}</div>
                      <div className="text-xs">{option.label}</div>
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* Navigation Buttons */}
          <div className="flex gap-4">
            <button
              onClick={handlePrevious}
              disabled={currentPage === 0}
              className={`flex items-center gap-2 px-6 py-3 rounded-xl font-semibold transition ${
                currentPage === 0
                  ? "bg-gray-200 text-gray-400 cursor-not-allowed"
                  : "bg-gray-200 text-gray-800 hover:bg-gray-300"
              }`}
            >
              <ChevronLeft className="w-5 h-5" />
              Previous
            </button>

            {currentPage < TOTAL_PAGES - 1 ? (
              <button
                onClick={handleNext}
                disabled={!isPageComplete()}
                className={`flex-1 flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-semibold transition ${
                  isPageComplete()
                    ? "bg-gradient-to-r from-blue-600 to-indigo-600 text-white hover:from-blue-700 hover:to-indigo-700 shadow-lg"
                    : "bg-gray-200 text-gray-400 cursor-not-allowed"
                }`}
              >
                Next
                <ChevronRight className="w-5 h-5" />
              </button>
            ) : (
              <button
                onClick={handleSubmit}
                disabled={Object.keys(answers).length !== surveyQuestions.length}
                className={`flex-1 flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-semibold transition ${
                  Object.keys(answers).length === surveyQuestions.length
                    ? "bg-gradient-to-r from-green-600 to-emerald-600 text-white hover:from-green-700 hover:to-emerald-700 shadow-lg"
                    : "bg-gray-200 text-gray-400 cursor-not-allowed"
                }`}
              >
                <CheckCircle className="w-5 h-5" />
                Get My Plan
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
