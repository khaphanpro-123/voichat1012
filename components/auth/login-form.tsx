"use client";
import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import { motion } from "framer-motion";

export function LoginForm() {
  const [formData, setFormData] = useState({ email: "", password: "" });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      // Add 15s timeout
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error("Timeout")), 15000)
      );

      const signInPromise = signIn("credentials", {
        email: formData.email,
        password: formData.password,
        redirect: false,
      });

      const result = await Promise.race([signInPromise, timeoutPromise]) as any;

      console.log("SignIn result:", result);

      if (result?.error) {
        setError("Email hoặc mật khẩu không đúng");
        return;
      }

      if (!result?.ok) {
        setError("Đăng nhập thất bại");
        return;
      }

      // Get session
      const { getSession } = await import("next-auth/react");
      const session = await getSession();
      
      console.log("Session:", session);
      
      if (session?.user) {
        const userRole = (session.user as any).role;
        console.log("Redirecting to dashboard, role:", userRole);
        
        // Use window.location for hard redirect
        if (userRole === "admin") {
          window.location.href = "/admin";
        } else {
          window.location.href = "/dashboard-new";
        }
      } else {
        console.error("No session after login");
        window.location.href = "/dashboard-new";
      }
    } catch (err: any) {
      console.error("Login error:", err);
      if (err.message === "Timeout") {
        setError("Kết nối chậm. Vui lòng thử lại.");
      } else {
        setError("Lỗi kết nối");
      }
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <motion.form
      onSubmit={handleSubmit}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="space-y-4"
    >
      {error && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-red-100 dark:bg-red-900 border border-red-400 text-red-700 dark:text-red-300 px-4 py-3 rounded-xl text-center text-sm"
        >
          {error}
        </motion.div>
      )}

      <div>
        <label className="block text-sm font-medium mb-1">Email</label>
        <input
          required
          type="email"
          placeholder="you@example.com"
          className="w-full px-4 py-2.5 rounded-lg border bg-gray-100 dark:bg-gray-700 focus:ring-2 focus:ring-blue-500"
          value={formData.email}
          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
        />
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">Mật khẩu</label>
        <input
          required
          type="password"
          placeholder="••••••••"
          className="w-full px-4 py-2.5 rounded-lg border bg-gray-100 dark:bg-gray-700 focus:ring-2 focus:ring-blue-500"
          value={formData.password}
          onChange={(e) => setFormData({ ...formData, password: e.target.value })}
        />
      </div>

      <motion.button
        type="submit"
        disabled={isLoading}
        whileHover={{ scale: isLoading ? 1 : 1.02 }}
        whileTap={{ scale: 0.98 }}
        className="w-full py-3 rounded-lg font-semibold text-white bg-blue-600 shadow-md hover:bg-blue-700 transition-colors duration-300 disabled:opacity-50"
      >
        {isLoading ? "Đang đăng nhập..." : "Đăng nhập"}
      </motion.button>
    </motion.form>
  );
}
