import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import User from "@/app/models/User";
import bcrypt from "bcryptjs";

// Simple in-memory rate limiting
const registerAttempts = new Map<string, { count: number; resetAt: number }>();

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const attempt = registerAttempts.get(ip);
  
  if (!attempt || now > attempt.resetAt) {
    registerAttempts.set(ip, { count: 1, resetAt: now + 300000 }); // 5 minute window
    return true;
  }
  
  if (attempt.count >= 3) { // Max 3 registrations per 5 minutes
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
        { success: false, message: "Too many registration attempts. Please try again later." },
        { status: 429 }
      );
    }

    const { username, fullName, email, password } = await req.json();

    // Validate input
    if (!username || !fullName || !email || !password) {
      return NextResponse.json(
        { success: false, message: "Vui lòng điền đầy đủ thông tin" },
        { status: 400 }
      );
    }

    // Validate username: 3-20 chars, only letters, numbers, underscore
    if (!/^[a-zA-Z0-9_]{3,20}$/.test(username)) {
      return NextResponse.json(
        { success: false, message: "Username phải từ 3-20 ký tự, chỉ chứa chữ, số và _" },
        { status: 400 }
      );
    }

    // Validate email format
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json(
        { success: false, message: "Email không hợp lệ" },
        { status: 400 }
      );
    }

    // Validate password: min 6 chars, uppercase, lowercase, number, special char
    const hasMinLength = password.length >= 6;
    const hasUppercase = /[A-Z]/.test(password);
    const hasLowercase = /[a-z]/.test(password);
    const hasNumber = /[0-9]/.test(password);
    const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);
    
    if (!hasMinLength || !hasUppercase || !hasLowercase || !hasNumber || !hasSpecialChar) {
      return NextResponse.json(
        { success: false, message: "Mật khẩu cần: 6+ ký tự, chữ hoa, chữ thường, số và ký tự đặc biệt" },
        { status: 400 }
      );
    }

    await connectDB();

    const normalizedUsername = username.toLowerCase();
    const normalizedEmail = email.toLowerCase();

    // Check both username and email in parallel for better performance
    const [existingUsername, existingEmail] = await Promise.all([
      User.findOne({ username: normalizedUsername }).lean().exec(),
      User.findOne({ email: normalizedEmail }).lean().exec()
    ]);

    if (existingUsername) {
      return NextResponse.json(
        { success: false, message: "Username đã được sử dụng" },
        { status: 400 }
      );
    }

    if (existingEmail) {
      return NextResponse.json(
        { success: false, message: "Email đã được đăng ký" },
        { status: 400 }
      );
    }

    // Hash password with cost factor 10 (faster, still secure)
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create new user
    const newUser = await User.create({
      username: normalizedUsername,
      fullName: fullName.trim(),
      email: normalizedEmail,
      password: hashedPassword,
      createdAt: new Date(),
    });

    return NextResponse.json({
      success: true,
      message: "Đăng ký thành công",
      user: {
        id: newUser._id,
        username: newUser.username,
        fullName: newUser.fullName,
        email: newUser.email,
      },
    });

  } catch (error: any) {
    console.error("Register error:", error?.message || error);
    return NextResponse.json(
      { success: false, message: "Lỗi server, vui lòng thử lại" },
      { status: 500 }
    );
  }
}
