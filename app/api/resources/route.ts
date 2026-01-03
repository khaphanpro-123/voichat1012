// app/api/resources/route.ts
import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import mongoose from "mongoose";

// Define Resource schema inline to avoid case-sensitivity issues
const ResourceSchema = new mongoose.Schema({
  title: { type: String, required: true },
  category: { type: String, enum: ["ministry","scholarship","academic","guide"], required: true },
  summary: { type: String, default: "" },
  content: { type: String, default: "" },
  url: { type: String, default: "" },
  publishedAt: { type: Date, default: Date.now },
  tags: [{ type: String }],
  isFeatured: { type: Boolean, default: false }
});

const Resource = mongoose.models.Resource || mongoose.model("Resource", ResourceSchema);

export async function GET(req: NextRequest) {
  try {
    await connectDB();
    const cat = new URL(req.url).searchParams.get("category") || undefined;
    const q = cat ? { category: cat } : {};
    const items = await Resource.find(q).sort({ isFeatured: -1, publishedAt: -1 }).limit(200);
    return NextResponse.json({ success: true, items });
  } catch (err) {
    console.error("Resources GET error:", err);
    return NextResponse.json({ success: false, message: "Server error" }, { status: 500 });
  }
}
