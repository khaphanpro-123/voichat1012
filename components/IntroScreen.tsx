"use client";
import { motion } from "framer-motion";
import { Sparkles, Clock, Target, TrendingUp } from "lucide-react";

interface IntroScreenProps {
  onStart: () => void;
}

export default function IntroScreen({ onStart }: IntroScreenProps) {
  const features = [
    {
      icon: Clock,
      title: "5 Minutes",
      description: "Quick assessment",
    },
    {
      icon: Target,
      title: "Personalized",
      description: "Custom learning path",
    },
    {
      icon: TrendingUp,
      title: "Proven",
      description: "Research-backed",
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-teal-50 via-emerald-50 to-green-50 flex items-center justify-center p-4">
      <motion.div
        className="max-w-2xl w-full"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
        <div className="bg-white rounded-3xl shadow-2xl p-8 md:p-12 text-center">
          {/* Icon */}
          <motion.div
            className="inline-flex items-center justify-center w-24 h-24 bg-gradient-to-br from-teal-400 to-emerald-500 rounded-full mb-6 shadow-lg"
            animate={{ 
              rotate: [0, 5, -5, 0],
              scale: [1, 1.05, 1]
            }}
            transition={{ 
              duration: 2,
              repeat: Infinity,
              repeatDelay: 1
            }}
          >
            <Sparkles className="w-12 h-12 text-white" />
          </motion.div>

          {/* Title */}
          <motion.h1
            className="text-4xl md:text-5xl font-bold text-gray-900 mb-4"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            Check Your Vietnamese Level
          </motion.h1>

          {/* Subtitle */}
          <motion.p
            className="text-xl text-gray-600 mb-8"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            Get a personalized learning plan based on your experience, goals, and learning style
          </motion.p>

          {/* Features */}
          <motion.div
            className="grid grid-cols-3 gap-6 mb-10"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
          >
            {features.map((feature, index) => (
              <motion.div
                key={index}
                className="text-center"
                whileHover={{ scale: 1.05 }}
              >
                <div className="w-16 h-16 bg-teal-100 rounded-2xl flex items-center justify-center mx-auto mb-3">
                  <feature.icon className="w-8 h-8 text-teal-600" />
                </div>
                <h3 className="font-bold text-gray-900 mb-1">{feature.title}</h3>
                <p className="text-sm text-gray-600">{feature.description}</p>
              </motion.div>
            ))}
          </motion.div>

          {/* CTA Button */}
          <motion.button
            onClick={onStart}
            className="w-full md:w-auto px-12 py-5 bg-gradient-to-r from-teal-500 to-emerald-600 text-white text-xl font-bold rounded-2xl shadow-xl hover:shadow-2xl transition-all"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
          >
            Start Assessment
          </motion.button>

          {/* Info Text */}
          <motion.p
            className="text-sm text-gray-500 mt-6"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6 }}
          >
            30 questions • No account required • 100% free
          </motion.p>
        </div>
      </motion.div>
    </div>
  );
}
