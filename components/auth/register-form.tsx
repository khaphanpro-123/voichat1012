"use client";

import React, { useState, useMemo } from "react";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import { CheckCircle, XCircle, Eye, EyeOff } from "lucide-react";

export function RegisterForm() {
  const router = useRouter();
  const [formData, setFormData] = useState({ fullName: "", email: "", password: "", confirmPassword: "" });
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const emailValidation = useMemo(() => {
    if (!formData.email) return { isValid: false, message: "" };
    const isValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email);
    return { isValid, message: isValid ? "Email hop le" : "Email khong dung dinh dang" };
  }, [formData.email]);

  const passwordValidation = useMemo(() => {
    const pwd = formData.password;
    const hasMinLength = pwd.length >= 6;
    const hasUppercase = /[A-Z]/.test(pwd);
    const hasLowercase = /[a-z]/.test(pwd);
    const hasNumber = /[0-9]/.test(pwd);
    const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(pwd);
    return { hasMinLength, hasUppercase, hasLowercase, hasNumber, hasSpecialChar,
      isValid: hasMinLength && hasUppercase && hasLowercase && hasNumber && hasSpecialChar };
  }, [formData.password]);

  const passwordsMatch = formData.password === formData.confirmPassword && formData.confirmPassword.length > 0;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!formData.fullName.trim()) { setError("Vui long nhap ho ten"); return; }
    if (!emailValidation.isValid) { setError("Email khong dung dinh dang"); return; }
    if (!passwordValidation.isValid) { setError("Mat khau chua du yeu cau"); return; }
    if (!passwordsMatch) { setError("Mat khau khong khop"); return; }
    if (!agreedToTerms) { setError("Vui long dong y dieu khoan"); return; }

    setIsLoading(true);
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fullName: formData.fullName, email: formData.email, password: formData.password }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.message || "Dang ky that bai"); return; }
      const login = await signIn("credentials", { email: formData.email, password: formData.password, redirect: false });
      router.push(login?.ok ? "/dashboard-new" : "/auth/login");
    } catch { setError("Loi ket noi"); } finally { setIsLoading(false); }
  }

  const Item = ({ ok, text }: { ok: boolean; text: string }) => (
    <div className={`flex items-center gap-2 text-xs ${ok ? "text-green-600" : "text-gray-400"}`}>
      {ok ? <CheckCircle className="w-3.5 h-3.5" /> : <XCircle className="w-3.5 h-3.5" />}
      <span>{text}</span>
    </div>
  );

  return (
    <motion.form onSubmit={handleSubmit} initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
      {error && <div className="bg-red-100 text-red-700 p-3 rounded-lg text-sm">{error}</div>}
      <div>
        <label className="block text-sm font-medium mb-1">Ho va ten</label>
        <input required placeholder="Nhap ho ten" className="w-full px-4 py-2.5 rounded-lg border bg-gray-100 dark:bg-gray-700" value={formData.fullName} onChange={(e) => setFormData({ ...formData, fullName: e.target.value })} />
      </div>
      <div>
        <label className="block text-sm font-medium mb-1">Email</label>
        <input required type="email" placeholder="email@example.com" className={`w-full px-4 py-2.5 rounded-lg border bg-gray-100 dark:bg-gray-700 ${formData.email ? (emailValidation.isValid ? "border-green-500" : "border-red-500") : ""}`} value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} />
        {formData.email && <p className={`mt-1 text-xs ${emailValidation.isValid ? "text-green-600" : "text-red-500"}`}>{emailValidation.message}</p>}
      </div>
      <div>
        <label className="block text-sm font-medium mb-1">Mat khau</label>
        <div className="relative">
          <input required type={showPassword ? "text" : "password"} placeholder="Nhap mat khau" className="w-full px-4 py-2.5 pr-10 rounded-lg border bg-gray-100 dark:bg-gray-700" value={formData.password} onChange={(e) => setFormData({ ...formData, password: e.target.value })} />
          <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500">{showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}</button>
        </div>
        {formData.password && (
          <div className="mt-2 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg space-y-1">
            <Item ok={passwordValidation.hasMinLength} text="Toi thieu 6 ky tu" />
            <Item ok={passwordValidation.hasUppercase} text="Co chu in hoa (A-Z)" />
            <Item ok={passwordValidation.hasLowercase} text="Co chu thuong (a-z)" />
            <Item ok={passwordValidation.hasNumber} text="Co so (0-9)" />
            <Item ok={passwordValidation.hasSpecialChar} text="Co ky tu dac biet" />
          </div>
        )}
      </div>
      <div>
        <label className="block text-sm font-medium mb-1">Xac nhan mat khau</label>
        <div className="relative">
          <input required type={showConfirmPassword ? "text" : "password"} placeholder="Nhap lai mat khau" className={`w-full px-4 py-2.5 pr-10 rounded-lg border bg-gray-100 dark:bg-gray-700 ${formData.confirmPassword ? (passwordsMatch ? "border-green-500" : "border-red-500") : ""}`} value={formData.confirmPassword} onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })} />
          <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500">{showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}</button>
        </div>
        {formData.confirmPassword && <p className={`mt-1 text-xs ${passwordsMatch ? "text-green-600" : "text-red-500"}`}>{passwordsMatch ? "Khop" : "Khong khop"}</p>}
      </div>
      <div className="flex items-start gap-3">
        <input type="checkbox" id="terms" checked={agreedToTerms} onChange={(e) => setAgreedToTerms(e.target.checked)} className="mt-1 w-4 h-4" />
        <label htmlFor="terms" className="text-sm text-gray-600 dark:text-gray-400">Toi dong y voi <a href="/terms" className="text-blue-600 hover:underline">Dieu khoan</a> va <a href="/privacy" className="text-blue-600 hover:underline">Chinh sach bao mat</a></label>
      </div>
      <button type="submit" disabled={isLoading || !agreedToTerms || !passwordValidation.isValid || !emailValidation.isValid} className="w-full py-3 rounded-lg font-semibold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50">{isLoading ? "Dang xu ly..." : "Dang ky"}</button>
    </motion.form>
  );
}
