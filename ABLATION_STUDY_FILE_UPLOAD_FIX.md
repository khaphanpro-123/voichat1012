# ✅ FIX: LỖI UPLOAD FILE VÀ 404 ERROR

## Vấn Đề

1. **Lỗi 404** - API endpoint không tìm thấy
2. **Hiển thị sai font** - File .docx hiển thị ký tự XML lạ

## Nguyên Nhân

### 1. Lỗi 404
- Code dùng `NEXT_PUBLIC_PYTHON_API_URL` 
- Nhưng .env chỉ có `NEXT_PUBLIC_API_URL`
- → API call fail với 404

### 2. Hiển thị sai font
- Code dùng `FileReader.readAsText()` cho tất cả file types
- File .docx là binary format (XML compressed)
- → Hiển thị raw XML content thay vì text

## Giải Pháp

### 1. Fix API URL ✅

**Trước:**
```typescript
fetch(`${process.env.NEXT_PUBLIC_PYTHON_API_URL}/api/...`)
```

**Sau:**
```typescript
fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/...`)
```

**Thay đổi:**
- 3 chỗ trong file `app/dashboard-new/ablation-study/page.tsx`
- Line 109: Upload file
- Line 161: Auto extract vocabulary
- Line 227: Run ablation study

### 2. Fix File Upload ✅

**Trước:**
```typescript
const handleFileUpload = async (event) => {
  const file = event.target.files?.[0];
  // Đọc tất cả file types bằng readAsText
  const reader = new FileReader();
  reader.readAsText(file); // ❌ Sai với .docx/.pdf
};
```

**Sau:**
```typescript
const handleFileUpload = async (event) => {
  const file = event.target.files?.[0];
  
  if (file.name.endsWith('.txt')) {
    // ✅ Chỉ .txt mới đọc trực tiếp
    const reader = new FileReader();
    reader.readAsText(file);
  } else {
    // ✅ .pdf/.docx gửi lên backend để xử lý
    const formData = new FormData();
    formData.append('file', file);
    
    const response = await fetch('/api/upload-document-complete', {
      method: 'POST',
      body: formData,
    });
    
    // Backend sẽ extract text từ PDF/DOCX
  }
};
```

### 3. Fix Auto Extract ✅

**Trước:**
```typescript
const autoExtractVocabulary = async () => {
  // Luôn tạo file mới từ documentText
  const blob = new Blob([documentText], { type: 'text/plain' });
  const file = new File([blob], documentTitle + '.txt');
  formData.append('file', file);
};
```

**Sau:**
```typescript
const autoExtractVocabulary = async () => {
  // ✅ Dùng file đã upload nếu có
  if (uploadedFile) {
    formData.append('file', uploadedFile);
  } else {
    // Tạo file mới từ text
    const blob = new Blob([documentText], { type: 'text/plain' });
    const file = new File([blob], documentTitle + '.txt');
    formData.append('file', file);
  }
};
```

## Chi Tiết Thay Đổi

### File: `app/dashboard-new/ablation-study/page.tsx`

#### 1. handleFileUpload Function

```typescript
const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
  const file = event.target.files?.[0];
  if (!file) return;

  setUploadedFile(file);
  setDocumentTitle(file.name.replace(/\.[^/.]+$/, ''));
  setError('');

  // Chỉ hỗ trợ .txt file cho việc đọc trực tiếp
  if (file.name.endsWith('.txt')) {
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      setDocumentText(text);
    };
    reader.readAsText(file);
  } else {
    // Với PDF/DOCX, gửi lên backend để extract text
    setError('Đang xử lý file... Vui lòng đợi');
    
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('max_phrases', '1');
      formData.append('max_words', '1');

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/upload-document-complete`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      if (data.success) {
        setDocumentText(`File "${file.name}" đã được tải lên.\n\nVui lòng click "Tự Động Trích Xuất Từ Vựng" để xử lý file này.`);
        setError('');
      } else {
        throw new Error('Không thể xử lý file');
      }
    } catch (err) {
      setError('Lỗi khi xử lý file. Vui lòng thử file .txt hoặc copy/paste nội dung.');
      console.error('Error:', err);
    }
  }
};
```

#### 2. autoExtractVocabulary Function

```typescript
const autoExtractVocabulary = async () => {
  if (!uploadedFile && !documentText.trim()) {
    setError('Vui lòng nhập văn bản hoặc tải file lên trước');
    return;
  }

  setExtractingVocab(true);
  setError('');

  try {
    const formData = new FormData();
    
    // Nếu có file đã upload, dùng file đó
    if (uploadedFile) {
      formData.append('file', uploadedFile);
    } else {
      // Nếu không, tạo file blob từ text
      const blob = new Blob([documentText], { type: 'text/plain' });
      const file = new File([blob], documentTitle + '.txt', { type: 'text/plain' });
      formData.append('file', file);
    }
    
    formData.append('max_phrases', '30');
    formData.append('max_words', '20');

    const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/upload-document-complete`, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HTTP error! status: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    
    if (data.success && data.vocabulary) {
      const extractedVocab = data.vocabulary
        .map((item: any) => item.word || item.phrase || item.text)
        .filter((word: string) => word && word.trim())
        .slice(0, 50);
      
      setGroundTruth(extractedVocab.join('\n'));
      setError('');
      
      // Nếu có file PDF/DOCX, cập nhật document text từ contexts
      if (uploadedFile && !uploadedFile.name.endsWith('.txt')) {
        const contexts = data.vocabulary
          .map((item: any) => item.context_sentence || item.supporting_sentence || '')
          .filter((s: string) => s.trim())
          .slice(0, 20);
        
        if (contexts.length > 0) {
          setDocumentText(contexts.join('\n\n'));
        }
      }
    } else {
      throw new Error('Không thể trích xuất từ vựng');
    }
  } catch (err) {
    setError(err instanceof Error ? err.message : 'Đã xảy ra lỗi khi trích xuất từ vựng');
    console.error('Error:', err);
  } finally {
    setExtractingVocab(false);
  }
};
```

#### 3. UI Updates

```tsx
<CardDescription>
  Tải file .txt lên (khuyến nghị) hoặc nhập văn bản (tiếng Anh)
  <br />
  <span className="text-xs text-orange-600">
    Lưu ý: File .pdf/.docx cần click "Tự Động Trích Xuất" để xử lý
  </span>
</CardDescription>

<Button onClick={() => fileInputRef.current?.click()}>
  <Upload className="mr-2 h-4 w-4" />
  {uploadedFile ? uploadedFile.name : 'Tải File Lên (.txt khuyến nghị)'}
</Button>
```

## Workflow Mới

### Với File .txt

```
1. Click "Tải File Lên"
   ↓
2. Chọn file .txt
   ↓
3. Văn bản tự động hiển thị trong textarea
   ↓
4. Click "Tự Động Trích Xuất Từ Vựng" (optional)
   ↓
5. Click "Chạy Ablation Study"
```

### Với File .pdf/.docx

```
1. Click "Tải File Lên"
   ↓
2. Chọn file .pdf hoặc .docx
   ↓
3. Hiển thị message "File đã được tải lên"
   ↓
4. Click "Tự Động Trích Xuất Từ Vựng" (REQUIRED)
   ↓
5. Backend xử lý file và extract text + vocabulary
   ↓
6. Văn bản và từ vựng tự động điền
   ↓
7. Click "Chạy Ablation Study"
```

## Kiểm Tra

### Test Case 1: File .txt ✅

```
1. Tải file .txt
2. Kiểm tra văn bản hiển thị đúng
3. Click "Tự Động Trích Xuất"
4. Kiểm tra từ vựng được trích xuất
5. Click "Chạy Ablation Study"
6. Kiểm tra kết quả
```

### Test Case 2: File .pdf ✅

```
1. Tải file .pdf
2. Kiểm tra message "File đã được tải lên"
3. Click "Tự Động Trích Xuất"
4. Đợi backend xử lý (5-10s)
5. Kiểm tra văn bản và từ vựng
6. Click "Chạy Ablation Study"
7. Kiểm tra kết quả
```

### Test Case 3: File .docx ✅

```
1. Tải file .docx
2. Kiểm tra message "File đã được tải lên"
3. Click "Tự Động Trích Xuất"
4. Đợi backend xử lý (5-10s)
5. Kiểm tra văn bản và từ vựng
6. Click "Chạy Ablation Study"
7. Kiểm tra kết quả
```

## Lưu Ý Quan Trọng

### 1. File Types

| Type | Đọc Trực Tiếp | Cần Backend | Khuyến Nghị |
|------|---------------|-------------|-------------|
| .txt | ✅ | ❌ | ⭐⭐⭐ |
| .pdf | ❌ | ✅ | ⭐⭐ |
| .docx | ❌ | ✅ | ⭐⭐ |

### 2. API URL

**Đúng:**
```typescript
process.env.NEXT_PUBLIC_API_URL
```

**Sai:**
```typescript
process.env.NEXT_PUBLIC_PYTHON_API_URL // ❌ Không tồn tại
```

### 3. Error Handling

```typescript
try {
  const response = await fetch(...);
  
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`HTTP error! status: ${response.status} - ${errorText}`);
  }
  
  const data = await response.json();
  // Process data
} catch (err) {
  setError(err instanceof Error ? err.message : 'Đã xảy ra lỗi');
  console.error('Error:', err);
}
```

## Deployment

✅ **Status:** DEPLOYED TO VERCEL

**Commit:** "fix: Fix file upload and API URL issues in Ablation Study"

**Files Changed:**
- `app/dashboard-new/ablation-study/page.tsx`

**Deploy Time:** 1-2 phút

## Kết Luận

✅ Lỗi 404 đã được fix (API URL đúng)  
✅ Lỗi hiển thị font đã được fix (.txt đọc trực tiếp, .pdf/.docx qua backend)  
✅ Error handling tốt hơn  
✅ User instructions rõ ràng hơn  
✅ Workflow mượt mà hơn  

**Người dùng giờ có thể:**
1. Tải file .txt và xem ngay văn bản
2. Tải file .pdf/.docx và xử lý qua backend
3. Hiểu rõ cần làm gì với từng loại file
4. Nhận feedback rõ ràng khi có lỗi

---

**Hoàn thành:** 2026-03-12  
**Thời gian:** ~10 phút  
**Status:** ✅ FIXED & DEPLOYED  
**Tác giả:** Kiro AI
