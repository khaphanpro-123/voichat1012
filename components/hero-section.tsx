"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowRight, Mic, BookOpen, MessageCircle, Trophy } from "lucide-react";

export function HeroSection() {
  const images = ["/bg_dashboard_r.png", "/bg_dashboard.png"];
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % images.length);
    }, 5000);
    return () => clearInterval(interval);
  }, [images.length]);

  const features = [
    { icon: Mic, text: "Voice Chat thực tế" },
    { icon: BookOpen, text: "Học từ vựng thông minh" },
    { icon: MessageCircle, text: "Luyện hội thoại thực tế" },
    { icon: Trophy, text: "Theo dõi tiến trình" },
  ];

  return (
    <section className="relative overflow-hidden px-6 sm:px-12 pb-20 sm:pb-32 py-16 sm:py-24">
      {/* Background Images */}
      {images.map((img, index) => (
        <div
          key={index}
          className={`absolute inset-0 w-full h-full bg-cover bg-center bg-fixed transition-opacity duration-1000 ${
            index === currentIndex ? "opacity-100" : "opacity-0"
          }`}
          style={{
            backgroundImage: `url(${img})`,
            filter: "blur(4px) brightness(0.6)",
          }}
        />
      ))}
      
      {/* Gradient Overlay */}
      <div className="absolute inset-0 bg-gradient-to-r from-white/70 via-white/50 to-transparent dark:from-black/70 dark:via-black/50 dark:to-transparent"></div>
      
      {/* Animated Blobs */}
      <div className="absolute top-1/4 left-0 w-80 h-80 bg-blue-300 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob animation-delay-0"></div>
      <div className="absolute bottom-1/4 right-0 w-96 h-96 bg-purple-300 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob animation-delay-2000"></div>
      <div className="absolute top-1/2 left-1/2 w-64 h-64 bg-pink-300 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob animation-delay-4000"></div>

      {/* Main Content */}
      <div className="w-full relative z-10">
        <div className="text-center">
          {/* Headline */}
          <h1 className="text-4xl lg:text-6xl font-extrabold text-gray-900 dark:text-gray-100 mb-6 text-balance animate-fade-in-up pt-2">
            Học Tiếng Anh cùng{" "}
            <span className="text-primary relative inline-block">
              AI Thông Minh
              <span className="absolute left-0 right-0 -bottom-2 h-1 bg-primary rounded-full"></span>
            </span>
          </h1>

          {/* Subtitle */}
          <p
            className="w-full text-center text-xl lg:text-2xl font-medium text-gray-700 dark:text-gray-300 mb-8 max-w-3xl mx-auto"
            style={{ animationDelay: "0.3s" }}
          >
            Luyện nói tiếng Anh như người bản xứ với Voice Chat AI. 
            Học từ vựng qua hình ảnh, nhận phản hồi ngữ pháp tức thì, 
            và theo dõi tiến trình học tập của bạn.
          </p>

          {/* Stats */}
          <div className="flex flex-wrap justify-center gap-8 mb-10">
            <div className="text-center flex flex-col items-center">
              <div className="w-16 h-16 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center mb-2">
                <span className="text-3xl">👨‍🎓</span>
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Người học</p>
            </div>
            <div className="text-center flex flex-col items-center">
              <div className="w-16 h-16 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center mb-2">
                <span className="text-3xl">📚</span>
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Từ vựng phong phú</p>
            </div>
            <div className="text-center flex flex-col items-center">
              <div className="w-16 h-16 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center mb-2">
                <span className="text-3xl">🤖</span>
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400">AI sẵn sàng 24/7</p>
            </div>
          </div>

          {/* CTA Buttons */}
          <div
            className="flex flex-col sm:flex-row gap-4 justify-center mb-16 animate-fade-in"
            style={{ animationDelay: "0.6s" }}
          >
            <Link href="/auth/register">
              <Button
                size="lg"
                className="min-w-[200px] text-lg font-semibold px-8 py-6 rounded-xl transform transition-all duration-300 hover:scale-105 hover:shadow-xl bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
              >
                Bắt đầu miễn phí
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </Link>
            <Link href="/dashboard-new">
              <Button
                variant="outline"
                size="lg"
                className="min-w-[200px] text-lg font-semibold px-8 py-6 rounded-xl bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm transform transition-all duration-300 hover:scale-105 hover:shadow-xl"
              >
                Xem Demo
              </Button>
            </Link>
          </div>

          {/* Features */}
          <div className="relative overflow-hidden mt-10">
            <div className="absolute inset-0 z-0 opacity-30">
              <div className="absolute top-1/4 left-1/4 w-72 h-72 bg-purple-300 rounded-full mix-blend-multiply filter blur-3xl animate-blob"></div>
              <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-blue-300 rounded-full mix-blend-multiply filter blur-3xl animate-blob animation-delay-2000"></div>
            </div>

            <div className="relative z-10 flex flex-col items-center">
              <h2 className="text-2xl lg:text-3xl font-bold text-white mb-8 text-center">
                Tính năng nổi bật
              </h2>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-4xl mx-auto">
                {features.map((f, i) => (
                  <div
                    key={i}
                    className="relative p-0.5 rounded-2xl group 
                         bg-gradient-to-br from-blue-500/80 via-purple-500/80 to-pink-500/80 
                         transform transition-transform duration-300 hover:scale-105"
                  >
                    <div
                      className="relative flex flex-col items-center gap-3 px-6 py-5 rounded-[calc(1rem-2px)] 
                           bg-white/10 dark:bg-gray-800/50 
                           border border-white/20 shadow-xl backdrop-blur-md
                           group-hover:bg-white/20 transition-colors duration-300"
                    >
                      <f.icon className="w-8 h-8 text-white" />
                      <span className="text-sm font-medium text-white text-center">
                        {f.text}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Testimonial Preview */}
          <div className="mt-16 max-w-2xl mx-auto">
            <div className="bg-white/20 dark:bg-gray-800/30 backdrop-blur-md rounded-2xl p-6 border border-white/20">
              <p className="text-lg text-white italic mb-4">
                "Mình đã học tiếng Anh nhiều năm nhưng không dám nói. Với L2-BRAIN, 
                mình có thể luyện nói bất cứ lúc nào mà không sợ xấu hổ. 
                Sau 3 tháng, mình đã tự tin giao tiếp hơn rất nhiều!"
              </p>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-white font-bold">
                  K
                </div>
                <div>
                  <p className="text-white font-medium">Phan Văn Kha</p>
                  <p className="text-white/60 text-sm">Sinh viên, Cần Thơ</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
