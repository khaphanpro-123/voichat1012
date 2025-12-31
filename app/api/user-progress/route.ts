import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import UserProgress from "@/app/models/UserProgress";
import Vocabulary from "@/app/models/Vocabulary";
import Document from "@/app/models/Document";

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

// Check and update streak
function updateStreak(progress: any) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const lastStudy = progress.lastStudyDate ? new Date(progress.lastStudyDate) : null;
  if (lastStudy) {
    lastStudy.setHours(0, 0, 0, 0);
  }
  
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  
  if (!lastStudy) {
    // First time studying
    progress.currentStreak = 1;
  } else if (lastStudy.getTime() === today.getTime()) {
    // Already studied today, no change
  } else if (lastStudy.getTime() === yesterday.getTime()) {
    // Studied yesterday, increment streak
    progress.currentStreak += 1;
  } else {
    // Missed a day, reset streak
    progress.currentStreak = 1;
  }
  
  // Update longest streak
  if (progress.currentStreak > progress.longestStreak) {
    progress.longestStreak = progress.currentStreak;
  }
  
  progress.lastStudyDate = new Date();
  return progress;
}

// GET - Get user progress
export async function GET(req: NextRequest) {
  try {
    await connectDB();
    const userId = req.nextUrl.searchParams.get("userId");
    
    if (!userId) {
      return NextResponse.json({ success: false, message: "userId required" }, { status: 400 });
    }
    
    let progress = await UserProgress.findOne({ userId });
    
    // Create new progress if not exists
    if (!progress) {
      progress = await UserProgress.create({ userId });
    }
    
    // Check if streak should be reset (missed a day)
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const lastStudy = progress.lastStudyDate ? new Date(progress.lastStudyDate) : null;
    
    if (lastStudy) {
      lastStudy.setHours(0, 0, 0, 0);
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);
      
      if (lastStudy.getTime() < yesterday.getTime()) {
        // Missed more than 1 day, reset streak
        progress.currentStreak = 0;
        await progress.save();
      }
    }
    
    // Get real counts from database
    const [vocabularyCount, documentsCount] = await Promise.all([
      Vocabulary.countDocuments({ userId }),
      Document.countDocuments({ userId }),
    ]);
    
    // Update activities with real counts
    progress.activities.vocabularyLearned = vocabularyCount;
    progress.activities.documentsUploaded = documentsCount;
    
    const levelProgress = getLevelProgress(progress.totalXp);
    
    return NextResponse.json({
      success: true,
      progress: {
        ...progress.toObject(),
        levelProgress,
      },
    });
  } catch (error) {
    console.error("Get progress error:", error);
    return NextResponse.json({ success: false, message: "Failed to get progress" }, { status: 500 });
  }
}

// POST - Update user progress (log activity)
export async function POST(req: NextRequest) {
  try {
    await connectDB();
    const { userId, activity, studyTime = 0 } = await req.json();
    
    if (!userId || !activity) {
      return NextResponse.json({ success: false, message: "userId and activity required" }, { status: 400 });
    }
    
    let progress = await UserProgress.findOne({ userId });
    
    if (!progress) {
      progress = new UserProgress({ userId });
    }
    
    // Get XP reward
    const xpReward = XP_REWARDS[activity as keyof typeof XP_REWARDS] || 5;
    
    // Update XP
    progress.totalXp += xpReward;
    progress.xp += xpReward;
    
    // Update activity count
    const activityMap: Record<string, string> = {
      chatSession: "chatSessions",
      photoAnalysis: "photoAnalysis",
      debateSession: "debateSessions",
      mediaLesson: "mediaLessons",
      documentUpload: "documentsUploaded",
      vocabularyLearned: "vocabularyLearned",
      pronunciationPractice: "pronunciationPractice",
    };
    
    const activityField = activityMap[activity];
    if (activityField && progress.activities) {
      (progress.activities as any)[activityField] += 1;
    }
    
    // Update study time
    progress.totalStudyTime += studyTime;
    
    // Update streak
    progress = updateStreak(progress);
    
    // Update level
    progress.level = calculateLevel(progress.totalXp);
    
    // Add to daily log
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const todayLog = progress.dailyLog?.find(
      (log: any) => new Date(log.date).toDateString() === today.toDateString()
    );
    
    if (todayLog) {
      todayLog.xpEarned += xpReward;
      todayLog.activitiesCompleted += 1;
      todayLog.studyTime += studyTime;
    } else {
      progress.dailyLog = progress.dailyLog || [];
      progress.dailyLog.push({
        date: today,
        xpEarned: xpReward,
        activitiesCompleted: 1,
        studyTime,
      });
    }
    
    progress.updatedAt = new Date();
    await progress.save();
    
    const levelProgress = getLevelProgress(progress.totalXp);
    
    return NextResponse.json({
      success: true,
      xpEarned: xpReward,
      progress: {
        ...progress.toObject(),
        levelProgress,
      },
    });
  } catch (error) {
    console.error("Update progress error:", error);
    return NextResponse.json({ success: false, message: "Failed to update progress" }, { status: 500 });
  }
}


// PUT - Add common mistake
export async function PUT(req: NextRequest) {
  try {
    await connectDB();
    const { userId, mistake } = await req.json();
    
    if (!userId || !mistake) {
      return NextResponse.json({ success: false, message: "userId and mistake required" }, { status: 400 });
    }
    
    let progress = await UserProgress.findOne({ userId });
    
    if (!progress) {
      progress = new UserProgress({ userId });
    }
    
    // Initialize commonMistakes if not exists
    if (!progress.commonMistakes) {
      progress.commonMistakes = [];
    }
    
    // Check if this mistake already exists
    const existingMistake = progress.commonMistakes.find(
      (m: any) => m.original?.toLowerCase() === mistake.original?.toLowerCase()
    );
    
    if (existingMistake) {
      // Increment count
      existingMistake.count += 1;
      existingMistake.lastOccurred = new Date();
    } else {
      // Add new mistake
      progress.commonMistakes.push({
        type: mistake.type || "grammar",
        original: mistake.original,
        corrected: mistake.corrected,
        explanation: mistake.explanation,
        count: 1,
        lastOccurred: new Date(),
      });
    }
    
    // Keep only top 50 mistakes (sorted by count)
    progress.commonMistakes.sort((a: any, b: any) => b.count - a.count);
    if (progress.commonMistakes.length > 50) {
      progress.commonMistakes = progress.commonMistakes.slice(0, 50);
    }
    
    progress.updatedAt = new Date();
    await progress.save();
    
    return NextResponse.json({
      success: true,
      message: "Mistake recorded",
      totalMistakes: progress.commonMistakes.length,
    });
  } catch (error) {
    console.error("Add mistake error:", error);
    return NextResponse.json({ success: false, message: "Failed to add mistake" }, { status: 500 });
  }
}
