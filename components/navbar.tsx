"use client";
import { useState } from "react";
import Link from "next/link";
import { Menu, X, BookOpen, HelpCircle, LayoutDashboard, Phone } from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";
import { cn } from "@/lib/utils";

const tabs = [
  { href: "/learn", label: "Khóa học", icon: BookOpen },
  { href: "/settings", label: "Khảo sát", icon: HelpCircle },
  { href: "/dashboard-new", label: "Dashboard", icon: LayoutDashboard },
  { href: "/contact", label: "Liên hệ", icon: Phone },
];

export function Navbar() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <nav className="sticky top-0 z-50 w-full bg-background/90 backdrop-blur-md shadow-md border-b border-gray-200 dark:border-gray-800">
      <div className="container mx-auto px-4 lg:px-6">
        <div className="flex h-20 items-center justify-between">
          {/* Logo */}
          <Link href="/" className="flex items-center space-x-2">
            <span className="text-3xl">🧠</span>
            <span className="text-2xl font-extrabold text-foreground">L2-BRAIN</span>
          </Link>

          {/* Desktop Navigation Tabs */}
          <div className="hidden md:flex items-center space-x-2 bg-gray-100 dark:bg-gray-800 rounded-full px-3 py-1">
            {tabs.map((tab) => (
              <Link
                key={tab.href}
                href={tab.href}
                className="flex items-center space-x-2 px-4 py-3 text-lg font-semibold rounded-full
                               text-foreground/80 hover:text-primary hover:bg-primary/10
                               transition-all duration-200"
              >
                <tab.icon className="h-5 w-5" />
                <span>{tab.label}</span>
              </Link>
            ))}
          </div>

          {/* Action Buttons */}
          <div className="hidden md:flex items-center space-x-3">
            <Link href="/auth/login">
              <button className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-primary transition">
                Đăng nhập
              </button>
            </Link>
            <Link href="/auth/register">
              <button className="px-4 py-2 text-sm font-medium bg-primary text-white rounded-lg hover:bg-primary/90 transition">
                Đăng ký miễn phí
              </button>
            </Link>
            <ThemeToggle />
          </div>

          {/* Mobile menu button */}
          <div className="md:hidden flex items-center space-x-2">
            <ThemeToggle />
            <button
              onClick={() => setIsOpen(!isOpen)}
              className="p-2 rounded-md text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            >
              {isOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
          </div>
        </div>

        {/* Mobile Navigation Tabs */}
        <div
          className={cn(
            "md:hidden absolute top-20 left-0 right-0 bg-background/95 dark:bg-gray-900/95 backdrop-blur-md transition-all duration-300 ease-in-out border-b border-gray-200 dark:border-gray-800",
            isOpen ? "transform translate-y-0 opacity-100" : "transform -translate-y-full opacity-0 pointer-events-none"
          )}
        >
          <div className="flex flex-col items-center py-6 space-y-4">
            {tabs.map((tab) => (
              <Link
                key={tab.href}
                href={tab.href}
                className="flex items-center space-x-2 text-xl font-semibold text-foreground hover:text-primary transition-colors"
                onClick={() => setIsOpen(false)}
              >
                <tab.icon className="h-5 w-5" />
                <span>{tab.label}</span>
              </Link>
            ))}
            <div className="flex gap-4 pt-4 border-t border-gray-200 dark:border-gray-700 w-full justify-center">
              <Link href="/auth/login" onClick={() => setIsOpen(false)}>
                <button className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                  Đăng nhập
                </button>
              </Link>
              <Link href="/auth/register" onClick={() => setIsOpen(false)}>
                <button className="px-4 py-2 text-sm font-medium bg-primary text-white rounded-lg">
                  Đăng ký
                </button>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
}
