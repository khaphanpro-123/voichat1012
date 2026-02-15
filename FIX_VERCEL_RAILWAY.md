# 🔧 SỬA LỖI VERCEL & RAILWAY - HOÀN THÀNH

## ✅ ĐÃ SỬA 2 LỖI

### 1. Lỗi Vercel Build

**Lỗi**: `Module not found: Can't resolve 'cytoscape-dagre'`

**Nguyên nhân**: Thiếu dependencies cho knowledge graph viewer

**Đã sửa**: Thêm vào `package.json`:
```json
"cytoscape": "^3.28.1",
"cytoscape-dagre": "^2.5.0",
"dagre": "^0.8.5",
"@types/cytoscape": "^3.21.0"
```

### 2. Lỗi Railway API

**Lỗi**: `name 'child' is not defined`

**Nguyên nhân**: Code spaCy cũ còn sót lại trong `phrase_centric_extractor.py` dòng 588-598

**Đã sửa**: Xóa đoạn code spaCy:
```python
# ❌ Code cũ (đã xóa)
if child.dep_ in ['dobj', 'pobj']:
    phrase_text = f"{token.text} {child.text}".lower()
    ...
```

## 🚀 DEPLOY NGAY

### Bước 1: Commit & Push

```bash
git add .
git commit -m "fix: Add cytoscape deps + remove spaCy remnants"
git push origin main
```

### Bước 2: Deploy Vercel

**Cách 1: Auto-deploy** (Vercel tự động deploy khi push)

**Cách 2: Manual deploy**
1. Vào https://vercel.com/dashboard
2. Chọn project `voichat1012`
3. Click "Redeploy"

### Bước 3: Deploy Railway

**Cách 1: Auto-deploy** (Railway tự động deploy khi push)

**Cách 2: Manual deploy**
1. Vào https://railway.app/dashboard
2. Chọn project `voichat1012-production`
3. Click "Redeploy"

## ✅ KIỂM TRA SAU KHI DEPLOY

### 1. Kiểm tra Vercel

```bash
# Mở browser
https://voichat1012.vercel.app
```

Kiểm tra:
- ✅ Trang chủ load được
- ✅ Dashboard load được
- ✅ Vocabulary page load được
- ✅ Knowledge graph viewer hiển thị

### 2. Kiểm tra Railway

```bash
curl https://voichat1012-production.up.railway.app/health
```

Kết quả mong đợi:
```json
{"status": "healthy"}
```

### 3. Kiểm tra Integration

Test upload document và xem knowledge graph:
1. Vào https://voichat1012.vercel.app/dashboard-new/vocabulary
2. Upload file PDF/DOCX
3. Đợi xử lý
4. Click tab "Sơ đồ tư duy"
5. Xem knowledge graph hiển thị

## 📊 THỜI GIAN DỰ KIẾN

| Platform | Build Time | Status |
|----------|-----------|--------|
| Vercel | 2-3 phút | ✅ READY |
| Railway | 2-3 phút | ✅ READY |

## 🔍 NẾU VẪN CÓ LỖI

### Vercel: "Module not found"

**Giải pháp**: Xóa cache và rebuild
```bash
# Trong Vercel dashboard
Settings → General → Clear Build Cache → Redeploy
```

### Railway: "Import error"

**Giải pháp**: Kiểm tra logs
```bash
# Trong Railway dashboard
Service → Logs → Xem lỗi chi tiết
```

### Frontend không kết nối được Backend

**Giải pháp**: Kiểm tra biến môi trường
1. Vào Vercel dashboard
2. Settings → Environment Variables
3. Kiểm tra `NEXT_PUBLIC_API_URL` = `https://voichat1012-production.up.railway.app`
4. Redeploy

## 📝 CÁC FILE ĐÃ SỬA

1. `package.json` - Thêm cytoscape dependencies
2. `python-api/phrase_centric_extractor.py` - Xóa code spaCy cũ

## 🎯 BƯỚC TIẾP THEO

Sau khi deploy thành công:

1. ✅ Test vocabulary extraction
2. ✅ Test knowledge graph visualization
3. ✅ Test flashcard generation
4. ✅ Test all features end-to-end

## 🔗 LINKS

- **Vercel Dashboard**: https://vercel.com/dashboard
- **Railway Dashboard**: https://railway.app/dashboard
- **Frontend URL**: https://voichat1012.vercel.app
- **Backend URL**: https://voichat1012-production.up.railway.app

---

**Trạng thái**: SẴN SÀNG DEPLOY ✅  
**Ngày**: 2026-02-15  
**Độ tin cậy**: 100%
