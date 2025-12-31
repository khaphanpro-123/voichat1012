"use client";

import React, { useState } from "react";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";

export function RegisterForm() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    password: "",
    confirmPassword: "",
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const validatePassword = (pwd: string) => {
    const hasMinLength = pwd.length >= 6;
    const hasSpecialChar = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]+/.test(pwd);
    return { hasMinLength, hasSpecialChar, isValid: hasMinLength && hasSpecialChar };
  };

  const passwordValidation = validatePassword(formData.password);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (!formData.fullName.trim()) {
      setError("Vui long nhap ho ten");
      return;
    }
    if (!formData.email.includes("@")) {
      setError("Email khong hop le");
      return;
    }
    if (!passwordValidation.isValid) {
      setError("Mat khau can toi thieu 6 ky tu va 1 ky tu dac biet");
      return;
    }
    if (formData.password !== formData.confirmPassword) {
      setError("Mat khau khong khop");
      return;
    }

    setIsLoading(true);
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName: formData.fullName,
          email: formData.email,
          password: formData.password,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.message || "Dang ky that bai");
        return;
      }

      const login = await signIn("credentials", {
        email: formData.email,
        password: formData.password,
        redirect: false,
      });

      router.push(login?.ok ? "/dashboard-new" : "/auth/login");
    } catch {
      setError("Loi ket noi server");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <motion.form
      onSubmit={handleSubmit}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-4"
    >
      {error && (
        <div className="bg-red-100 text-red-700 p-3 rounded-lg text-sm">{error}</div>
      )}

      <div>
        <label className="block text-sm font-medium mb-1">Ho va ten</label>
        <input
          required
          placeholder="Nhap ho ten"
          className="w-full px-4 py-2.5 rounded-lg border bg-gray-100 dark:bg-gray-700"
          value={formData.fullName}
          onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
        />
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">Email</label>
        <input
          required
          type="email"
          placeholder="email@example.com"
          className="w-full px-4 py-2.5 rounded-lg border bg-gray-100 dark:bg-gray-700"
          value={formData.email}
          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
        />
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">Mat khau</label>
        <input
          required
          type="password"
          placeholder="Toi thieu 6 ky tu, 1 ky tu dac biet"
          className="w-full px-4 py-2.5 rounded-lg border bg-gray-100 dark:bg-gray-700"
          value={formData.password}
          onChange={(e) => setFormData({ ...formData, password: e.target.value })}
        />
        {formData.password && (
          <div className="mt-2 text-xs space-y-1">
            <div className={passwordValidation.hasMinLength ? "text-green-600" : "text-gray-400"}>
              {passwordValidation.hasMinLength ? "V" : "O"} Toi thieu 6 ky tu
            </div>
            <div className={passwordValidation.hasSpecialChar ? "text-green-600" : "text-gray-400"}>
              {passwordValidation.hasSpecialChar ? "V" : "O"} Co it nhat 1 ky tu dac biet
            </div>
          </div>
        )}
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">Xac nhan mat khau</label>
        <input
          required
          type="password"
          placeholder="Nhap lai mat khau"
          className="w-full px-4 py-2.5 rounded-lg border bg-gray-100 dark:bg-gray-700"
          value={formData.confirmPassword}
          onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
        />
      </div>

      <button
        type="submit"
        disabled={isLoading}
        className="w-full py-3 rounded-lg font-semibold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
      >
        {isLoading ? "Dang xu ly..." : "Dang ky"}
      </button>
    </motion.form>
  );
}
