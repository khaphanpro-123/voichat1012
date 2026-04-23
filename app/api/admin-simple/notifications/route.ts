import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { isUserAdmin } from "@/lib/simpleAdminAuth";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";

// GET - Get all notifications
export async function GET(req: NextRequest) {
  try {
    const isAdmin = await isUserAdmin();
    if (!isAdmin) {
      return NextResponse.json(
        { success: false, message: "Not admin" },
        { status: 403 }
      );
    }

    const { db } = await connectToDatabase();
    const notifications = await db
      .collection("notifications")
      .find({})
      .sort({ createdAt: -1 })
      .toArray();

    return NextResponse.json({
      success: true,
      notifications: notifications,
    });
  } catch (error: any) {
    console.error("❌ Error:", error);
    return NextResponse.json(
      { success: false, message: error.message },
      { status: 500 }
    );
  }
}

// POST - Send notification
export async function POST(req: NextRequest) {
  try {
    const isAdmin = await isUserAdmin();
    if (!isAdmin) {
      return NextResponse.json(
        { success: false, message: "Not admin" },
        { status: 403 }
      );
    }

    const session = await getServerSession(authOptions);
    const { title, content, type, mediaUrl, documentUrl, linkUrl } = await req.json();

    if (!title || !content) {
      return NextResponse.json(
        { success: false, message: "Title and content required" },
        { status: 400 }
      );
    }

    const { db } = await connectToDatabase();
    
    // Get admin user
    const adminEmail = session?.user?.email?.trim().toLowerCase();
    const adminUser = await db.collection("users").findOne({ email: adminEmail });

    const notification = {
      title,
      content,
      type: type || "text",
      mediaUrl: mediaUrl || null,
      documentUrl: documentUrl || null,
      linkUrl: linkUrl || null,
      targetUsers: "all",
      createdBy: adminUser?._id,
      readBy: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const result = await db.collection("notifications").insertOne(notification);

    console.log("✅ Notification sent:", result.insertedId);

    return NextResponse.json({
      success: true,
      message: "Gửi thông báo thành công",
      notification: { ...notification, _id: result.insertedId },
    });
  } catch (error: any) {
    console.error("❌ Error:", error);
    return NextResponse.json(
      { success: false, message: error.message },
      { status: 500 }
    );
  }
}
