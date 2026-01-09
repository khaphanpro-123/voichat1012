import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import OTP from "@/app/models/OTP";

export async function POST(req: NextRequest) {
  try {
    const { email, otp, type = "register" } = await req.json();

    if (!email || !otp) {
      return NextResponse.json({ success: false, message: "Thiếu thông tin" }, { status: 400 });
    }

    await connectDB();

    // Find valid OTP
    const otpRecord = await OTP.findOne({
      email: email.toLowerCase(),
      otp,
      type,
      verified: false,
      expiresAt: { $gt: new Date() },
    });

    if (!otpRecord) {
      return NextResponse.json(
        { success: false, message: "Mã OTP không hợp lệ hoặc đã hết hạn" },
        { status: 400 }
      );
    }

    // Mark as verified
    otpRecord.verified = true;
    await otpRecord.save();

    return NextResponse.json({
      success: true,
      message: "Xác minh thành công",
    });
  } catch (error: any) {
    console.error("Verify OTP error:", error?.message);
    return NextResponse.json(
      { success: false, message: "Lỗi xác minh OTP" },
      { status: 500 }
    );
  }
}
