"use client";

import { useSession } from "next-auth/react";
import { useRouter, useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import {
  ArrowLeft,
  User,
  Mail,
  Calendar,
  TrendingUp,
  BookOpen,
  Activity,
  Clock,
} from "lucide-react";
import DashboardLayout from "@/components/DashboardLayout";

interface UserDetail {
  _id: string;
  username: string;
  fullName: string;
  email: string;
  avatar?: string;
  createdAt: string;
  progress: any;
  stats: {
    totalSessions: number;
    totalVocabulary: number;
    level: string;
    lastActive: string;
  };
}

export default function UserDetailPage() {
  const { status } = useSession();
  const router = useRouter();
  const params = useParams();
  const userId = params.userId as string;
  const [user, setUser] = useState<UserDetail | null>(null);
  const [sessions, setSessions] = useState<any[]>([]);
  const [vocabulary, setVocabulary] = useState<any[]>([]);
  const [sessionsByDate, setSessionsByDate] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/auth/login");
    }
  }, [status, router]);

  useEffect(() => {
    if (userId) {
      fetchUserDetail();
    }
  }, [userId]);

  const fetchUserDetail = async () => {
    try {
      const res = await fetch(`/api/admin/statistics/${userId}`);
      const data = await res.json();
      if (data.success) {
        setUser(data.user);
        setSessions(data.sessions);
        setVocabulary(data.vocabulary);
        setSessionsByDate(data.sessionsByDate);
      } else {
        if (res.status === 403) {
          router.push("/dashboard-new");
        }
      }
    } catch (error) {
      console.error("Error fetching user detail:", error);
    } finally {
      setLoading(false);
    }
  };

  if (status === "loading" || loading) {
    return (
      <DashboardLayout>
        <div className="min-h-screen bg-gradient-to-br from-slate-100 to-slate-200 flex items-center justify-center">
          <motion.div
            className="text-5xl"
            animate={{ scale: [1, 1.1, 1] }}
            transition={{ duration: 1.5, repeat: Infinity }}
          >
            📊
          </motion.div>
        </div>
      </DashboardLayout>
    );
  }

  if (!user) {
    return (
      <DashboardLayout>
        <div className="min-h-screen bg-gradient-to-br from-slate-100 to-slate-200 flex items-center justify-center">
          <p className="text-gray-600">Không tìm thấy người dùng</p>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="min-h-screen bg-gradient-to-br from-slate-100 to-slate-200 p-6">
        <div className="max-w-7xl mx-auto">
          {/* Back Button */}
          <Link
            href="/admin/users"
            className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-6 transition"
          >
            <ArrowLeft className="w-5 h-5" />
            Quay lại danh sách
          </Link>

          {/* User Info Card */}
          <div className="bg-white rounded-xl p-6 shadow-lg mb-6">
            <div className="flex items-start gap-6">
              <div className="w-20 h-20 bg-gradient-to-br from-teal-400 to-emerald-500 rounded-full flex items-center justify-center text-white text-3xl font-bold">
                {user.fullName.charAt(0).toUpperCase()}
              </div>
              <div className="flex-1">
                <h1 className="text-3xl font-bold text-gray-900 mb-2">
                  {user.fullName}
                </h1>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-gray-600">
                  <div className="flex items-center gap-2">
                    <User className="w-4 h-4" />
                    <span>@{user.username}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Mail className="w-4 h-4" />
                    <span>{user.email}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4" />
                    <span>
                      Tham gia: {new Date(user.createdAt).toLocaleDateString("vi-VN")}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4" />
                    <span>
                      Hoạt động: {new Date(user.stats.lastActive).toLocaleDateString("vi-VN")}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Statistics Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
            <div className="bg-white rounded-xl p-6 shadow-lg">
              <div className="flex items-center gap-4 mb-4">
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                  <TrendingUp className="w-6 h-6 text-blue-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-900">
                    {user.stats.level}
                  </p>
                  <p className="text-gray-600">Cấp độ</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl p-6 shadow-lg">
              <div className="flex items-center gap-4 mb-4">
                <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                  <Activity className="w-6 h-6 text-green-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-900">
                    {user.stats.totalSessions}
                  </p>
                  <p className="text-gray-600">Phiên học tập</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl p-6 shadow-lg">
              <div className="flex items-center gap-4 mb-4">
                <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                  <BookOpen className="w-6 h-6 text-purple-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-900">
                    {user.stats.totalVocabulary}
                  </p>
                  <p className="text-gray-600">Từ vựng</p>
                </div>
              </div>
            </div>
          </div>

          {/* Activity Chart */}
          {sessionsByDate.length > 0 && (
            <div className="bg-white rounded-xl p-6 shadow-lg mb-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4">
                📈 Hoạt động 30 ngày gần đây
              </h2>
              <div className="flex items-end gap-2 h-48">
                {sessionsByDate.map((day) => (
                  <div key={day._id} className="flex-1 flex flex-col items-center gap-2">
                    <div
                      className="w-full bg-gradient-to-t from-teal-500 to-emerald-600 rounded-t-lg"
                      style={{
                        height: `${(day.count / Math.max(...sessionsByDate.map((d) => d.count))) * 100}%`,
                        minHeight: "4px",
                      }}
                    />
                    <span className="text-xs text-gray-600 transform rotate-45 origin-left">
                      {new Date(day._id).toLocaleDateString("vi-VN", {
                        month: "short",
                        day: "numeric",
                      })}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Recent Sessions */}
          <div className="bg-white rounded-xl p-6 shadow-lg mb-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">
              🎯 Phiên học gần đây
            </h2>
            <div className="space-y-3">
              {sessions.slice(0, 10).map((session) => (
                <div
                  key={session._id}
                  className="flex items-center justify-between p-4 bg-gray-50 rounded-lg"
                >
                  <div>
                    <p className="font-semibold text-gray-900">
                      {session.topic || "Học tập"}
                    </p>
                    <p className="text-sm text-gray-600">
                      {new Date(session.createdAt).toLocaleString("vi-VN")}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-teal-600">
                      {session.duration || 0} phút
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Recent Vocabulary */}
          <div className="bg-white rounded-xl p-6 shadow-lg">
            <h2 className="text-xl font-bold text-gray-900 mb-4">
              📚 Từ vựng gần đây
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {vocabulary.slice(0, 12).map((vocab) => (
                <div
                  key={vocab._id}
                  className="p-4 bg-gradient-to-br from-teal-50 to-emerald-50 rounded-lg"
                >
                  <p className="font-bold text-gray-900 text-lg mb-1">
                    {vocab.word}
                  </p>
                  <p className="text-sm text-gray-600 mb-2">{vocab.meaning}</p>
                  {vocab.ipa && (
                    <p className="text-xs text-teal-600">/{vocab.ipa}/</p>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
