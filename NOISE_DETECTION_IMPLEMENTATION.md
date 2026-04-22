# Noise Detection & Image Enhancement Implementation

## 📋 Tóm Tắt
Đã áp dụng toàn bộ giải pháp phát hiện từ vô nghĩa và cải thiện chất lượng ảnh vào hệ thống documents-simple.

---

## 🎯 Các File Được Tạo/Cập Nhật

### 1. **lib/image-enhancement.ts** (NEW)
**Chức năng**: Cải thiện chất lượng ảnh trước OCR

**Hàm chính**:
- `enhanceImageQuality(file)` - Tăng độ tương phản và sáng
- `assessImageQuality(file)` - Đánh giá chất lượng ảnh

**Cách hoạt động**:
```
Ảnh gốc → Canvas → Tăng contrast (1.5x) → Tăng brightness (+20) → JPEG 95%
```

**Khi nào dùng**:
- Ảnh chụp bị mờ, nhòe
- Ảnh quá tối hoặc quá sáng
- Ảnh chất lượng kém (< 50KB hoặc > 10MB)

---

### 2. **lib/noise-detection.ts** (NEW)
**Chức năng**: Phát hiện từ vô nghĩa từ OCR

**Hàm chính**:
- `detectNoiseWords(text)` - Phát hiện tất cả từ lỗi
- `filterNoiseFromVocabulary(vocabulary, noiseWords)` - Lọc từ lỗi

**Tiêu chí phát hiện**:
1. ✓ Chứa ký tự lạ (™, ©, ®, etc.) → Confidence: 90%
2. ✓ Từ quá dài (> 30 ký tự) → Confidence: 70%
3. ✓ Toàn ký tự đặc biệt → Confidence: 95%
4. ✓ Ký tự lặp quá nhiều (4+) → Confidence: 85%
5. ✓ Hỗn hợp ký tự từ nhiều ngôn ngữ → Confidence: 80%
6. ✓ Từ quá ngắn (≤2) với ký tự lạ → Confidence: 75%

---

### 3. **components/CameraCapture.tsx** (UPDATED)
**Thay đổi**:
- Thêm import `enhanceImageQuality`, `assessImageQuality`
- Cập nhật `handleCapture()` để:
  1. Kiểm tra chất lượng ảnh
  2. Nếu chất lượng kém → Tự động cải thiện
  3. Gửi ảnh đã cải thiện lên

**Code**:
```typescript
const quality = assessImageQuality(originalFile)
if (quality.quality === "poor" || quality.quality === "fair") {
  const enhancedBlob = await enhanceImageQuality(originalFile)
  fileToUse = new File([enhancedBlob], "camera-photo-enhanced.jpg", ...)
}
onCapture(fileToUse)
```

---

### 4. **app/dashboard-new/documents-simple/page.tsx** (UPDATED)
**Thay đổi**:
- Thêm import `detectNoiseWords`, `filterNoiseFromVocabulary`
- Cập nhật `uploadToBackend()` để:
  1. Phát hiện từ lỗi từ OCR
  2. Lọc vocabulary thành 2 phần: clean + noise
  3. Lưu vào state result
- Thêm UI section hiển thị từ lỗi

**Code**:
```typescript
const noiseWords = detectNoiseWords(allText)
const { clean, noise } = filterNoiseFromVocabulary(vocabulary, noiseWords)
setResult({
  ...data,
  vocabulary: clean,
  noiseVocabulary: noise,
  noiseDetection: { totalNoise: noise.length, noiseWords, cleanCount: clean.length }
})
```

---

## 🎨 UI Changes

### Phần Từ Lỗi (Noise Vocabulary Section)
**Vị trí**: Hiển thị trước phần thống kê

**Nội dung**:
- ⚠️ Tiêu đề: "Từ Vựng Lỗi Do Nhiễu OCR (N từ)"
- 📋 Danh sách lý do phát hiện (top 5)
- 📝 Danh sách từ lỗi với:
  - Tên từ
  - Score
  - Nút "Xóa" để loại bỏ

**Styling**:
- Border đỏ (red-200)
- Background nhạt (red-50)
- Có thể scroll nếu > 5 từ

---

## 🔄 Luồng Xử Lý

### Khi Chụp Ảnh
```
1. Người dùng chụp ảnh
   ↓
2. CameraCapture.handleCapture()
   ↓
3. assessImageQuality() → Kiểm tra chất lượng
   ↓
4. Nếu chất lượng kém → enhanceImageQuality()
   ↓
5. Gửi ảnh (gốc hoặc cải thiện) lên
```

### Khi Upload File/Ảnh
```
1. uploadToBackend() nhận kết quả từ backend
   ↓
2. detectNoiseWords() → Phát hiện từ lỗi
   ↓
3. filterNoiseFromVocabulary() → Lọc thành 2 phần
   ↓
4. setResult() → Lưu vào state
   ↓
5. UI hiển thị:
   - Phần từ lỗi (nếu có)
   - Phần từ sạch
   - Thống kê
   - Chủ đề
```

---

## 📊 Ví Dụ

### Ảnh Chụp Bị Mờ
```
Input: camera-photo.jpg (30KB, mờ)
  ↓
assessImageQuality() → quality: "poor", score: 45
  ↓
enhanceImageQuality() → Tăng contrast + brightness
  ↓
Output: camera-photo-enhanced.jpg (cải thiện)
```

### OCR Trích Xuất Từ Lỗi
```
Input: ["machine", "learning", "™™™", "alg0rithm", "data"]
  ↓
detectNoiseWords():
  - "™™™" → Confidence: 95% (toàn ký tự đặc biệt)
  - "alg0rithm" → Confidence: 80% (hỗn hợp chữ + số)
  ↓
Output:
  clean: ["machine", "learning", "data"]
  noise: ["™™™", "alg0rithm"]
```

---

## ✨ Tính Năng

✅ **Tự động cải thiện ảnh** kém chất lượng  
✅ **Phát hiện từ lỗi** từ OCR noise  
✅ **Hiển thị riêng** phần từ vô nghĩa  
✅ **Cho phép xóa** từ lỗi  
✅ **Giải thích lý do** phát hiện noise  
✅ **Tăng độ chính xác** của vocabulary extraction  
✅ **Hoạt động cho cả ảnh và file**

---

## 🔧 Cấu Hình

### Image Enhancement
- Contrast: 1.5x
- Brightness: +20
- JPEG Quality: 95%

### Noise Detection
- Ký tự lạ: ™©®§¶†‡•‰′″‴‵‶‷‸‹›«»„‟""''‚''`~^¨˚˜¯ˆ˝
- Độ dài tối đa: 30 ký tự
- Lặp ký tự: 4+ lần
- Hỗn hợp script: > 2 loại

---

## 📝 Cách Sử Dụng

### Cho Người Dùng
1. Chụp ảnh tài liệu (có thể mờ, nhòe)
2. Hệ thống tự động cải thiện ảnh
3. Trích xuất từ vựng
4. Xem phần "Từ Vựng Lỗi" (nếu có)
5. Xóa từ lỗi nếu cần

### Cho Developer
```typescript
// Phát hiện noise
import { detectNoiseWords, filterNoiseFromVocabulary } from "@/lib/noise-detection"

const noiseWords = detectNoiseWords(text)
const { clean, noise } = filterNoiseFromVocabulary(vocabulary, noiseWords)

// Cải thiện ảnh
import { enhanceImageQuality, assessImageQuality } from "@/lib/image-enhancement"

const quality = assessImageQuality(file)
if (quality.quality === "poor") {
  const enhanced = await enhanceImageQuality(file)
}
```

---

## 🐛 Troubleshooting

| Vấn đề | Nguyên Nhân | Giải Pháp |
|--------|-----------|----------|
| Ảnh không được cải thiện | Chất lượng đã tốt | Không cần cải thiện |
| Từ hợp lệ bị phát hiện là noise | Tiêu chí quá nghiêm | Điều chỉnh confidence threshold |
| Từ lỗi không được phát hiện | Tiêu chí quá lỏng | Thêm tiêu chí mới |
| Performance chậm | Ảnh quá lớn | Giảm kích thước ảnh |

---

## 🚀 Cải Thiện Tương Lai

1. **Machine Learning**: Dùng ML model để phát hiện noise chính xác hơn
2. **Spell Checker**: Tích hợp spell checker để sửa từ lỗi
3. **Language Detection**: Phát hiện ngôn ngữ để lọc từ lỗi tốt hơn
4. **User Feedback**: Học từ feedback của người dùng
5. **Batch Processing**: Xử lý nhiều ảnh cùng lúc

---

## 📞 Support

Nếu có vấn đề, kiểm tra:
1. Console log: `[CameraCapture]`, `[Upload]`
2. Network tab: Kiểm tra request/response
3. State: Kiểm tra `result.noiseVocabulary`
