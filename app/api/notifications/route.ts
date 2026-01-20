import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import { connectDB } from "@/lib/db";
import Notification from "@/app/models/Notification";
import User from "@/app/models/User";

// GET - Get user notifications
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 401 }
      );
    }

    await connectDB();

    const user = await User.findOne({ email: session.user.email });
    if (!user) {
      return NextResponse.json(
        { success: false, message: "User not found" },
        { status: 404 }
      );
    }

    // Get notifications for this user
    const notifications = await Notification.find({
      $or: [
        { targetUsers: "all" },
        { targetUsers: user._id.toString() },
      ],
    })
      .populate("createdBy", "username fullName")
      .sort({ createdAt: -1 })
      .limit(50);

    // Mark which ones are read
    const notificationsWithReadStatus = notifications.map((notif) => ({
      ...notif.toObject(),
      isRead: notif.readBy.some((id) => id.toString() === user._id.toString()),
    }));

    return NextResponse.json({
      success: true,
      notifications: notificationsWithReadStatus,
    });
  } catch (error: any) {
    console.error("Get notifications error:", error);
    return NextResponse.json(
      { success: false, message: "Server error" },
      { status: 500 }
    );
  }
}

// PATCH - Mark notification as read
export async function PATCH(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 401 }
      );
    }

    const { notificationId } = await req.json();

    if (!notificationId) {
      return NextResponse.json(
        { success: false, message: "Notification ID is required" },
        { status: 400 }
      );
    }

    await connectDB();

    const user = await User.findOne({ email: session.user.email });
    if (!user) {
      return NextResponse.json(
        { success: false, message: "User not found" },
        { status: 404 }
      );
    }

    // Add user to readBy array if not already there
    await Notification.findByIdAndUpdate(
      notificationId,
      { $addToSet: { readBy: user._id } },
      { new: true }
    );

    return NextResponse.json({
      success: true,
      message: "Notification marked as read",
    });
  } catch (error: any) {
    console.error("Mark notification as read error:", error);
    return NextResponse.json(
      { success: false, message: "Server error" },
      { status: 500 }
    );
  }
}
