import { NextRequest, NextResponse } from "next/server";

/**
 * Simple Document Upload API
 * Supports: PDF, DOCX, TXT, Images
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

    console.log("[upload-ocr] Processing:", file.name, file.type, file.size);

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Check Cloudinary config
    const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
    const apiKey = process.env.CLOUDINARY_API_KEY;
    const apiSecret = process.env.CLOUDINARY_API_SECRET;

    if (!cloudName || !apiKey || !apiSecret) {
      return NextResponse.json(
        { success: false, message: "Missing Cloudinary config" },
        { status: 500 }
      );
    }

    const { v2: cloudinary } = await import("cloudinary");
    const { connectDB } = await import("@/lib/db");
    const Document = (await import("@/app/models/Document")).default;

    cloudinary.config({
      cloud_name: cloudName,
      api_key: apiKey,
      api_secret: apiSecret,
    });

    await connectDB();

    // Determine resource type for Cloudinary
    // PDF and documents must use "raw", images use "image"
    let resourceType: "image" | "raw" = "raw";
    if (file.type.startsWith("image/")) {
      resourceType = "image";
    }

    // Upload to Cloudinary with correct resource type
    let uploadResult: any;
    try {
      uploadResult = await new Promise<any>((resolve, reject) => {
        const uploadStream = cloudinary.uploader.upload_stream(
          { 
            resource_type: resourceType, 
            folder: "documents",
            // No transformations for raw files
          },
          (error, result) => {
            if (error) {
              console.error("[upload-ocr] Cloudinary error:", error);
              reject(error);
            } else {
              resolve(result);
            }
          }
        );
        uploadStream.end(buffer);
      });
    } catch (cloudErr: any) {
      console.error("[upload-ocr] Cloudinary failed:", cloudErr?.message);
      return NextResponse.json(
        { success: false, message: "Upload to cloud failed: " + cloudErr?.message },
        { status: 500 }
      );
    }

    // Extract text based on file type
    let extractedText = "";

    if (file.type.startsWith("image/")) {
      extractedText = `[Image: ${file.name}] - Hình ảnh đã được upload thành công.`;
    } else if (file.type === "application/pdf") {
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
        extractedText = result.value.trim() || `[DOCX: ${file.name}] - File rỗng.`;
      } catch (e: any) {
        extractedText = `[DOCX: ${file.name}] - Không thể đọc file.`;
      }
    } else if (file.type === "text/plain" || file.name.endsWith(".txt")) {
      extractedText = buffer.toString("utf-8");
    } else {
      extractedText = `[File: ${file.name}] - Đã upload thành công.`;
    }

    // Save to MongoDB
    const document = new Document({
      userId,
      fileName: file.name,
      fileType: file.type,
      fileSize: file.size,
      cloudinaryUrl: uploadResult?.secure_url || "",
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
    console.error("[upload-ocr] Error:", error?.message);
    return NextResponse.json(
      { success: false, message: "Upload failed: " + (error?.message || "Unknown") },
      { status: 500 }
    );
  }
}

function extractTextFromPDF(buffer: Buffer): string {
  try {
    const content = buffer.toString("binary");
    const textParts: string[] = [];

    const btEtRegex = /BT\s*([\s\S]*?)\s*ET/g;
    let match;
    while ((match = btEtRegex.exec(content)) !== null) {
      const textBlock = match[1];
      const tjMatches = textBlock.match(/\(([^)]*)\)\s*Tj/g);
      if (tjMatches) {
        tjMatches.forEach((tj) => {
          const text = tj.match(/\(([^)]*)\)/)?.[1];
          if (text) textParts.push(decodeOctal(text));
        });
      }
      const tjArrayMatches = textBlock.match(/\[(.*?)\]\s*TJ/g);
      if (tjArrayMatches) {
        tjArrayMatches.forEach((tja) => {
          const innerTexts = tja.match(/\(([^)]*)\)/g);
          if (innerTexts) {
            innerTexts.forEach((t) => {
              const text = t.match(/\(([^)]*)\)/)?.[1];
              if (text) textParts.push(decodeOctal(text));
            });
          }
        });
      }
    }

    if (textParts.length === 0) {
      const readable = content.match(/[A-Za-z][A-Za-z0-9\s.,!?;:'"()-]{10,}/g);
      if (readable) textParts.push(...readable.filter((t) => t.length > 15));
    }

    return textParts
      .join(" ")
      .replace(/\s+/g, " ")
      .replace(/[^\x20-\x7E\u00C0-\u024F]/g, " ")
      .trim();
  } catch {
    return "";
  }
}

function decodeOctal(str: string): string {
  return str.replace(/\\([0-7]{3})/g, (_, o) => String.fromCharCode(parseInt(o, 8)));
}

export async function GET(req: NextRequest) {
  const fileId = req.nextUrl.searchParams.get("fileId");
  if (!fileId) {
    return NextResponse.json({ success: false, message: "File ID required" }, { status: 400 });
  }
  return NextResponse.json({ success: true, fileId, status: "completed" });
}
