import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import User, { IUser } from "@/app/models/User";
import mongoose from "mongoose";
import { getAuthUser } from "@/lib/auth";

export async function GET(_: NextRequest, context: { params: Promise<{ id: string }> }) {
  await connectDB();
  const { id } = await context.params;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    return NextResponse.json({ success: false, message: "Invalid user id" }, { status: 400 });
  }

  const user = await User.findById(id).lean<IUser & { _id: mongoose.Types.ObjectId }>();
  if (!user) {
    return NextResponse.json({ success: false, message: "Not found" }, { status: 404 });
  }

  return NextResponse.json({
    success: true,
    user: {
      id: user._id,
      fullName: user.fullName,
      email: user.email,
      avatar: user.avatar,
      bio: (user as any).bio || "",
    },
  });
}

// ✅ Update hồ sơ (chỉ cho chính chủ)
export async function PUT(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params; // unwrap Promise

  const me = await getAuthUser(req);
  if (!me || me.id.toString() !== id) {
    return NextResponse.json({ success: false, message: "Forbidden" }, { status: 403 });
  }

  await connectDB();
  const { fullName, avatar, bio } = await req.json();

  // 👇 Khắc phục: cho phép update ngay cả khi bio = ""
  const updateData: any = {};
  if (fullName !== undefined) updateData.fullName = fullName;
  if (avatar !== undefined) updateData.avatar = avatar;
  if (bio !== undefined) updateData.bio = bio;

  const updated = await User.findByIdAndUpdate(id, updateData, { new: true })
    .lean<IUser & { _id: mongoose.Types.ObjectId }>();

  if (!updated) {
    return NextResponse.json({ success: false, message: "User not found" }, { status: 404 });
  }

  return NextResponse.json({
    success: true,
    user: {
      id: updated._id,
      fullName: updated.fullName,
      email: updated.email,
      avatar: updated.avatar,
      bio: (updated as any).bio || "",
    },
  });
}
