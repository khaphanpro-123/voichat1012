"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import {
  ArrowLeft,
  Send,
  Bell,
  Image as ImageIcon,
  Music,
  Link as LinkIcon,
  FileText,
  Upload,
} from "lucide-react";
import DashboardLayout from "@/components/DashboardLayout";
import AdminLayout from "@/components/AdminLayout";

export default function AdminNotificationsPage() {
  const { status } = useSession();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    title: "",
    content: "",
    type: "text" as "text" | "image" | "audio" | "link" | "document",
    mediaUrl: "",
    documentUrl: "",
    linkUrl: "",
    targetUsers: "all" as "all" | string[],
  });

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/auth/login");
    }
  }, [status, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await fetch("/api/admin/notifications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const data = await res.json();
      if (data.success) {
        alert("Gửi thông báo thành công!");
        setFormData({
          title: "",
          content: "",
          type: "text",
          mediaUrl: "",
          documentUrl: "",
          linkUrl: "",
          targetUsers: "all",
        });
      } else {
        alert(data.message || "Lỗi khi gửi thông báo");
      }
    } catch (error) {
      console.error("Error sending notification:", error);
      alert("Lỗi khi gửi thông báo");
    } finally {
      setLoading(false);
    }
  };

  if (status === "loading") {
    return (
      <AdminLayout>
        <div className="min-h-screen bg-gradient-to-br from-slate-100 to-slate-200 flex items-center justify-center">
          <motion.div
            className="text-5xl"
            animate={{ scale: [1, 1.1, 1] }}
            transition={{ duration: 1.5, repeat: Infinity }}
          >
            📢
          </motion.div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="min-h-screen bg-gradient-to-br from-slate-100 to-slate-200 p-6">
        <div className="max-w-4xl mx-auto">
          {/* Back Button */}
          <Link
            href="/admin"
            className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-6 transition"
          >
            <ArrowLeft className="w-5 h-5" />
            Quay lại dashboard
          </Link>

          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              📢 Gửi thông báo
            </h1>
            <p className="text-gray-600">
              Gửi thông báo đến tất cả người học
            </p>
          </div>

          {/* Form */}
          <div className="bg-white rounded-xl p-6 shadow-lg">
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Title */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Tiêu đề <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formData.title}
                  onChange={(e) =>
                    setFormData({ ...formData, title: e.target.value })
                  }
                  placeholder="Nhập tiêu đề thông báo..."
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                />
              </div>

              {/* Content */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Nội dung <span className="text-red-500">*</span>
                </label>
                <textarea
                  required
                  value={formData.content}
                  onChange={(e) =>
                    setFormData({ ...formData, content: e.target.value })
                  }
                  placeholder="Nhập nội dung thông báo..."
                  rows={5}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent resize-none"
                />
              </div>

              {/* Type */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  Loại thông báo
                </label>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                  {[
                    { value: "text", label: "Văn bản", icon: FileText },
                    { value: "image", label: "Hình ảnh", icon: ImageIcon },
                    { value: "audio", label: "Âm thanh", icon: Music },
                    { value: "link", label: "Liên kết", icon: LinkIcon },
                    { value: "document", label: "Tài liệu", icon: Upload },
                  ].map((type) => (
                    <button
                      key={type.value}
                      type="button"
                      onClick={() =>
                        setFormData({
                          ...formData,
                          type: type.value as any,
                        })
                      }
                      className={`flex flex-col items-center gap-2 p-4 rounded-lg border-2 transition ${
                        formData.type === type.value
                          ? "border-teal-500 bg-teal-50"
                          : "border-gray-200 hover:border-gray-300"
                      }`}
                    >
                      <type.icon
                        className={`w-6 h-6 ${
                          formData.type === type.value
                            ? "text-teal-600"
                            : "text-gray-600"
                        }`}
                      />
                      <span
                        className={`text-sm font-medium ${
                          formData.type === type.value
                            ? "text-teal-600"
                            : "text-gray-700"
                        }`}
                      >
                        {type.label}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Media URL */}
              {formData.type === "image" && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    URL hình ảnh
                  </label>
                  <input
                    type="url"
                    value={formData.mediaUrl}
                    onChange={(e) =>
                      setFormData({ ...formData, mediaUrl: e.target.value })
                    }
                    placeholder="https://example.com/image.jpg"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                  />
                </div>
              )}

              {/* Audio URL */}
              {formData.type === "audio" && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    URL âm thanh
                  </label>
                  <input
                    type="url"
                    value={formData.mediaUrl}
                    onChange={(e) =>
                      setFormData({ ...formData, mediaUrl: e.target.value })
                    }
                    placeholder="https://example.com/audio.mp3"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                  />
                </div>
              )}

              {/* Link URL */}
              {formData.type === "link" && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Liên kết
                  </label>
                  <input
                    type="url"
                    value={formData.linkUrl}
                    onChange={(e) =>
                      setFormData({ ...formData, linkUrl: e.target.value })
                    }
                    placeholder="https://example.com"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                  />
                </div>
              )}

              {/* Document URL */}
              {formData.type === "document" && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    URL tài liệu
                  </label>
                  <input
                    type="url"
                    value={formData.documentUrl}
                    onChange={(e) =>
                      setFormData({ ...formData, documentUrl: e.target.value })
                    }
                    placeholder="https://example.com/document.pdf"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                  />
                </div>
              )}

              {/* Submit Button */}
              <div className="flex gap-3 pt-4">
                <Link
                  href="/admin"
                  className="flex-1 px-6 py-3 bg-gray-100 text-gray-700 font-medium rounded-xl hover:bg-gray-200 transition text-center"
                >
                  Hủy
                </Link>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-teal-500 to-emerald-600 text-white font-medium rounded-xl hover:shadow-lg transition disabled:opacity-50"
                >
                  {loading ? (
                    <>
                      <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                        className="w-5 h-5 border-2 border-white border-t-transparent rounded-full"
                      />
                      Đang gửi...
                    </>
                  ) : (
                    <>
                      <Send className="w-5 h-5" />
                      Gửi thông báo
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
