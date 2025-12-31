import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import User from "@/app/models/User";
import bcrypt from "bcryptjs";

export async function POST(req: NextRequest) {
  try {
    const { fullName, email, password } = await req.json();

    // Validate input
    if (!fullName || !email || !password) {
      return NextResponse.json(
        { success: false, message: "Vui lòng điền đầy đủ thông tin" },
        { status: 400 }
      );
    }

    // Validate email format
    if (!email.includes('@')) {
      return NextResponse.json(
        { success: false, message: "Email không hợp lệ" },
        { status: 400 }
      );
    }

    // Validate password: min 6 chars + 1 special character
    const hasMinLength = password.length >= 6;
    const hasSpecialChar = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]+/.test(password);
    
    if (!hasMinLength || !hasSpecialChar) {
      return NextResponse.json(
        { success: false, message: "Mật khẩu cần tối thiểu 6 ký tự và 1 ký tự đặc biệt" },
        { status: 400 }
      );
    }

    await connectDB();

    // Check if email already exists
    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return NextResponse.json(
        { success: false, message: "Email đã được đăng ký" },
        { status: 400 }
      );
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12);

    // Create new user
    const newUser = await User.create({
      fullName: fullName.trim(),
      email: email.toLowerCase(),
      password: hashedPassword,
      createdAt: new Date(),
    });

    return NextResponse.json({
      success: true,
      message: "Đăng ký thành công",
      user: {
        id: newUser._id,
        fullName: newUser.fullName,
        email: newUser.email,
      },
    });

  } catch (error) {
    console.error("Register error:", error);
    return NextResponse.json(
      { success: false, message: "Lỗi server, vui lòng thử lại" },
      { status: 500 }
    );
  }
}
