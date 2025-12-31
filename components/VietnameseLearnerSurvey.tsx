"use client";
import { useSession } from "next-auth/react";
import React, { useState } from "react";

// Thang đo Likert 1-5
const LIKERT_SCALE = [
    { value: 1, label: "1 - Strongly Disagree" },
    { value: 2, label: "2 - Disagree" },
    { value: 3, label: "3 - Neutral" },
    { value: 4, label: "4 - Agree" },
    { value: 5, label: "5 - Strongly Agree" },
];

// Bộ câu hỏi đầy đủ
const SURVEY_PARTS = {
    MOV: {
        title: "PART 1: LEARNING MOTIVATION (MOV)",
        description: "Measuring the driving forces behind learning",
        items: [
            { code: "MOV1", text: "I study Vietnamese primarily for travel purposes." },
            { code: "MOV2", text: "Proficiency in Vietnamese will directly benefit my career or business." },
            { code: "MOV3", text: "My relationship with Vietnamese family or friends is my main motivation for learning." },
            { code: "MOV4", text: "I am learning Vietnamese because of my deep interest in Vietnamese history and culture." },
            { code: "MOV5", text: "I learn Vietnamese simply because I enjoy exploring new languages as a hobby." },
        ],
    },
    EXP: {
        title: "PART 2: BACKGROUND & EXPERIENCE (EXP)",
        description: "Measuring prior exposure and familiarity",
        items: [
            { code: "EXP1", text: "I have prior experience learning other Asian languages." },
            { code: "EXP2", text: "I can distinguish Vietnamese tones when listening." },
            { code: "EXP3", text: "I have mastered basic Vietnamese greetings." },
            { code: "EXP4", text: "I have previously taken Vietnamese courses or engaged in self-study." },
            { code: "EXP5", text: "I am familiar with the Vietnamese alphabet." },
        ],
    },
    STY: {
        title: "PART 3: PREFERRED LEARNING STYLES (STY)",
        description: "Identifying the most effective acquisition methods",
        items: [
            { code: "STY1", text: "I learn most effectively through visual content (images, videos)." },
            { code: "STY2", text: "I prioritize learning through listening and pronunciation practice over reading and writing." },
            { code: "STY3", text: "I prefer traditional learning methods involving reading texts and writing." },
            { code: "STY4", text: "Interactive exercises help me retain information better." },
            { code: "STY5", text: "I prefer a structured learning path over free exploration." },
        ],
    },
    GOA: {
        title: "PART 4: LEARNING GOALS (GOA)",
        description: "Measuring outcome expectations",
        items: [
            { code: "GOA1", text: "My ultimate goal is to achieve fluency in daily conversation." },
            { code: "GOA2", text: "Reading comprehension is the most important skill for me." },
            { code: "GOA3", text: "I want to understand Vietnamese media products (movies, music, news)." },
            { code: "GOA4", text: "Mastering Vietnamese writing is one of my main goals." },
            { code: "GOA5", text: "I am learning to pass Vietnamese proficiency exams (such as VSL, IVPT)." },
        ],
    },
    TIM: {
        title: "PART 5: TIME & COMMITMENT (TIM)",
        description: "Measuring time resources and perseverance",
        items: [
            { code: "TIM1", text: "I can commit at least 30 minutes a day to learning Vietnamese." },
            { code: "TIM2", text: "I find short, frequent study sessions (daily) more effective." },
            { code: "TIM3", text: "I prefer longer study sessions (over 1 hour) on weekends." },
            { code: "TIM4", text: "I can utilize my commute time for passive practice." },
            { code: "TIM5", text: "I am willing to maintain my studies continuously for at least the next 6 months." },
        ],
    },
    CHA: {
        title: "PART 6: PERCEIVED CHALLENGES (CHA)",
        description: "Measuring perceived difficulty",
        items: [
            { code: "CHA1", text: "Pronunciation (and tones) is my biggest barrier when learning Vietnamese." },
            { code: "CHA2", text: "I struggle with memorizing and retaining new vocabulary." },
            { code: "CHA3", text: "Vietnamese grammar structures are confusing to me." },
            { code: "CHA4", text: "I find it difficult to maintain motivation over a long period." },
            { code: "CHA5", text: "My biggest problem is the lack of an environment or partners to practice speaking." },
        ],
    },
};

// Modal thông báo
const Modal = ({ message, onClose }) => (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50">
        <div className="relative p-8 border w-96 shadow-lg rounded-xl bg-white text-center">
            <div className="text-xl font-semibold mb-4 text-gray-800">Notification</div>
            <p className="text-gray-600 mb-6">{message}</p>
            <button
                onClick={onClose}
                className="px-6 py-2 bg-blue-600 text-white text-base font-semibold rounded-lg hover:bg-blue-700"
            >
                Close
            </button>
        </div>
    </div>
);

// Spinner loading
const LoadingSpinner = () => (
    <svg
        className="animate-spin h-5 w-5 text-white inline"
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        viewBox="0 0 24 24"
    >
        <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
        ></circle>
        <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
        ></path>
    </svg>
);

// Component hiển thị kết quả
const ResultsDisplay = ({ answers, onBack }) => {
    const calculatePartScore = (partKey) => {
        const part = SURVEY_PARTS[partKey];
        const scores = part.items.map(item => answers[item.code] || 0);
        const total = scores.reduce((sum, score) => sum + score, 0);
        const average = total / part.items.length;
        return { total, average, max: part.items.length * 5 };
    };

    const allParts = Object.keys(SURVEY_PARTS).map(key => ({
        key,
        title: SURVEY_PARTS[key].title,
        ...calculatePartScore(key)
    }));

    return (
        <div className="space-y-6">
            <h2 className="text-2xl font-bold text-center text-blue-800 mb-6">
                Your Learning Profile
            </h2>
            
            <div className="space-y-4">
                {allParts.map(part => (
                    <div key={part.key} className="bg-white p-4 rounded-xl shadow border border-gray-200">
                        <div className="flex justify-between items-center mb-2">
                            <h3 className="font-semibold text-gray-800">{part.title}</h3>
                            <span className="text-sm font-bold text-blue-600">
                                {part.average.toFixed(1)}/5.0
                            </span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-3">
                            <div
                                className="bg-blue-600 h-3 rounded-full transition-all duration-500"
                                style={{ width: `${(part.average / 5) * 100}%` }}
                            ></div>
                        </div>
                    </div>
                ))}
            </div>

            <button
                onClick={onBack}
                className="w-full px-6 py-3 rounded-xl font-semibold text-white bg-blue-600 hover:bg-blue-700"
            >
                Back to Survey
            </button>
        </div>
    );
};

// Main component
export default function VietnameseLearnerSurvey() {
    const { data: session } = useSession();
    const [fullName, setFullName] = useState("");
    const [email, setEmail] = useState("");
    const [answers, setAnswers] = useState({});
    const [isLoading, setIsLoading] = useState(false);
    const [showModal, setShowModal] = useState(false);
    const [modalMessage, setModalMessage] = useState("");
    const [showResults, setShowResults] = useState(false);

    const handleAnswerChange = (code, value) => {
        setAnswers({ ...answers, [code]: parseInt(value) });
    };

    // Tính tổng số câu hỏi
    const totalQuestions = Object.values(SURVEY_PARTS).reduce(
        (sum, part) => sum + part.items.length,
        0
    );
    const answeredQuestions = Object.keys(answers).length;
    const canSubmit = fullName && email && answeredQuestions === totalQuestions;

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!canSubmit) return;

        setIsLoading(true);

        const submissionData = {
            userId: session?.user?.id || session?.user?.email,
            fullName,
            email,
            answers,
            timestamp: new Date().toISOString(),
        };

        try {
            const res = await fetch("/api/learner-survey", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(submissionData),
            });

            const data = await res.json();
            if (data.success) {
                setModalMessage("✅ Survey submitted successfully!");
                setShowModal(true);
                setShowResults(true);
            } else {
                setModalMessage("❌ " + data.message);
                setShowModal(true);
            }
        } catch (error) {
            console.error("Error submitting survey:", error);
            setModalMessage("⚠️ Unable to connect to server.");
            setShowModal(true);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-6 flex items-center justify-center font-sans">
            <div className="bg-white rounded-3xl shadow-2xl p-8 w-full max-w-3xl border border-blue-200">
                <div className="text-center mb-8">
                    <h1 className="text-4xl font-bold text-blue-800 mb-2">
                        Vietnamese Learner Survey
                    </h1>
                    <p className="text-gray-600">
                        Help us understand your learning journey
                    </p>
                </div>

                {showResults ? (
                    <ResultsDisplay answers={answers} onBack={() => setShowResults(false)} />
                ) : (
                    <form onSubmit={handleSubmit} className="space-y-6">
                        {/* Personal Information */}
                        <div className="bg-blue-50 p-6 rounded-2xl border border-blue-200">
                            <h3 className="text-xl font-bold text-blue-700 mb-4">Personal Information</h3>
                            <div className="grid sm:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-gray-700 font-semibold mb-2">
                                        Full Name *
                                    </label>
                                    <input
                                        type="text"
                                        value={fullName}
                                        onChange={(e) => setFullName(e.target.value)}
                                        className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="block text-gray-700 font-semibold mb-2">
                                        Email *
                                    </label>
                                    <input
                                        type="email"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
                                        required
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Progress Bar */}
                        <div className="bg-gray-50 p-4 rounded-xl border border-gray-200">
                            <div className="flex justify-between text-sm text-gray-600 mb-2">
                                <span>Progress</span>
                                <span>{answeredQuestions} / {totalQuestions} questions</span>
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-2">
                                <div
                                    className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                                    style={{ width: `${(answeredQuestions / totalQuestions) * 100}%` }}
                                ></div>
                            </div>
                        </div>

                        {/* Survey Parts */}
                        {Object.entries(SURVEY_PARTS).map(([partKey, part]) => (
                            <div key={partKey} className="bg-gray-50 p-6 rounded-2xl border border-gray-200">
                                <h3 className="text-xl font-bold text-blue-700 mb-2">
                                    {part.title}
                                </h3>
                                <p className="text-sm text-gray-600 mb-4 italic">
                                    {part.description}
                                </p>
                                <div className="space-y-4">
                                    {part.items.map((item) => (
                                        <div key={item.code} className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
                                            <p className="text-gray-800 font-medium mb-3">
                                                {item.code}: {item.text}
                                            </p>
                                            <div className="flex flex-wrap gap-3 justify-between">
                                                {LIKERT_SCALE.map((option) => (
                                                    <label
                                                        key={option.value}
                                                        className="flex items-center gap-2 cursor-pointer hover:bg-blue-50 p-2 rounded-lg transition"
                                                    >
                                                        <input
                                                            type="radio"
                                                            name={item.code}
                                                            value={option.value}
                                                            checked={answers[item.code] === option.value}
                                                            onChange={() => handleAnswerChange(item.code, option.value)}
                                                            className="form-radio text-blue-600 focus:ring-blue-500"
                                                            required
                                                        />
                                                        <span className="text-sm text-gray-700">
                                                            {option.value}
                                                        </span>
                                                    </label>
                                                ))}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))}

                        <button
                            type="submit"
                            disabled={!canSubmit || isLoading}
                            className={`w-full px-6 py-4 rounded-xl font-semibold text-white text-lg ${
                                canSubmit && !isLoading
                                    ? "bg-blue-600 hover:bg-blue-700 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition"
                                    : "bg-gray-400 cursor-not-allowed"
                            }`}
                        >
                            {isLoading ? <LoadingSpinner /> : "Submit Survey"}
                        </button>
                    </form>
                )}

                {showModal && (
                    <Modal message={modalMessage} onClose={() => setShowModal(false)} />
                )}
            </div>
        </div>
    );
}
