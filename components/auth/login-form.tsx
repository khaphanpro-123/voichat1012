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
      const result = await signIn("credentials", {
        email: formData.email,
        password: formData.password,
        redirect: false,
      });

      if (result?.error) {
        setError("Email hoặc mật khẩu không đúng");
        return;
      }

      // Check user role to redirect accordingly
      const userRes = await fetch("/api/users/me");
      const userData = await userRes.json();
      
      console.log("User data from API:", userData);
      
      if (userData.success && userData.user) {
        console.log("User role:", userData.user.role);
        if (userData.user.role === "admin") {
          console.log("Redirecting to admin dashboard");
          router.push("/admin");
        } else {
          console.log("Redirecting to user dashboard");
          router.push("/dashboard-new");
        }
      } else {
        console.log("No user data, redirecting to user dashboard");
        router.push("/dashboard-new");
      }
    } catch (err) {
      console.error(err);
      setError("Lỗi kết nối");
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
