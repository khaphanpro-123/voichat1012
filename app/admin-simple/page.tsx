"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Link from "next/link";

export default function AdminSimplePage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [stats, setStats] = useState({ totalUsers: 0, totalVocabulary: 0, totalDocuments: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/auth/login");
    }
  }, [status, router]);

  useEffect(() => {
    if (status === "authenticated") {
      fetchStats();
    }
  }, [status]);

  const fetchStats = async () => {
    try {
      const res = await fetch("/api/admin-simple/stats");
      const data = await res.json();
      if (data.success) {
        setStats(data.stats);
      }
    } catch (error) {
      console.error("Error:", error);
    } finally {
      setLoading(false);
    }
  };

  if (status === "loading" || loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-2xl">⏳ Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            👨‍💼 Admin Panel
          </h1>
          <p className="text-gray-600">Simple & Clean Admin Dashboard</p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-3xl mb-2">👥</div>
            <div className="text-3xl font-bold text-gray-900">{stats.totalUsers}</div>
            <div className="text-gray-600">Total Users</div>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-3xl mb-2">📚</div>
            <div className="text-3xl font-bold text-gray-900">{stats.totalVocabulary}</div>
            <div className="text-gray-600">Vocabulary Items</div>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-3xl mb-2">📄</div>
            <div className="text-3xl font-bold text-gray-900">{stats.totalDocuments}</div>
            <div className="text-gray-600">Documents</div>
          </div>
        </div>

        {/* Action Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Link href="/admin-simple/users">
            <div className="bg-white rounded-lg shadow p-8 hover:shadow-lg transition cursor-pointer">
              <div className="text-5xl mb-4">👥</div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                Manage Users
              </h2>
              <p className="text-gray-600">
                View and manage all users in the system
              </p>
            </div>
          </Link>

          <Link href="/admin-simple/notifications">
            <div className="bg-white rounded-lg shadow p-8 hover:shadow-lg transition cursor-pointer">
              <div className="text-5xl mb-4">🔔</div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                Send Notifications
              </h2>
              <p className="text-gray-600">
                Send notifications to all users
              </p>
            </div>
          </Link>
        </div>

        {/* Back to Dashboard */}
        <div className="mt-8">
          <Link
            href="/dashboard-new"
            className="text-blue-600 hover:text-blue-800 font-medium"
          >
            ← Back to Dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}
