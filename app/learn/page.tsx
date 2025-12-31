"use client";
import { useState } from "react";
import Link from "next/link";
import { 
    MessageCircle, 
    BookOpen, 
    Mic, 
    Users, 
    Phone,
    Camera,
    Trophy,
    Clock
} from "lucide-react";

const learningModes = [
    {
        id: "chat",
        title: "Chat",
        description: "Nâng cao kỹ năng ngôn ngữ bằng cách trò chuyện với gia sư của bạn.",
        tags: ["#Writing", "#Reading"],
        icon: MessageCircle,
        color: "from-yellow-400 to-orange-400",
        bgColor: "bg-gradient-to-br from-yellow-50 to-orange-50",
        level: "Beginner"
    },
    {
        id: "word",
        title: "Word Mode",
        description: "Learn basic vocabulary with word decks.",
        tags: ["#Vocabulary", "#Speaking"],
        icon: BookOpen,
        color: "from-purple-400 to-indigo-400",
        bgColor: "bg-gradient-to-br from-purple-50 to-indigo-50",
        level: "Beginner"
    },
    {
        id: "sentence",
        title: "Sentence Mode",
        description: "Build a solid foundation of your language skills by learning basics.",
        tags: ["#Speaking", "#Pronunciation"],
        icon: Mic,
        color: "from-green-400 to-emerald-400",
        bgColor: "bg-gradient-to-br from-green-50 to-emerald-50",
        level: "Beginner"
    },
    {
        id: "dialogue",
        title: "Dialogue Mode",
        description: "Practice essential daily vocabulary with pre-scripted conversations.",
        tags: ["#Speaking", "#Pronunciation"],
        icon: Users,
        color: "from-red-400 to-pink-400",
        bgColor: "bg-gradient-to-br from-red-50 to-pink-50",
        level: "Beginner"
    },
    {
        id: "call",
        title: "Call Mode",
        description: "Luyện hội thoại thời gian thực qua giọng nói.",
        tags: ["#Speaking", "#Listening"],
        icon: Phone,
        color: "from-blue-400 to-cyan-400",
        bgColor: "bg-gradient-to-br from-blue-50 to-cyan-50",
        level: "Intermediate"
    },
    {
        id: "roleplay",
        title: "Roleplays",
        description: "Practice real-life scenarios through interactive roleplays.",
        tags: ["#Speaking", "#Conversation"],
        icon: Camera,
        color: "from-pink-400 to-rose-400",
        bgColor: "bg-gradient-to-br from-pink-50 to-rose-50",
        level: "Advanced"
    },
];

export default function LearnPage() {
    const [selectedMode, setSelectedMode] = useState(null);

    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
            {/* Header */}
            <header className="bg-white shadow-sm border-b">
                <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <Link href="/" className="text-2xl font-bold text-blue-600">
                            🇻🇳 VietLearn
                        </Link>
                    </div>
                    <nav className="flex items-center gap-6">
                        <Link href="/learn" className="text-gray-700 hover:text-blue-600 font-medium">
                            Learning modes
                        </Link>
                        <Link href="/dashboard" className="text-gray-700 hover:text-blue-600 font-medium">
                            Dashboard
                        </Link>
                        <Link href="/survey" className="text-gray-700 hover:text-blue-600 font-medium">
                            Survey
                        </Link>
                    </nav>
                </div>
            </header>

            <div className="max-w-7xl mx-auto px-6 py-12">
                <div className="grid lg:grid-cols-3 gap-8">
                    {/* Left: Learning Modes */}
                    <div className="lg:col-span-2">
                        <h1 className="text-4xl font-bold text-gray-900 mb-2">Learning modes</h1>
                        <p className="text-gray-600 mb-8">Choose your preferred way to learn Vietnamese</p>

                        <div className="grid md:grid-cols-2 gap-6">
                            {learningModes.map((mode) => (
                                <div
                                    key={mode.id}
                                    className={`${mode.bgColor} rounded-3xl p-6 shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 cursor-pointer border-2 border-transparent hover:border-blue-300`}
                                    onClick={() => setSelectedMode(mode)}
                                >
                                    <div className="flex items-start justify-between mb-4">
                                        <div className={`p-3 rounded-2xl bg-gradient-to-br ${mode.color} text-white`}>
                                            <mode.icon className="w-8 h-8" />
                                        </div>
                                        <span className="px-3 py-1 bg-white rounded-full text-xs font-semibold text-gray-700">
                                            {mode.level}
                                        </span>
                                    </div>
                                    
                                    <h3 className="text-2xl font-bold text-gray-900 mb-2">{mode.title}</h3>
                                    <p className="text-gray-600 mb-4 text-sm">{mode.description}</p>
                                    
                                    <div className="flex flex-wrap gap-2">
                                        {mode.tags.map((tag, idx) => (
                                            <span
                                                key={idx}
                                                className="px-3 py-1 bg-white/70 rounded-full text-xs font-medium text-blue-700"
                                            >
                                                {tag}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Right: Dashboard Stats */}
                    <div className="space-y-6">
                        {/* Promo Card */}
                        <div className="bg-gradient-to-br from-pink-500 to-rose-600 rounded-3xl p-6 text-white shadow-xl">
                            <h3 className="text-2xl font-bold mb-2">Cyber Monday Sale: up to 79% off!</h3>
                            <p className="text-sm mb-4 opacity-90">
                                For a limited time Talkpal Premium is on sale.
                            </p>
                            <button className="bg-white text-pink-600 px-6 py-2 rounded-full font-semibold hover:bg-gray-100 transition">
                                Upgrade now →
                            </button>
                        </div>

                        {/* Level Card */}
                        <div className="bg-white rounded-3xl p-6 shadow-lg">
                            <h3 className="text-xl font-bold text-gray-900 mb-2">Level 2</h3>
                            <p className="text-sm text-gray-600 mb-4">Your current level.</p>
                            
                            <div className="mb-4">
                                <div className="flex justify-between text-sm text-gray-600 mb-2">
                                    <span>Minutes left till the next level: 7 minutes</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className="text-2xl font-bold text-blue-600">2</span>
                                    <div className="flex-1 bg-gray-200 rounded-full h-3">
                                        <div className="bg-blue-600 h-3 rounded-full" style={{ width: "65%" }}></div>
                                    </div>
                                    <span className="text-2xl font-bold text-gray-400">3</span>
                                </div>
                            </div>
                            
                            <p className="text-xs text-gray-500">Keep on learning!</p>
                        </div>

                        {/* Stats Card */}
                        <div className="bg-white rounded-3xl p-6 shadow-lg">
                            <h3 className="text-xl font-bold text-gray-900 mb-4">Stats</h3>
                            <p className="text-sm text-gray-600 mb-6">Your personal learning data.</p>
                            
                            <div className="space-y-4">
                                <div className="flex items-center gap-4">
                                    <div className="p-3 bg-blue-100 rounded-2xl">
                                        <Clock className="w-6 h-6 text-blue-600" />
                                    </div>
                                    <div>
                                        <p className="text-2xl font-bold text-gray-900">9 minutes</p>
                                        <p className="text-sm text-gray-600">Total learning time.</p>
                                    </div>
                                </div>
                                
                                <div className="flex items-center gap-4">
                                    <div className="p-3 bg-green-100 rounded-2xl">
                                        <Trophy className="w-6 h-6 text-green-600" />
                                    </div>
                                    <div>
                                        <p className="text-2xl font-bold text-gray-900">3 sessions</p>
                                        <p className="text-sm text-gray-600">Completed today.</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
