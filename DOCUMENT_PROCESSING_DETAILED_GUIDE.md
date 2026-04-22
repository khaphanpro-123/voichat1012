# Hướng Dẫn Chi Tiết: Chức Năng Tải và Xử Lý Tài Liệu

## 📋 Tổng Quan Quy Trình

```
User chọn file
    ↓
Validate file (kiểm tra kích thước, loại)
    ↓
Detect file type (ảnh/PDF/text)
    ↓
Nếu ảnh → OCR extraction (trích xuất text)
Nếu PDF/text → Upload trực tiếp
    ↓
Gửi đến backend (/api/upload-document-complete)
    ↓
Backend xử lý: 11-step NLP pipeline
    ↓
Trích xuất vocabulary + topics
    ↓
Lưu vào MongoDB
    ↓
Hiển thị kết quả cho user
```

---

## 🔍 BƯỚC 1: VALIDATE FILE (Kiểm Tra File)

### File: `lib/file-processing-pipeline.ts`

```typescript
export function validateFile(file: File, maxSizeMB: number = 50): {
  valid: boolean;
  error?: string;
} {
  const maxSizeBytes = maxSizeMB * 1024 * 1024;

  // Kiểm tra kích thước file
  if (file.size > maxSizeBytes) {
    return {
      valid: false,
      error: `File too large (${(file.size / 1024 / 1024).toFixed(2)}MB). Max: ${maxSizeMB}MB`,
    };
  }

  // Kiểm tra loại file
  const fileType = detectFileType(file);
  if (fileType === "unknown") {
    return {
      valid: false,
      error: "Unsupported file type. Please use: PDF, DOCX, TXT, JPG, PNG",
    };
  }

  return { valid: true };
}
```

**Tác dụng**:
- ✅ Kiểm tra file không vượt quá 50MB
- ✅ Kiểm tra file type hợp lệ (image, PDF, text)
- ✅ Trả về error message nếu không hợp lệ

**Sử dụng trong frontend**:
```typescript
const validation = validateFile(selectedFile);
if (!validation.valid) {
  setError(validation.error || "Invalid file");
  return;
}
```

---

## 🎯 BƯỚC 2: DETECT FILE TYPE (Xác Định Loại File)

### File: `lib/file-processing-pipeline.ts`

```typescript
export function detectFileType(file: File): FileType {
  const mimeType = file.type.toLowerCase();
  const fileName = file.name.toLowerCase();

  // Kiểm tra ảnh
  if (
    mimeType.startsWith("image/") ||
    /\.(jpg|jpeg|png|gif|webp|bmp)$/i.test(fileName)
  ) {
    return "image";
  }

  // Kiểm tra PDF
  if (
    mimeType === "application/pdf" ||
    fileName.endsWith(".pdf")
  ) {
    return "pdf";
  }

  // Kiểm tra text/Word
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
```

**Tác dụng**:
- ✅ Kiểm tra MIME type của file
- ✅ Kiểm tra extension của file
- ✅ Trả về loại file: "image" | "pdf" | "text" | "unknown"

**Ví dụ**:
```
File: "document.pdf" → "pdf"
File: "photo.jpg" → "image"
File: "notes.txt" → "text"
File: "data.xlsx" → "unknown"
```

---

## 🖼️ BƯỚC 3: OCR EXTRACTION (Trích Xuất Text Từ Ảnh)

### File: `lib/file-processing-pipeline.ts`

#### 3.1 Client-Side OCR (Tesseract.js)

```typescript
export async function runOCRClientSide(imageFile: File): Promise<string> {
  try {
    console.log("[OCR] Starting client-side OCR for file:", imageFile.name);

    // Bước 1: Convert file thành data URL
    const imageData = await fileToDataUrl(imageFile);

    // Bước 2: Chạy Tesseract OCR
    const result = await Tesseract.recognize(imageData, "eng", {
      logger: (m) => {
        if (m.status === "recognizing text") {
          console.log(`[OCR] Progress: ${Math.round(m.progress * 100)}%`);
        }
      },
    });

    // Bước 3: Lấy text từ result
    let rawText = result.data.text;

    // Bước 4: Đảm bảo output là string
    if (typeof rawText !== "string") {
      console.warn("[OCR] Output is not a string, converting...");
      rawText = String(rawText || "");
    }

    // Bước 5: Kiểm tra text không rỗng
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
```

**Tác dụng**:
- ✅ Chuyển ảnh thành data URL
- ✅ Chạy Tesseract OCR trên browser (client-side)
- ✅ Trích xuất text từ ảnh
- ✅ Đảm bảo output là string (không phải object/array)
- ✅ Kiểm tra text không rỗng

**Ưu điểm**:
- Nhanh (không cần gửi lên server)
- Không tốn bandwidth

**Nhược điểm**:
- Chậm với ảnh lớn
- Tốn CPU của browser

#### 3.2 Server-Side OCR (Fallback)

```typescript
export async function runOCRServerSide(imageFile: File): Promise<string> {
  try {
    console.log("[OCR-Server] Starting server-side OCR for file:", imageFile.name);

    const formData = new FormData();
    formData.append("file", imageFile);

    // Gửi ảnh đến backend
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

    // Đảm bảo output là string
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
```

**Tác dụng**:
- ✅ Gửi ảnh đến backend
- ✅ Backend chạy OCR (Tesseract.js server-side)
- ✅ Trả về text đã trích xuất
- ✅ Đảm bảo output là string

**Ưu điểm**:
- Nhanh hơn client-side
- Không tốn CPU browser

#### 3.3 OCR Với Fallback

```typescript
export async function runOCR(imageFile: File, preferServer: boolean = true): Promise<string> {
  if (preferServer) {
    try {
      // Thử server-side trước
      return await runOCRServerSide(imageFile);
    } catch (serverError) {
      console.warn("[OCR] Server-side OCR failed, falling back to client-side");
      // Nếu server fail, dùng client-side
      return await runOCRClientSide(imageFile);
    }
  } else {
    try {
      // Thử client-side trước
      return await runOCRClientSide(imageFile);
    } catch (clientError) {
      console.warn("[OCR] Client-side OCR failed, falling back to server-side");
      // Nếu client fail, dùng server-side
      return await runOCRServerSide(imageFile);
    }
  }
}
```

**Tác dụng**:
- ✅ Thử server-side OCR trước (nhanh hơn)
- ✅ Nếu fail, fallback sang client-side
- ✅ Đảm bảo luôn có text được trích xuất

---

## 📝 BƯỚC 4: NORMALIZE TEXT (Chuẩn Hóa Text)

### File: `lib/file-processing-pipeline.ts`

```typescript
export function normalizeText(text: string): string {
  if (typeof text !== "string") {
    console.warn("[Normalize] Input is not a string:", typeof text);
    text = String(text || "");
  }

  return text
    // Thay thế nhiều newline bằng 1 newline
    .replace(/\n\n+/g, "\n")
    // Thay thế nhiều space bằng 1 space
    .replace(/\s+/g, " ")
    // Xóa leading/trailing whitespace
    .trim();
}
```

**Tác dụng**:
- ✅ Xóa multiple newlines
- ✅ Xóa multiple spaces
- ✅ Trim leading/trailing whitespace
- ✅ Đảm bảo text sạch sẽ

**Ví dụ**:
```
Input:  "Hello    world\n\n\nHow are you?"
Output: "Hello world\nHow are you?"
```

---

## 🚀 BƯỚC 5: UPLOAD ĐẾN BACKEND

### File: `app/dashboard-new/documents-simple/page.tsx`

```typescript
const handleUpload = async () => {
  if (!file) { setError("Vui lòng chọn file"); return }
  setUploading(true)
  setError("")
  setResult(null)
  
  try {
    const fileType = detectFileType(file)
    console.log("[Upload] File type detected:", fileType)
    
    // Nếu là ảnh, chạy OCR trước
    if (fileType === "image") {
      console.log("[Upload] Running OCR on image...")
      try {
        // Trích xuất text từ ảnh
        const extractedText = await processFile(file)
        if (!extractedText || extractedText.trim().length === 0) {
          setError("Không thể trích xuất text từ ảnh. Vui lòng thử ảnh khác.")
          setUploading(false)
          return
        }
        console.log("[Upload] OCR successful, text length:", extractedText.length)
        
        // Tạo text file từ OCR output
        const textBlob = new Blob([extractedText], { type: "text/plain" })
        const textFile = new File([textBlob], "ocr-output.txt", { type: "text/plain" })
        
        // Upload text file
        await uploadToBackend(textFile, `${file.name} (OCR)`)
      } catch (ocrError: any) {
        setError(`Lỗi OCR: ${ocrError?.message || "Không xác định"}`)
        setUploading(false)
        return
      }
    } else {
      // Nếu là PDF/text, upload trực tiếp
      await uploadToBackend(file, file.name)
    }
  } catch (err: any) {
    setError("Hệ thống xử lý tài liệu đã xảy ra lỗi, vui lòng tải tệp khác")
    console.error("[Upload] Error:", err)
  } finally {
    setUploading(false)
  }
}
```

**Tác dụng**:
- ✅ Detect file type
- ✅ Nếu ảnh → chạy OCR
- ✅ Tạo text file từ OCR output
- ✅ Upload đến backend

---

## 🔗 BƯỚC 6: UPLOAD ĐẾN BACKEND API

### File: `app/dashboard-new/documents-simple/page.tsx`

```typescript
const uploadToBackend = async (fileToUpload: File, displayName: string) => {
  try {
    // Tạo FormData
    const formData = new FormData()
    formData.append("file", fileToUpload)
    formData.append("title", displayName)
    formData.append("max_phrases", maxPhrases.toString())
    formData.append("max_words", maxWords.toString())
    formData.append("min_phrase_length", "2")
    formData.append("max_phrase_length", "5")
    formData.append("bm25_weight", "0.2")
    formData.append("generate_flashcards", "true")

    // Gửi đến backend
    const response = await fetch(`/api/upload-document-complete`, { 
      method: "POST", 
      body: formData 
    })
    const data = await response.json()

    // Kiểm tra response
    if (!response.ok) {
      if (response.status === 413) { setError("File quá lớn (tối đa 50MB)"); return }
      if (response.status === 504) { setError("Xử lý quá lâu. Vui lòng thử file nhỏ hơn"); return }
      if (response.status === 502) { setError("Backend đang khởi động. Vui lòng đợi 10 giây và thử lại..."); return }
      throw new Error(data.error || `Upload failed: ${response.statusText}`)
    }

    // Kiểm tra data format
    if (!data || typeof data !== "object") throw new Error("Invalid response format")
    if (!data.flashcards && !data.vocabulary) throw new Error("Response missing vocabulary data")

    // Lưu result
    setResult(data)
    
    // Lưu topics vào localStorage
    if (data.topics && data.topics.length > 0) {
      try { localStorage.setItem("recent_topics", JSON.stringify(data.topics)) } catch {}
    }
    
    // Lưu metadata tài liệu
    try {
      await fetch("/api/documents-history", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          filename: displayName,
          fileSize: fileToUpload.size,
          vocabularyCount: data.vocabulary_count || data.vocabulary?.length || 0,
          topicsCount: data.topics?.length || 0,
        })
      })
      await loadDocuments()
    } catch {}
    
    // Lưu vocabulary vào database
    await handleSaveToDatabase(data)
  } catch (err: any) {
    throw err
  }
}
```

**Tác dụng**:
- ✅ Tạo FormData với file + parameters
- ✅ Gửi POST request đến `/api/upload-document-complete`
- ✅ Kiểm tra response status
- ✅ Lưu result vào state
- ✅ Lưu topics vào localStorage
- ✅ Lưu metadata tài liệu
- ✅ Lưu vocabulary vào database

**Parameters**:
- `file`: File được upload
- `title`: Tên tài liệu
- `max_phrases`: Số lượng phrases tối đa (40)
- `max_words`: Số lượng words tối đa (10)
- `min_phrase_length`: Độ dài phrase tối thiểu (2)
- `max_phrase_length`: Độ dài phrase tối đa (5)
- `bm25_weight`: Trọng số BM25 (0.2)
- `generate_flashcards`: Tạo flashcards (true)

---

## ⚙️ BƯỚC 7: BACKEND PROCESSING

### File: `app/api/upload-document-complete/route.ts`

Backend nhận file và chạy 11-step NLP pipeline:

```
1. Text preprocessing (xóa HTML, normalize whitespace)
2. Sentence segmentation (chia thành câu)
3. POS tagging (gán nhãn từ loại)
4. Phrase extraction (trích xuất cụm từ)
5. Semantic embeddings (chuyển thành vector)
6. TF-IDF scoring (tính điểm TF-IDF)
7. Frequency analysis (phân tích tần suất)
8. Length normalization (chuẩn hóa độ dài)
9. Hybrid scoring (tính điểm tổng hợp)
10. Clustering (nhóm từ tương tự)
11. Ranking & filtering (xếp hạng và lọc)
```

**Output**:
```json
{
  "vocabulary": [
    {
      "word": "resource",
      "definition": "a supply of something",
      "context_sentence": "The company invested in renewable resources",
      "importance_score": 0.85,
      "pos_label": "noun"
    }
  ],
  "topics": [
    {
      "core_phrase": "natural resource",
      "words": ["resource", "renewable", "sustainable"],
      "size": 3
    }
  ],
  "vocabulary_count": 50,
  "topics_count": 5
}
```

---

## 💾 BƯỚC 8: LƯU VÀO DATABASE

### File: `app/dashboard-new/documents-simple/page.tsx`

```typescript
const handleSaveToDatabase = async (data: any) => {
  try {
    const vocabularyToSave = data.vocabulary || data.flashcards || []
    if (vocabularyToSave.length === 0) return { savedCount: 0, failedCount: 0 }
    
    let savedCount = 0, failedCount = 0
    
    // Lưu từng vocabulary item
    const savePromises = vocabularyToSave.map(async (item: any) => {
      if (!item || (!item.word && !item.phrase)) return
      
      const payload = {
        word: item.word || item.phrase,
        meaning: item.definition || "",
        example: item.context_sentence || item.supporting_sentence || "",
        type: item.pos_label || "noun",
        level: "intermediate",
        source: "document",
      }
      
      try {
        const res = await fetch("/api/vocabulary", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        })
        
        if (res.ok) {
          savedCount++
        } else {
          failedCount++
        }
      } catch {
        failedCount++
      }
    })
    
    await Promise.all(savePromises)
    return { savedCount, failedCount }
  } catch (err: any) {
    console.error("[SaveDB] Error:", err)
    return { savedCount: 0, failedCount: vocabularyToSave.length }
  }
}
```

**Tác dụng**:
- ✅ Lấy vocabulary từ backend response
- ✅ Lưu từng item vào database
- ✅ Gọi `/api/vocabulary` POST endpoint
- ✅ Theo dõi số lượng saved/failed

---

## 📊 BƯỚC 9: HIỂN THỊ KẾT QUẢ

### File: `app/dashboard-new/documents-simple/page.tsx`

```typescript
// Hiển thị vocabulary cards
{result?.vocabulary?.map((card: any) => (
  <VocabularyCard 
    key={card.word} 
    card={card} 
    speakText={speakText} 
  />
))}

// Hiển thị topics
{result?.topics?.map((topic: any, idx: number) => (
  <div key={idx} className="border rounded-lg p-4">
    <button onClick={() => toggleTopic(idx)}>
      {topic.core_phrase} ({topic.size} words)
    </button>
    {expandedTopics.has(idx) && (
      <div className="mt-2 space-y-2">
        {topic.words.map((word: string) => (
          <span key={word} className="inline-block bg-blue-100 px-2 py-1 rounded">
            {word}
          </span>
        ))}
      </div>
    )}
  </div>
))}
```

**Tác dụng**:
- ✅ Hiển thị danh sách vocabulary
- ✅ Hiển thị topics (có thể expand/collapse)
- ✅ Cho phép phát âm từ
- ✅ Hiển thị điểm importance

---

## 🔄 LIÊN KẾT GIỮA CÁC PHẦN

```
Frontend (documents-simple/page.tsx)
    ↓
1. validateFile() → Kiểm tra file
    ↓
2. detectFileType() → Xác định loại
    ↓
3. Nếu ảnh:
   - processFile() → Chạy OCR
   - normalizeText() → Chuẩn hóa
   ↓
4. uploadToBackend() → Gửi FormData
    ↓
Backend (/api/upload-document-complete)
    ↓
5. 11-step NLP pipeline → Xử lý text
    ↓
6. Trích xuất vocabulary + topics
    ↓
7. Trả về JSON response
    ↓
Frontend
    ↓
8. handleSaveToDatabase() → Lưu vào MongoDB
    ↓
9. setResult() → Hiển thị kết quả
```

---

## ⚠️ ERROR HANDLING

```typescript
// Kiểm tra file size
if (file.size > 50MB) → Error: "File quá lớn"

// Kiểm tra file type
if (fileType === "unknown") → Error: "Unsupported file type"

// Kiểm tra OCR output
if (!extractedText) → Error: "Không thể trích xuất text"

// Kiểm tra backend response
if (response.status === 413) → Error: "File quá lớn"
if (response.status === 504) → Error: "Xử lý quá lâu"
if (response.status === 502) → Error: "Backend đang khởi động"

// Kiểm tra data format
if (!data.vocabulary) → Error: "Response missing vocabulary data"
```

---

## 📌 TÓM TẮT

| Bước | Hàm | Tác Dụng |
|------|-----|---------|
| 1 | `validateFile()` | Kiểm tra file hợp lệ |
| 2 | `detectFileType()` | Xác định loại file |
| 3 | `runOCR()` | Trích xuất text từ ảnh |
| 4 | `normalizeText()` | Chuẩn hóa text |
| 5 | `uploadToBackend()` | Gửi file đến backend |
| 6 | Backend pipeline | Xử lý NLP 11 bước |
| 7 | `handleSaveToDatabase()` | Lưu vocabulary vào DB |
| 8 | UI render | Hiển thị kết quả |

