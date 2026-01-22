import { NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import User, { IUser } from "@/app/models/User";
import mongoose from "mongoose";

export async function GET(req: Request) {
  const me = await getAuthUser(req);
  if (!me) {
    return NextResponse.json(
      { success: false, message: "Unauthorized" },
      { status: 401 }
    );
  }

  await connectDB();

  const user = await User.findById(me.id).lean<IUser & { _id: mongoose.Types.ObjectId }>();
  if (!user) {
    return NextResponse.json(
      { success: false, message: "User not found" },
      { status: 404 }
    );
  }

  return NextResponse.json({
    success: true,
    user: {
      id: user._id,
      fullName: user.fullName,
      email: user.email,
      avatar: user.avatar,
      role: user.role,
      bio: user.bio || "",
    },
  });
}
