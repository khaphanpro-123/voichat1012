/**
 * Text extraction from PDF and DOCX files
 */

import mammoth from "mammoth";

export interface TextExtractionResult {
  text: string;
  pageCount?: number;
  error?: string;
}

/**
 * Extract text from DOCX file
 */
export async function extractFromDocx(buffer: Buffer): Promise<TextExtractionResult> {
  try {
    const result = await mammoth.extractRawText({ buffer });
    return {
      text: result.value,
      pageCount: undefined, // DOCX doesn't have page concept in raw text
    };
  } catch (error) {
    return {
      text: "",
      error: `DOCX extraction failed: ${error instanceof Error ? error.message : "Unknown error"}`,
    };
  }
}

/**
 * Extract text from PDF file
 */
export async function extractFromPdf(buffer: Buffer): Promise<TextExtractionResult> {
  try {
    // Dynamic import for pdf-parse-new
    const pdfParse = require("pdf-parse-new");
    const data = await pdfParse(buffer);
    
    return {
      text: data.text || "",
      pageCount: data.numpages,
    };
  } catch (error) {
    return {
      text: "",
      error: `PDF extraction failed: ${error instanceof Error ? error.message : "Unknown error"}`,
    };
  }
}

/**
 * Extract text based on file type
 */
export async function extractText(
  buffer: Buffer,
  fileType: string
): Promise<TextExtractionResult> {
  const mimeType = fileType.toLowerCase();
  
  if (mimeType === "application/pdf" || mimeType.endsWith(".pdf")) {
    return extractFromPdf(buffer);
  }
  
  if (
    mimeType.includes("document") ||
    mimeType.includes("wordprocessingml") ||
    mimeType === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
    mimeType.endsWith(".docx")
  ) {
    return extractFromDocx(buffer);
  }
  
  return {
    text: "",
    error: `Unsupported file type: ${fileType}. Only PDF and DOCX are supported.`,
  };
}

/**
 * Validate file for extraction
 */
export function validateFile(
  fileName: string,
  fileSize: number,
  maxSizeBytes: number = 10 * 1024 * 1024 // 5MB default
): { valid: boolean; error?: string } {
  // Check file extension
  const ext = fileName.toLowerCase().split(".").pop();
  const allowedExtensions = ["pdf", "docx"];
  
  if (!ext || !allowedExtensions.includes(ext)) {
    return {
      valid: false,
      error: `Invalid file type. Allowed: ${allowedExtensions.join(", ")}`,
    };
  }
  
  // Check file size
  if (fileSize > maxSizeBytes) {
    return {
      valid: false,
      error: `File too large. Maximum size: ${Math.round(maxSizeBytes / 1024 / 1024)}MB`,
    };
  }
  
  if (fileSize === 0) {
    return {
      valid: false,
      error: "File is empty",
    };
  }
  
  return { valid: true };
}
