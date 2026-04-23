import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { ObjectId } from "mongodb";
import { checkAdminAuth } from "@/lib/adminAuth";

// POST - Send notification
export async function POST(req: NextRequest) {
  try {
    console.log("[Notifications API] POST - Starting...");
    
    const authCheck = await checkAdminAuth();
    console.log("[Notifications API] Auth check result:", authCheck);
    
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

    const { db } = await connectToDatabase();
    console.log("[Notifications API] Database connected");

    // Create notification using MongoDB native
    const notification = {
      title,
      content,
      type: type || "text",
      mediaUrl: mediaUrl || null,
      documentUrl: documentUrl || null,
      linkUrl: linkUrl || null,
      targetUsers: targetUsers || "all",
      createdBy: new ObjectId(authCheck.userId),
      readBy: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const result = await db.collection("notifications").insertOne(notification);
    console.log("[Notifications API] ✅ Notification created:", result.insertedId);

    return NextResponse.json({
      success: true,
      message: "Gửi thông báo thành công",
      notification: { ...notification, _id: result.insertedId },
    });
  } catch (error: any) {
    console.error("[Notifications API] ❌ Error:", error);
    return NextResponse.json(
      { success: false, message: "Server error: " + error.message },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  try {
    console.log("[Notifications API] GET - Starting...");
    
    const authCheck = await checkAdminAuth();
    console.log("[Notifications API] Auth check result:", authCheck);
    
    if (!authCheck.isAdmin) {
      return NextResponse.json(
        { success: false, message: authCheck.error },
        { status: authCheck.status }
      );
    }

    const { db } = await connectToDatabase();
    console.log("[Notifications API] Database connected");

    const notifications = await db
      .collection("notifications")
      .find({})
      .sort({ createdAt: -1 })
      .toArray();

    console.log("[Notifications API] ✅ Found", notifications.length, "notifications");

    return NextResponse.json({
      success: true,
      notifications,
    });
  } catch (error: any) {
    console.error("[Notifications API] ❌ Error:", error);
    return NextResponse.json(
      { success: false, message: "Server error: " + error.message },
      { status: 500 }
    );
  }
}
