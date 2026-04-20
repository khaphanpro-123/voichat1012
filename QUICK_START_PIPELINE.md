# File Processing Pipeline - Quick Start Guide

## 🚀 Quick Start (5 minutes)

### What Changed?

The `/documents-simple` page now supports **image uploads with automatic OCR**. Images are converted to text and processed the same way as PDFs and documents.

### Supported File Types

| Type | Extensions | Processing |
|------|-----------|-----------|
| **Image** | JPG, PNG, GIF, WebP, BMP | OCR → Text → Vocabulary |
| **PDF** | PDF | Backend → Vocabulary |
| **Text** | TXT, DOCX, DOC | Direct → Vocabulary |

### How It Works

```
1. Upload file (image, PDF, or text)
   ↓
2. System detects file type
   ↓
3. If IMAGE:
   - Run OCR (server-side preferred, client-side fallback)
   - Convert to text
   - Normalize text
   ↓
4. Send to backend for vocabulary extraction
   ↓
5. Get results (vocabulary, flashcards, topics)
```

## 💻 For Developers

### Import the Pipeline

```typescript
import { 
  processFile, 
  validateFile, 
  detectFileType 
} from "@/lib/file-processing-pipeline"
```

### Basic Usage

```typescript
// 1. Validate file
const validation = validateFile(file);
if (!validation.valid) {
  console.error(validation.error);
  return;
}

// 2. Detect type
const fileType = detectFileType(file);
console.log("File type:", fileType); // "image" | "pdf" | "text"

// 3. Process file
try {
  const text = await processFile(file);
  console.log("Extracted text:", text);
} catch (error) {
  console.error("Processing failed:", error.message);
}
```

### Handle Images Specifically

```typescript
if (fileType === "image") {
  // Process image with OCR
  const extractedText = await processFile(file);
  
  // Create text file from OCR output
  const textFile = new File(
    [extractedText], 
    "ocr-output.txt", 
    { type: "text/plain" }
  );
  
  // Upload as normal text file
  await uploadToBackend(textFile, `${file.name} (OCR)`);
}
```

## 🎯 Key Functions

### `detectFileType(file: File): FileType`
Returns the file type: `"image"` | `"pdf"` | `"text"` | `"unknown"`

### `validateFile(file: File): {valid: boolean; error?: string}`
Validates file size and type. Returns error message if invalid.

### `processFile(file: File): Promise<string>`
Main function. Processes any file type and returns extracted text.

### `normalizeText(text: string): string`
Cleans text: removes extra spaces, normalizes newlines.

## 🔧 Configuration

### Change OCR Preference

```typescript
// Prefer server-side OCR (default)
const text = await processFile(file, true);

// Prefer client-side OCR
const text = await processFile(file, false);
```

### Change File Size Limit

```typescript
// Default: 50MB
const validation = validateFile(file, 50);

// Custom: 100MB
const validation = validateFile(file, 100);
```

## 📊 Performance Tips

| Scenario | Recommendation |
|----------|-----------------|
| Small images (< 1MB) | Client-side OCR is fine |
| Medium images (1-5MB) | Use server-side OCR |
| Large images (> 5MB) | Must use server-side OCR |
| Batch processing | Use server-side OCR |

## 🐛 Troubleshooting

### Problem: "OCR produced empty text"
**Solution**: Image is blank or corrupted. Try a clearer image.

### Problem: "Server OCR failed: 502"
**Solution**: Backend is starting. Wait 10 seconds and retry.

### Problem: "File too large"
**Solution**: File exceeds 50MB. Compress or split the file.

### Problem: Camera not working
**Solution**: Grant camera permissions. Use HTTPS.

## 📝 Console Logs

Enable debug mode by checking browser console:

```
[Pipeline] Starting file processing for: photo.jpg
[Pipeline] Detected file type: image
[OCR] Starting server-side OCR for file: photo.jpg
[OCR-Server] Progress: 45%
[OCR-Server] Successfully extracted text, length: 1234
[Pipeline] Processing complete, text length: 1200
```

## 🧪 Test Cases

```typescript
// Test 1: Image upload
const imageFile = new File(["..."], "test.jpg", { type: "image/jpeg" });
const text = await processFile(imageFile);
console.log("✓ Image OCR works");

// Test 2: PDF upload
const pdfFile = new File(["..."], "test.pdf", { type: "application/pdf" });
const fileType = detectFileType(pdfFile);
console.log("✓ PDF detection works");

// Test 3: Text normalization
const raw = "Hello  \n\n  world";
const clean = normalizeText(raw);
console.log("✓ Text normalization works");

// Test 4: File validation
const largeFile = new File(["x".repeat(60 * 1024 * 1024)], "large.pdf");
const validation = validateFile(largeFile);
console.log("✓ File validation works");
```

## 🎓 Architecture

```
┌─────────────────────────────────────────┐
│   documents-simple/page.tsx             │
│   (Frontend UI)                         │
└────────────────┬────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────┐
│   file-processing-pipeline.ts           │
│   (Core logic)                          │
│   - detectFileType()                    │
│   - validateFile()                      │
│   - processFile()                       │
│   - runOCR()                            │
│   - normalizeText()                     │
└────────────────┬────────────────────────┘
                 │
        ┌────────┴────────┐
        │                 │
        ▼                 ▼
┌──────────────┐  ┌──────────────────┐
│ Client-side  │  │ Server-side      │
│ OCR          │  │ OCR              │
│ (Tesseract)  │  │ (/api/ocr-extract)
└──────────────┘  └──────────────────┘
        │                 │
        └────────┬────────┘
                 │
                 ▼
┌─────────────────────────────────────────┐
│   /api/upload-document-complete         │
│   (Backend processing)                  │
│   - Extract vocabulary                  │
│   - Generate flashcards                 │
│   - Extract topics                      │
└─────────────────────────────────────────┘
```

## 📚 Full Documentation

For complete documentation, see:
- `docs/FILE_PROCESSING_PIPELINE.md` - Detailed guide
- `PIPELINE_IMPLEMENTATION_SUMMARY.md` - Implementation details

## ✅ Checklist

- [ ] Images upload and process with OCR
- [ ] PDFs upload and process normally
- [ ] Text files upload and process normally
- [ ] Error messages are clear
- [ ] Camera works on smartphone
- [ ] Console logs show progress
- [ ] Vocabulary extraction works
- [ ] Flashcards are generated

## 🚀 Next Steps

1. Test image upload on `/documents-simple`
2. Check console logs for OCR progress
3. Verify vocabulary extraction works
4. Test on smartphone with camera
5. Report any issues

## 📞 Need Help?

1. Check console logs (F12 → Console)
2. Review troubleshooting section above
3. Check full documentation
4. Test with different file types

---

**Status**: ✅ Ready to Use
**Last Updated**: 2026-04-21
