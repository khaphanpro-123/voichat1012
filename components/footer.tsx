import Link from "next/link";
import { Mail, Phone, MapPin, Facebook, Youtube, Instagram } from "lucide-react";

export function Footer() {
  return (
    <footer className="relative bg-gray-900 text-white overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 z-0 opacity-20">
        <div
          className="w-full h-full"
          style={{
            backgroundImage:
              "linear-gradient(25deg, rgba(59, 130, 246, 0.2), rgba(168, 85, 247, 0.2), rgba(236, 72, 153, 0.2))",
          }}
        ></div>
      </div>

      <div className="container mx-auto px-6 py-16 relative z-10">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12">
          {/* Logo & Description */}
          <div>
            <Link href="/" className="flex items-center space-x-2 mb-4">
              <span className="text-3xl"></span>
              <span className="text-2xl font-extrabold">L2-BRAIN</span>
            </Link>
            <p className="text-gray-400 mb-6">
              Nền tảng học tiếng Anh thông minh, giúp người Việt tự tin giao tiếp tiếng Anh.
            </p>
            <div className="flex space-x-4">
              <Link href="#" aria-label="Facebook" className="hover:text-blue-400 transition">
                <Facebook className="h-6 w-6" />
              </Link>
              <Link href="#" aria-label="Youtube" className="hover:text-red-500 transition">
                <Youtube className="h-6 w-6" />
              </Link>
              <Link href="#" aria-label="Instagram" className="hover:text-pink-400 transition">
                <Instagram className="h-6 w-6" />
              </Link>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="text-lg font-bold mb-4">Khóa học</h3>
            <ul className="space-y-2 text-gray-400">
              <li><Link href="/dashboard-new/chat" className="hover:text-white transition">Voice Chat</Link></li>
              <li><Link href="/dashboard-new/vocabulary" className="hover:text-white transition">Học từ vựng</Link></li>
              <li><Link href="/dashboard-new/documents-simple" className="hover:text-white transition">Upload tài liệu</Link></li>
              <li><Link href="/dashboard-new/pronunciation" className="hover:text-white transition">Luyện phát âm</Link></li>
            </ul>
          </div>

          {/* Support */}
          <div>
            <h3 className="text-lg font-bold mb-4">Hỗ trợ</h3>
            <ul className="space-y-2 text-gray-400">
              <li><Link href="/settings" className="hover:text-white transition">Cài đặt API Key</Link></li>
              <li><Link href="#" className="hover:text-white transition">Hướng dẫn sử dụng</Link></li>
              <li><Link href="#" className="hover:text-white transition">Câu hỏi thường gặp</Link></li>
              <li><Link href="#" className="hover:text-white transition">Chính sách bảo mật</Link></li>
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h3 className="text-lg font-bold mb-4">Liên hệ</h3>
            <ul className="space-y-3 text-gray-400">
              <li className="flex items-center space-x-3">
                <span className="text-primary"></span>
                <span>Phan Văn Kha</span>
              </li>
              <li className="flex items-center space-x-3">
                <Mail className="h-5 w-5 text-primary" />
                <span>Sư phạm Tin Học</span>
              </li>
              <li className="flex items-center space-x-3">
                <MapPin className="h-5 w-5 text-primary" />
                <span>Can Tho University</span>
              </li>
              <li className="flex items-center space-x-3">
                <Phone className="h-5 w-5 text-primary" />
                <span>0356339381</span>
              </li>
            </ul>
          </div>
        </div>

        {/* Copyright */}
        <div className="border-t border-gray-700 mt-12 pt-8 text-center">
          <p className="text-gray-500 text-sm">
            © 2024 L2-BRAIN - Phan Văn Kha | Sư phạm Tin Học - Can Tho University
          </p>
        </div>
      </div>
    </footer>
  );
}
