import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import User from "@/app/models/User";
import OTP from "@/app/models/OTP";
import { sendOTPEmail, generateOTP } from "@/lib/email";

export async function POST(req: NextRequest) {
  try {
    const { email, type = "register" } = await req.json();

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ success: false, message: "Email không hợp lệ" }, { status: 400 });
    }

    await connectDB();

    // Check if email exists for register type
    if (type === "register") {
      const existingUser = await User.findOne({ email: email.toLowerCase() });
      if (existingUser) {
        return NextResponse.json({ success: false, message: "Email đã được đăng ký" }, { status: 400 });
      }
    }

    // Delete old OTPs for this email
    await OTP.deleteMany({ email: email.toLowerCase(), type });

    // Generate new OTP
    const otp = generateOTP();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    // Save OTP to database
    await OTP.create({
      email: email.toLowerCase(),
      otp,
      type,
      expiresAt,
    });

    // Check if Resend API key is configured
    if (!process.env.RESEND_API_KEY) {
      console.log(`[DEV MODE] OTP for ${email}: ${otp}`);
      return NextResponse.json({
        success: true,
        message: "Mã OTP đã được gửi đến email của bạn",
        // DEV only - remove in production
        devOtp: process.env.NODE_ENV === "development" ? otp : undefined,
      });
    }

    // Send email
    await sendOTPEmail(email, otp, type);

    return NextResponse.json({
      success: true,
      message: "Mã OTP đã được gửi đến email của bạn",
    });
  } catch (error: any) {
    console.error("Send OTP error:", error?.message);
    return NextResponse.json(
      { success: false, message: "Không thể gửi OTP. Vui lòng thử lại sau." },
      { status: 500 }
    );
  }
}
