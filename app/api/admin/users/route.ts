import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import User from "@/app/models/User";
import UserProgress from "@/app/models/UserProgress";
import LearningSession from "@/app/models/LearningSession";
import Vocabulary from "@/app/models/Vocabulary";
import bcrypt from "bcryptjs";
import { checkAdminAuth } from "@/lib/adminAuth";

// GET - List all users
export async function GET(req: NextRequest) {
  try {
    const authCheck = await checkAdminAuth();
    if (!authCheck.isAdmin) {
      return NextResponse.json(
        { success: false, message: authCheck.error },
        { status: authCheck.status }
      );
    }

    await connectDB();

    const users = await User.find({ role: "user" })
      .select("-password")
      .sort({ createdAt: -1 });

    // Get statistics for each user
    const usersWithStats = await Promise.all(
      users.map(async (user) => {
        const progress = await UserProgress.findOne({ userId: user._id });
        const sessionCount = await LearningSession.countDocuments({ userId: user._id });
        const vocabularyCount = await Vocabulary.countDocuments({ userId: user._id });

        return {
          ...user.toObject(),
          stats: {
            level: progress?.level || "Beginner",
            totalSessions: sessionCount,
            vocabularyCount: vocabularyCount,
            lastActive: progress?.updatedAt || user.createdAt,
          },
        };
      })
    );

    return NextResponse.json({
      success: true,
      users: usersWithStats,
      total: usersWithStats.length,
    });
  } catch (error: any) {
    console.error("Get users error:", error);
    return NextResponse.json(
      { success: false, message: "Server error" },
      { status: 500 }
    );
  }
}

// POST - Create new user
export async function POST(req: NextRequest) {
  try {
    const authCheck = await checkAdminAuth();
    if (!authCheck.isAdmin) {
      return NextResponse.json(
        { success: false, message: authCheck.error },
        { status: authCheck.status }
      );
    }

    const { username, fullName, email, password } = await req.json();

    if (!username || !fullName || !email || !password) {
      return NextResponse.json(
        { success: false, message: "Vui lòng điền đầy đủ thông tin" },
        { status: 400 }
      );
    }

    await connectDB();

    // Check if username exists
    const existingUsername = await User.findOne({ username: username.toLowerCase() });
    if (existingUsername) {
      return NextResponse.json(
        { success: false, message: "Username đã được sử dụng" },
        { status: 400 }
      );
    }

    // Check if email exists
    const existingEmail = await User.findOne({ email: email.toLowerCase() });
    if (existingEmail) {
      return NextResponse.json(
        { success: false, message: "Email đã được đăng ký" },
        { status: 400 }
      );
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12);

    // Create user
    const newUser = await User.create({
      username: username.toLowerCase(),
      fullName: fullName.trim(),
      email: email.toLowerCase(),
      password: hashedPassword,
      role: "user",
      emailVerified: true,
    });

    return NextResponse.json({
      success: true,
      message: "Tạo tài khoản thành công",
      user: {
        id: newUser._id,
        username: newUser.username,
        fullName: newUser.fullName,
        email: newUser.email,
      },
    });
  } catch (error: any) {
    console.error("Create user error:", error);
    return NextResponse.json(
      { success: false, message: "Server error" },
      { status: 500 }
    );
  }
}

// DELETE - Delete user
export async function DELETE(req: NextRequest) {
  try {
    const authCheck = await checkAdminAuth();
    if (!authCheck.isAdmin) {
      return NextResponse.json(
        { success: false, message: authCheck.error },
        { status: authCheck.status }
      );
    }

    const { searchParams } = new URL(req.url);
    const userId = searchParams.get("userId");

    if (!userId) {
      return NextResponse.json(
        { success: false, message: "User ID is required" },
        { status: 400 }
      );
    }

    await connectDB();

    // Delete user and all related data
    await User.findByIdAndDelete(userId);
    await UserProgress.deleteMany({ userId });
    await LearningSession.deleteMany({ userId });
    await Vocabulary.deleteMany({ userId });

    return NextResponse.json({
      success: true,
      message: "Xóa tài khoản thành công",
    });
  } catch (error: any) {
    console.error("Delete user error:", error);
    return NextResponse.json(
      { success: false, message: "Server error" },
      { status: 500 }
    );
  }
}
