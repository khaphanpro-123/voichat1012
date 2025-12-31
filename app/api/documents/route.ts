import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import Document from "@/app/models/Document";

export async function GET(req: NextRequest) {
  try {
    await connectDB();
    
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('userId') || 'anonymous';
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const skip = (page - 1) * limit;

    const documents = await Document.find({ userId })
      .sort({ uploadDate: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    const total = await Document.countDocuments({ userId });

    return NextResponse.json({
      success: true,
      documents,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error("Get documents error:", error);
    return NextResponse.json(
      { success: false, message: "Failed to fetch documents" },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest) {
  try {
    await connectDB();
    
    const { searchParams } = new URL(req.url);
    const documentId = searchParams.get('id');

    if (!documentId) {
      return NextResponse.json(
        { success: false, message: "Document ID required" },
        { status: 400 }
      );
    }

    await Document.findByIdAndDelete(documentId);

    return NextResponse.json({
      success: true,
      message: "Document deleted successfully"
    });
  } catch (error) {
    console.error("Delete document error:", error);
    return NextResponse.json(
      { success: false, message: "Failed to delete document" },
      { status: 500 }
    );
  }
}