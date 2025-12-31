"use client";
import React, { useEffect, useState } from "react";
import { WelcomeToast } from "@/components/dashboard/welcome-toast";
import DailyLogForm from "@/components/dashboard/daily-log-form";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Bell, User, Newspaper, BarChart2, MessageSquare, BriefcaseMedical, ChevronDown, ChevronUp } from "lucide-react";
import { Navbar } from "@/components/navbar";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

// Định nghĩa kiểu dữ liệu cho thông báo
interface Notification {
    _id: string;
    title: string;
    content: string;
    source: string;
    link: string;
    date: string;
    image?: string;
}

// Chú thích: Component DailyLogChart đã được chuyển vào đây để tạo thành một file duy nhất.
// Điều này giúp tránh các lỗi liên quan đến việc import/export.
function DailyLogChart({ childId }: { childId: string }) {
    const [data, setData] = useState<{ date: string, sleep: number }[]>([]);

    useEffect(() => {
        if (!childId) return;
        (async () => {
            const res = await fetch(`/api/daily-log?childId=${childId}`);
            if (!res.ok) {
                console.error("Failed to fetch daily logs:", await res.text());
                return;
            }
            const js = await res.json();
            const items = (js.logs || []).map((l: any) => ({ date: new Date(l.date).toLocaleDateString(), sleep: l.sleepHours || 0 })).reverse();
            setData(items);
        })();
    }, [childId]);

    return (
        <Card className="rounded-3xl shadow-lg border-none">
            <CardHeader>
                <CardTitle className="text-2xl font-bold">Biểu đồ giấc ngủ hàng ngày</CardTitle>
                <CardDescription className="text-gray-600 dark:text-gray-400">
                    Theo dõi số giờ ngủ của trẻ theo từng ngày.
                </CardDescription>
            </CardHeader>
            <CardContent>
                <div style={{ width: "100%", height: 260 }}>
                    <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={data}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="date" />
                            <YAxis />
                            <Tooltip />
                            <Line type="monotone" dataKey="sleep" strokeWidth={2} />
                        </LineChart>
                    </ResponsiveContainer>
                </div>
            </CardContent>
        </Card>
    );
}

export default function DashboardPage() {
    const [user, setUser] = useState<any>(null);
    // Đã thay thế "mock-child-id" bằng một ID giả hợp lệ để tránh lỗi CastError từ MongoDB
    const [childId, setChildId] = useState<string | null>("66a8779b1248c8949c81c4e7");
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [expandedId, setExpandedId] = useState<string | null>(null);

    const handleToggleExpand = (id: string) => {
        setExpandedId(expandedId === id ? null : id);
    };

    useEffect(() => {
        const u = sessionStorage
.getItem("user");
        if (u) setUser(JSON.parse(u));

        // Fetch notifications from the API
        const fetchNotifications = async () => {
            try {
                const response = await fetch('/api/notifications');
                if (!response.ok) {
                    throw new Error('Failed to fetch notifications');
                }
                const data = await response.json();
                // Tạm thời thêm trường 'image' cho dữ liệu giả định
                const updatedData = data.map((item: Notification) => ({
                    ...item,
                    image: `https://placehold.co/400x200/2563EB/ffffff?text=Image`,
                }));
                setNotifications(updatedData);
            } catch (err: any) {
                setError(err.message);
            } finally {
                setIsLoading(false);
            }
        };

        fetchNotifications();
    }, []);

    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 p-6 flex">
            {/* Sidebar */}
            <aside className="w-64 bg-white dark:bg-gray-800 rounded-3xl p-6 shadow-xl hidden lg:block">
                <h2 className="text-2xl font-extrabold mb-8 text-gray-800 dark:text-gray-100">L2-BRAIN</h2>
                <nav className="space-y-3">
                    <a href="#" className="flex items-center space-x-3 py-3 px-4 rounded-xl text-white bg-blue-600 shadow-md font-semibold transition-all duration-200 hover:bg-blue-700">
                        <BarChart2 size={20} />
                        <span>Tổng quan</span>
                    </a>
                    <a href="#" className="flex items-center space-x-3 py-3 px-4 rounded-xl text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
                        <User size={20} />
                        <span>Thông tin trẻ</span>
                    </a>
                    <a href="#" className="flex items-center space-x-3 py-3 px-4 rounded-xl text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
                        <BriefcaseMedical size={20} />
                        <span>Thông tin y tế</span>
                    </a>
                    <a href="#" className="flex items-center space-x-3 py-3 px-4 rounded-xl text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
                        <MessageSquare size={20} />
                        <span>Cộng đồng</span>
                    </a>
                </nav>
            </aside>

            {/* Main Content */}
            <main className="flex-1 lg:ml-8">
                <Navbar />
                <header className="flex items-center justify-between mb-6">
                    <h1 className="text-4xl font-extrabold text-gray-800 dark:text-gray-100">Tổng quan</h1>
                </header>

                <section className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Cột chính bên trái */}
                    <div className="lg:col-span-2 space-y-8">
                        <WelcomeToast name={user?.name} />
                        <DailyLogForm childId={childId || ""} />
                        <DailyLogChart childId={childId || ""} />
                    </div>

                    {/* Cột phụ bên phải */}
                    <div className="space-y-8">
                        {/* Thẻ Tin tức & Thông báo */}
                        <Card className="rounded-3xl shadow-lg border-none">
                            <CardHeader>
                                <CardTitle className="text-2xl font-bold">Tin tức & Thông báo</CardTitle>
                                <CardDescription className="text-gray-600 dark:text-gray-400">
                                    Cập nhật các thông tin mới nhất từ L2-BRAIN.
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                {isLoading ? (
                                    <div className="text-center text-gray-500 dark:text-gray-400">Đang tải thông báo...</div>
                                ) : error ? (
                                    <div className="text-center text-red-500 dark:text-red-400">Lỗi: {error}</div>
                                ) : (
                                    <ul className="space-y-4">
                                        {notifications.map(notification => (
                                            <li key={notification._id} className="pb-4 border-b border-gray-200 dark:border-gray-700 last:border-b-0">
                                                <div
                                                    className="flex items-center justify-between cursor-pointer"
                                                    onClick={() => handleToggleExpand(notification._id)}
                                                >
                                                    <div className="flex items-center space-x-3 text-sm mb-2">
                                                        <Bell size={18} className="text-blue-500 flex-shrink-0" />
                                                        <h3 className="font-semibold text-gray-800 dark:text-gray-100">
                                                            {notification.title}
                                                        </h3>
                                                    </div>
                                                    {expandedId === notification._id ? <ChevronUp size={24} className="text-gray-500 transition-transform duration-300" /> : <ChevronDown size={24} className="text-gray-500 transition-transform duration-300" />}
                                                </div>
                                                <div
                                                    className={`overflow-hidden transition-all duration-300 ease-in-out ${expandedId === notification._id ? 'max-h-96 opacity-100 mt-4' : 'max-h-0 opacity-0'}`}
                                                >
                                                    <div className="pl-6 text-sm text-gray-600 dark:text-gray-400 space-y-2">
                                                        {notification.image && (
                                                            <img
                                                                src={notification.image}
                                                                alt={notification.title}
                                                                className="w-full h-auto rounded-xl object-cover mb-2 shadow-md"
                                                            />
                                                        )}
                                                        <p>
                                                            <span className="font-medium">Nội dung:</span> {notification.content}
                                                        </p>
                                                        <p>
                                                            <span className="font-medium">Nguồn:</span> {notification.source}
                                                        </p>
                                                        <p>
                                                            <span className="font-medium">Ngày:</span> {new Date(notification.date).toLocaleDateString("vi-VN")}
                                                        </p>
                                                        <p>
                                                            <span className="font-medium">Đường dẫn:</span>
                                                            <a href={notification.link} target="_blank" rel="noopener noreferrer" className="hover:underline text-blue-500 break-words">
                                                                {notification.link}
                                                            </a>
                                                        </p>
                                                    </div>
                                                </div>
                                            </li>
                                        ))}
                                    </ul>
                                )}
                            </CardContent>
                        </Card>
                    </div>
                </section>
            </main>
        </div>
    );
}
