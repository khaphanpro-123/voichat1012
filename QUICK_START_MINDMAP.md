# 🚀 Quick Start: Knowledge Graph (Sơ đồ tư duy)

## ⚡ 3 bước để chạy

### 1️⃣ Cài đặt (1 phút)
```bash
# Double-click file này:
INSTALL_DEPENDENCIES.bat

# Hoặc chạy:
npm install cytoscape cytoscape-dagre @types/cytoscape
```

### 2️⃣ Cấu hình (30 giây)
Mở `.env` hoặc tạo `.env.local`:
```env
NEXT_PUBLIC_BACKEND_URL=https://perceptive-charm-production-eb6c.up.railway.app
```

### 3️⃣ Chạy (10 giây)
```bash
# Local:
npm run dev

# Deploy:
git add . && git commit -m "Add mindmap" && git push
```

## ✅ Xong! Giờ làm gì?

1. **Upload tài liệu** → `/dashboard-new/documents`
   - Chọn file PDF/DOCX/TXT (tiếng Anh)
   - Đợi 30-60 giây

2. **Xem sơ đồ** → `/dashboard-new/vocabulary` → Tab "Sơ đồ tư duy"
   - Zoom: Cuộn chuột
   - Pan: Kéo thả
   - Select: Click node

## 📁 Files quan trọng

| File | Mô tả |
|------|-------|
| `HUONG_DAN_SO_DO_TU_DUY.md` | Hướng dẫn chi tiết (Vietnamese) |
| `KNOWLEDGE_GRAPH_SETUP.md` | Technical docs (English) |
| `SUMMARY_KNOWLEDGE_GRAPH.md` | Tổng quan dự án |
| `INSTALL_DEPENDENCIES.bat` | Script cài đặt |

## 🐛 Lỗi thường gặp

| Lỗi | Giải pháp |
|-----|-----------|
| "Cannot find module 'cytoscape'" | Chạy `npm install cytoscape cytoscape-dagre` |
| "Document not found" | Upload tài liệu mới |
| "Không thể tải knowledge graph" | Kiểm tra `.env` có đúng URL không |
| Đồ thị không hiển thị | Refresh trang, kiểm tra console (F12) |

## 🎯 Demo nhanh

```
1. Upload: climate_change.pdf
2. Đợi: 30 giây
3. Xem: Tab "Sơ đồ tư duy"
4. Kết quả:
   - 3 clusters (topics)
   - 40 phrases
   - 10 words
   - 15 semantic relations
```

## 📞 Cần giúp?

1. Đọc `HUONG_DAN_SO_DO_TU_DUY.md` (chi tiết)
2. Kiểm tra backend: https://perceptive-charm-production-eb6c.up.railway.app/health
3. Xem console log (F12)

---

**Tất cả đã sẵn sàng! Chỉ cần cài dependencies và chạy.** 🎉
