# ✅ CHECKLIST DEPLOY - LÀM NGAY

## 🎯 ĐÃ SỬA XONG

- [x] Thêm cytoscape dependencies vào package.json
- [x] Xóa code spaCy cũ trong phrase_centric_extractor.py
- [x] Cập nhật .env.example với Railway URL mới

## 🚀 DEPLOY NGAY (3 BƯỚC)

### Bước 1: Commit & Push (30 giây)

```bash
git add .
git commit -m "fix: Add cytoscape + remove spaCy remnants"
git push origin main
```

### Bước 2: Đợi Auto-Deploy (5 phút)

- Vercel: Tự động deploy khi push
- Railway: Tự động deploy khi push

Hoặc deploy thủ công:
- Vercel: https://vercel.com/dashboard → Redeploy
- Railway: https://railway.app/dashboard → Redeploy

### Bước 3: Kiểm tra (1 phút)

```bash
# Test Vercel
curl https://voichat1012.vercel.app

# Test Railway
curl https://voichat1012-production.up.railway.app/health
```

## ✅ KẾT QUẢ MONG ĐỢI

### Vercel Build Logs

```
✅ Installing dependencies...
✅ cytoscape@3.28.1
✅ cytoscape-dagre@2.5.0
✅ Building...
✅ Build completed
✅ Deployment ready
```

### Railway Build Logs

```
✅ Installing dependencies...
✅ NLTK downloaded
✅ Starting uvicorn...
✅ Application startup complete
```

### Frontend Test

1. Mở https://voichat1012.vercel.app
2. Vào Dashboard → Vocabulary
3. Upload file
4. Xem knowledge graph → ✅ Hiển thị

### Backend Test

```bash
curl https://voichat1012-production.up.railway.app/health
# Response: {"status": "healthy"}
```

## ⚠️ NẾU CÓ LỖI

### Vercel: "Module not found"

```bash
# Xóa cache trong Vercel dashboard
Settings → General → Clear Build Cache → Redeploy
```

### Railway: "Import error"

```bash
# Xem logs trong Railway dashboard
Service → Logs → Tìm lỗi
```

### Biến môi trường sai

```bash
# Trong Vercel dashboard
Settings → Environment Variables
# Kiểm tra NEXT_PUBLIC_API_URL
# Phải là: https://voichat1012-production.up.railway.app
```

## 📊 THỜI GIAN

| Bước | Thời gian |
|------|-----------|
| Commit & Push | 30 giây |
| Vercel Build | 2-3 phút |
| Railway Build | 2-3 phút |
| Test | 1 phút |
| **TỔNG** | **~6 phút** |

## 🎯 SAU KHI XONG

- [ ] Test upload document
- [ ] Test vocabulary extraction
- [ ] Test knowledge graph
- [ ] Test flashcards
- [ ] Test all features

---

**Trạng thái**: SẴN SÀNG ✅  
**Hành động**: COMMIT & PUSH NGAY
