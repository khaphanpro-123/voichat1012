"use client";
import { useRouter } from "next/navigation";

export default function LogoutButton() {
  const router = useRouter();

  const handleLogout = async () => {
    // Xóa token trong sessionStorage
    sessionStorage.removeItem("token");

    // Gọi API logout để clear cookie server-side
    await fetch("/api/auth/logout", { method: "POST" });

    // Redirect sang login
    router.push("/auth/login");
  };

  return (
    <button
      onClick={handleLogout}
      className="px-4 py-2 rounded bg-red-500 text-white hover:bg-red-600"
    >
      Đăng xuất
    </button>
  );
}
