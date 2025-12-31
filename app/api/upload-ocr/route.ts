import { NextRequest, NextResponse } from "next/server";
import { createWorker } from 'tesseract.js';
import { v2 as cloudinary } from 'cloudinary';
import { connectDB } from "@/lib/db";
import Document from "@/app/models/Document";
import mammoth from 'mammoth';

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export async function POST(req: NextRequest) {
  try {
    await connectDB();
    
    const formData = await req.formData();
    const file = formData.get("file") as File;
    const userId = formData.get("userId") as string || "anonymous";

    if (!file) {
      return NextResponse.json(
        { success: false, message: "No file uploaded" },
        { status: 400 }
      );
    }

    // Convert file to buffer
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Upload to Cloudinary
    const uploadResult = await new Promise((resolve, reject) => {
      cloudinary.uploader.upload_stream(
        {
          resource_type: "auto",
          folder: "documents",
        },
        (error, result) => {
          if (error) reject(error);
          else resolve(result);
        }
      ).end(buffer);
    }) as any;

    let extractedText = "";
    
    // Extract text based on file type
    if (file.type.startsWith('image/')) {
      try {
        const worker = await createWorker('vie'); // Vietnamese language
        const { data: { text } } = await worker.recognize(buffer);
        extractedText = text.trim();
        await worker.terminate();
      } catch (ocrError) {
        console.error("OCR Error:", ocrError);
        extractedText = "Text extraction failed for this image";
      }
    } else if (file.type === 'application/pdf') {
      try {
        // Use pdf-parse-new for PDF text extraction
        const pdfParse = require('pdf-parse-new');
        const pdfData = await pdfParse(buffer);
        extractedText = pdfData.text?.trim() || "";
        
        // If no text extracted
        if (!extractedText) {
          extractedText = "PDF không có text có thể trích xuất. Vui lòng thử file khác hoặc chuyển sang hình ảnh.";
        }
      } catch (pdfError: any) {
        console.error("PDF Error:", pdfError);
        extractedText = "PDF text extraction failed. Please try converting to image or DOCX.";
      }
    } else if (file.type.includes('document') || file.type.includes('wordprocessingml')) {
      try {
        const result = await mammoth.extractRawText({ buffer });
        extractedText = result.value.trim();
      } catch (docError) {
        console.error("Document Error:", docError);
        extractedText = "Document text extraction failed";
      }
    } else {
      extractedText = "Text extraction not supported for this file type";
    }

    // Save to MongoDB
    const document = new Document({
      userId,
      fileName: file.name,
      fileType: file.type,
      fileSize: file.size,
      cloudinaryUrl: uploadResult.secure_url,
      extractedText,
      metadata: {
        originalName: file.name,
        uploadedAt: new Date()
      }
    });

    await document.save();

    // Process extracted text for vocabulary and sentences
    const sentences = extractedText
      .split(/[.!?]+/)
      .map((s) => s.trim())
      .filter((s) => s.length > 0);

    // Extract potential vocabulary (words with 3+ characters)
    const words = extractedText
      .split(/\s+/)
      .filter((w) => w.length >= 3 && /[\p{L}]/u.test(w))
      .map((w) => w.replace(/[.,;:!?]/g, ""));

    const uniqueWords = [...new Set(words)];

    return NextResponse.json({
      success: true,
      fileId: document._id.toString(),
      filename: file.name,
      text: extractedText,
      chunks: sentences,
      vocabulary: uniqueWords.slice(0, 50), // Top 50 words
      stats: {
        totalWords: words.length,
        uniqueWords: uniqueWords.length,
        sentences: sentences.length,
      },
    });
  } catch (error) {
    console.error("OCR Error:", error);
    return NextResponse.json(
      { success: false, message: "OCR processing failed" },
      { status: 500 }
    );
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
