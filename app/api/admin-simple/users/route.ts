import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { isUserAdmin } from "@/lib/simpleAdminAuth";

export async function GET(req: NextRequest) {
  try {
    // Check admin
    const isAdmin = await isUserAdmin();
    if (!isAdmin) {
      return NextResponse.json(
        { success: false, message: "Not admin" },
        { status: 403 }
      );
    }

    // Get users
    const { db } = await connectToDatabase();
    const users = await db
      .collection("users")
      .find({ role: "user" })
      .project({ password: 0 })
      .sort({ createdAt: -1 })
      .toArray();

    console.log(`✅ Found ${users.length} users`);

    return NextResponse.json({
      success: true,
      users: users,
      total: users.length,
    });
  } catch (error: any) {
    console.error("❌ Error:", error);
    return NextResponse.json(
      { success: false, message: error.message },
      { status: 500 }
    );
  }
}
