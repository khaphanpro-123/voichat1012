import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import UserProgress from "@/app/models/UserProgress";
import Vocabulary from "@/app/models/Vocabulary";
import Document from "@/app/models/Document";
import { taskQueue, TASK_TYPES } from "@/lib/queue";
import "@/lib/workers";

// XP rewards for activities
const XP_REWARDS = {
  chatSession: 10,
  photoAnalysis: 15,
  debateSession: 20,
  mediaLesson: 15,
  documentUpload: 25,
  vocabularyLearned: 5,
  pronunciationPractice: 10,
};

// Calculate level from XP
function calculateLevel(totalXp: number) {
  if (totalXp >= 5000) return "Advanced";
  if (totalXp >= 2500) return "Upper-Intermediate";
  if (totalXp >= 1000) return "Intermediate";
  if (totalXp >= 300) return "Elementary";
  return "Beginner";
}

// Calculate level progress
function getLevelProgress(totalXp: number) {
  const levels = [
    { name: "Beginner", min: 0, max: 300 },
    { name: "Elementary", min: 300, max: 1000 },
    { name: "Intermediate", min: 1000, max: 2500 },
    { name: "Upper-Intermediate", min: 2500, max: 5000 },
    { name: "Advanced", min: 5000, max: 10000 },
  ];
  
  const currentLevel = levels.find(l => totalXp >= l.min && totalXp < l.max) || levels[levels.length - 1];
  const progress = ((totalXp - currentLevel.min) / (currentLevel.max - currentLevel.min)) * 100;
  
  return {
    level: currentLevel.name,
    progress: Math.min(Math.round(progress), 100),
    xpInLevel: totalXp - currentLevel.min,
    xpToNextLevel: currentLevel.max - currentLevel.min,
  };
}

// GET - Get user progress (optimized with lean query and parallel execution)
export async function GET(req: NextRequest) {
  try {
    const userId = req.nextUrl.searchParams.get("userId");
    
    if (!userId) {
      return NextResponse.json({ success: false, message: "userId required" }, { status: 400 });
    }

    await connectDB();
    
    // Run all queries in parallel for speed
    const results = await Promise.all([
      UserProgress.findOne({ userId }).lean(),
      Vocabulary.countDocuments({ userId }),
      Document.countDocuments({ userId }),
    ]);
    
    const progressDoc = results[0] as any;
    const vocabularyCount = results[1] as number;
    const documentsCount = results[2] as number;
    
    // Create new progress if not exists
    if (!progressDoc) {
      const newProgress = await UserProgress.create({ userId });
      const levelProgress = getLevelProgress(0);
      return NextResponse.json({
        success: true,
        progress: {
          ...newProgress.toObject(),
          activities: { ...newProgress.activities, vocabularyLearned: vocabularyCount, documentsUploaded: documentsCount },
          levelProgress,
        },
      });
    }
    
    // Check streak reset (fire-and-forget update if needed)
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const lastStudy = progressDoc.lastStudyDate ? new Date(progressDoc.lastStudyDate) : null;
    
    let currentStreak = progressDoc.currentStreak || 0;
    if (lastStudy) {
      lastStudy.setHours(0, 0, 0, 0);
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);
      
      if (lastStudy.getTime() < yesterday.getTime()) {
        currentStreak = 0;
        // Fire-and-forget update
        UserProgress.updateOne({ userId }, { currentStreak: 0 }).catch(() => {});
      }
    }
    
    const levelProgress = getLevelProgress(progressDoc.totalXp || 0);
    
    return NextResponse.json({
      success: true,
      progress: {
        ...progressDoc,
        currentStreak,
        activities: {
          ...(progressDoc.activities || {}),
          vocabularyLearned: vocabularyCount,
          documentsUploaded: documentsCount,
        },
        levelProgress,
      },
    });
  } catch (error) {
    console.error("Get progress error:", error);
    return NextResponse.json({ success: false, message: "Failed to get progress" }, { status: 500 });
  }
}

// POST - Update user progress (FIRE-AND-FORGET - returns immediately)
export async function POST(req: NextRequest) {
  try {
    const { userId, activity, studyTime = 0 } = await req.json();
    
    if (!userId || !activity) {
      return NextResponse.json({ success: false, message: "userId and activity required" }, { status: 400 });
    }

    // Fire-and-forget: enqueue task and return immediately
    taskQueue.fireAndForget(TASK_TYPES.TRACK_PROGRESS, { userId, activity, studyTime });

    // Return immediately with estimated XP
    const xpReward = XP_REWARDS[activity as keyof typeof XP_REWARDS] || 5;
    
    return NextResponse.json({
      success: true,
      xpEarned: xpReward,
      message: "Progress update queued",
    });
  } catch (error) {
    console.error("Update progress error:", error);
    return NextResponse.json({ success: false, message: "Failed to update progress" }, { status: 500 });
  }
}

// PUT - Add common mistake (FIRE-AND-FORGET)
export async function PUT(req: NextRequest) {
  try {
    const { userId, mistake } = await req.json();
    
    if (!userId || !mistake) {
      return NextResponse.json({ success: false, message: "userId and mistake required" }, { status: 400 });
    }
    
    // Fire-and-forget
    taskQueue.fireAndForget(TASK_TYPES.TRACK_PROGRESS, { userId, mistake });
    
    return NextResponse.json({
      success: true,
      message: "Mistake recorded",
    });
  } catch (error) {
    console.error("Add mistake error:", error);
    return NextResponse.json({ success: false, message: "Failed to add mistake" }, { status: 500 });
  }
}
