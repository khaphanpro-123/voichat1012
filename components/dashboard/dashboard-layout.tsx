"use client"

import type React from "react"
import { useState } from "react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Heart, LayoutDashboard, Calendar, BarChart3, Phone, BookOpen, Settings, Menu, X, LogOut } from "lucide-react"
import { ThemeToggle } from "@/components/theme-toggle"

// Hàm logout gọi API + clear sessionStorage

async function logout(router: ReturnType<typeof useRouter>) {
  try {
    const res = await fetch("/api/auth/logout", {
      method: "POST",
      credentials: "include",
    })
    if (res.ok) {
      sessionStorage
.clear()
      router.push("auth/login") // chuyển hướng về trang login
    }
  } catch (error) {
    console.error("Logout failed:", error)
  }
}

interface DashboardLayoutProps {
  children: React.ReactNode
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const pathname = usePathname()
  const router = useRouter()

  const navigation = [
    { name: "Tổng quan", href: "/dashboard", icon: LayoutDashboard },
    { name: "Đánh giá hàng ngày", href: "/dashboard/assessment", icon: Calendar },
    { name: "Kết quả phân tích", href: "/dashboard/results", icon: BarChart3 },
    { name: "Liên hệ khẩn cấp", href: "/dashboard/emergency", icon: Phone },
    { name: "Tài nguyên", href: "/dashboard/resources", icon: BookOpen },
    { name: "Cài đặt", href: "/dashboard/settings", icon: Settings },
  ]

  return (
    <div className="min-h-screen bg-background">
      {/* Mobile sidebar */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="fixed inset-0 bg-black/50" onClick={() => setSidebarOpen(false)} />
          <div className="fixed left-0 top-0 h-full w-64 bg-sidebar border-r">
            <div className="flex h-16 items-center justify-between px-4">
              <Link href="/" className="flex items-center space-x-2">
                <Heart className="h-8 w-8 text-sidebar-primary" />
                <span className="text-xl font-bold text-sidebar-foreground">L2-BRAIN</span>
              </Link>
              <Button variant="ghost" size="sm" onClick={() => setSidebarOpen(false)}>
                <X className="h-5 w-5" />
              </Button>
            </div>
            <nav className="px-4 py-4">
              {navigation.map((item) => (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`flex items-center space-x-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    pathname === item.href
                      ? "bg-sidebar-accent text-sidebar-accent-foreground"
                      : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                  }`}
                  onClick={() => setSidebarOpen(false)}
                >
                  <item.icon className="h-5 w-5" />
                  <span>{item.name}</span>
                </Link>
              ))}
            </nav>
          </div>
        </div>
      )}

      {/* Desktop sidebar */}
      <div className="hidden lg:fixed lg:inset-y-0 lg:left-0 lg:z-50 lg:block lg:w-64 lg:bg-sidebar lg:border-r">
        <div className="flex h-16 items-center px-4">
          <Link href="/" className="flex items-center space-x-2">
            <Heart className="h-8 w-8 text-sidebar-primary" />
            <span className="text-xl font-bold text-sidebar-foreground">L2-BRAIN</span>
          </Link>
        </div>
        <nav className="px-4 py-4">
          {navigation.map((item) => (
            <Link
              key={item.name}
              href={item.href}
              className={`flex items-center space-x-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors mb-1 ${
                pathname === item.href
                  ? "bg-sidebar-accent text-sidebar-accent-foreground"
                  : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
              }`}
            >
              <item.icon className="h-5 w-5" />
              <span>{item.name}</span>
            </Link>
          ))}
        </nav>
      </div>

      {/* Main content */}
      <div className="lg:pl-64">
        {/* Top bar */}
        <div className="sticky top-0 z-40 flex h-16 items-center gap-x-4 border-b bg-background px-4 shadow-sm sm:gap-x-6 sm:px-6 lg:px-8">
          <Button variant="ghost" size="sm" className="lg:hidden" onClick={() => setSidebarOpen(true)}>
            <Menu className="h-5 w-5" />
          </Button>

          <div className="flex flex-1 gap-x-4 self-stretch lg:gap-x-6">
            <div className="flex flex-1" />
            <div className="flex items-center gap-x-4 lg:gap-x-6">
              <ThemeToggle />
              <Button variant="ghost" size="sm" onClick={() => logout(router)}>
                <LogOut className="h-4 w-4 mr-2" />
                Đăng xuất
              </Button>
            </div>
          </div>
        </div>

        {/* Page content */}
        <main className="py-8 px-4 sm:px-6 lg:px-8">{children}</main>
      </div>
    </div>
  )
}
