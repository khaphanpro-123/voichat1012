import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import User from "@/app/models/User";
import { comparePassword } from "@/lib/auth";

export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json();

    console.log("[Debug] Test login - email:", email);

    if (!email || !password) {
      return NextResponse.json({
        success: false,
        message: "Email and password required",
      });
    }

    // Step 1: Connect to database
    try {
      await connectDB();
      console.log("[Debug] Database connected");
    } catch (dbErr: any) {
      console.error("[Debug] Database connection failed:", dbErr);
      return NextResponse.json({
        success: false,
        step: "database",
        message: "Database connection failed",
        error: dbErr.message,
      });
    }

    // Step 2: Normalize email
    const normalizedEmail = email.trim().toLowerCase();
    console.log("[Debug] Normalized email:", normalizedEmail);

    // Step 3: Find user
    let user;
    try {
      user = await User.findOne({ email: normalizedEmail });
      console.log("[Debug] User found:", {
        found: !!user,
        email: user?.email,
        role: user?.role,
      });
    } catch (queryErr: any) {
      console.error("[Debug] User query failed:", queryErr);
      return NextResponse.json({
        success: false,
        step: "user_query",
        message: "User query failed",
        error: queryErr.message,
      });
    }

    if (!user) {
      return NextResponse.json({
        success: false,
        step: "user_not_found",
        message: "User not found",
        email: normalizedEmail,
      });
    }

    // Step 4: Compare password
    let passwordMatch = false;
    try {
      passwordMatch = await comparePassword(password, user.password);
      console.log("[Debug] Password match:", passwordMatch);
    } catch (pwErr: any) {
      console.error("[Debug] Password comparison failed:", pwErr);
      return NextResponse.json({
        success: false,
        step: "password_compare",
        message: "Password comparison failed",
        error: pwErr.message,
      });
    }

    if (!passwordMatch) {
      return NextResponse.json({
        success: false,
        step: "password_mismatch",
        message: "Password incorrect",
      });
    }

    // All checks passed
    return NextResponse.json({
      success: true,
      message: "Login test passed",
      user: {
        id: user._id.toString(),
        email: user.email,
        role: user.role,
        fullName: user.fullName,
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
