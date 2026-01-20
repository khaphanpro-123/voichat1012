import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import Notification from "@/app/models/Notification";
import User from "@/app/models/User";
import { checkAdminAuth } from "@/lib/adminAuth";

// POST - Send notification
export async function POST(req: NextRequest) {
  try {
    const authCheck = await checkAdminAuth();
    if (!authCheck.isAdmin) {
      return NextResponse.json(
        { success: false, message: authCheck.error },
        { status: authCheck.status }
      );
    }

    const { title, content, type, mediaUrl, documentUrl, linkUrl, targetUsers } = await req.json();

    if (!title || !content) {
      return NextResponse.json(
        { success: false, message: "Title and content are required" },
        { status: 400 }
      );
    }

    await connectDB();

    // Create notification
    const notification = await Notification.create({
      title,
      content,
      type: type || "text",
      mediaUrl,
      documentUrl,
      linkUrl,
      targetUsers: targetUsers || "all",
      createdBy: authCheck.userId,
      readBy: [],
    });

    return NextResponse.json({
      success: true,
      message: "Gửi thông báo thành công",
      notification,
    });
  } catch (error: any) {
    console.error("Send notification error:", error);
    return NextResponse.json(
      { success: false, message: "Server error" },
      { status: 500 }
    );
  }
}

// GET - Get all notifications (admin view)
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

    const notifications = await Notification.find()
      .populate("createdBy", "username fullName email")
      .sort({ createdAt: -1 });

    return NextResponse.json({
      success: true,
      notifications,
    });
  } catch (error: any) {
    console.error("Get notifications error:", error);
    return NextResponse.json(
      { success: false, message: "Server error" },
      { status: 500 }
    );
  }
}
