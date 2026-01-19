import { NextRequest, NextResponse } from "next/server";
import { extractVocabularyFromPDF, removeMetadata, validatePDFContent } from "@/lib/pdfVocabularyExtractor";
import { extractVocabularyAdvanced } from "@/lib/advancedVocabularyExtractor";
import { extractVocabularyEnsemble } from "@/lib/ensembleVocabularyExtractor";

// Increase body size limit for this route
export const config = {
  api: {
    bodyParser: {
      sizeLimit: '10mb',
    },
  },
};

/**
 * Document Upload API with Improved PDF Vocabulary Extraction
 * 
 * Pipeline:
 * 1. Upload file to Cloudinary
 * 2. Extract text (PDF/DOCX/TXT)
 * 3. Filter metadata (XMP, RDF, UUID, etc.)
 * 4. NLP chunking for vocabulary
 * 5. Return cleaned text + vocabulary
 */
export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File;
    const userId = (formData.get("userId") as string) || "anonymous";
    const debug = formData.get("debug") === "true";
    const convertPdf = formData.get("convertPdf") === "true";

    if (!file) {
      return NextResponse.json(
        { success: false, message: "No file uploaded" },
        { status: 400 }
      );
    }

    // Validate file type
    const allowedTypes = [
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/plain'
    ];
    const allowedExtensions = ['.pdf', '.docx', '.txt'];
    const fileExtension = file.name.toLowerCase().substring(file.name.lastIndexOf('.'));
    
    if (!allowedTypes.includes(file.type) && !allowedExtensions.includes(fileExtension)) {
      return NextResponse.json(
        { success: false, message: "Chỉ chấp nhận file PDF, Word (.docx) hoặc TXT" },
        { status: 400 }
      );
    }

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json(
        { success: false, message: "File quá lớn. Tối đa 10MB" },
        { status: 400 }
      );
    }

    console.log("[upload-ocr] Processing:", file.name, file.type, file.size, "convertPdf:", convertPdf);

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
    let rawText = "";
    let isImage = false;

    if (file.type.startsWith("image/")) {
      isImage = true;
      rawText = `[Image: ${file.name}] - Hình ảnh đã được upload thành công.`;
    } else if (file.type === "application/pdf") {
      rawText = extractTextFromPDF(buffer);
      if (!rawText || rawText.length < 20) {
        rawText = `[PDF: ${file.name}] - PDF này có thể là dạng scan/hình ảnh, không trích xuất được text.`;
      }
    } else if (
      file.type.includes("document") ||
      file.type.includes("wordprocessingml") ||
      file.name.endsWith(".docx")
    ) {
      try {
        const mammoth = await import("mammoth");
        const result = await mammoth.extractRawText({ buffer });
        rawText = result.value.trim() || `[DOCX: ${file.name}] - File rỗng.`;
      } catch (e: any) {
        rawText = `[DOCX: ${file.name}] - Không thể đọc file.`;
      }
    } else if (file.type === "text/plain" || file.name.endsWith(".txt")) {
      rawText = buffer.toString("utf-8");
    } else {
      rawText = `[File: ${file.name}] - Đã upload thành công.`;
    }

    // ============ IMPROVED VOCABULARY EXTRACTION ============
    let extractedText = rawText;
    let vocabulary: string[] = [];
    let extractionLogs: any[] = [];
    let stats = { totalWords: 0, uniqueWords: 0, sentences: 0, metadataRemoved: 0 };

    if (!isImage && rawText.length > 50) {
      const startTime = Date.now();
      
      // Step 1: Validate content
      const validation = validatePDFContent(rawText);
      extractionLogs.push({ step: "Validation", data: validation, timestamp: Date.now() - startTime });
      
      if (validation.valid) {
        // Step 2: Remove metadata
        const { cleaned, removedCount } = removeMetadata(rawText);
        extractedText = cleaned;
        extractionLogs.push({ 
          step: "Metadata Removal", 
          data: { removedCount, originalLength: rawText.length, cleanedLength: cleaned.length }, 
          timestamp: Date.now() - startTime 
        });
        
        // Step 3: Use Ensemble Vocabulary Extraction (TF-IDF + RAKE + YAKE with weighted scoring)
        try {
          const ensembleResult = extractVocabularyEnsemble(extractedText, {
            maxWords: 100,
            minWordLength: 3,
            weights: {
              frequency: 0.15,
              tfidf: 0.35,
              rake: 0.25,
              yake: 0.25
            },
            includeNgrams: true
          });
          
          vocabulary = ensembleResult.vocabulary;
          stats = {
            totalWords: ensembleResult.stats.totalWords,
            uniqueWords: ensembleResult.stats.uniqueWords,
            sentences: ensembleResult.stats.sentences,
            metadataRemoved: removedCount,
          };
          
          extractionLogs.push({ 
            step: "Ensemble Extraction (Freq+TF-IDF+RAKE+YAKE)", 
            data: { 
              method: ensembleResult.stats.method,
              weights: ensembleResult.stats.weights,
              extractedCount: vocabulary.length,
              topScores: ensembleResult.scores.slice(0, 10).map(s => ({ 
                word: s.word, 
                score: s.score.toFixed(3),
                normalized: {
                  freq: s.normalized.frequency.toFixed(3),
                  tfidf: s.normalized.tfidf.toFixed(3),
                  rake: s.normalized.rake.toFixed(3),
                  yake: s.normalized.yake.toFixed(3)
                }
              }))
            }, 
            timestamp: Date.now() - startTime 
          });
          
          console.log(`[upload-ocr] Ensemble extraction: ${vocabulary.length} words using ${ensembleResult.stats.method}`);
        } catch (ensembleErr) {
          console.error("[upload-ocr] Ensemble extraction failed, falling back to advanced:", ensembleErr);
          
          // Fallback to advanced extractor
          try {
            const advancedResult = extractVocabularyAdvanced(extractedText, {
              maxWords: 100,
              minWordLength: 3,
              methods: ['tfidf', 'rake', 'yake']
            });
            
            vocabulary = advancedResult.vocabulary;
            stats = {
              totalWords: advancedResult.stats.totalWords,
              uniqueWords: advancedResult.stats.uniqueWords,
              sentences: advancedResult.stats.sentences,
              metadataRemoved: removedCount,
            };
            
            extractionLogs.push({ 
              step: "Fallback: Advanced Extraction (TF-IDF+RAKE+YAKE)", 
              data: { 
                method: advancedResult.stats.method,
                extractedCount: vocabulary.length,
                topScores: advancedResult.scores.slice(0, 10).map(s => ({ word: s.word, score: s.score.toFixed(3) }))
              }, 
              timestamp: Date.now() - startTime 
            });
            
            console.log(`[upload-ocr] Fallback advanced extraction: ${vocabulary.length} words`);
          } catch (advErr) {
            console.error("[upload-ocr] Advanced extraction also failed, using basic:", advErr);
            
            // Final fallback to original extractor
            const extraction = extractVocabularyFromPDF(rawText);
            if (extraction.success) {
              vocabulary = extraction.vocabulary.map(v => v.word);
              extractionLogs.push(...extraction.logs);
              stats = {
                totalWords: extraction.stats.originalLength,
                uniqueWords: extraction.stats.extractedCount,
                sentences: extraction.stats.sentenceCount,
                metadataRemoved: extraction.stats.metadataRemoved,
              };
            }
          }
        }
        
        console.log(`[upload-ocr] Extracted ${vocabulary.length} vocabulary items, removed ${removedCount} metadata`);
      } else {
        console.log(`[upload-ocr] Content validation failed: ${validation.reason}`);
        extractionLogs.push({ step: "Validation Failed", data: { reason: validation.reason }, timestamp: Date.now() - startTime });
      }
    }

    // Fallback: basic word extraction if improved extraction failed
    if (vocabulary.length === 0 && !isImage) {
      const words = extractedText
        .split(/\s+/)
        .filter((w) => w.length >= 3 && /[a-zA-Z]/.test(w))
        .map((w) => w.replace(/[.,;:!?"'()[\]{}]/g, "").toLowerCase());
      vocabulary = [...new Set(words)].slice(0, 50);
      stats.totalWords = words.length;
      stats.uniqueWords = vocabulary.length;
    }

    // Process sentences
    const sentences = extractedText
      .split(/[.!?]+/)
      .map((s) => s.trim())
      .filter((s) => s.length > 10);
    stats.sentences = sentences.length;

    // Save to MongoDB
    const document = new Document({
      userId,
      fileName: file.name,
      fileType: file.type,
      fileSize: file.size,
      cloudinaryUrl: uploadResult?.secure_url || "",
      extractedText,
      metadata: { 
        originalName: file.name, 
        uploadedAt: new Date(),
        extractionStats: stats,
      },
    });
    await document.save();

    return NextResponse.json({
      success: true,
      fileId: document._id.toString(),
      filename: file.name,
      text: extractedText,
      chunks: sentences.slice(0, 100),
      vocabulary: vocabulary.slice(0, 50),
      stats,
      logs: debug ? extractionLogs : undefined,
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
