import { NextRequest, NextResponse } from "next/server";
import { taskQueue, TASK_TYPES } from "@/lib/queue";
// Import workers to register handlers
import "@/lib/workers";

/**
 * ASYNC OCR Upload API
 * Returns HTTP 202 immediately, processes in background
 * Frontend polls /api/task-status?taskId=xxx for results
 */
export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File;
    const userId = formData.get("userId") as string || "anonymous";
    const mode = formData.get("mode") as string; // "async" or "sync" (default sync for compatibility)

    if (!file) {
      return NextResponse.json(
        { success: false, message: "No file uploaded" },
        { status: 400 }
      );
    }

    // Convert file to buffer array (serializable)
    const bytes = await file.arrayBuffer();
    const bufferArray = Array.from(new Uint8Array(bytes));

    // ASYNC MODE: Return immediately, process in background
    if (mode === "async") {
      const taskId = taskQueue.enqueue(TASK_TYPES.OCR_PROCESS, {
        buffer: bufferArray,
        fileName: file.name,
        fileType: file.type,
        fileSize: file.size,
        userId,
      });

      // Return 202 Accepted immediately
      return NextResponse.json({
        success: true,
        accepted: true,
        taskId,
        message: "File accepted for processing",
        pollUrl: `/api/task-status?taskId=${taskId}`,
      }, { status: 202 });
    }

    // SYNC MODE (default): Process immediately for backward compatibility
    // But still optimized with dynamic imports
    const { v2: cloudinary } = await import("cloudinary");
    const mammoth = await import("mammoth");
    const { connectDB } = await import("@/lib/db");
    const Document = (await import("@/app/models/Document")).default;

    cloudinary.config({
      cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
      api_key: process.env.CLOUDINARY_API_KEY,
      api_secret: process.env.CLOUDINARY_API_SECRET,
    });

    await connectDB();
    const buffer = Buffer.from(bytes);

    // Upload to Cloudinary
    const uploadResult = await new Promise<any>((resolve, reject) => {
      cloudinary.uploader.upload_stream(
        { resource_type: "auto", folder: "documents" },
        (error, result) => {
          if (error) reject(error);
          else resolve(result);
        }
      ).end(buffer);
    });

    let extractedText = "";

    if (file.type.startsWith("image/")) {
      // Skip OCR on serverless - tesseract.js needs local files
      // Just note that it's an image
      extractedText = `[Image file: ${file.name}] - OCR not available on serverless. Please use text-based documents for vocabulary extraction.`;
    } else if (file.type === "application/pdf") {
      try {
        // Use pdf-parse instead of pdf-parse-new for better serverless compatibility
        const pdfParse = (await import("pdf-parse")).default;
        const pdfData = await pdfParse(buffer, {
          // Disable test file loading which causes issues on serverless
          max: 0,
        });
        extractedText = pdfData.text?.trim() || "PDF không có text có thể trích xuất.";
        if (!extractedText || extractedText.length < 10) {
          extractedText = `PDF uploaded: ${file.name}. Text extraction returned minimal content - this PDF may be image-based or protected.`;
        }
      } catch (err: any) {
        console.error("PDF parse error:", err?.message || err);
        // Fallback message with more detail
        extractedText = `PDF uploaded: ${file.name}. Text extraction failed on serverless. Error: ${err?.message || 'Unknown'}`;
      }
    } else if (file.type.includes("document") || file.type.includes("wordprocessingml")) {
      try {
        const result = await mammoth.extractRawText({ buffer });
        extractedText = result.value.trim();
      } catch (err) {
        extractedText = "Document text extraction failed";
      }
    } else {
      extractedText = "Text extraction not supported for this file type";
    }

    const document = new Document({
      userId,
      fileName: file.name,
      fileType: file.type,
      fileSize: file.size,
      cloudinaryUrl: uploadResult.secure_url,
      extractedText,
      metadata: { originalName: file.name, uploadedAt: new Date() },
    });
    await document.save();

    const sentences = extractedText.split(/[.!?]+/).map(s => s.trim()).filter(s => s.length > 0);
    const words = extractedText.split(/\s+/).filter(w => w.length >= 3 && /[\p{L}]/u.test(w)).map(w => w.replace(/[.,;:!?]/g, ""));
    const uniqueWords = [...new Set(words)];

    return NextResponse.json({
      success: true,
      fileId: document._id.toString(),
      filename: file.name,
      text: extractedText,
      chunks: sentences,
      vocabulary: uniqueWords.slice(0, 50),
      stats: { totalWords: words.length, uniqueWords: uniqueWords.length, sentences: sentences.length },
    });
  } catch (error: any) {
    console.error("OCR Error:", error?.message || error);
    console.error("Stack:", error?.stack);
    return NextResponse.json({ 
      success: false, 
      message: "OCR processing failed",
      error: error?.message 
    }, { status: 500 });
  }
}

// For getting OCR status or results
export async function GET(req: NextRequest) {
  const fileId = req.nextUrl.searchParams.get("fileId");

  if (!fileId) {
    return NextResponse.json(
      { success: false, message: "File ID required" },
      { status: 400 }
    );
  }

  // In production, retrieve from database
  return NextResponse.json({
    success: true,
    fileId,
    status: "completed",
  });
}
