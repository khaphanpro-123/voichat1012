import { NextRequest, NextResponse } from "next/server";

/**
 * Simple Document Upload API
 * Supports: PDF, DOCX, TXT, Images
 * PDF text extraction using simple regex (no external libs that fail on serverless)
 */
export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File;
    const userId = (formData.get("userId") as string) || "anonymous";

    if (!file) {
      return NextResponse.json(
        { success: false, message: "No file uploaded" },
        { status: 400 }
      );
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Dynamic imports
    const { v2: cloudinary } = await import("cloudinary");
    const { connectDB } = await import("@/lib/db");
    const Document = (await import("@/app/models/Document")).default;

    cloudinary.config({
      cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
      api_key: process.env.CLOUDINARY_API_KEY,
      api_secret: process.env.CLOUDINARY_API_SECRET,
    });

    await connectDB();

    // Upload to Cloudinary
    const uploadResult = await new Promise<any>((resolve, reject) => {
      cloudinary.uploader
        .upload_stream(
          { resource_type: "auto", folder: "documents" },
          (error, result) => {
            if (error) reject(error);
            else resolve(result);
          }
        )
        .end(buffer);
    });

    let extractedText = "";

    // Extract text based on file type
    if (file.type.startsWith("image/")) {
      extractedText = `[Image: ${file.name}] - Hình ảnh đã được upload. OCR không khả dụng trên serverless.`;
    } else if (file.type === "application/pdf") {
      // Simple PDF text extraction - extract readable strings from PDF binary
      extractedText = extractTextFromPDF(buffer);
      if (!extractedText || extractedText.length < 20) {
        extractedText = `[PDF: ${file.name}] - PDF này có thể là dạng scan/hình ảnh, không trích xuất được text.`;
      }
    } else if (
      file.type.includes("document") ||
      file.type.includes("wordprocessingml") ||
      file.name.endsWith(".docx")
    ) {
      try {
        const mammoth = await import("mammoth");
        const result = await mammoth.extractRawText({ buffer });
        extractedText = result.value.trim();
      } catch {
        extractedText = `[DOCX: ${file.name}] - Không thể trích xuất text từ file này.`;
      }
    } else if (file.type === "text/plain" || file.name.endsWith(".txt")) {
      extractedText = buffer.toString("utf-8");
    } else {
      extractedText = `[File: ${file.name}] - Định dạng file không được hỗ trợ.`;
    }

    // Save to MongoDB
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

    // Process text for vocabulary
    const sentences = extractedText
      .split(/[.!?]+/)
      .map((s) => s.trim())
      .filter((s) => s.length > 0);
    const words = extractedText
      .split(/\s+/)
      .filter((w) => w.length >= 3 && /[a-zA-Z]/.test(w))
      .map((w) => w.replace(/[.,;:!?"'()[\]{}]/g, "").toLowerCase());
    const uniqueWords = [...new Set(words)];

    return NextResponse.json({
      success: true,
      fileId: document._id.toString(),
      filename: file.name,
      text: extractedText,
      chunks: sentences.slice(0, 100),
      vocabulary: uniqueWords.slice(0, 50),
      stats: {
        totalWords: words.length,
        uniqueWords: uniqueWords.length,
        sentences: sentences.length,
      },
    });
  } catch (error: any) {
    console.error("Upload Error:", error?.message || error);
    return NextResponse.json(
      {
        success: false,
        message: "Upload failed",
        error: error?.message || "Unknown error",
      },
      { status: 500 }
    );
  }
}

/**
 * Extract readable text from PDF buffer
 * Simple approach: find text streams and decode them
 */
function extractTextFromPDF(buffer: Buffer): string {
  const content = buffer.toString("binary");
  const textParts: string[] = [];

  // Method 1: Extract text between BT and ET markers (text objects)
  const btEtRegex = /BT\s*([\s\S]*?)\s*ET/g;
  let match;
  while ((match = btEtRegex.exec(content)) !== null) {
    const textBlock = match[1];
    // Extract text from Tj and TJ operators
    const tjMatches = textBlock.match(/\(([^)]*)\)\s*Tj/g);
    if (tjMatches) {
      tjMatches.forEach((tj) => {
        const text = tj.match(/\(([^)]*)\)/)?.[1];
        if (text) textParts.push(decodeOctalEscapes(text));
      });
    }
    // TJ array format
    const tjArrayMatches = textBlock.match(/\[(.*?)\]\s*TJ/g);
    if (tjArrayMatches) {
      tjArrayMatches.forEach((tja) => {
        const innerTexts = tja.match(/\(([^)]*)\)/g);
        if (innerTexts) {
          innerTexts.forEach((t) => {
            const text = t.match(/\(([^)]*)\)/)?.[1];
            if (text) textParts.push(decodeOctalEscapes(text));
          });
        }
      });
    }
  }

  // Method 2: Look for stream content with readable text
  if (textParts.length === 0) {
    // Try to find any readable ASCII text sequences
    const readableRegex = /[A-Za-z][A-Za-z0-9\s.,!?;:'"()-]{10,}/g;
    const readable = content.match(readableRegex);
    if (readable) {
      textParts.push(...readable.filter((t) => t.length > 15));
    }
  }

  // Clean and join
  let result = textParts
    .join(" ")
    .replace(/\s+/g, " ")
    .replace(/[^\x20-\x7E\u00C0-\u024F]/g, " ")
    .trim();

  return result;
}

function decodeOctalEscapes(str: string): string {
  return str.replace(/\\([0-7]{3})/g, (_, octal) =>
    String.fromCharCode(parseInt(octal, 8))
  );
}

export async function GET(req: NextRequest) {
  const fileId = req.nextUrl.searchParams.get("fileId");
  if (!fileId) {
    return NextResponse.json(
      { success: false, message: "File ID required" },
      { status: 400 }
    );
  }
  return NextResponse.json({ success: true, fileId, status: "completed" });
}
