import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import User, { IUser } from "@/app/models/User";
import { comparePassword, signToken } from "@/lib/auth"; // gộp chung import

export async function POST(req: NextRequest) {
  try {
    await connectDB();

    const { email, password } = await req.json();
    if (!email || !password) {
      return NextResponse.json(
        { success: false, message: "Missing fields" },
        { status: 400 }
      );
    }

    const dbUser = (await User.findOne({ email })) as IUser | null;
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

    // ✅ Sinh token
    const token = signToken(dbUser._id.toString(), dbUser.role || "user");

    const res = NextResponse.json({
      success: true,
      user: {
        id: dbUser._id.toString(),
        email: dbUser.email,
        fullName: dbUser.fullName,
        avatar: dbUser.avatar,
        role: dbUser.role,
        childId: dbUser.childId?.toString(),
      },
    });

    // ✅ Gửi cookie chứa token
    res.cookies.set("auth-token", token, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 24 * 7, // 7 ngày
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
