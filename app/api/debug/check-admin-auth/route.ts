import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import { connectToDatabase } from "@/lib/mongodb";

export async function GET(req: NextRequest) {
  try {
    // Get session
    const session = await getServerSession(authOptions);
    console.log("[Debug] Session:", JSON.stringify(session, null, 2));

    if (!session || !session.user) {
      return NextResponse.json({
        success: false,
        message: "No session found",
        session: null,
      });
    }

    // Get database connection
    const { db } = await connectToDatabase();
    console.log("[Debug] Database connected");

    // Find user in database
    const user = await db.collection("users").findOne({ email: session.user.email });
    console.log("[Debug] User from database:", JSON.stringify(user, null, 2));

    if (!user) {
      return NextResponse.json({
        success: false,
        message: "User not found in database",
        sessionEmail: session.user.email,
        user: null,
      });
    }

    // Check role
    const isAdmin = user.role === "admin";
    console.log("[Debug] User role:", user.role, "Is admin:", isAdmin);

    return NextResponse.json({
      success: true,
      message: "Debug info retrieved",
      session: {
        email: session.user.email,
        name: session.user.name,
        role: (session.user as any).role,
      },
      database: {
        email: user.email,
        role: user.role,
        isAdmin: isAdmin,
      },
      match: {
        emailMatch: session.user.email === user.email,
        roleMatch: (session.user as any).role === user.role,
      },
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
