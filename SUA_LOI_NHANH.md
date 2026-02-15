# 🔧 ĐÃ SỬA 2 LỖI - DEPLOY NGAY

## ✅ LỖI 1: VERCEL

**Lỗi**: `Module not found: Can't resolve 'cytoscape-dagre'`

**Đã sửa**: Thêm vào `package.json`:
- cytoscape
- cytoscape-dagre
- dagre
- @types/cytoscape

## ✅ LỖI 2: RAILWAY

**Lỗi**: `name 'child' is not defined`

**Đã sửa**: Xóa code spaCy cũ trong `phrase_centric_extractor.py`

## 🚀 DEPLOY NGAY

```bash
git add .
git commit -m "fix: cytoscape + spaCy"
git push origin main
```

Đợi 5 phút → Xong!

## ✅ KIỂM TRA

```bash
# Frontend
https://voichat1012.vercel.app

# Backend
https://voichat1012-production.up.railway.app/health
```

## 📝 CHÚ Ý

Trong Vercel dashboard, kiểm tra biến môi trường:
```
NEXT_PUBLIC_API_URL = https://voichat1012-production.up.railway.app
```

---

**Trạng thái**: SẴN SÀNG ✅  
**Thời gian**: ~5 phút
