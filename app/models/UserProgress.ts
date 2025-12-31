import mongoose from "mongoose";

const UserProgressSchema = new mongoose.Schema({
  userId: { type: String, required: true, unique: true },
  
  // Basic stats
  level: { type: String, default: "Beginner" }, // Beginner, Elementary, Intermediate, Upper-Intermediate, Advanced
  xp: { type: Number, default: 0 },
  totalXp: { type: Number, default: 0 },
  
  // Streak tracking
  currentStreak: { type: Number, default: 0 },
  longestStreak: { type: Number, default: 0 },
  lastStudyDate: { type: Date, default: null },
  
  // Activity counts
  activities: {
    chatSessions: { type: Number, default: 0 },
    photoAnalysis: { type: Number, default: 0 },
    debateSessions: { type: Number, default: 0 },
    mediaLessons: { type: Number, default: 0 },
    documentsUploaded: { type: Number, default: 0 },
    vocabularyLearned: { type: Number, default: 0 },
    pronunciationPractice: { type: Number, default: 0 },
  },
  
  // Common mistakes tracking
  commonMistakes: [{
    type: { type: String }, // "grammar", "pronunciation", "vocabulary"
    original: String, // Câu/từ sai
    corrected: String, // Câu/từ đúng
    explanation: String, // Giải thích lỗi
    count: { type: Number, default: 1 }, // Số lần mắc lỗi này
    lastOccurred: { type: Date, default: Date.now },
  }],
  
  // Time spent (in minutes)
  totalStudyTime: { type: Number, default: 0 },
  
  // Daily activity log
  dailyLog: [{
    date: Date,
    xpEarned: Number,
    activitiesCompleted: Number,
    studyTime: Number, // minutes
  }],
  
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

// Calculate level based on XP
UserProgressSchema.methods.calculateLevel = function() {
  const xp = this.totalXp;
  if (xp >= 5000) return "Advanced";
  if (xp >= 2500) return "Upper-Intermediate";
  if (xp >= 1000) return "Intermediate";
  if (xp >= 300) return "Elementary";
  return "Beginner";
};

// XP thresholds for each level
UserProgressSchema.methods.getLevelProgress = function() {
  const xp = this.totalXp;
  const levels = [
    { name: "Beginner", min: 0, max: 300 },
    { name: "Elementary", min: 300, max: 1000 },
    { name: "Intermediate", min: 1000, max: 2500 },
    { name: "Upper-Intermediate", min: 2500, max: 5000 },
    { name: "Advanced", min: 5000, max: 10000 },
  ];
  
  const currentLevel = levels.find(l => xp >= l.min && xp < l.max) || levels[levels.length - 1];
  const progress = ((xp - currentLevel.min) / (currentLevel.max - currentLevel.min)) * 100;
  
  return {
    level: currentLevel.name,
    progress: Math.min(progress, 100),
    xpInLevel: xp - currentLevel.min,
    xpToNextLevel: currentLevel.max - currentLevel.min,
  };
};

const UserProgress = mongoose.models.UserProgress || mongoose.model("UserProgress", UserProgressSchema);

export default UserProgress;
