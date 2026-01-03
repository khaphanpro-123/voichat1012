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
  if (!me) return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });

  await connectDB();
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return NextResponse.json({ success: false, message: "Invalid id" }, { status: 400 });
  }

  const post = await Post.findById(id);
  if (!post) return NextResponse.json({ success: false, message: "Not found" }, { status: 404 });

  const uid = new mongoose.Types.ObjectId(me.id);
  const liked = post.likes.some((x) => x.equals(uid));

  if (liked) {
    post.likes = post.likes.filter((x) => !x.equals(uid));
    post.likesCount = Math.max(0, post.likesCount - 1);
  } else {
    post.likes.push(uid);
    post.likesCount += 1;
  }
  await post.save();

  return NextResponse.json({ success: true, liked: !liked, likesCount: post.likesCount });
}
