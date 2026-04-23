import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import { connectToDatabase } from "@/lib/mongodb";

export async function GET(req: NextRequest) {
  try {
    console.log("[Debug] Starting detailed admin auth check");

    // Step 1: Get session
    const session = await getServerSession(authOptions);
    console.log("[Debug] Session retrieved:", {
      hasSession: !!session,
      email: session?.user?.email,
      sessionRole: (session?.user as any)?.role,
    });

    if (!session) {
      return NextResponse.json({
        success: false,
        step: "session",
        message: "No session found - user not logged in",
        session: null,
      });
    }

    // ⚠️ Fix 1: Check if email exists
    if (!session.user?.email) {
      console.log("[Debug] Session email is missing");
      return NextResponse.json({
        success: false,
        step: "session_email",
        message: "Session email is missing",
        session: {
          hasUser: !!session.user,
          email: session.user?.email,
        },
      });
    }

    // Step 2: Connect to database
    let db;
    try {
      const connection = await connectToDatabase();
      db = connection.db;
      console.log("[Debug] Database connected successfully");
    } catch (dbErr: any) {
      console.error("[Debug] Database connection failed:", dbErr);
      return NextResponse.json({
        success: false,
        step: "database_connection",
        message: "Failed to connect to database",
        error: dbErr.message,
      });
    }

    // ⚠️ Fix 2: Normalize email
    const normalizedEmail = session.user.email.trim().toLowerCase();
    console.log("[Debug] Email normalization:", {
      original: session.user.email,
      normalized: normalizedEmail,
    });

    // Step 3: Find user in database
    let user;
    try {
      user = await db.collection("users").findOne({ email: normalizedEmail });
      console.log("[Debug] User query result:", {
        found: !!user,
        email: user?.email,
        databaseRole: user?.role,
      });
    } catch (queryErr: any) {
      console.error("[Debug] User query failed:", queryErr);
      return NextResponse.json({
        success: false,
        step: "user_query",
        message: "Failed to query user from database",
        error: queryErr.message,
      });
    }

    if (!user) {
      return NextResponse.json({
        success: false,
        step: "user_not_found",
        message: "User not found in database",
        sessionEmail: session.user.email,
        normalizedEmail: normalizedEmail,
        databaseEmail: null,
      });
    }

    // ⚠️ Fix 3: Check role exists and is "admin"
    const isAdmin = user.role === "admin";
    console.log("[Debug] Role check:", {
      sessionRole: (session.user as any).role,
      databaseRole: user.role,
      isAdmin: isAdmin,
      roleMatch: (session.user as any).role === user.role,
    });

    if (!isAdmin) {
      return NextResponse.json({
        success: false,
        step: "role_check",
        message: "User is not admin",
        sessionRole: (session.user as any).role,
        databaseRole: user.role,
        isAdmin: false,
      });
    }

    // All checks passed
    return NextResponse.json({
      success: true,
      message: "Admin verified successfully",
      details: {
        sessionEmail: session.user.email,
        normalizedEmail: normalizedEmail,
        sessionRole: (session.user as any).role,
        databaseEmail: user.email,
        databaseRole: user.role,
        isAdmin: true,
        userId: user._id.toString(),
      },
    });
  } catch (error: any) {
    console.error("[Debug] Unexpected error:", error);
    return NextResponse.json(
      {
        success: false,
        message: "Unexpected error",
        error: error.message,
        stack: error.stack,
      },
      { status: 500 }
    );
  }
}
