"use client";
import React, { useState, useEffect } from "react";
import { CheckCircle, ChevronRight, ChevronLeft, BookOpen, Target, Clock, Lightbulb, RefreshCw, AlertCircle } from "lucide-react";

// Thang đo Likert 1-5
const LIKERT_SCALE = [
  { value: 1, label: "Hoàn toàn không đồng ý" },
  { value: 2, label: "Không đồng ý" },
  { value: 3, label: "Trung lập" },
  { value: 4, label: "Đồng ý" },
  { value: 5, label: "Hoàn toàn đồng ý" },
];

// Bộ câu hỏi khảo sát người Việt học tiếng Anh
const SURVEY_PARTS = {
  MOV: {
    title: "PHẦN 1: ĐỘNG LỰC HỌC TẬP",
    description: "Tìm hiểu lý do bạn muốn học tiếng Anh",
    items: [
      { code: "MOV1", text: "Tôi học tiếng Anh chủ yếu để đi du lịch nước ngoài." },
      { code: "MOV2", text: "Thành thạo tiếng Anh sẽ giúp ích trực tiếp cho công việc/sự nghiệp của tôi." },
      { code: "MOV3", text: "Tôi học tiếng Anh để giao tiếp với bạn bè/người thân nước ngoài." },
      { code: "MOV4", text: "Tôi học tiếng Anh vì yêu thích văn hóa phương Tây (phim, nhạc, sách)." },
      { code: "MOV5", text: "Tôi học tiếng Anh đơn giản vì thích khám phá ngôn ngữ mới." },
    ],
  },
  EXP: {
    title: "PHẦN 2: KINH NGHIỆM & NỀN TẢNG",
    description: "Đánh giá trình độ hiện tại của bạn",
    items: [
      { code: "EXP1", text: "Tôi đã học tiếng Anh ở trường từ cấp 2/cấp 3." },
      { code: "EXP2", text: "Tôi có thể nghe hiểu được các cuộc hội thoại tiếng Anh cơ bản." },
      { code: "EXP3", text: "Tôi có thể tự giới thiệu bản thân bằng tiếng Anh." },
      { code: "EXP4", text: "Tôi đã từng học tại trung tâm Anh ngữ hoặc tự học online." },
      { code: "EXP5", text: "Tôi quen thuộc với ngữ pháp tiếng Anh cơ bản (thì, câu hỏi, phủ định)." },
    ],
  },
  STY: {
    title: "PHẦN 3: PHONG CÁCH HỌC TẬP",
    description: "Xác định cách học phù hợp nhất với bạn",
    items: [
      { code: "STY1", text: "Tôi học hiệu quả nhất qua hình ảnh và video." },
      { code: "STY2", text: "Tôi ưu tiên luyện nghe và phát âm hơn đọc và viết." },
      { code: "STY3", text: "Tôi thích học qua đọc sách và ghi chép." },
      { code: "STY4", text: "Các bài tập tương tác giúp tôi nhớ lâu hơn." },
      { code: "STY5", text: "Tôi thích có lộ trình học rõ ràng hơn là tự do khám phá." },
    ],
  },
  GOA: {
    title: "PHẦN 4: MỤC TIÊU HỌC TẬP",
    description: "Xác định kỳ vọng của bạn",
    items: [
      { code: "GOA1", text: "Mục tiêu của tôi là giao tiếp thành thạo trong cuộc sống hàng ngày." },
      { code: "GOA2", text: "Kỹ năng đọc hiểu là quan trọng nhất với tôi." },
      { code: "GOA3", text: "Tôi muốn xem phim, nghe nhạc tiếng Anh không cần phụ đề." },
      { code: "GOA4", text: "Viết email/văn bản tiếng Anh là một trong những mục tiêu chính." },
      { code: "GOA5", text: "Tôi đang chuẩn bị cho các kỳ thi (IELTS, TOEIC, TOEFL)." },
    ],
  },
  CHA: {
    title: "PHẦN 5: KHÓ KHĂN GẶP PHẢI",
    description: "Xác định những thách thức cần vượt qua",
    items: [
      { code: "CHA1", text: "Phát âm tiếng Anh là rào cản lớn nhất của tôi." },
      { code: "CHA2", text: "Tôi gặp khó khăn trong việc nhớ từ vựng mới." },
      { code: "CHA3", text: "Ngữ pháp tiếng Anh làm tôi bối rối." },
      { code: "CHA4", text: "Tôi khó duy trì động lực học trong thời gian dài." },
      { code: "CHA5", text: "Tôi thiếu môi trường và người để thực hành nói." },
    ],
  },
};

interface LearningPlan {
  level: string;
  weeklyHours: number;
  focusAreas: string[];
  recommendations: string[];
  weeklySchedule: { day: string; activity: string; duration: string }[];
  resources: { name: string; type: string; link?: string }[];
  milestones: { week: number; goal: string }[];
}

interface EnglishLearnerSurveyProps {
  userId: string;
  onComplete?: (profile: any) => void;
}

export default function EnglishLearnerSurvey({ userId, onComplete }: EnglishLearnerSurveyProps) {
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [currentPart, setCurrentPart] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);
  const [savedProfile, setSavedProfile] = useState<any>(null);
  const [learningPlan, setLearningPlan] = useState<LearningPlan | null>(null);
  const [showPlan, setShowPlan] = useState(false);
  const [planError, setPlanError] = useState<string | null>(null);
  const [isRegenerating, setIsRegenerating] = useState(false);

  const partKeys = Object.keys(SURVEY_PARTS);
  const currentPartKey = partKeys[currentPart];
  const currentPartData = SURVEY_PARTS[currentPartKey as keyof typeof SURVEY_PARTS];

  // Load existing survey data
  useEffect(() => {
    const loadSurvey = async () => {
      try {
        const res = await fetch(`/api/learner-survey?userId=${userId}`);
        const data = await res.json();
        console.log("Loaded survey data:", data);
        
        if (data.success && data.survey) {
          setAnswers(data.survey.answers || {});
          setSavedProfile(data.survey.profile);
          setLearningPlan(data.survey.learningPlan);
          if (data.survey.completed) {
            setIsCompleted(true);
            
            // Nếu đã hoàn thành nhưng chưa có learningPlan, tạo lại
            if (!data.survey.learningPlan && data.survey.profile && Object.keys(data.survey.answers || {}).length > 0) {
              console.log("No learning plan found, regenerating...");
              // Delay để tránh race condition
              setTimeout(() => {
                regenerateLearningPlan(data.survey.answers);
              }, 500);
            }
          }
        }
      } catch (error) {
        console.error("Load survey error:", error);
      }
    };
    if (userId && userId !== "anonymous") {
      loadSurvey();
    }
  }, [userId]);

  // Regenerate learning plan if missing
  const regenerateLearningPlan = async (surveyAnswers: Record<string, number>) => {
    console.log("Regenerating learning plan for userId:", userId);
    console.log("Survey answers:", surveyAnswers);
    
    if (!surveyAnswers || Object.keys(surveyAnswers).length === 0) {
      setPlanError("Không có dữ liệu khảo sát. Vui lòng làm lại khảo sát.");
      return;
    }
    
    setIsRegenerating(true);
    setPlanError(null);
    try {
      const res = await fetch("/api/learner-survey", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId,
          answers: surveyAnswers,
          completed: true,
        }),
      });
      const data = await res.json();
      console.log("Regenerate response:", data);
      
      if (data.success && data.learningPlan) {
        setLearningPlan(data.learningPlan);
        setSavedProfile(data.profile);
      } else {
        setPlanError(data.message || "Không thể tạo kế hoạch học tập. Vui lòng thử lại.");
      }
    } catch (error) {
      console.error("Regenerate plan error:", error);
      setPlanError("Lỗi kết nối. Vui lòng thử lại.");
    } finally {
      setIsRegenerating(false);
    }
  };

  const handleAnswerChange = (code: string, value: number) => {
    setAnswers({ ...answers, [code]: value });
  };

  // Calculate progress
  const totalQuestions = Object.values(SURVEY_PARTS).reduce((sum, part) => sum + part.items.length, 0);
  const answeredQuestions = Object.keys(answers).length;
  const progress = (answeredQuestions / totalQuestions) * 100;

  // Check if current part is complete
  const isCurrentPartComplete = currentPartData.items.every(item => answers[item.code] !== undefined);

  const handleNext = () => {
    if (currentPart < partKeys.length - 1) {
      setCurrentPart(currentPart + 1);
    }
  };

  const handlePrev = () => {
    if (currentPart > 0) {
      setCurrentPart(currentPart - 1);
    }
  };

  const handleSubmit = async () => {
    if (answeredQuestions < totalQuestions) return;
    
    setIsLoading(true);
    try {
      const res = await fetch("/api/learner-survey", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId,
          answers,
          completed: true,
          timestamp: new Date().toISOString(),
        }),
      });

      const data = await res.json();
      if (data.success) {
        setIsCompleted(true);
        setSavedProfile(data.profile);
        setLearningPlan(data.learningPlan);
        onComplete?.(data.profile);
      }
    } catch (error) {
      console.error("Submit error:", error);
    } finally {
      setIsLoading(false);
    }
  };


  // Completed view with Learning Plan
  if (isCompleted && savedProfile) {
    const profile = savedProfile;
    
    return (
      <div className="space-y-6">
        {/* Profile Summary */}
        <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 border border-white/20">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <CheckCircle className="w-6 h-6 text-green-400" />
              <h2 className="text-xl font-bold text-white">Hồ sơ học tập của bạn</h2>
            </div>
            <button
              onClick={() => setShowPlan(!showPlan)}
              className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition text-sm"
            >
              {showPlan ? "Xem hồ sơ" : "Xem kế hoạch học"}
            </button>
          </div>

          {!showPlan ? (
            <div className="space-y-4">
              {Object.entries(SURVEY_PARTS).map(([key, part]) => {
                const data = profile[key.toLowerCase() === "mov" ? "motivation" : 
                              key.toLowerCase() === "exp" ? "experience" :
                              key.toLowerCase() === "sty" ? "learningStyle" :
                              key.toLowerCase() === "goa" ? "goals" : "challenges"] || { score: 0, level: "Thấp" };
                return (
                  <div key={key} className="bg-white/5 rounded-xl p-4">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-white/80 text-sm">{part.title.replace("PHẦN ", "").split(":")[1]}</span>
                      <span className={`text-sm font-medium px-2 py-1 rounded ${
                        data.level === "Cao" ? "bg-green-500/20 text-green-400" :
                        data.level === "Trung bình" ? "bg-yellow-500/20 text-yellow-400" :
                        "bg-red-500/20 text-red-400"
                      }`}>
                        {data.level} ({data.score}/5)
                      </span>
                    </div>
                    <div className="w-full bg-white/10 rounded-full h-2">
                      <div
                        className={`h-2 rounded-full transition-all ${
                          data.level === "Cao" ? "bg-green-500" :
                          data.level === "Trung bình" ? "bg-yellow-500" :
                          "bg-red-500"
                        }`}
                        style={{ width: `${(data.score / 5) * 100}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          ) : learningPlan ? (
            <div className="space-y-6">
              {/* Level & Hours */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-gradient-to-br from-blue-500/20 to-purple-500/20 rounded-xl p-4 border border-blue-500/30">
                  <div className="flex items-center gap-2 mb-2">
                    <Target className="w-5 h-5 text-blue-400" />
                    <span className="text-white/60 text-sm">Trình độ đề xuất</span>
                  </div>
                  <p className="text-2xl font-bold text-white">{learningPlan.level}</p>
                </div>
                <div className="bg-gradient-to-br from-green-500/20 to-teal-500/20 rounded-xl p-4 border border-green-500/30">
                  <div className="flex items-center gap-2 mb-2">
                    <Clock className="w-5 h-5 text-green-400" />
                    <span className="text-white/60 text-sm">Thời gian học/tuần</span>
                  </div>
                  <p className="text-2xl font-bold text-white">{learningPlan.weeklyHours} giờ</p>
                </div>
              </div>

              {/* Focus Areas */}
              <div className="bg-white/5 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-3">
                  <Lightbulb className="w-5 h-5 text-yellow-400" />
                  <h3 className="text-white font-semibold">Lĩnh vực cần tập trung</h3>
                </div>
                <div className="flex flex-wrap gap-2">
                  {learningPlan.focusAreas.map((area, idx) => (
                    <span key={idx} className="px-3 py-1 bg-yellow-500/20 text-yellow-300 rounded-full text-sm">
                      {area}
                    </span>
                  ))}
                </div>
              </div>

              {/* Recommendations */}
              <div className="bg-white/5 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-3">
                  <BookOpen className="w-5 h-5 text-blue-400" />
                  <h3 className="text-white font-semibold">Gợi ý học tập</h3>
                </div>
                <ul className="space-y-2">
                  {learningPlan.recommendations.map((rec, idx) => (
                    <li key={idx} className="flex items-start gap-2 text-white/80 text-sm">
                      <span className="text-blue-400 mt-1">•</span>
                      {rec}
                    </li>
                  ))}
                </ul>
              </div>

              {/* Weekly Schedule */}
              <div className="bg-white/5 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-3">
                  <Clock className="w-5 h-5 text-purple-400" />
                  <h3 className="text-white font-semibold">Lịch học hàng tuần</h3>
                </div>
                <div className="space-y-2">
                  {learningPlan.weeklySchedule.map((item, idx) => (
                    <div key={idx} className="flex items-center justify-between bg-white/5 rounded-lg p-3">
                      <div>
                        <span className="text-purple-400 font-medium">{item.day}</span>
                        <p className="text-white/80 text-sm">{item.activity}</p>
                      </div>
                      <span className="text-white/60 text-sm">{item.duration}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Milestones */}
              <div className="bg-white/5 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-3">
                  <Target className="w-5 h-5 text-green-400" />
                  <h3 className="text-white font-semibold">Mục tiêu theo tuần</h3>
                </div>
                <div className="space-y-3">
                  {learningPlan.milestones.map((milestone, idx) => (
                    <div key={idx} className="flex items-start gap-3">
                      <div className="w-8 h-8 rounded-full bg-green-500/20 flex items-center justify-center text-green-400 font-bold text-sm flex-shrink-0">
                        {milestone.week}
                      </div>
                      <div className="flex-1">
                        <p className="text-white/80 text-sm">{milestone.goal}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Resources */}
              <div className="bg-white/5 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-3">
                  <BookOpen className="w-5 h-5 text-teal-400" />
                  <h3 className="text-white font-semibold">Tài nguyên học tập</h3>
                </div>
                <div className="grid gap-2">
                  {learningPlan.resources.map((resource, idx) => (
                    <div key={idx} className="flex items-center justify-between bg-white/5 rounded-lg p-3">
                      <div>
                        <p className="text-white font-medium text-sm">{resource.name}</p>
                        <span className="text-white/50 text-xs">{resource.type}</span>
                      </div>
                      {resource.link && (
                        <a href={resource.link} target="_blank" rel="noopener noreferrer" 
                           className="text-blue-400 text-sm hover:underline">
                          Truy cập →
                        </a>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-8">
              {isRegenerating ? (
                <div className="flex flex-col items-center gap-3">
                  <div className="animate-spin w-8 h-8 border-4 border-white/20 border-t-blue-500 rounded-full"></div>
                  <p className="text-white/60">Đang tạo kế hoạch học tập...</p>
                </div>
              ) : planError ? (
                <div className="flex flex-col items-center gap-3">
                  <AlertCircle className="w-8 h-8 text-red-400" />
                  <p className="text-red-400">{planError}</p>
                  <button
                    onClick={() => regenerateLearningPlan(answers)}
                    className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition"
                  >
                    Thử lại
                  </button>
                </div>
              ) : Object.keys(answers).length > 0 ? (
                <div className="flex flex-col items-center gap-3">
                  <p className="text-white/60">Chưa có kế hoạch học tập</p>
                  <button
                    onClick={() => regenerateLearningPlan(answers)}
                    className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition"
                  >
                    Tạo kế hoạch
                  </button>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-3">
                  <AlertCircle className="w-8 h-8 text-yellow-400" />
                  <p className="text-white/60">Vui lòng làm khảo sát trước để tạo kế hoạch học tập</p>
                  <button
                    onClick={() => {
                      setIsCompleted(false);
                      setShowPlan(false);
                    }}
                    className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition"
                  >
                    Làm khảo sát
                  </button>
                </div>
              )}
            </div>
          )}

          <button
            onClick={() => {
              setIsCompleted(false);
              setShowPlan(false);
            }}
            className="mt-6 w-full py-3 bg-white/10 text-white rounded-xl hover:bg-white/20 transition flex items-center justify-center gap-2"
          >
            <RefreshCw className="w-4 h-4" /> Làm lại khảo sát
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 border border-white/20">
      <div className="mb-6">
        <h2 className="text-xl font-bold text-white mb-2"> Khảo sát học tiếng Anh</h2>
        <p className="text-white/60 text-sm">Giúp chúng tôi hiểu nhu cầu học tập của bạn để tạo kế hoạch phù hợp</p>
      </div>

      {/* Progress */}
      <div className="mb-6">
        <div className="flex justify-between text-sm text-white/60 mb-2">
          <span>Tiến độ</span>
          <span>{answeredQuestions}/{totalQuestions} câu</span>
        </div>
        <div className="w-full bg-white/10 rounded-full h-2">
          <div
            className="bg-blue-500 h-2 rounded-full transition-all"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Part Navigation */}
      <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
        {partKeys.map((key, idx) => {
          const part = SURVEY_PARTS[key as keyof typeof SURVEY_PARTS];
          const partAnswered = part.items.filter(item => answers[item.code] !== undefined).length;
          const isComplete = partAnswered === part.items.length;
          
          return (
            <button
              key={key}
              onClick={() => setCurrentPart(idx)}
              className={`px-3 py-2 rounded-lg text-sm whitespace-nowrap transition ${
                currentPart === idx
                  ? "bg-blue-500 text-white"
                  : isComplete
                  ? "bg-green-500/20 text-green-400"
                  : "bg-white/10 text-white/60 hover:bg-white/20"
              }`}
            >
              {idx + 1}. {isComplete && ""}
            </button>
          );
        })}
      </div>

      {/* Current Part */}
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-white mb-1">{currentPartData.title}</h3>
        <p className="text-white/60 text-sm mb-4">{currentPartData.description}</p>

        <div className="space-y-4">
          {currentPartData.items.map((item) => (
            <div key={item.code} className="bg-white/5 rounded-xl p-4">
              <p className="text-white mb-3">{item.text}</p>
              <div className="flex flex-wrap gap-2">
                {LIKERT_SCALE.map((option) => (
                  <button
                    key={option.value}
                    onClick={() => handleAnswerChange(item.code, option.value)}
                    className={`px-3 py-2 rounded-lg text-sm transition ${
                      answers[item.code] === option.value
                        ? "bg-blue-500 text-white"
                        : "bg-white/10 text-white/70 hover:bg-white/20"
                    }`}
                  >
                    {option.value}
                  </button>
                ))}
              </div>
              <div className="flex justify-between text-xs text-white/40 mt-2">
                <span>Không đồng ý</span>
                <span>Đồng ý</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Navigation */}
      <div className="flex gap-3">
        {currentPart > 0 && (
          <button
            onClick={handlePrev}
            className="flex-1 py-3 bg-white/10 text-white rounded-xl hover:bg-white/20 transition flex items-center justify-center gap-2"
          >
            <ChevronLeft className="w-5 h-5" /> Trước
          </button>
        )}
        
        {currentPart < partKeys.length - 1 ? (
          <button
            onClick={handleNext}
            disabled={!isCurrentPartComplete}
            className={`flex-1 py-3 rounded-xl transition flex items-center justify-center gap-2 ${
              isCurrentPartComplete
                ? "bg-blue-500 text-white hover:bg-blue-600"
                : "bg-white/10 text-white/40 cursor-not-allowed"
            }`}
          >
            Tiếp <ChevronRight className="w-5 h-5" />
          </button>
        ) : (
          <button
            onClick={handleSubmit}
            disabled={answeredQuestions < totalQuestions || isLoading}
            className={`flex-1 py-3 rounded-xl transition ${
              answeredQuestions >= totalQuestions && !isLoading
                ? "bg-green-500 text-white hover:bg-green-600"
                : "bg-white/10 text-white/40 cursor-not-allowed"
            }`}
          >
            {isLoading ? "Đang tạo kế hoạch..." : "Hoàn thành & Xem kế hoạch"}
          </button>
        )}
      </div>
    </div>
  );
}
