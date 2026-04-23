import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { isUserAdmin } from "@/lib/simpleAdminAuth";

export async function GET(req: NextRequest) {
  try {
    const isAdmin = await isUserAdmin();
    if (!isAdmin) {
      return NextResponse.json(
        { success: false, message: "Not admin" },
        { status: 403 }
      );
    }

    const { db } = await connectToDatabase();
    
    const totalUsers = await db.collection("users").countDocuments({ role: "user" });
    const totalVocabulary = await db.collection("vocabulary").countDocuments({});
    const totalDocuments = await db.collection("document_history").countDocuments({});

    return NextResponse.json({
      success: true,
      stats: {
        totalUsers,
        totalVocabulary,
        totalDocuments,
      },
    });
  } catch (error: any) {
    console.error("❌ Error:", error);
    return NextResponse.json(
      { success: false, message: error.message },
      { status: 500 }
    );
  }
}
