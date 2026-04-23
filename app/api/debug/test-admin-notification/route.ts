import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import { connectToDatabase } from "@/lib/mongodb";
import { checkAdminAuth } from "@/lib/adminAuth";

export async function POST(req: NextRequest) {
  try {
    console.log("[Debug] Starting test admin notification");

    // Step 1: Check session
    const session = await getServerSession(authOptions);
    console.log("[Debug] Session:", {
      hasSession: !!session,
      email: session?.user?.email,
      role: (session?.user as any)?.role,
    });

    if (!session || !session.user) {
      return NextResponse.json({
        success: false,
        step: "session",
        message: "No session found",
      });
    }

    // Step 2: Check email exists
    if (!session.user.email) {
      return NextResponse.json({
        success: false,
        step: "session_email",
        message: "Session email is missing",
      });
    }

    // Step 3: Check database connection
    try {
      const { db } = await connectToDatabase();
      console.log("[Debug] Database connected");

      // Step 4: Find user in database
      const normalizedEmail = session.user.email.trim().toLowerCase();
      const user = await db.collection("users").findOne({ email: normalizedEmail });
      console.log("[Debug] User from database:", {
        found: !!user,
        email: user?.email,
        role: user?.role,
      });

      if (!user) {
        return NextResponse.json({
          success: false,
          step: "database",
          message: "User not found in database",
          sessionEmail: session.user.email,
        });
      }

      // Step 5: Check admin auth
      const authCheck = await checkAdminAuth();
      console.log("[Debug] Admin auth check:", {
        isAdmin: authCheck.isAdmin,
        error: authCheck.error,
        status: authCheck.status,
      });

      if (!authCheck.isAdmin) {
        return NextResponse.json({
          success: false,
          step: "adminAuth",
          message: authCheck.error,
          status: authCheck.status,
          details: {
            sessionRole: (session.user as any).role,
            databaseRole: user.role,
            sessionEmail: session.user.email,
            databaseEmail: user.email,
          },
        });
      }

      // Step 6: All checks passed
      return NextResponse.json({
        success: true,
        message: "All checks passed - admin can send notifications",
        details: {
          sessionEmail: session.user.email,
          databaseRole: user.role,
          isAdmin: true,
        },
      });
    } catch (dbError: any) {
      console.error("[Debug] Database error:", dbError);
      return NextResponse.json({
        success: false,
        step: "database",
        message: "Database error",
        error: dbError.message,
      });
    }
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
