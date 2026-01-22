"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import {
  Users,
  Bell,
} from "lucide-react";
import AdminLayout from "@/components/AdminLayout";

export default function AdminDashboard() {
  const { status } = useSession();
  const router = useRouter();
  const [totalUsers, setTotalUsers] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/auth/login");
    }
  }, [status, router]);

  useEffect(() => {
    const fetchUserCount = async () => {
      try {
        const res = await fetch("/api/admin/statistics");
        const data = await res.json();
        if (data.success) {
          setTotalUsers(data.statistics.totalUsers);
        } else {
          if (res.status === 403) {
            router.push("/dashboard-new");
          }
        }
      } catch (error) {
        console.error("Error fetching statistics:", error);
      } finally {
        setLoading(false);
      }
    };

    if (status === "authenticated") {
      fetchUserCount();
    }
  }, [status, router]);

  if (status === "loading" || loading) {
    return (
      <AdminLayout>
        <div className="min-h-screen bg-gradient-to-br from-slate-100 to-slate-200 flex items-center justify-center">
          <motion.div
            className="text-5xl"
            animate={{ scale: [1, 1.1, 1], rotate: [0, 5, -5, 0] }}
            transition={{ duration: 1.5, repeat: Infinity }}
          >
            👨‍💼
          </motion.div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="min-h-screen bg-gradient-to-br from-slate-100 to-slate-200 p-6">
        <div className="max-w-5xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              👨‍💼 Admin Dashboard
            </h1>
            <p className="text-gray-600">Quản lý hệ thống và người dùng</p>
          </div>

          {/* Total Users Card */}
          <div className="bg-white rounded-xl p-6 shadow-lg mb-8">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 bg-blue-100 rounded-lg flex items-center justify-center">
                <Users className="w-8 h-8 text-blue-600" />
              </div>
              <div>
                <h3 className="text-3xl font-bold text-gray-900">{totalUsers}</h3>
                <p className="text-gray-600">Tổng số người dùng trong hệ thống</p>
              </div>
            </div>
          </div>

          {/* Main Actions */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Link href="/admin/users">
              <motion.div
                whileHover={{ scale: 1.02 }}
                className="bg-white rounded-xl p-8 shadow-lg cursor-pointer border-2 border-transparent hover:border-blue-500 transition h-full"
              >
                <div className="flex flex-col items-center text-center gap-4">
                  <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center">
                    <Users className="w-10 h-10 text-blue-600" />
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold text-gray-900 mb-2">
                      Quản lý người dùng
                    </h3>
                    <p className="text-gray-600">
                      Xem danh sách, thêm mới, xóa tài khoản người dùng
                    </p>
                  </div>
                </div>
              </motion.div>
            </Link>

            <Link href="/admin/notifications">
              <motion.div
                whileHover={{ scale: 1.02 }}
                className="bg-white rounded-xl p-8 shadow-lg cursor-pointer border-2 border-transparent hover:border-green-500 transition h-full"
              >
                <div className="flex flex-col items-center text-center gap-4">
                  <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center">
                    <Bell className="w-10 h-10 text-green-600" />
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold text-gray-900 mb-2">
                      Gửi thông báo
                    </h3>
                    <p className="text-gray-600">
                      Gửi thông báo với văn bản, hình ảnh, âm thanh, tài liệu
                    </p>
                  </div>
                </div>
              </motion.div>
            </Link>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}

