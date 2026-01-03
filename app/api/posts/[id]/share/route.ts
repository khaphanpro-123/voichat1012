import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import Post from "@/app/models/Post";
import { getAuthUser } from "@/lib/auth";
import mongoose from "mongoose";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const me = await getAuthUser(req);
  if (!me)
    return NextResponse.json(
      { success: false, message: "Unauthorized" },
      { status: 401 }
    );
  await connectDB();

  if (!mongoose.Types.ObjectId.isValid(id)) {
    return NextResponse.json(
      { success: false, message: "Invalid id" },
      { status: 400 }
    );
  }
  const origin = await Post.findById(id);
  if (!origin)
    return NextResponse.json(
      { success: false, message: "Not found" },
      { status: 404 }
    );

  origin.sharesCount += 1;
  origin.shares.push(new mongoose.Types.ObjectId(me.id));
  await origin.save();

  const shared = await Post.create({
    author: me.id,
    content: "",
    media: [],
    sharedFrom: origin._id,
  });

  const populated = await Post.findById(shared._id)
    .populate("author", "fullName avatar")
    .populate({
      path: "sharedFrom",
      select: "author content media createdAt",
      populate: { path: "author", select: "fullName avatar" },
    })
    .lean();

  return NextResponse.json({ success: true, data: populated }, { status: 201 });
}
