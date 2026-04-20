/**
 * File Processing Pipeline
 * Handles image uploads with OCR and text/PDF files uniformly
 */

import Tesseract from "tesseract.js";

export type FileType = "image" | "pdf" | "text" | "unknown";

/**
 * Detect file type based on MIME type and extension
 */
export function detectFileType(file: File): FileType {
  const mimeType = file.type.toLowerCase();
  const fileName = file.name.toLowerCase();

  // Image detection
  if (
    mimeType.startsWith("image/") ||
    /\.(jpg|jpeg|png|gif|webp|bmp)$/i.test(fileName)
  ) {
    return "image";
  }

  // PDF detection
  if (
    mimeType === "application/pdf" ||
    fileName.endsWith(".pdf")
  ) {
    return "pdf";
  }

  // Text detection
  if (
    mimeType.startsWith("text/") ||
    mimeType === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
    mimeType === "application/msword" ||
    /\.(txt|docx|doc)$/i.test(fileName)
  ) {
    return "text";
  }

  return "unknown";
}

/**
 * Run OCR on image file using Tesseract.js (client-side)
 * Returns plain string text
 */
export async function runOCRClientSide(imageFile: File): Promise<string> {
  try {
    console.log("[OCR] Starting client-side OCR for file:", imageFile.name);

    // Convert file to data URL for Tesseract
    const imageData = await fileToDataUrl(imageFile);

    // Run Tesseract OCR
    const result = await Tesseract.recognize(imageData, "eng", {
      logger: (m) => {
        if (m.status === "recognizing text") {
          console.log(`[OCR] Progress: ${Math.round(m.progress * 100)}%`);
        }
      },
    });

    // Extract text from result
    let rawText = result.data.text;

    console.log("[OCR] Raw output type:", typeof rawText);
    console.log("[OCR] Raw output length:", rawText?.length || 0);

    // Ensure we have a string
    if (typeof rawText !== "string") {
      console.warn("[OCR] Output is not a string, converting...");
      rawText = String(rawText || "");
    }

    if (!rawText || rawText.trim().length === 0) {
      throw new Error("OCR produced empty text");
    }

    console.log("[OCR] Successfully extracted text, length:", rawText.length);
    return rawText;
  } catch (error: any) {
    console.error("[OCR] Error:", error?.message || error);
    throw new Error(`OCR failed: ${error?.message || "Unknown error"}`);
  }
}

/**
 * Run OCR on image file using backend API (server-side)
 * More reliable for large images
 */
export async function runOCRServerSide(imageFile: File): Promise<string> {
  try {
    console.log("[OCR-Server] Starting server-side OCR for file:", imageFile.name);

    const formData = new FormData();
    formData.append("file", imageFile);

    const response = await fetch("/api/ocr-extract", {
      method: "POST",
      body: formData,
    });

    if (!response.ok) {
      throw new Error(`Server OCR failed: ${response.statusText}`);
    }

    const data = await response.json();

    if (!data.success || !data.text) {
      throw new Error("Server OCR returned no text");
    }

    let rawText = data.text;

    console.log("[OCR-Server] Raw output type:", typeof rawText);
    console.log("[OCR-Server] Raw output length:", rawText?.length || 0);

    // Ensure we have a string
    if (typeof rawText !== "string") {
      console.warn("[OCR-Server] Output is not a string, converting...");
      rawText = String(rawText || "");
    }

    if (!rawText || rawText.trim().length === 0) {
      throw new Error("Server OCR produced empty text");
    }

    console.log("[OCR-Server] Successfully extracted text, length:", rawText.length);
    return rawText;
  } catch (error: any) {
    console.error("[OCR-Server] Error:", error?.message || error);
    throw new Error(`Server OCR failed: ${error?.message || "Unknown error"}`);
  }
}

/**
 * Run OCR with fallback: try server-side first, then client-side
 */
export async function runOCR(imageFile: File, preferServer: boolean = true): Promise<string> {
  if (preferServer) {
    try {
      return await runOCRServerSide(imageFile);
    } catch (serverError) {
      console.warn("[OCR] Server-side OCR failed, falling back to client-side");
      return await runOCRClientSide(imageFile);
    }
  } else {
    try {
      return await runOCRClientSide(imageFile);
    } catch (clientError) {
      console.warn("[OCR] Client-side OCR failed, falling back to server-side");
      return await runOCRServerSide(imageFile);
    }
  }
}

/**
 * Convert File to data URL for Tesseract
 */
function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error("Failed to read file"));
    reader.readAsDataURL(file);
  });
}

/**
 * Normalize text by cleaning up whitespace and line breaks
 */
export function normalizeText(text: string): string {
  if (typeof text !== "string") {
    console.warn("[Normalize] Input is not a string:", typeof text);
    text = String(text || "");
  }

  return text
    // Replace multiple newlines with single newline
    .replace(/\n\n+/g, "\n")
    // Replace multiple spaces with single space
    .replace(/\s+/g, " ")
    // Trim leading/trailing whitespace
    .trim();
}

/**
 * Process text file and extract content
 * For now, returns the text as-is (will be enhanced for DOCX/PDF)
 */
export async function processTextFile(file: File): Promise<string> {
  try {
    console.log("[TextProcess] Processing text file:", file.name);

    // For simple text files, read directly
    if (file.type === "text/plain" || file.name.endsWith(".txt")) {
      const text = await file.text();
      console.log("[TextProcess] Text file read, length:", text.length);
      return text;
    }

    // For DOCX/DOC files, we'll pass to backend
    // (backend has mammoth.js for DOCX parsing)
    console.log("[TextProcess] File will be processed by backend");
    return "";
  } catch (error: any) {
    console.error("[TextProcess] Error:", error?.message || error);
    throw new Error(`Text processing failed: ${error?.message || "Unknown error"}`);
  }
}

/**
 * Main pipeline: Process any file type uniformly
 * Returns normalized text ready for vocabulary extraction
 */
export async function processFile(file: File, preferServerOCR: boolean = true): Promise<string> {
  console.log("[Pipeline] Starting file processing for:", file.name);

  const fileType = detectFileType(file);
  console.log("[Pipeline] Detected file type:", fileType);

  let rawText = "";

  try {
    if (fileType === "image") {
      console.log("[Pipeline] Processing as image with OCR");
      rawText = await runOCR(file, preferServerOCR);
    } else if (fileType === "text") {
      console.log("[Pipeline] Processing as text file");
      rawText = await processTextFile(file);
    } else if (fileType === "pdf") {
      console.log("[Pipeline] PDF will be processed by backend");
      return "";
    } else {
      throw new Error(`Unsupported file type: ${fileType}`);
    }

    // Normalize the extracted text
    const normalizedText = normalizeText(rawText);

    if (!normalizedText || normalizedText.length === 0) {
      throw new Error("No text could be extracted from file");
    }

    console.log("[Pipeline] Processing complete, text length:", normalizedText.length);
    return normalizedText;
  } catch (error: any) {
    console.error("[Pipeline] Error:", error?.message || error);
    throw error;
  }
}

/**
 * Validate file before processing
 */
export function validateFile(file: File, maxSizeMB: number = 50): {
  valid: boolean;
  error?: string;
} {
  const maxSizeBytes = maxSizeMB * 1024 * 1024;

  if (file.size > maxSizeBytes) {
    return {
      valid: false,
      error: `File too large (${(file.size / 1024 / 1024).toFixed(2)}MB). Max: ${maxSizeMB}MB`,
    };
  }

  const fileType = detectFileType(file);
  if (fileType === "unknown") {
    return {
      valid: false,
      error: "Unsupported file type. Please use: PDF, DOCX, TXT, JPG, PNG",
    };
  }

  return { valid: true };
}
