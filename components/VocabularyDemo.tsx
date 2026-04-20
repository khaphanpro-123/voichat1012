"use client";
import { useState } from "react";
import VocabularyGrid from "./VocabularyGrid";
import { motion } from "framer-motion";
import { BookOpen, Sparkles } from "lucide-react";

export default function VocabularyDemo() {
  const [showDemo, setShowDemo] = useState(false);

  const demoVocabulary = [
    "lập trình",
    "máy tính", 
    "phần mềm",
    "ứng dụng",
    "website",
    "internet",
    "công nghệ",
    "thông tin",
    "dữ liệu",
    "hệ thống",
    "mạng",
    "trí tuệ",
    "nhân tạo",
    "học máy",
    "thuật toán",
    "cơ sở dữ liệu",
    "giao diện",
    "người dùng"
  ];

  if (!showDemo) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 flex items-center justify-center p-6">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center bg-white rounded-3xl shadow-xl p-12 max-w-md"
        >
          <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-6">
            <BookOpen className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-4">
            Demo Từ vựng với Âm thanh & Hình ảnh
          </h1>
          <p className="text-gray-600 mb-8">
            Trải nghiệm tính năng học từ vựng mới với phát âm và hình ảnh minh họa
          </p>
          <button
            onClick={() => setShowDemo(true)}
            className="px-8 py-4 bg-gradient-to-r from-blue-500 to-purple-600 text-white font-bold rounded-xl hover:shadow-lg transition flex items-center gap-2 mx-auto"
          >
            <Sparkles className="w-5 h-5" />
            Bắt đầu Demo
          </button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <button
            onClick={() => setShowDemo(false)}
            className="px-4 py-2 bg-white text-gray-700 rounded-lg hover:bg-gray-50 transition mb-4"
          >
            ← Quay lại
          </button>
          <div className="bg-white rounded-2xl p-6 shadow-lg">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
               Demo Tính năng Từ vựng
            </h1>
            <p className="text-gray-600">
              Mỗi từ vựng có âm thanh phát âm và hình ảnh minh họa. Bạn có thể:
            </p>
            <ul className="list-disc list-inside text-gray-600 mt-2 space-y-1">
              <li>Nhấn nút  để nghe phát âm</li>
              <li>Xem hình ảnh minh họa cho từng từ</li>
              <li>Sử dụng tính năng "Phát tự động" để nghe tất cả từ</li>
              <li>Tìm kiếm và lọc theo cấp độ</li>
            </ul>
          </div>
        </div>

        <VocabularyGrid
          vocabularyList={demoVocabulary}
          title="Demo - Từ vựng Công nghệ Thông tin"
        />
      </div>
    </div>
  );
}