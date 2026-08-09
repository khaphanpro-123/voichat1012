# File Processing Pipeline Documentation

## Overview

The file processing pipeline provides a unified, modular approach to handling different file types (images, PDFs, text documents) with automatic OCR for images.

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    File Upload                              │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│              detectFileType(file)                            │
│  Returns: "image" | "pdf" | "text" | "unknown"              │
└────────────────────────┬────────────────────────────────────┘
                         │
        ┌────────────────┼────────────────┐
        │                │                │
        ▼                ▼                ▼
    [IMAGE]          [PDF]            [TEXT]
        │                │                │
        ▼                ▼                ▼
    runOCR()      (Backend)      processTextFile()
        │                │                │
        ├─ Server-side   │                │
        │  (preferred)   │                │
        │                │                │
        └─ Client-side   │                │
           (fallback)    │                │
        │                │                │
        └────────────────┼────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│              normalizeText(text)                             │
│  - Clean whitespace                                          │
│  - Remove extra newlines                                     │
│  - Ensure UTF-8 encoding                                     │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│              uploadToBackend(file)                           │
│  - Send to vocabulary extraction pipeline                    │
│  - Extract phrases and words                                 │
│  - Generate flashcards                                       │
└─────────────────────────────────────────────────────────────┘
```

## Core Functions

### 1. `detectFileType(file: File): FileType`

Detects the file type based on MIME type and extension.

**Supported Types:**
- **Image**: jpg, jpeg, png, gif, webp, bmp
- **PDF**: pdf
- **Text**: txt, docx, doc
- **Unknown**: Any other type

**Example:**
```typescript
const fileType = detectFileType(file);
// Returns: "image" | "pdf" | "text" | "unknown"
```

### 2. `runOCR(imageFile: File, preferServer?: boolean): Promise<string>`

Runs OCR on an image file with automatic fallback.

**Features:**
- Tries server-side OCR first (more reliable)
- Falls back to client-side Tesseract.js if server fails
- Ensures output is always a plain string
- Logs progress and errors

**Example:**
```typescript
try {
  const text = await runOCR(imageFile);
  console.log("Extracted text:", text);
} catch (error) {
  console.error("OCR failed:", error.message);
}
```

**Server-side OCR:**
- Uses backend Python/Tesseract
- Better for large images
- Requires `/api/ocr-extract` endpoint

**Client-side OCR:**
- Uses Tesseract.js (WASM)
- Works offline
- Slower for large images

### 3. `normalizeText(text: string): string`

Cleans and normalizes extracted text.

**Operations:**
- Replaces multiple newlines with single newline
- Replaces multiple spaces with single space
- Trims leading/trailing whitespace
- Ensures UTF-8 encoding

**Example:**
```typescript
const raw = "Hello  \n\n  world   \n\n  text";
const normalized = normalizeText(raw);
// Result: "Hello world text"
```

### 4. `processFile(file: File, preferServerOCR?: boolean): Promise<string>`

Main pipeline function that processes any file type uniformly.

**Flow:**
1. Detect file type
2. If image → Run OCR
3. If text → Read directly
4. If PDF → Return empty (backend handles)
5. Normalize text
6. Return cleaned text

**Example:**
```typescript
try {
  const extractedText = await processFile(file);
  if (extractedText) {
    // Send to vocabulary extraction
    await uploadToBackend(file, extractedText);
  }
} catch (error) {
  console.error("Processing failed:", error.message);
}
```

### 5. `validateFile(file: File, maxSizeMB?: number): {valid: boolean; error?: string}`

Validates file before processing.

**Checks:**
- File size (default: 50MB max)
- File type support

**Example:**
```typescript
const validation = validateFile(file);
if (!validation.valid) {
  console.error(validation.error);
  return;
}
```

## Usage in Components

### documents-simple/page.tsx

The page now uses the pipeline for all file types:

```typescript
import { processFile, validateFile, detectFileType } from "@/lib/file-processing-pipeline"

// Validate file
const validation = validateFile(file);
if (!validation.valid) {
  setError(validation.error);
  return;
}

// Process file
const fileType = detectFileType(file);
if (fileType === "image") {
  const extractedText = await processFile(file);
  // Create text file from OCR output
  const textFile = new File([extractedText], "ocr-output.txt", { type: "text/plain" });
  // Upload as normal
  await uploadToBackend(textFile, `${file.name} (OCR)`);
} else {
  // Upload directly
  await uploadToBackend(file, file.name);
}
```

## API Endpoints

### POST `/api/ocr-extract`

Server-side OCR extraction endpoint.

**Request:**
```
Content-Type: multipart/form-data
Body: { file: File }
```

**Response:**
```json
{
  "success": true,
  "text": "Extracted text from image...",
  "confidence": 0.95
}
```

**Error Response:**
```json
{
  "error": "OCR failed: Invalid image format"
}
```

## Error Handling

### OCR Errors

```typescript
try {
  const text = await runOCR(imageFile);
} catch (error) {
  // Specific error messages:
  // - "OCR failed: Invalid image format"
  // - "OCR failed: Image too large"
  // - "OCR produced empty text"
  // - "Server OCR failed: 500 Internal Server Error"
}
```

### File Validation Errors

```typescript
const validation = validateFile(file);
if (!validation.valid) {
  // Error messages:
  // - "File too large (52.5MB). Max: 50MB"
  // - "Unsupported file type. Please use: PDF, DOCX, TXT, JPG, PNG"
}
```

## Debugging

The pipeline includes comprehensive logging:

```typescript
// Enable debug logs in browser console
console.log("[Pipeline] Starting file processing for: document.pdf");
console.log("[Pipeline] Detected file type: image");
console.log("[OCR] Starting client-side OCR for file: photo.jpg");
console.log("[OCR] Progress: 45%");
console.log("[OCR] Successfully extracted text, length: 1234");
console.log("[Normalize] Input is not a string: object");
console.log("[Pipeline] Processing complete, text length: 1200");
```

## Performance Considerations

### Image Size Impact

| Image Size | Client-side OCR | Server-side OCR |
|-----------|-----------------|-----------------|
| < 1MB     | ~5-10s          | ~2-3s           |
| 1-5MB     | ~15-30s         | ~5-10s          |
| > 5MB     | ~60s+           | ~15-30s         |

### Recommendations

- **Small images (< 1MB)**: Use client-side OCR (no server load)
- **Medium images (1-5MB)**: Use server-side OCR (faster)
- **Large images (> 5MB)**: Use server-side OCR (client may timeout)

## Future Enhancements

1. **Batch Processing**: Handle multiple images in one upload
2. **Language Support**: Add support for Vietnamese, Chinese, etc.
3. **Confidence Scoring**: Return OCR confidence for each word
4. **Caching**: Cache OCR results for identical images
5. **Progressive Upload**: Stream large files instead of buffering
6. **Compression**: Auto-compress images before OCR

## Troubleshooting

### "OCR produced empty text"

**Causes:**
- Image is blank or corrupted
- Image quality too low
- Wrong language setting

**Solutions:**
- Try a clearer image
- Increase image resolution
- Check image format

### "Server OCR failed: 502"

**Causes:**
- Backend is starting up
- Backend is overloaded

**Solutions:**
- Wait 10 seconds and retry
- Use client-side OCR as fallback
- Check backend status

### "File too large"

**Causes:**
- File exceeds 50MB limit

**Solutions:**
- Compress image before upload
- Split large documents
- Use PDF instead of image

## Testing

```typescript
// Test file detection
const imageFile = new File(["..."], "test.jpg", { type: "image/jpeg" });
expect(detectFileType(imageFile)).toBe("image");

// Test text normalization
const raw = "Hello  \n\n  world";
expect(normalizeText(raw)).toBe("Hello world");

// Test file validation
const largeFile = new File(["x".repeat(60 * 1024 * 1024)], "large.pdf");
const validation = validateFile(largeFile);
expect(validation.valid).toBe(false);
```

## References

- [Tesseract.js Documentation](https://github.com/naptha/tesseract.js)
- [File API](https://developer.mozilla.org/en-US/docs/Web/API/File)
- [FormData API](https://developer.mozilla.org/en-US/docs/Web/API/FormData)
