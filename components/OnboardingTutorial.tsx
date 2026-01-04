"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  ChevronLeft,
  ChevronRight,
  Key,
  Mic,
  FileText,
  History,
  BookOpen,
  Settings,
  CheckCircle,
} from "lucide-react";

interface TutorialStep {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  content: React.ReactNode;
}

interface OnboardingTutorialProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete: () => void;
}

export function OnboardingTutorial({ isOpen, onClose, onComplete }: OnboardingTutorialProps) {
  const [currentStep, setCurrentStep] = useState(0);

  const steps: TutorialStep[] = [
    {
      id: "welcome",
      title: "Chào mừng đến với LS-BRAIN! 🎉",
      description: "Hãy cùng khám phá các tính năng học tiếng Anh thông minh",
      icon: <BookOpen className="w-8 h-8 text-blue-500" />,
      content: (
        <div className="space-y-4">
          <div className="bg-gradient-to-r from-blue-500 to-purple-600 rounded-2xl p-6 text-white text-center">
            <h3 className="text-2xl font-bold mb-2">Học Tiếng Anh cùng AI</h3>
            <p className="opacity-90">Trải nghiệm học tập cá nhân hóa với công nghệ AI tiên tiến</p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-xl text-center">
              <span className="text-3xl">🎤</span>
              <p className="text-sm mt-2 font-medium">Voice Chat</p>
            </div>
            <div className="bg-orange-50 dark:bg-orange-900/20 p-4 rounded-xl text-center">
              <span className="text-3xl">📚</span>
              <p className="text-sm mt-2 font-medium">Flashcards</p>
            </div>
            <div className="bg-purple-50 dark:bg-purple-900/20 p-4 rounded-xl text-center">
              <span className="text-3xl">📄</span>
              <p className="text-sm mt-2 font-medium">Tài liệu</p>
            </div>
            <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-xl text-center">
              <span className="text-3xl">📊</span>
              <p className="text-sm mt-2 font-medium">Theo dõi</p>
            </div>
          </div>
        </div>
      ),
    },
    {
      id: "api-key",
      title: "Bước 1: Lấy API Key 🔑",
      description: "Để sử dụng AI, bạn cần có API key từ Google hoặc OpenAI",
      icon: <Key className="w-8 h-8 text-yellow-500" />,
      content: (
        <div className="space-y-4">
          <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-xl p-4">
            <h4 className="font-semibold text-yellow-800 dark:text-yellow-200 mb-2">
              📌 Tại sao cần API Key?
            </h4>
            <p className="text-sm text-yellow-700 dark:text-yellow-300">
              API Key giúp kết nối với AI để xử lý giọng nói, tạo flashcard và nhiều tính năng khác.
            </p>
          </div>
          
          <div className="space-y-3">
            <h4 className="font-semibold">Cách lấy Google Gemini API Key (Miễn phí):</h4>
            <ol className="space-y-2 text-sm">
              <li className="flex items-start gap-2">
                <span className="bg-blue-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs flex-shrink-0">1</span>
                <span>Truy cập <a href="https://aistudio.google.com/apikey" target="_blank" className="text-blue-500 underline">aistudio.google.com/apikey</a></span>
              </li>
              <li className="flex items-start gap-2">
                <span className="bg-blue-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs flex-shrink-0">2</span>
                <span>Đăng nhập bằng tài khoản Google</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="bg-blue-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs flex-shrink-0">3</span>
                <span>Click "Create API Key" → Chọn project</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="bg-blue-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs flex-shrink-0">4</span>
                <span>Copy API Key và dán vào Settings</span>
              </li>
            </ol>
          </div>

          <div className="bg-gray-100 dark:bg-gray-800 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <Settings className="w-4 h-4" />
              <span className="font-medium text-sm">Vào Settings để nhập API Key</span>
            </div>
            <div className="bg-white dark:bg-gray-700 rounded-lg p-3 border-2 border-dashed border-gray-300 dark:border-gray-600">
              <code className="text-xs text-gray-500">AIzaSy...xxxxxx</code>
            </div>
          </div>
        </div>
      ),
    },
    {
      id: "voice-chat",
      title: "Bước 2: Voice Chat 🎤",
      description: "Luyện nói tiếng Anh với AI như người thật",
      icon: <Mic className="w-8 h-8 text-green-500" />,
      content: (
        <div className="space-y-4">
          <div className="bg-green-50 dark:bg-green-900/20 rounded-xl p-4">
            <h4 className="font-semibold text-green-800 dark:text-green-200 mb-2">
              🎯 Tính năng Voice Chat
            </h4>
            <ul className="text-sm text-green-700 dark:text-green-300 space-y-1">
              <li>• Nói chuyện trực tiếp với AI bằng giọng nói</li>
              <li>• AI sẽ sửa lỗi phát âm và ngữ pháp</li>
              <li>• Luyện tập theo chủ đề bạn chọn</li>
            </ul>
          </div>

          <div className="space-y-3">
            <h4 className="font-semibold">Cách sử dụng:</h4>
            <div className="grid gap-2">
              <div className="flex items-center gap-3 bg-white dark:bg-gray-800 p-3 rounded-lg border">
                <div className="bg-green-100 dark:bg-green-900 p-2 rounded-full">
                  <Mic className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <p className="font-medium text-sm">Nhấn nút micro</p>
                  <p className="text-xs text-gray-500">Bắt đầu nói tiếng Anh</p>
                </div>
              </div>
              <div className="flex items-center gap-3 bg-white dark:bg-gray-800 p-3 rounded-lg border">
                <div className="bg-blue-100 dark:bg-blue-900 p-2 rounded-full">
                  <span className="text-xl">🤖</span>
                </div>
                <div>
                  <p className="font-medium text-sm">AI phản hồi</p>
                  <p className="text-xs text-gray-500">Nghe và đọc câu trả lời</p>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-3 text-center">
            <p className="text-sm">📍 Vào <strong>English Live</strong> để bắt đầu</p>
          </div>
        </div>
      ),
    },
    {
      id: "documents",
      title: "Bước 3: Upload Tài liệu 📄",
      description: "Tạo flashcard từ PDF, DOCX hoặc hình ảnh",
      icon: <FileText className="w-8 h-8 text-orange-500" />,
      content: (
        <div className="space-y-4">
          <div className="bg-orange-50 dark:bg-orange-900/20 rounded-xl p-4">
            <h4 className="font-semibold text-orange-800 dark:text-orange-200 mb-2">
              📚 Học từ tài liệu của bạn
            </h4>
            <p className="text-sm text-orange-700 dark:text-orange-300">
              Upload bất kỳ tài liệu nào và AI sẽ tự động trích xuất từ vựng, tạo flashcard.
            </p>
          </div>

          <div className="space-y-3">
            <h4 className="font-semibold">Định dạng hỗ trợ:</h4>
            <div className="grid grid-cols-2 gap-2">
              <div className="bg-red-50 dark:bg-red-900/20 p-3 rounded-lg text-center">
                <span className="text-2xl">📕</span>
                <p className="text-xs mt-1 font-medium">PDF</p>
              </div>
              <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg text-center">
                <span className="text-2xl">📘</span>
                <p className="text-xs mt-1 font-medium">DOCX</p>
              </div>
              <div className="bg-green-50 dark:bg-green-900/20 p-3 rounded-lg text-center">
                <span className="text-2xl">🖼️</span>
                <p className="text-xs mt-1 font-medium">Hình ảnh</p>
              </div>
              <div className="bg-gray-50 dark:bg-gray-800 p-3 rounded-lg text-center">
                <span className="text-2xl">📝</span>
                <p className="text-xs mt-1 font-medium">TXT</p>
              </div>
            </div>
          </div>

          <div className="bg-purple-50 dark:bg-purple-900/20 rounded-xl p-3 text-center">
            <p className="text-sm">📍 Vào <strong>Documents</strong> để upload</p>
          </div>
        </div>
      ),
    },
    {
      id: "history",
      title: "Bước 4: Theo dõi tiến độ 📊",
      description: "Xem lịch sử học tập và tiến bộ của bạn",
      icon: <History className="w-8 h-8 text-purple-500" />,
      content: (
        <div className="space-y-4">
          <div className="bg-purple-50 dark:bg-purple-900/20 rounded-xl p-4">
            <h4 className="font-semibold text-purple-800 dark:text-purple-200 mb-2">
              📈 Theo dõi tiến bộ
            </h4>
            <p className="text-sm text-purple-700 dark:text-purple-300">
              Hệ thống ghi nhận mọi hoạt động học tập để bạn thấy sự tiến bộ theo thời gian.
            </p>
          </div>

          <div className="space-y-3">
            <h4 className="font-semibold">Bạn có thể xem:</h4>
            <ul className="space-y-2">
              <li className="flex items-center gap-2 text-sm">
                <CheckCircle className="w-4 h-4 text-green-500" />
                <span>Số từ vựng đã học</span>
              </li>
              <li className="flex items-center gap-2 text-sm">
                <CheckCircle className="w-4 h-4 text-green-500" />
                <span>Thời gian luyện nói</span>
              </li>
              <li className="flex items-center gap-2 text-sm">
                <CheckCircle className="w-4 h-4 text-green-500" />
                <span>Điểm phát âm trung bình</span>
              </li>
              <li className="flex items-center gap-2 text-sm">
                <CheckCircle className="w-4 h-4 text-green-500" />
                <span>Flashcard đã ôn tập</span>
              </li>
            </ul>
          </div>

          <div className="bg-indigo-50 dark:bg-indigo-900/20 rounded-xl p-3 text-center">
            <p className="text-sm">📍 Vào <strong>Learning History</strong> để xem</p>
          </div>
        </div>
      ),
    },
    {
      id: "complete",
      title: "Hoàn tất! 🎊",
      description: "Bạn đã sẵn sàng bắt đầu học",
      icon: <CheckCircle className="w-8 h-8 text-green-500" />,
      content: (
        <div className="space-y-4 text-center">
          <div className="text-6xl">🎉</div>
          <h3 className="text-xl font-bold">Chúc mừng!</h3>
          <p className="text-gray-600 dark:text-gray-400">
            Bạn đã hoàn thành hướng dẫn. Hãy bắt đầu hành trình học tiếng Anh ngay!
          </p>
          
          <div className="bg-gradient-to-r from-green-500 to-blue-500 rounded-xl p-4 text-white">
            <p className="font-medium">💡 Mẹo: Bắt đầu với Settings để nhập API Key</p>
          </div>

          <div className="grid grid-cols-2 gap-3 mt-4">
            <a href="/dashboard-new/settings" className="bg-yellow-100 dark:bg-yellow-900/30 p-3 rounded-xl hover:scale-105 transition-transform">
              <Key className="w-6 h-6 mx-auto text-yellow-600" />
              <p className="text-xs mt-1 font-medium">Settings</p>
            </a>
            <a href="/dashboard-new/english-live" className="bg-green-100 dark:bg-green-900/30 p-3 rounded-xl hover:scale-105 transition-transform">
              <Mic className="w-6 h-6 mx-auto text-green-600" />
              <p className="text-xs mt-1 font-medium">Voice Chat</p>
            </a>
          </div>
        </div>
      ),
    },
  ];

  const nextStep = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      onComplete();
    }
  };

  const prevStep = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b dark:border-gray-800">
            <div className="flex items-center gap-3">
              {steps[currentStep].icon}
              <div>
                <h2 className="font-bold">{steps[currentStep].title}</h2>
                <p className="text-xs text-gray-500">{steps[currentStep].description}</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Content */}
          <div className="p-4 overflow-y-auto max-h-[60vh]">
            <AnimatePresence mode="wait">
              <motion.div
                key={currentStep}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.2 }}
              >
                {steps[currentStep].content}
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Footer */}
          <div className="p-4 border-t dark:border-gray-800">
            {/* Progress dots */}
            <div className="flex justify-center gap-1.5 mb-4">
              {steps.map((_, index) => (
                <button
                  key={index}
                  onClick={() => setCurrentStep(index)}
                  className={`w-2 h-2 rounded-full transition-all ${
                    index === currentStep
                      ? "bg-blue-500 w-6"
                      : index < currentStep
                      ? "bg-green-500"
                      : "bg-gray-300 dark:bg-gray-700"
                  }`}
                />
              ))}
            </div>

            {/* Navigation buttons */}
            <div className="flex gap-3">
              <button
                onClick={prevStep}
                disabled={currentStep === 0}
                className="flex-1 py-2.5 px-4 rounded-xl border border-gray-300 dark:border-gray-700 font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors flex items-center justify-center gap-2"
              >
                <ChevronLeft className="w-4 h-4" />
                Trước
              </button>
              <button
                onClick={nextStep}
                className="flex-1 py-2.5 px-4 rounded-xl bg-blue-500 text-white font-medium hover:bg-blue-600 transition-colors flex items-center justify-center gap-2"
              >
                {currentStep === steps.length - 1 ? "Bắt đầu" : "Tiếp"}
                {currentStep < steps.length - 1 && <ChevronRight className="w-4 h-4" />}
              </button>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
