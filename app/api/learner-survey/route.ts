import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import mongoose from "mongoose";

// Schema cho learner survey - người Việt học tiếng Anh
const LearnerSurveySchema = new mongoose.Schema({
  userId: { type: String, required: true, unique: true },
  answers: { type: Object, default: {} },
  completed: { type: Boolean, default: false },
  profile: {
    motivation: { score: Number, level: String },
    experience: { score: Number, level: String },
    learningStyle: { score: Number, level: String },
    goals: { score: Number, level: String },
    challenges: { score: Number, level: String },
  },
  learningPlan: { type: Object, default: null },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

const LearnerSurvey =
  mongoose.models.LearnerSurvey ||
  mongoose.model("LearnerSurvey", LearnerSurveySchema);

// Calculate profile from answers
function calculateProfile(answers: Record<string, number>) {
  const parts = {
    MOV: { items: ["MOV1", "MOV2", "MOV3", "MOV4", "MOV5"], name: "motivation" },
    EXP: { items: ["EXP1", "EXP2", "EXP3", "EXP4", "EXP5"], name: "experience" },
    STY: { items: ["STY1", "STY2", "STY3", "STY4", "STY5"], name: "learningStyle" },
    GOA: { items: ["GOA1", "GOA2", "GOA3", "GOA4", "GOA5"], name: "goals" },
    CHA: { items: ["CHA1", "CHA2", "CHA3", "CHA4", "CHA5"], name: "challenges" },
  };

  const profile: Record<string, { score: number; level: string }> = {};

  Object.entries(parts).forEach(([, part]) => {
    const scores = part.items.map(item => answers[item] || 0);
    const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
    let level = "Thấp";
    if (avg >= 4) level = "Cao";
    else if (avg >= 3) level = "Trung bình";
    profile[part.name] = { score: Math.round(avg * 10) / 10, level };
  });

  return profile;
}

// Generate learning plan based on profile
function generateLearningPlan(profile: Record<string, { score: number; level: string }>, answers: Record<string, number>) {
  // Determine level based on experience
  let level = "A1 - Beginner";
  const expScore = profile.experience?.score || 0;
  if (expScore >= 4) level = "B1 - Intermediate";
  else if (expScore >= 3) level = "A2 - Elementary";

  // Calculate weekly hours based on motivation and goals
  const motivationScore = profile.motivation?.score || 3;
  const goalsScore = profile.goals?.score || 3;
  let weeklyHours = 5;
  if (motivationScore >= 4 && goalsScore >= 4) weeklyHours = 10;
  else if (motivationScore >= 3 || goalsScore >= 3) weeklyHours = 7;

  // Determine focus areas based on challenges and goals
  const focusAreas: string[] = [];
  const challengesScore = profile.challenges?.score || 0;
  
  // Check specific answers for challenges
  if (answers.CHA1 >= 4) focusAreas.push("Phát âm");
  if (answers.CHA2 >= 4) focusAreas.push("Từ vựng");
  if (answers.CHA3 >= 4) focusAreas.push("Ngữ pháp");
  if (answers.CHA5 >= 4) focusAreas.push("Giao tiếp");
  
  // Check goals
  if (answers.GOA1 >= 4) focusAreas.push("Hội thoại hàng ngày");
  if (answers.GOA2 >= 4) focusAreas.push("Đọc hiểu");
  if (answers.GOA3 >= 4) focusAreas.push("Nghe hiểu");
  if (answers.GOA4 >= 4) focusAreas.push("Viết");
  if (answers.GOA5 >= 4) focusAreas.push("Luyện thi");

  // Default focus areas if none selected
  if (focusAreas.length === 0) {
    focusAreas.push("Từ vựng cơ bản", "Ngữ pháp nền tảng", "Nghe - Nói");
  }

  // Generate recommendations based on learning style
  const recommendations: string[] = [];
  
  if (answers.STY1 >= 4) {
    recommendations.push("Học qua video YouTube, phim có phụ đề song ngữ");
    recommendations.push("Sử dụng flashcard có hình ảnh minh họa");
  }
  if (answers.STY2 >= 4) {
    recommendations.push("Luyện nghe podcast tiếng Anh mỗi ngày 15-30 phút");
    recommendations.push("Thực hành shadowing - nghe và nhắc lại theo");
  }
  if (answers.STY3 >= 4) {
    recommendations.push("Đọc sách graded readers phù hợp trình độ");
    recommendations.push("Ghi chép từ vựng và ngữ pháp mới vào sổ tay");
  }
  if (answers.STY4 >= 4) {
    recommendations.push("Sử dụng app học tương tác như Duolingo, EnglishPal");
    recommendations.push("Tham gia các bài quiz và game học tiếng Anh");
  }
  if (answers.STY5 >= 4) {
    recommendations.push("Theo dõi lộ trình học có sẵn, đặt mục tiêu rõ ràng");
    recommendations.push("Kiểm tra tiến độ hàng tuần");
  }

  // Default recommendations
  if (recommendations.length < 3) {
    recommendations.push("Học từ vựng mới mỗi ngày (10-15 từ)");
    recommendations.push("Xem video tiếng Anh có phụ đề 30 phút/ngày");
    recommendations.push("Thực hành nói với AI hoặc bạn học");
  }

  // Generate weekly schedule
  const weeklySchedule = [
    { day: "Thứ 2", activity: "Học từ vựng mới + Nghe podcast", duration: `${Math.round(weeklyHours/5)} giờ` },
    { day: "Thứ 3", activity: "Ngữ pháp + Bài tập", duration: `${Math.round(weeklyHours/5)} giờ` },
    { day: "Thứ 4", activity: "Đọc hiểu + Ghi chép", duration: `${Math.round(weeklyHours/5)} giờ` },
    { day: "Thứ 5", activity: "Luyện nghe + Shadowing", duration: `${Math.round(weeklyHours/5)} giờ` },
    { day: "Thứ 6", activity: "Thực hành nói + Ôn tập", duration: `${Math.round(weeklyHours/5)} giờ` },
    { day: "Thứ 7", activity: "Xem phim/video tiếng Anh", duration: "1-2 giờ" },
    { day: "Chủ nhật", activity: "Ôn tập tuần + Kiểm tra", duration: "1 giờ" },
  ];

  // Generate milestones
  const milestones = [
    { week: 1, goal: "Nắm vững 100 từ vựng cơ bản, làm quen với phát âm" },
    { week: 2, goal: "Hiểu và sử dụng các thì cơ bản (hiện tại, quá khứ)" },
    { week: 3, goal: "Nghe hiểu được hội thoại đơn giản, tự giới thiệu bản thân" },
    { week: 4, goal: "Đọc hiểu đoạn văn ngắn, viết câu đơn giản" },
    { week: 6, goal: "Giao tiếp cơ bản trong các tình huống hàng ngày" },
    { week: 8, goal: "Hoàn thành level hiện tại, sẵn sàng lên level tiếp theo" },
  ];

  // Resources
  const resources = [
    { name: "EnglishPal Voice Chat", type: "App", link: "/dashboard-new/chat" },
    { name: "Flashcard từ tài liệu", type: "App", link: "/dashboard-new/documents" },
    { name: "BBC Learning English", type: "Website", link: "https://www.bbc.co.uk/learningenglish" },
    { name: "English with Lucy", type: "YouTube", link: "https://www.youtube.com/@EnglishwithLucy" },
    { name: "Duolingo", type: "App", link: "https://www.duolingo.com" },
  ];

  return {
    level,
    weeklyHours,
    focusAreas: [...new Set(focusAreas)].slice(0, 5), // Remove duplicates, max 5
    recommendations: recommendations.slice(0, 5),
    weeklySchedule,
    milestones,
    resources,
  };
}

export async function POST(req: NextRequest) {
  try {
    await connectDB();
    const body = await req.json();
    const { userId, answers, completed } = body;

    if (!userId) {
      return NextResponse.json(
        { success: false, message: "userId required" },
        { status: 400 }
      );
    }

    const profile = calculateProfile(answers);
    const learningPlan = completed ? generateLearningPlan(profile, answers) : null;

    const survey = await LearnerSurvey.findOneAndUpdate(
      { userId },
      {
        userId,
        answers,
        completed: completed || false,
        profile,
        learningPlan,
        updatedAt: new Date(),
      },
      { upsert: true, new: true }
    );

    return NextResponse.json({
      success: true,
      message: "Survey saved successfully",
      survey,
      profile,
      learningPlan,
    });
  } catch (error) {
    console.error("Error saving survey:", error);
    return NextResponse.json(
      { success: false, message: "Failed to save survey" },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  try {
    await connectDB();
    const userId = req.nextUrl.searchParams.get("userId");

    if (userId) {
      // Get specific user's survey
      const survey = await LearnerSurvey.findOne({ userId });
      return NextResponse.json({
        success: true,
        survey,
      });
    }

    // Get all surveys (admin)
    const surveys = await LearnerSurvey.find().sort({ updatedAt: -1 }).limit(50);
    return NextResponse.json({
      success: true,
      surveys,
      count: surveys.length,
    });
  } catch (error) {
    console.error("Error fetching surveys:", error);
    return NextResponse.json(
      { success: false, message: "Failed to fetch surveys" },
      { status: 500 }
    );
  }
}
