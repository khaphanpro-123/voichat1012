"use client";
import { motion } from "framer-motion";
import { Brain, Image as ImageIcon, Volume2, BookOpen, Sparkles } from "lucide-react";

interface VocabularyExtractionLoaderProps {
  currentStep?: string;
  progress?: number;
}

export default function VocabularyExtractionLoader({
  currentStep = "Đang trích xuất từ vựng...",
  progress = 0
}: VocabularyExtractionLoaderProps) {
  const steps = [
    { icon: Brain, text: "Phân tích văn bản thông minh", color: "text-blue-500" },
    { icon: BookOpen, text: "Trích xuất từ vựng có ý nghĩa", color: "text-green-500" },
    { icon: ImageIcon, text: "Tạo hình ảnh minh họa", color: "text-purple-500" },
    { icon: Volume2, text: "Chuẩn bị âm thanh phát âm", color: "text-orange-500" },
    { icon: Sparkles, text: "Hoàn thành!", color: "text-pink-500" }
  ];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white rounded-3xl p-8 max-w-md w-full mx-4 text-center"
      >
        {/* Main Loading Animation */}
        <div className="mb-6">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
            className="w-16 h-16 mx-auto mb-4"
          >
            <div className="w-full h-full rounded-full border-4 border-blue-200 border-t-blue-600"></div>
          </motion.div>
          
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            Đang xử lý từ vựng
          </h2>
          <p className="text-gray-600">
            Đang trích xuất từ vựng và tạo hình ảnh minh họa
          </p>
        </div>

        {/* Progress Bar */}
        <div className="mb-6">
          <div className="w-full bg-gray-200 rounded-full h-2 mb-2">
            <motion.div
              className="bg-gradient-to-r from-blue-500 to-purple-600 h-2 rounded-full"
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.5 }}
            />
          </div>
          <p className="text-sm text-gray-500">{progress}% hoàn thành</p>
        </div>

        {/* Steps */}
        <div className="space-y-3">
          {steps.map((step, index) => {
            const Icon = step.icon;
            const isActive = index <= Math.floor(progress / 20);
            const isCurrent = index === Math.floor(progress / 20);
            
            return (
              <motion.div
                key={index}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
                className={`flex items-center gap-3 p-3 rounded-xl transition ${
                  isActive 
                    ? 'bg-blue-50 border border-blue-200' 
                    : 'bg-gray-50'
                }`}
              >
                <div className={`p-2 rounded-full ${
                  isActive ? 'bg-white shadow-sm' : 'bg-gray-200'
                }`}>
                  <Icon className={`w-4 h-4 ${
                    isActive ? step.color : 'text-gray-400'
                  }`} />
                </div>
                <span className={`text-sm font-medium ${
                  isActive ? 'text-gray-900' : 'text-gray-500'
                }`}>
                  {step.text}
                </span>
                {isCurrent && (
                  <motion.div
                    animate={{ scale: [1, 1.2, 1] }}
                    transition={{ duration: 1, repeat: Infinity }}
                    className="ml-auto w-2 h-2 bg-blue-500 rounded-full"
                  />
                )}
              </motion.div>
            );
          })}
        </div>

        {/* Current Step */}
        <div className="mt-6 p-4 bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl">
          <p className="text-sm font-medium text-gray-700">
            {currentStep}
          </p>
        </div>
      </motion.div>
    </div>
  );
}