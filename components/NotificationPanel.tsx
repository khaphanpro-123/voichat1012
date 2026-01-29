"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  Bell,
  Image as ImageIcon,
  Music,
  Link as LinkIcon,
  FileText,
  ExternalLink,
} from "lucide-react";

interface Notification {
  _id: string;
  title: string;
  content: string;
  type: "text" | "image" | "audio" | "link" | "document";
  mediaUrl?: string;
  documentUrl?: string;
  linkUrl?: string;
  isRead: boolean;
  createdAt: string;
  createdBy: {
    username: string;
    fullName: string;
  };
}

interface NotificationPanelProps {
  isOpen: boolean;
  onClose: () => void;
  onNotificationRead: () => void;
}

export default function NotificationPanel({
  isOpen,
  onClose,
  onNotificationRead,
}: NotificationPanelProps) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isOpen) {
      fetchNotifications();
    }
  }, [isOpen]);

  const fetchNotifications = async () => {
    try {
      const res = await fetch("/api/notifications");
      const data = await res.json();
      if (data.success) {
        setNotifications(data.notifications);
      }
    } catch (error) {
      console.error("Error fetching notifications:", error);
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async (notificationId: string) => {
    try {
      await fetch("/api/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notificationId }),
      });
      
      setNotifications((prev) =>
        prev.map((n) =>
          n._id === notificationId ? { ...n, isRead: true } : n
        )
      );
      onNotificationRead();
    } catch (error) {
      console.error("Error marking notification as read:", error);
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "image":
        return <ImageIcon className="w-5 h-5" />;
      case "audio":
        return <Music className="w-5 h-5" />;
      case "link":
        return <LinkIcon className="w-5 h-5" />;
      case "document":
        return <FileText className="w-5 h-5" />;
      default:
        return <Bell className="w-5 h-5" />;
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40"
            onClick={onClose}
          />

          {/* Panel */}
          <motion.div
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            className="fixed right-0 top-0 bottom-0 w-full max-w-md bg-white shadow-2xl z-50 flex flex-col"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-br from-teal-500 to-emerald-600 rounded-lg flex items-center justify-center">
                  <Bell className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-gray-900">Thông báo</h2>
                  <p className="text-sm text-gray-600">
                    {notifications.filter((n) => !n.isRead).length} chưa đọc
                  </p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-2 hover:bg-gray-100 rounded-lg transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Notifications List */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                    className="w-8 h-8 border-4 border-teal-500 border-t-transparent rounded-full"
                  />
                </div>
              ) : notifications.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-gray-500">
                  <Bell className="w-16 h-16 mb-4 opacity-20" />
                  <p>Chưa có thông báo nào</p>
                </div>
              ) : (
                notifications.map((notification) => (
                  <motion.div
                    key={notification._id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`p-4 rounded-xl border-2 transition cursor-pointer ${
                      notification.isRead
                        ? "bg-gray-50 border-gray-200"
                        : "bg-teal-50 border-teal-200"
                    }`}
                    onClick={() => !notification.isRead && markAsRead(notification._id)}
                  >
                    <div className="flex items-start gap-3 mb-2">
                      <div
                        className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                          notification.isRead
                            ? "bg-gray-200 text-gray-600"
                            : "bg-teal-500 text-white"
                        }`}
                      >
                        {getTypeIcon(notification.type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-bold text-gray-900 mb-1">
                          {notification.title}
                        </h3>
                        <p className="text-sm text-gray-600 mb-2">
                          {notification.content}
                        </p>

                        {/* Media */}
                        {notification.type === "image" && notification.mediaUrl && (
                          <div className="mb-2">
                            <img
                              src={notification.mediaUrl}
                              alt={notification.title}
                              className="w-full h-48 object-cover rounded-lg mb-2"
                              onError={(e) => {
                                e.currentTarget.src = "/placeholder.jpg";
                              }}
                            />
                            <a
                              href={notification.mediaUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-2 px-3 py-2 bg-teal-500 text-white rounded-lg hover:bg-teal-600 text-sm font-medium transition"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <ExternalLink className="w-4 h-4" />
                              Xem ảnh gốc
                            </a>
                          </div>
                        )}

                        {/* Audio */}
                        {notification.type === "audio" && notification.mediaUrl && (
                          <div className="mb-2">
                            <audio controls className="w-full mb-2">
                              <source src={notification.mediaUrl} type="audio/mpeg" />
                              <source src={notification.mediaUrl} type="audio/wav" />
                              <source src={notification.mediaUrl} type="audio/ogg" />
                              Trình duyệt của bạn không hỗ trợ phát audio.
                            </audio>
                            <a
                              href={notification.mediaUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              download
                              className="inline-flex items-center gap-2 px-3 py-2 bg-teal-500 text-white rounded-lg hover:bg-teal-600 text-sm font-medium transition"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <ExternalLink className="w-4 h-4" />
                              Tải xuống audio
                            </a>
                          </div>
                        )}

                        {/* Link */}
                        {notification.type === "link" && notification.linkUrl && (
                          <div className="mb-2">
                            <a
                              href={notification.linkUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 text-sm font-medium transition break-all"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <ExternalLink className="w-4 h-4 flex-shrink-0" />
                              <span className="truncate">{notification.linkUrl}</span>
                            </a>
                          </div>
                        )}

                        {/* Document */}
                        {notification.type === "document" && notification.documentUrl && (
                          <div className="flex flex-wrap gap-2 mb-2">
                            <a
                              href={notification.documentUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-2 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 text-sm font-medium transition"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <ExternalLink className="w-4 h-4" />
                              Xem tài liệu
                            </a>
                            <a
                              href={notification.documentUrl}
                              download
                              className="inline-flex items-center gap-2 px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 text-sm font-medium transition"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <FileText className="w-4 h-4" />
                              Tải xuống
                            </a>
                          </div>
                        )}

                        <div className="flex items-center justify-between mt-2">
                          <p className="text-xs text-gray-500">
                            {new Date(notification.createdAt).toLocaleString("vi-VN")}
                          </p>
                          {!notification.isRead && (
                            <span className="text-xs font-semibold text-teal-600">
                              Mới
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </motion.div>
                ))
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
