"use client";
import { motion } from "framer-motion";
import Link from "next/link";
import { 
  Sparkles, 
  BookOpen, 
  Target, 
  Lightbulb, 
  ArrowRight,
  CheckCircle2,
  Trophy
} from "lucide-react";
import { PlacementResult } from "@/lib/calculatePlacementFlow";

interface ResultScreenProps {
  result: PlacementResult;
}

const levelColors = {
  Newbie: {
    gradient: "from-blue-500 to-indigo-600",
    bg: "bg-blue-50",
    text: "text-blue-600",
    border: "border-blue-200",
  },
  Intermediate: {
    gradient: "from-teal-500 to-emerald-600",
    bg: "bg-teal-50",
    text: "text-teal-600",
    border: "border-teal-200",
  },
  Advanced: {
    gradient: "from-purple-500 to-pink-600",
    bg: "bg-purple-50",
    text: "text-purple-600",
    border: "border-purple-200",
  },
};

export default function ResultScreen({ result }: ResultScreenProps) {
  const colors = levelColors[result.level];

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.15,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 },
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-teal-50 via-emerald-50 to-green-50 py-12 px-4">
      <motion.div
        className="max-w-4xl mx-auto"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        {/* Header */}
        <motion.div variants={itemVariants} className="text-center mb-12">
          <motion.div
            className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-teal-400 to-emerald-500 rounded-full mb-6 shadow-lg"
            animate={{ rotate: [0, 10, -10, 0] }}
            transition={{ duration: 0.6, delay: 0.3 }}
          >
            <Trophy className="w-10 h-10 text-white" />
          </motion.div>
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-3">
            Your Personalized Vietnamese Plan is Ready! 🎉
          </h1>
          <p className="text-xl text-gray-600">
            Based on your assessment, here's your custom learning path
          </p>
        </motion.div>

        {/* Level Badge */}
        <motion.div
          variants={itemVariants}
          className={`bg-gradient-to-r ${colors.gradient} rounded-3xl p-8 md:p-10 text-white mb-8 shadow-2xl`}
        >
          <div className="flex items-center gap-3 mb-4">
            <BookOpen className="w-8 h-8" />
            <h2 className="text-2xl font-bold">Your Level</h2>
          </div>
          <div className="space-y-2">
            <motion.p
              className="text-5xl font-extrabold"
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.5, type: "spring" }}
            >
              {result.level}
            </motion.p>
            <p className="text-xl opacity-90">{result.roadmapDescription}</p>
            <p className="text-sm opacity-75">Experience Score: {result.experienceAvg}/5.0</p>
          </div>
        </motion.div>

        <div className="grid md:grid-cols-2 gap-8 mb-8">
          {/* Roadmap */}
          <motion.div
            variants={itemVariants}
            className={`${colors.bg} rounded-3xl p-8 border-2 ${colors.border}`}
          >
            <div className="flex items-center gap-3 mb-6">
              <Target className={`w-7 h-7 ${colors.text}`} />
              <h3 className="text-2xl font-bold text-gray-900">Your Roadmap</h3>
            </div>
            <div className="space-y-4">
              {result.roadmapSteps.map((step, index) => (
                <motion.div
                  key={index}
                  className="flex items-start gap-3"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.8 + index * 0.1 }}
                >
                  <div className={`flex-shrink-0 w-8 h-8 bg-gradient-to-br ${colors.gradient} text-white rounded-full flex items-center justify-center font-bold text-sm shadow-md`}>
                    {index + 1}
                  </div>
                  <p className="text-gray-800 font-medium pt-1">{step}</p>
                </motion.div>
              ))}
            </div>
          </motion.div>

          {/* Learning Method */}
          <motion.div
            variants={itemVariants}
            className="bg-gradient-to-br from-yellow-50 to-orange-50 rounded-3xl p-8 border-2 border-yellow-200"
          >
            <div className="flex items-center gap-3 mb-6">
              <Lightbulb className="w-7 h-7 text-yellow-600" />
              <h3 className="text-2xl font-bold text-gray-900">How You Learn Best</h3>
            </div>
            <div className="space-y-4">
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-yellow-200 text-yellow-800 rounded-full font-semibold">
                <Sparkles className="w-4 h-4" />
                {result.recommendedMethod}
              </div>
              <p className="text-gray-700 leading-relaxed">
                {result.methodDescription}
              </p>
              <div className="pt-4 space-y-2">
                <p className="text-sm font-semibold text-gray-600 uppercase tracking-wide">
                  Recommended Tools:
                </p>
                <div className="flex flex-wrap gap-2">
                  {["Flashcards", "Videos", "Podcasts", "Quizzes"].map((tool) => (
                    <span
                      key={tool}
                      className="px-3 py-1 bg-white rounded-full text-sm font-medium text-gray-700 border border-gray-200"
                    >
                      {tool}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        </div>

        {/* Why This Works */}
        <motion.div
          variants={itemVariants}
          className="bg-white rounded-3xl p-8 shadow-xl mb-8"
        >
          <h3 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-3">
            <CheckCircle2 className="w-7 h-7 text-teal-600" />
            Why This Plan Works For You
          </h3>
          <div className="grid md:grid-cols-3 gap-6">
            <div className="text-center">
              <div className="w-16 h-16 bg-teal-100 rounded-2xl flex items-center justify-center mx-auto mb-3">
                <span className="text-3xl">🎯</span>
              </div>
              <h4 className="font-bold text-gray-900 mb-2">Personalized</h4>
              <p className="text-sm text-gray-600">Tailored to your experience level and goals</p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-emerald-100 rounded-2xl flex items-center justify-center mx-auto mb-3">
                <span className="text-3xl">⚡</span>
              </div>
              <h4 className="font-bold text-gray-900 mb-2">Efficient</h4>
              <p className="text-sm text-gray-600">Focus on what matters most for your level</p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-green-100 rounded-2xl flex items-center justify-center mx-auto mb-3">
                <span className="text-3xl">🚀</span>
              </div>
              <h4 className="font-bold text-gray-900 mb-2">Proven</h4>
              <p className="text-sm text-gray-600">Based on language learning research</p>
            </div>
          </div>
        </motion.div>

        {/* CTA */}
        <motion.div variants={itemVariants} className="text-center">
          <Link href="/auth/login">
            <motion.button
              className="inline-flex items-center gap-3 px-10 py-5 bg-gradient-to-r from-teal-500 to-emerald-600 text-white text-xl font-bold rounded-2xl shadow-2xl hover:shadow-3xl transition-all"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              Start My First Lesson
              <ArrowRight className="w-6 h-6" />
            </motion.button>
          </Link>
          <p className="text-sm text-gray-500 mt-4">
            Join thousands of learners mastering Vietnamese
          </p>
        </motion.div>
      </motion.div>
    </div>
  );
}
