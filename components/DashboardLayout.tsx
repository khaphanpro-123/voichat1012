"use client";
import { ReactNode, useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import { motion, AnimatePresence } from "framer-motion";
import {
  LayoutDashboard,
  MessageCircle,
  Settings,
  Menu,
  X,
  LogOut,
  BookOpen,
  FileText,
  AlertTriangle,
  ClipboardList,
  Camera,
} from "lucide-react";

interface DashboardLayoutProps {
  children: ReactNode;
  userLevel?: string;
}

const navItems = [
  { href: "/dashboard-new", label: "Dashboard", icon: LayoutDashboard },
  { href: "/dashboard-new/chat", label: "Voice Chat", icon: MessageCircle },
  { href: "/dashboard-new/image-learning", label: "Học qua hình ảnh", icon: Camera },
  { href: "/dashboard-new/documents", label: "Tải lên tài liệu", icon: FileText },
  { href: "/dashboard-new/vocabulary", label: "Từ vựng", icon: BookOpen },
  { href: "/dashboard-new/survey", label: "Khảo sát học tập", icon: ClipboardList },
  { href: "/settings", label: "Settings", icon: Settings },
];

export default function DashboardLayout({ children, userLevel = "Beginner" }: DashboardLayoutProps) {
  const pathname = usePathname();
  const { data: session } = useSession();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [level, setLevel] = useState(userLevel);
  const [showLogoutModal, setShowLogoutModal] = useState(false);

  useEffect(() => {
    const loadProgress = async () => {
      if (session?.user) {
        const userId = (session.user as any).id;
        if (userId) {
          try {
            const res = await fetch(`/api/user-progress?userId=${userId}`);
            const data = await res.json();
            if (data.success && data.progress) {
              setLevel(data.progress.level || "Beginner");
            }
          } catch (error) {
            console.error("Load progress error:", error);
          }
        }
      }
    };
    loadProgress();
  }, [session]);

  const userName = session?.user?.name || session?.user?.email?.split("@")[0] || "User";
  const userInitial = userName.charAt(0).toUpperCase();
  const userAvatar = session?.user?.image;

  const handleLogout = () => {
    setShowLogoutModal(true);
  };

  const confirmLogout = () => {
    signOut({ callbackUrl: "/auth/login" });
  };

  const cancelLogout = () => {
    setShowLogoutModal(false);
  };

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Logout Confirmation Modal */}
      <AnimatePresence>
        {showLogoutModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm"
            onClick={cancelLogout}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-2xl shadow-2xl p-6 mx-4 max-w-sm w-full"
            >
              <div className="flex flex-col items-center text-center">
                <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mb-4">
                  <AlertTriangle className="w-8 h-8 text-orange-500" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">Xác nhận đăng xuất</h3>
                <p className="text-gray-600 mb-6">
                  Phiên học tập của bạn sẽ được kết thúc. Bạn có chắc chắn muốn đăng xuất không?
                </p>
                <div className="flex gap-3 w-full">
                  <button
                    onClick={cancelLogout}
                    className="flex-1 px-4 py-3 bg-gray-100 text-gray-700 font-medium rounded-xl hover:bg-gray-200 transition"
                  >
                    Quay lại
                  </button>
                  <button
                    onClick={confirmLogout}
                    className="flex-1 px-4 py-3 bg-red-500 text-white font-medium rounded-xl hover:bg-red-600 transition"
                  >
                    Đăng xuất
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Mobile Menu Button */}
      <button
        onClick={() => setIsSidebarOpen(!isSidebarOpen)}
        className="lg:hidden fixed top-4 left-4 z-50 p-2 bg-white rounded-lg shadow-lg"
      >
        {isSidebarOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
      </button>

      {/* Sidebar */}
      <aside
        className={`fixed lg:static inset-y-0 left-0 z-40 w-64 bg-white border-r border-gray-200 transform transition-transform duration-300 ${
          isSidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        }`}
      >
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="p-6 border-b border-gray-200">
            <Link href="/dashboard-new" className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-teal-500 to-emerald-600 rounded-xl flex items-center justify-center">
                <span className="text-2xl">🇬🇧</span>
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">EnglishPal</h1>
                <p className="text-xs text-gray-500">Level: {level}</p>
              </div>
            </Link>
          </div>

          {/* Navigation */}
          <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
            {navItems.map((item) => {
              const isActive = pathname === item.href || 
                (item.href !== "/dashboard-new" && pathname?.startsWith(item.href));
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setIsSidebarOpen(false)}
                  className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
                    isActive
                      ? "bg-gradient-to-r from-teal-500 to-emerald-600 text-white shadow-lg"
                      : "text-gray-700 hover:bg-gray-100"
                  }`}
                >
                  <item.icon className="w-5 h-5" />
                  <span className="font-medium">{item.label}</span>
                </Link>
              );
            })}
          </nav>

          {/* User Info */}
          <div className="p-4 border-t border-gray-200">
            <div className="flex items-center gap-3 p-3 bg-gradient-to-r from-teal-50 to-emerald-50 rounded-xl">
              {userAvatar ? (
                <img src={userAvatar} alt={userName} className="w-10 h-10 rounded-full object-cover" />
              ) : (
                <div className="w-10 h-10 bg-gradient-to-br from-teal-400 to-emerald-500 rounded-full flex items-center justify-center text-white font-bold">
                  {userInitial}
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-gray-900 truncate">{userName}</p>
                <p className="text-xs text-gray-600">{level}</p>
              </div>
            </div>
            
            <button
              onClick={handleLogout}
              className="mt-3 w-full flex items-center justify-center gap-2 px-4 py-2 text-sm text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
            >
              <LogOut className="w-4 h-4" />
              <span>Đăng xuất</span>
            </button>
          </div>
        </div>
      </aside>

      {/* Overlay for mobile */}
      {isSidebarOpen && (
        <div className="lg:hidden fixed inset-0 bg-black bg-opacity-50 z-30" onClick={() => setIsSidebarOpen(false)} />
      )}

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto">{children}</main>
    </div>
  );
}
