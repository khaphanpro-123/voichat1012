# Test Pages - Tìm nguyên nhân lỗi

## Vấn đề
Trang `/dashboard-new/documents` vẫn bị lỗi hydration/React error dù đã:
- Xóa Cytoscape
- Xóa D3
- Bỏ Suspense
- Bỏ dynamic import
- Đơn giản hóa code

## Chiến lược test

Tạo 2 trang test để tìm nguyên nhân:

### 1. Test Page (Minimal)
**URL**: `/dashboard-new/documents-test`
**File**: `app/dashboard-new/documents-test/page.tsx`

**Mục đích**: Kiểm tra xem routing có hoạt động không

**Nội dung**: Chỉ có text thuần, không có components

**Test**:
```
✅ Nếu trang này load được → Routing OK
❌ Nếu trang này lỗi → Vấn đề ở routing/layout
```

### 2. Simple Page (Basic functionality)
**URL**: `/dashboard-new/documents-simple`
**File**: `app/dashboard-new/documents-simple/page.tsx`

**Mục đích**: Kiểm tra upload và hiển thị data đơn giản

**Nội dung**:
- Upload form (native HTML)
- Fetch API
- Hiển thị kết quả dạng list (không dùng flashcard component)

**Test**:
```
✅ Nếu trang này load được → Components phức tạp gây lỗi
❌ Nếu trang này lỗi → Vấn đề ở fetch/API
```

## Cách test

### Bước 1: Test routing
```
1. Push code lên Git
2. Vercel auto-deploy
3. Truy cập: https://voichat1012.vercel.app/dashboard-new/documents-test
4. Kiểm tra:
   - ✅ Thấy text "Documents Test Page" → Routing OK
   - ❌ Vẫn lỗi → Vấn đề ở layout/root
```

### Bước 2: Test upload
```
1. Truy cập: https://voichat1012.vercel.app/dashboard-new/documents-simple
2. Upload file PDF/DOCX
3. Kiểm tra:
   - ✅ Upload thành công, hiển thị list → API OK, components phức tạp gây lỗi
   - ❌ Upload lỗi → Vấn đề ở API route
   - ❌ Trang không load → Vấn đề ở fetch/state
```

### Bước 3: So sánh
```
documents-test:     ✅ Works
documents-simple:   ✅ Works
documents (gốc):    ❌ Error

→ Kết luận: FlashcardViewer component gây lỗi
```

## Kịch bản và giải pháp

### Kịch bản 1: documents-test lỗi
**Nguyên nhân**: Layout hoặc routing issue

**Giải pháp**:
- Kiểm tra `app/dashboard-new/layout.tsx`
- Kiểm tra `app/layout.tsx`
- Có thể có middleware hoặc auth blocking

### Kịch bản 2: documents-simple lỗi
**Nguyên nhân**: API route hoặc fetch issue

**Giải pháp**:
- Kiểm tra `app/api/upload-document-complete/route.ts`
- Kiểm tra CORS
- Kiểm tra Railway API

### Kịch bản 3: Chỉ documents gốc lỗi
**Nguyên nhân**: FlashcardViewer component

**Giải pháp**:
- Xóa FlashcardViewer
- Dùng simple list như documents-simple
- Hoặc debug FlashcardViewer từng phần

## Files đã tạo

1. ✅ `app/dashboard-new/documents-test/page.tsx` - Minimal test
2. ✅ `app/dashboard-new/documents-simple/page.tsx` - Upload + simple list

## Next steps

### Nếu test pages hoạt động:
```
1. Thay thế documents gốc bằng documents-simple
2. Từ từ thêm features vào
3. Test từng feature một
4. Tìm ra feature nào gây lỗi
```

### Nếu test pages cũng lỗi:
```
1. Vấn đề không phải ở components
2. Có thể là:
   - Layout issue
   - Auth middleware
   - Global state
   - Theme provider
3. Cần kiểm tra root layout và providers
```

## Kết luận

Với 2 test pages này, chúng ta sẽ biết chính xác:
- ✅ Routing có OK không
- ✅ Upload có hoạt động không
- ✅ Component nào gây lỗi
- ✅ Cách fix cụ thể

Push code và test ngay!
