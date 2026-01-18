# Cải Tiến Hệ Thống Upload Tài Liệu

## Tổng Quan
Đã nâng cấp hệ thống upload tài liệu với các thuật toán trích xuất từ vựng nâng cao và trải nghiệm người dùng tốt hơn.

## Các Cải Tiến Chính

### 1. Giới Hạn File & Định Dạng
- ✅ **Tăng dung lượng**: 5MB → **10MB**
- ✅ **Chỉ chấp nhận**: PDF, Word (.docx), TXT
- ✅ **Loại bỏ**: PNG, JPG, JPEG (không còn hỗ trợ OCR hình ảnh)

### 2. PDF Conversion Dialog
- ✅ Hiển thị thông báo khi upload PDF
- ✅ Cảnh báo người dùng về việc chuyển đổi:
  - Một số định dạng phức tạp có thể bị mất
  - Hình ảnh và bảng biểu sẽ không được xử lý
  - Chất lượng phụ thuộc vào chất lượng PDF
- ✅ Người dùng phải đồng ý trước khi tiếp tục
- ✅ Word (.docx) và TXT không cần chuyển đổi

### 3. Thuật Toán Trích Xuất Từ Vựng Nâng Cao

#### 3.1. TF-IDF (Term Frequency - Inverse Document Frequency)
```
tf(t,d) = f(t,d) / max{f(w,d) : w ∈ d}
idf(t,D) = log(|D| / |{d ∈ D : t ∈ d}|)
score = TF × IDF
```
- **Mục đích**: Tìm từ quan trọng dựa trên tần suất xuất hiện
- **Ưu điểm**: Loại bỏ từ phổ biến, giữ lại từ đặc trưng

#### 3.2. RAKE (Rapid Automatic Keyword Extraction)
```
score = degree(w) / frequency(w)
```
- **Mục đích**: Trích xuất từ khóa dựa trên đồng xuất hiện
- **Ưu điểm**: Tìm cụm từ và từ có ngữ cảnh liên quan

#### 3.3. YAKE (Yet Another Keyword Extractor)
```
Tiêu chí vị trí: position(w) = log(log(3 + Median(Sen(w))))
Tiêu chí tần suất: frequency(w) = count(w) / (mean + stdDev)
Tiêu chí ngữ cảnh: relatedness(w) = 1 + (WL + WR) × count(w) / maxCount
Tiêu chí phân bố: different(w) = sentenceCount(w) / totalSentences
score = (d × b) / (a + c/d + e/d)
```
- **Mục đích**: Đánh giá từ dựa trên nhiều tiêu chí
- **Ưu điểm**: Xem xét vị trí, viết hoa, ngữ cảnh

#### 3.4. Combined Method
- Kết hợp cả 3 phương pháp
- Tính điểm trung bình từ các phương pháp
- Chọn top N từ có điểm cao nhất

### 4. Quy Trình Xử Lý

```
1. Upload File (PDF/DOCX/TXT)
   ↓
2. Validate File Type & Size
   ↓
3. [Nếu PDF] → Show Conversion Dialog → User Accept
   ↓
4. Extract Text
   ↓
5. Remove Metadata (XMP, RDF, UUID)
   ↓
6. Apply Advanced Extraction (TF-IDF + RAKE + YAKE)
   ↓
7. Return Top Vocabulary Words
   ↓
8. User Select Words → Generate Flashcards
```

## Files Đã Thay Đổi

### 1. `components/FileUploadOCR.tsx`
- Thêm validation file type (chỉ PDF, DOCX, TXT)
- Tăng file size limit lên 10MB
- Thêm PDF conversion dialog
- Cải thiện UI/UX

### 2. `app/api/upload-ocr/route.ts`
- Thêm validation file type và size
- Tích hợp advanced vocabulary extraction
- Thêm extraction logs chi tiết
- Cải thiện error handling

### 3. `lib/advancedVocabularyExtractor.ts` (MỚI)
- Implement TF-IDF algorithm
- Implement RAKE algorithm
- Implement YAKE algorithm
- Combined extraction method
- Export functions cho API sử dụng

## Cách Sử Dụng

### Cho Người Dùng:
1. Vào https://voichat1012-alpha.vercel.app/dashboard-new/documents
2. Click "Upload Document"
3. Chọn file PDF, DOCX hoặc TXT (max 10MB)
4. [Nếu PDF] Đọc thông báo và click "Đồng ý & Tiếp tục"
5. Đợi hệ thống xử lý (3 bước)
6. Chọn từ vựng muốn học
7. Click "Tạo Flashcards"
8. Xem flashcards và học từ vựng

### Cho Developer:
```typescript
import { extractVocabularyAdvanced } from '@/lib/advancedVocabularyExtractor';

const result = extractVocabularyAdvanced(text, {
  maxWords: 50,
  minWordLength: 3,
  methods: ['tfidf', 'rake', 'yake']
});

console.log(result.vocabulary); // Top 50 words
console.log(result.scores); // Detailed scores
console.log(result.stats); // Statistics
```

## Kết Quả Mong Đợi

### Trước:
- Trích xuất từ vựng đơn giản (word frequency)
- Nhiều từ phổ biến không hữu ích (the, a, is...)
- Không xem xét ngữ cảnh

### Sau:
- Trích xuất thông minh với 3 thuật toán
- Loại bỏ stop words tự động
- Ưu tiên từ quan trọng theo ngữ cảnh
- Điểm số chi tiết cho mỗi từ
- Logs để debug và cải thiện

## Testing

### Test Cases:
1. ✅ Upload PDF < 10MB → Success
2. ✅ Upload PDF > 10MB → Error "File quá lớn"
3. ✅ Upload DOCX → Success (no dialog)
4. ✅ Upload TXT → Success (no dialog)
5. ✅ Upload PNG → Error "Chỉ chấp nhận PDF, DOCX, TXT"
6. ✅ PDF Dialog → Cancel → File cleared
7. ✅ PDF Dialog → Accept → Processing starts
8. ✅ Extraction logs visible in debug mode

## Deployment

```bash
# Đã push lên GitHub
git push origin main

# Vercel sẽ tự động deploy
# Check: https://vercel.com/dashboard
```

## Next Steps (Tương Lai)

1. **PDF to Word Conversion**: Sử dụng thư viện Python `pdf2docx` cho conversion tốt hơn
2. **Machine Learning**: Train model để nhận diện từ vựng quan trọng
3. **User Feedback**: Cho phép user đánh giá chất lượng từ vựng
4. **Batch Processing**: Upload nhiều file cùng lúc
5. **Export Options**: Export vocabulary sang Anki, Quizlet

## Tài Liệu Tham Khảo

- TF-IDF: https://en.wikipedia.org/wiki/Tf%E2%80%93idf
- RAKE: https://www.researchgate.net/publication/227988510_Automatic_Keyword_Extraction_from_Individual_Documents
- YAKE: https://repositorio.inesctec.pt/handle/123456789/7623

---

**Tác giả**: Kiro AI Assistant  
**Ngày**: 2026-01-18  
**Version**: 2.0.0
