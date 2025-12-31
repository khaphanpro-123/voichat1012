// app/page.tsx hoặc app/home/page.tsx

import { Navbar } from "@/components/navbar";
import { HeroSection } from "@/components/hero-section";
import { HowItWorksSection } from "@/components/how-it-works-section";
import { Footer } from "@/components/footer";

export default function HomePage() {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Thanh điều hướng */}
      <Navbar />

      {/* Nội dung chính */}
      <main className="flex-1 flex flex-col gap-y-0">
        {/* Khối 1: Hero & Features */}
        <div className="flex flex-col lg:flex-row relative z-10 overflow-hidden">
          {/* Vùng trái */}
          <div className="bg-gray-50 dark:bg-gray-600 rounded-none relative w-full">
            <HeroSection />
          </div>
        </div>

        {/* Khối 2: How It Works */}
        <div className="w-full relative z-20">
          <div className="bg-white dark:bg-gray-800 p-8 flex items-center justify-center">
            <HowItWorksSection />
          </div>
        </div>
      </main>

      {/* Chân trang */}
      <Footer />
    </div>
  );
}
