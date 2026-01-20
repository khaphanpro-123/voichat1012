"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import {
  Users,
  BookOpen,
  TrendingUp,
  Bell,
  BarChart3,
  UserPlus,
  Activity,
} from "lucide-react";
import DashboardLayout from "@/components/DashboardLayout";

interface Statistics {
  totalUsers: number;
  totalSessions: number;
  totalVocabulary: number;
  recentSessions: number;
  recentUsers: number;
  levelDistribution: Array<{ _id: string; count: number }>;
  activeUsers: Array<{
    userId: string;
    sessionCount: number;
    username: string;
    fullName: string;
    email: string;
  }>;
}

export default function AdminDashboard() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [statistics, setStatistics] = useState<Statistics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/auth/login");
    }
  }, [status, router]);

  useEffect(() => {
    const fetchStatistics = async () => {
      try {
        const res = await fetch("/api/admin/statistics");
        const data = await res.json();
        if (data.success) {
          setStatistics(data.statistics);
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
      fetchStatistics();
    }
  }, [status, router]);

  if (status === "loading" || loading) {
    return (
      <DashboardLayout>
        <div className="min-h-screen bg-gradient-to-br from-slate-100 to-slate-200 flex items-center justify-center">
          <motion.div
            className="text-5xl"
            animate={{ scale: [1, 1.1, 1], rotate: [0, 5, -5, 0] }}
            transition={{ duration: 1.5, repeat: Infinity }}
          >
            👨‍💼
          </motion.div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="min-h-screen bg-gradient-to-br from-slate-100 to-slate-200 p-6">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              👨‍💼 Admin Dashboard
            </h1>
            <p className="text-gray-600">Quản lý hệ thống và người dùng</p>
          </div>

          {/* Quick Actions */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
            <Link href="/admin/users">
              <motion.div
                whileHover={{ scale: 1.02 }}
                className="bg-white rounded-xl p-6 shadow-lg cursor-pointer border-2 border-transparent hover:border-blue-500 transition"
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                    <Users className="w-6 h-6 text-blue-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">Quản lý người dùng</h3>
                    <p className="text-sm text-gray-600">Xem, thêm, xóa tài khoản</p>
                  </div>
                </div>
              </motion.div>
            </Link>

            <Link href="/admin/notifications">
              <motion.div
                whileHover={{ scale: 1.02 }}
                className="bg-white rounded-xl p-6 shadow-lg cursor-pointer border-2 border-transparent hover:border-green-500 transition"
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                    <Bell className="w-6 h-6 text-green-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">Gửi thông báo</h3>
                    <p className="text-sm text-gray-600">Thông báo cho người học</p>
                  </div>
                </div>
              </motion.div>
            </Link>

            <Link href="/admin/users">
              <motion.div
                whileHover={{ scale: 1.02 }}
                className="bg-white rounded-xl p-6 shadow-lg cursor-pointer border-2 border-transparent hover:border-purple-500 transition"
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                    <BarChart3 className="w-6 h-6 text-purple-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">Thống kê chi tiết</h3>
                    <p className="text-sm text-gray-600">Xem thống kê từng người</p>
                  </div>
                </div>
              </motion.div>
            </Link>
          </div>

          {/* Statistics Cards */}
          {statistics && (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-white rounded-xl p-6 shadow-lg"
                >
                  <div className="flex items-center justify-between mb-4">
                    <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                      <Users className="w-6 h-6 text-blue-600" />
                    </div>
                    <span className="text-sm text-green-600 font-medium">
                      +{statistics.recentUsers} tuần này
                    </span>
                  </div>
                  <h3 className="text-2xl font-bold text-gray-900 mb-1">
                    {statistics.totalUsers}
                  </h3>
                  <p className="text-gray-600">Tổng người dùng</p>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 }}
                  className="bg-white rounded-xl p-6 shadow-lg"
                >
                  <div className="flex items-center justify-between mb-4">
                    <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                      <Activity className="w-6 h-6 text-green-600" />
                    </div>
                    <span className="text-sm text-green-600 font-medium">
                      +{statistics.recentSessions} tuần này
                    </span>
                  </div>
                  <h3 className="text-2xl font-bold text-gray-900 mb-1">
                    {statistics.totalSessions}
                  </h3>
                  <p className="text-gray-600">Phiên học tập</p>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                  className="bg-white rounded-xl p-6 shadow-lg"
                >
                  <div className="flex items-center justify-between mb-4">
                    <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                      <BookOpen className="w-6 h-6 text-purple-600" />
                    </div>
                  </div>
                  <h3 className="text-2xl font-bold text-gray-900 mb-1">
                    {statistics.totalVocabulary}
                  </h3>
                  <p className="text-gray-600">Từ vựng đã học</p>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                  className="bg-white rounded-xl p-6 shadow-lg"
                >
                  <div className="flex items-center justify-between mb-4">
                    <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
                      <TrendingUp className="w-6 h-6 text-orange-600" />
                    </div>
                  </div>
                  <h3 className="text-2xl font-bold text-gray-900 mb-1">
                    {statistics.levelDistribution.length}
                  </h3>
                  <p className="text-gray-600">Cấp độ khác nhau</p>
                </motion.div>
              </div>

              {/* Active Users */}
              <div className="bg-white rounded-xl p-6 shadow-lg mb-8">
                <h2 className="text-xl font-bold text-gray-900 mb-4">
                  🏆 Người dùng tích cực nhất
                </h2>
                <div className="space-y-3">
                  {statistics.activeUsers.map((user, index) => (
                    <Link
                      key={user.userId}
                      href={`/admin/users/${user.userId}`}
                      className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition"
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 bg-gradient-to-br from-teal-400 to-emerald-500 rounded-full flex items-center justify-center text-white font-bold">
                          {index + 1}
                        </div>
                        <div>
                          <p className="font-semibold text-gray-900">{user.fullName}</p>
                          <p className="text-sm text-gray-600">@{user.username}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-teal-600">{user.sessionCount}</p>
                        <p className="text-sm text-gray-600">phiên học</p>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>

              {/* Level Distribution */}
              <div className="bg-white rounded-xl p-6 shadow-lg">
                <h2 className="text-xl font-bold text-gray-900 mb-4">
                  📊 Phân bố cấp độ
                </h2>
                <div className="space-y-3">
                  {statistics.levelDistribution.map((level) => (
                    <div key={level._id} className="flex items-center gap-4">
                      <div className="w-32 font-medium text-gray-700">{level._id}</div>
                      <div className="flex-1 bg-gray-200 rounded-full h-8 overflow-hidden">
                        <div
                          className="bg-gradient-to-r from-teal-500 to-emerald-600 h-full flex items-center justify-end px-3 text-white font-semibold text-sm"
                          style={{
                            width: `${(level.count / statistics.totalUsers) * 100}%`,
                          }}
                        >
                          {level.count}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
