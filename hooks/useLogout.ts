// hooks/useLogout.ts
"use client"

import { useRouter } from "next/navigation"

export function useLogout() {
  const router = useRouter()

  const logout = async () => {
    try {
      // Gọi API logout
      await fetch("/api/auth/logout", {
        method: "POST",
      })

      // Xoá user trong sessionStorage

      sessionStorage
.removeItem("user")

      // Điều hướng về login
      router.push("auth/login")
    } catch (error) {
      console.error("❌ Logout error:", error)
    }
  }

  return logout
}
