"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import {
  Key,
  Mic,
  FileText,
  Settings,
  ChevronRight,
  ExternalLink,
  AlertCircle,
  BookOpen,
  Upload,
  BarChart3,
} from "lucide-react";
import Link from "next/link";

interface GuideSection {
  id: string;
  title: string;
  icon: React.ReactNode;
  color: string;
  steps: {
    title: string;
    description: string;
    image?: string;
    tip?: string;
  }[];
}

export default function GuidePage() {
  const [activeSection, setActiveSection] = useState<string>("api-key");

  const sections: GuideSection[] = [
    {
      id: "api-key",
      title: "Lấy API Key",
      icon: <Key className="w-6 h-6" />,
      color: "from-yellow-400 to-orange-500",
      steps: [
        {
          title: "Truy cập Google AI Studio",
          description: "Mở trình duyệt và truy cập aistudio.google.com/apikey. Đăng nhập bằng tài khoản Google của bạn.",
          image: "https://images.unsplash.com/photo-1573804633927-bfcbcd909acd?w=600&h=300&fit=crop",
          tip: "API Key của Google Gemini hoàn toàn miễn phí cho người dùng cá nhân!",
        },
        {
          title: "Tạo API Key mới",
          description: "Click vào nút 'Create API Key', chọn project (hoặc tạo mới), sau đó copy API Key được tạo ra.",
          image: "https://images.unsplash.com/photo-1555949963-ff9fe0c870eb?w=600&h=300&fit=crop",
        },
        {
          title: "Nhập vào Settings",
          description: "Vào trang Settings trong dashboard, dán API Key vào ô 'Google Gemini API Key' và nhấn Lưu.",
          image: "https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=600&h=300&fit=crop",
          tip: "API Key được lưu an toàn và chỉ bạn mới có thể sử dụng.",
        },
      ],
    },
    {
      id: "voice-chat",
      title: "Voice Chat với AI",
      icon: <Mic className="w-6 h-6" />,
      color: "from-green-400 to-emerald-500",
      steps: [
        {
          title: "Vào English Live",
          description: "Từ menu bên trái, chọn 'English Live' để bắt đầu luyện nói với AI.",
          image: "https://images.unsplash.com/photo-1589254065878-42c9da997008?w=600&h=300&fit=crop",
        },
        {
          title: "Cho phép microphone",
          description: "Trình duyệt sẽ hỏi quyền truy cập microphone. Nhấn 'Cho phép' để tiếp tục.",
          image: "https://images.unsplash.com/photo-1478737270239-2f02b77fc618?w=600&h=300&fit=crop",
          tip: "Đảm bảo bạn đang ở nơi yên tĩnh để AI nghe rõ giọng nói của bạn.",
        },
        {
          title: "Bắt đầu nói chuyện",
          description: "Nhấn nút micro màu xanh, nói tiếng Anh, AI sẽ phản hồi và sửa lỗi cho bạn.",
          image: "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=600&h=300&fit=crop",
        },
      ],
    },
    {
      id: "documents",
      title: "Upload Tài liệu",
      icon: <FileText className="w-6 h-6" />,
      color: "from-blue-400 to-indigo-500",
      steps: [
        {
          title: "Vào trang Documents",
          description: "Chọn 'Documents' từ menu để mở trang quản lý tài liệu.",
          image: "https://images.unsplash.com/photo-1568667256549-094345857637?w=600&h=300&fit=crop",
        },
        {
          title: "Upload file",
          description: "Kéo thả hoặc click để chọn file PDF, DOCX, hoặc TXT. Hệ thống sẽ tự động trích xuất nội dung.",
          image: "https://images.unsplash.com/photo-1586281380349-632531db7ed4?w=600&h=300&fit=crop",
          tip: "File PDF và DOCX hoạt động tốt nhất. Hình ảnh cần có chữ rõ ràng.",
        },
        {
          title: "Tạo Flashcards",
          description: "Sau khi upload, nhấn 'Trích xuất từ vựng' để AI tự động tạo flashcards từ nội dung.",
          image: "https://images.unsplash.com/photo-1434030216411-0b793f4b4173?w=600&h=300&fit=crop",
        },
      ],
    },
    {
      id: "vocabulary",
      title: "Học Từ vựng",
      icon: <BookOpen className="w-6 h-6" />,
      color: "from-purple-400 to-pink-500",
      steps: [
        {
          title: "Vào trang Vocabulary",
          description: "Chọn 'Vocabulary' để xem danh sách từ vựng đã học và cần ôn tập.",
          image: "https://images.unsplash.com/photo-1456513080510-7bf3a84b82f8?w=600&h=300&fit=crop",
        },
        {
          title: "Ôn tập với Flashcards",
          description: "Hệ thống sử dụng thuật toán Spaced Repetition để nhắc bạn ôn tập đúng lúc.",
          image: "https://images.unsplash.com/photo-1503676260728-1c00da094a0b?w=600&h=300&fit=crop",
          tip: "Ôn tập mỗi ngày 10-15 phút để nhớ lâu hơn!",
        },
      ],
    },
    {
      id: "history",
      title: "Theo dõi Tiến độ",
      icon: <BarChart3 className="w-6 h-6" />,
      color: "from-orange-400 to-red-500",
      steps: [
        {
          title: "Xem Learning History",
          description: "Vào 'Learning History' để xem thống kê chi tiết về quá trình học tập.",
          image: "https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=600&h=300&fit=crop",
        },
        {
          title: "Phân tích lỗi thường gặp",
          description: "Hệ thống ghi nhận các lỗi bạn hay mắc và đưa ra gợi ý cải thiện.",
          image: "https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=600&h=300&fit=crop",
          tip: "Tập trung sửa các lỗi xuất hiện nhiều nhất để tiến bộ nhanh hơn.",
        },
      ],
    },
  ];

  const activeGuide = sections.find((s) => s.id === activeSection);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-6xl mx-auto p-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-3">
            📚 Hướng dẫn sử dụng
          </h1>
          <p className="text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
            Làm theo các bước dưới đây để bắt đầu hành trình học tiếng Anh cùng AI
          </p>
        </motion.div>

        {/* Quick Start Banner */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-gradient-to-r from-blue-500 to-purple-600 rounded-2xl p-6 mb-8 text-white"
        >
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-bold mb-2">🚀 Bắt đầu nhanh</h2>
              <p className="opacity-90">
                Bước quan trọng nhất: Lấy API Key miễn phí từ Google để sử dụng các tính năng AI
              </p>
            </div>
            <Link href="/settings">
              <button className="px-6 py-3 bg-white text-blue-600 rounded-xl font-semibold hover:bg-gray-100 transition-colors flex items-center gap-2">
                <Settings className="w-5 h-5" />
                Vào Settings
              </button>
            </Link>
          </div>
        </motion.div>

        <div className="grid md:grid-cols-4 gap-6">
          {/* Sidebar Navigation */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
            className="md:col-span-1"
          >
            <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 shadow-lg sticky top-6">
              <h3 className="font-semibold text-gray-700 dark:text-gray-300 mb-4 px-2">
                Các mục hướng dẫn
              </h3>
              <nav className="space-y-2">
                {sections.map((section) => (
                  <button
                    key={section.id}
                    onClick={() => setActiveSection(section.id)}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
                      activeSection === section.id
                        ? `bg-gradient-to-r ${section.color} text-white shadow-lg`
                        : "hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300"
                    }`}
                  >
                    {section.icon}
                    <span className="font-medium text-sm">{section.title}</span>
                    {activeSection === section.id && (
                      <ChevronRight className="w-4 h-4 ml-auto" />
                    )}
                  </button>
                ))}
              </nav>
            </div>
          </motion.div>

          {/* Main Content */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3 }}
            className="md:col-span-3"
          >
            {activeGuide && (
              <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg overflow-hidden">
                {/* Section Header */}
                <div
                  className={`bg-gradient-to-r ${activeGuide.color} p-6 text-white`}
                >
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 bg-white/20 rounded-2xl flex items-center justify-center backdrop-blur-sm">
                      {activeGuide.icon}
                    </div>
                    <div>
                      <h2 className="text-2xl font-bold">{activeGuide.title}</h2>
                      <p className="opacity-90">
                        {activeGuide.steps.length} bước đơn giản
                      </p>
                    </div>
                  </div>
                </div>

                {/* Steps */}
                <div className="p-6 space-y-8">
                  {activeGuide.steps.map((step, index) => (
                    <motion.div
                      key={index}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.1 }}
                      className="relative"
                    >
                      {/* Step number */}
                      <div className="flex items-start gap-4">
                        <div
                          className={`w-10 h-10 rounded-full bg-gradient-to-r ${activeGuide.color} text-white flex items-center justify-center font-bold flex-shrink-0`}
                        >
                          {index + 1}
                        </div>
                        <div className="flex-1">
                          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                            {step.title}
                          </h3>
                          <p className="text-gray-600 dark:text-gray-400 mb-4">
                            {step.description}
                          </p>

                          {/* Image */}
                          {step.image && (
                            <div className="rounded-xl overflow-hidden mb-4 border dark:border-gray-700">
                              <img
                                src={step.image}
                                alt={step.title}
                                className="w-full h-48 object-cover"
                              />
                            </div>
                          )}

                          {/* Tip */}
                          {step.tip && (
                            <div className="flex items-start gap-3 bg-blue-50 dark:bg-blue-900/20 p-4 rounded-xl">
                              <AlertCircle className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
                              <p className="text-sm text-blue-700 dark:text-blue-300">
                                💡 {step.tip}
                              </p>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Connector line */}
                      {index < activeGuide.steps.length - 1 && (
                        <div className="absolute left-5 top-12 w-0.5 h-full bg-gray-200 dark:bg-gray-700 -z-10" />
                      )}
                    </motion.div>
                  ))}
                </div>

                {/* Action Button */}
                <div className="p-6 bg-gray-50 dark:bg-gray-900/50 border-t dark:border-gray-700">
                  {activeSection === "api-key" && (
                    <div className="flex flex-col sm:flex-row gap-4">
                      <a
                        href="https://aistudio.google.com/apikey"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-blue-500 text-white rounded-xl font-semibold hover:bg-blue-600 transition-colors"
                      >
                        <ExternalLink className="w-5 h-5" />
                        Lấy API Key từ Google
                      </a>
                      <Link href="/settings" className="flex-1">
                        <button className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-xl font-semibold hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors">
                          <Settings className="w-5 h-5" />
                          Vào Settings
                        </button>
                      </Link>
                    </div>
                  )}
                  {activeSection === "voice-chat" && (
                    <Link href="/dashboard-new/english-live">
                      <button className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-green-500 text-white rounded-xl font-semibold hover:bg-green-600 transition-colors">
                        <Mic className="w-5 h-5" />
                        Bắt đầu Voice Chat
                      </button>
                    </Link>
                  )}
                  {activeSection === "documents" && (
                    <Link href="/dashboard-new/documents-simple">
                      <button className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-blue-500 text-white rounded-xl font-semibold hover:bg-blue-600 transition-colors">
                        <Upload className="w-5 h-5" />
                        Upload Tài liệu
                      </button>
                    </Link>
                  )}
                  {activeSection === "vocabulary" && (
                    <Link href="/dashboard-new/vocabulary">
                      <button className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-purple-500 text-white rounded-xl font-semibold hover:bg-purple-600 transition-colors">
                        <BookOpen className="w-5 h-5" />
                        Học Từ vựng
                      </button>
                    </Link>
                  )}
                  {activeSection === "history" && (
                    <Link href="/dashboard-new/learning-history">
                      <button className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-orange-500 text-white rounded-xl font-semibold hover:bg-orange-600 transition-colors">
                        <BarChart3 className="w-5 h-5" />
                        Xem Lịch sử học tập
                      </button>
                    </Link>
                  )}
                </div>
              </div>
            )}
          </motion.div>
        </div>

        {/* FAQ Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="mt-8 bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-lg"
        >
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
            ❓ Câu hỏi thường gặp
          </h2>
          <div className="space-y-4">
            <div className="border-b dark:border-gray-700 pb-4">
              <h3 className="font-semibold text-gray-800 dark:text-gray-200 mb-2">
                API Key có mất phí không?
              </h3>
              <p className="text-gray-600 dark:text-gray-400 text-sm">
                Không! Google Gemini API miễn phí cho người dùng cá nhân với giới hạn 60 requests/phút.
              </p>
            </div>
            <div className="border-b dark:border-gray-700 pb-4">
              <h3 className="font-semibold text-gray-800 dark:text-gray-200 mb-2">
                Tại sao Voice Chat không hoạt động?
              </h3>
              <p className="text-gray-600 dark:text-gray-400 text-sm">
                Đảm bảo bạn đã nhập API Key trong Settings và cho phép trình duyệt truy cập microphone.
              </p>
            </div>
            <div>
              <h3 className="font-semibold text-gray-800 dark:text-gray-200 mb-2">
                Làm sao để học hiệu quả nhất?
              </h3>
              <p className="text-gray-600 dark:text-gray-400 text-sm">
                Học đều đặn mỗi ngày 15-30 phút, kết hợp Voice Chat và ôn tập Flashcards.
              </p>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
