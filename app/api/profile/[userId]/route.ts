import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import mongoose from "mongoose";

// User Profile Schema
const UserProfileSchema = new mongoose.Schema({
  userId: { type: String, required: true, unique: true },
  fullName: String,
  email: String,
  phone: String,
  dateOfBirth: Date,
  gender: String,
  country: String,
  nativeLanguage: String,
  learningGoals: [String],
  level: { type: String, default: "Beginner" },
  avatar: String,
  bio: String,
  interests: [String],
  studyTime: { type: Number, default: 0 }, // minutes
  streak: { type: Number, default: 0 },
  xp: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

const UserProfile =
  mongoose.models.UserProfile ||
  mongoose.model("UserProfile", UserProfileSchema);

// GET /api/profile/:userId
export async function GET(
  request: Request,
  context: { params: Promise<{ userId: string }> }
) {
  try {
    await connectDB();
    const { userId } = await context.params;

    let profile = await UserProfile.findOne({ userId });
    
    if (!profile) {
      // Create default profile
      profile = await UserProfile.create({
        userId,
        level: "Beginner",
        streak: 0,
        xp: 0,
      });
    }

    return NextResponse.json({
      success: true,
      profile,
    });
  } catch (error) {
    console.error("Get profile error:", error);
    return NextResponse.json(
      { success: false, message: "Failed to get profile" },
      { status: 500 }
    );
  }
}

// PUT /api/profile/:userId
export async function PUT(
  request: Request,
  context: { params: Promise<{ userId: string }> }
) {
  try {
    await connectDB();
    const { userId } = await context.params;
    const body = await request.json();

    // Update timestamp
    body.updatedAt = new Date();

    const updated = await UserProfile.findOneAndUpdate(
      { userId },
      body,
      { new: true, upsert: true }
    );

    return NextResponse.json({
      success: true,
      profile: updated,
    });
  } catch (error) {
    console.error("Update profile error:", error);
    return NextResponse.json(
      { success: false, message: "Failed to update profile" },
      { status: 500 }
    );
  }
}
