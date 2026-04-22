import { NextRequest, NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { connectToDatabase } from "@/lib/mongodb";
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

    const { db } = await connectToDatabase();

    const users = await db
      .collection("users")
      .find({ role: "user" })
      .project({ password: 0 })
      .sort({ createdAt: -1 })
      .toArray();

    // Get statistics for each user
    const usersWithStats = await Promise.all(
      users.map(async (user) => {
        const progress = await db
          .collection("user_progress")
          .findOne({ userId: user._id });

        const sessionCount = await db
          .collection("learning_sessions")
          .countDocuments({ userId: user._id });

        const vocabularyCount = await db
          .collection("vocabulary")
          .countDocuments({ userId: user._id });

        return {
          ...user,
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

    const { db } = await connectToDatabase();

    // Check if username exists
    const existingUsername = await db
      .collection("users")
      .findOne({ username: username.toLowerCase() });
    if (existingUsername) {
      return NextResponse.json(
        { success: false, message: "Username đã được sử dụng" },
        { status: 400 }
      );
    }

    // Check if email exists
    const existingEmail = await db
      .collection("users")
      .findOne({ email: email.toLowerCase() });
    if (existingEmail) {
      return NextResponse.json(
        { success: false, message: "Email đã được đăng ký" },
        { status: 400 }
      );
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12);

    // Create user
    const result = await db.collection("users").insertOne({
      username: username.toLowerCase(),
      fullName: fullName.trim(),
      email: email.toLowerCase(),
      password: hashedPassword,
      role: "user",
      emailVerified: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    return NextResponse.json({
      success: true,
      message: "Tạo tài khoản thành công",
      user: {
        id: result.insertedId,
        username: username.toLowerCase(),
        fullName: fullName.trim(),
        email: email.toLowerCase(),
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

    if (!ObjectId.isValid(userId)) {
      return NextResponse.json(
        { success: false, message: "Invalid user ID" },
        { status: 400 }
      );
    }

    const { db } = await connectToDatabase();
    const userObjectId = new ObjectId(userId);

    // Delete user and all related data
    await db.collection("users").deleteOne({ _id: userObjectId });
    await db.collection("user_progress").deleteMany({ userId: userObjectId });
    await db.collection("learning_sessions").deleteMany({ userId: userObjectId });
    await db.collection("vocabulary").deleteMany({ userId: userObjectId });

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
