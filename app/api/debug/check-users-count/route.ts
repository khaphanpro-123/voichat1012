import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";

export async function GET(req: NextRequest) {
  try {
    const { db } = await connectToDatabase();

    // Count all users
    const totalUsers = await db.collection("users").countDocuments();
    console.log("[Debug] Total users:", totalUsers);

    // Count admin users
    const adminUsers = await db.collection("users").countDocuments({ role: "admin" });
    console.log("[Debug] Admin users:", adminUsers);

    // Get all users with their roles
    const allUsers = await db
      .collection("users")
      .find({})
      .project({ email: 1, role: 1, fullName: 1, createdAt: 1 })
      .toArray();

    console.log("[Debug] All users:", JSON.stringify(allUsers, null, 2));

    return NextResponse.json({
      success: true,
      stats: {
        totalUsers,
        adminUsers,
        regularUsers: totalUsers - adminUsers,
      },
      users: allUsers.map((u) => ({
        email: u.email,
        role: u.role,
        fullName: u.fullName,
        createdAt: u.createdAt,
      })),
    });
  } catch (error: any) {
    console.error("[Debug] Error:", error);
    return NextResponse.json(
      {
        success: false,
        message: error.message,
        error: error.toString(),
      },
      { status: 500 }
    );
  }
}
