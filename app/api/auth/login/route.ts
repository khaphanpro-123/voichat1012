import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import User, { IUser } from "@/app/models/User";
import { comparePassword, signToken } from "@/lib/auth";

// Simple in-memory rate limiting (production should use Redis)
const loginAttempts = new Map<string, { count: number; resetAt: number }>();

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const attempt = loginAttempts.get(ip);
  
  if (!attempt || now > attempt.resetAt) {
    loginAttempts.set(ip, { count: 1, resetAt: now + 60000 }); // 1 minute window
    return true;
  }
  
  if (attempt.count >= 5) { // Max 5 attempts per minute
    return false;
  }
  
  attempt.count++;
  return true;
}

export async function POST(req: NextRequest) {
  try {
    // Rate limiting
    const ip = req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || "unknown";
    if (!checkRateLimit(ip)) {
      return NextResponse.json(
        { success: false, message: "Too many login attempts. Please try again later." },
        { status: 429 }
      );
    }

    await connectDB();

    const { email, password } = await req.json();
    if (!email || !password) {
      return NextResponse.json(
        { success: false, message: "Missing fields" },
        { status: 400 }
      );
    }

    // Use lean() for faster query (returns plain object instead of Mongoose document)
    const dbUser = await User.findOne({ email }).lean().exec() as (IUser & { _id: any }) | null;
    
    if (!dbUser) {
      return NextResponse.json(
        { success: false, message: "Invalid credentials" },
        { status: 401 }
      );
    }

    const ok = await comparePassword(password, dbUser.password);
    if (!ok) {
      return NextResponse.json(
        { success: false, message: "Invalid credentials" },
        { status: 401 }
      );
    }

    // Generate token
    const token = signToken(dbUser._id.toString(), dbUser.role || "user");

    const res = NextResponse.json({
      success: true,
      user: {
        id: dbUser._id.toString(),
        email: dbUser.email,
        fullName: dbUser.fullName,
        avatar: dbUser.avatar,
        role: dbUser.role,
      },
    });

    // Set auth cookie
    res.cookies.set("auth-token", token, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 24 * 7, // 7 days
    });

    return res;
  } catch (e: any) {
    console.error("Login error:", e);
    return NextResponse.json(
      { success: false, message: "Server error" },
      { status: 500 }
    );
  }
}
