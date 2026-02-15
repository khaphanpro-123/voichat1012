# Hướng dẫn sử dụng Sơ đồ tư duy (Knowledge Graph)

## 🚀 Bắt đầu nhanh

### Bước 1: Cài đặt thư viện

Chạy file `INSTALL_DEPENDENCIES.bat`:
```
Double-click vào file INSTALL_DEPENDENCIES.bat
```

Hoặc mở PowerShell và chạy:
```powershell
npm install cytoscape cytoscape-dagre
npm install --save-dev @types/cytoscape
```

### Bước 2: Cấu hình Backend

Mở file `.env` và thêm dòng sau (nếu chưa có):
```
NEXT_PUBLIC_BACKEND_URL=https://perceptive-charm-production-eb6c.up.railway.app
```

### Bước 3: Chạy ứng dụng

Nếu đang chạy local:
```powershell
npm run dev
```

Nếu deploy lên Vercel:
```powershell
git add .
git commit -m "Thêm tính năng sơ đồ tư duy"
git push origin main
```

## 📖 Cách sử dụng

### 1. Upload tài liệu

1. Vào trang **Documents** (Tài liệu)
2. Click nút **Upload**
3. Chọn file PDF, DOCX hoặc TXT (PHẢI là tiếng Anh)
4. Đợi hệ thống xử lý (khoảng 30-60 giây)

**Lưu ý:** Tài liệu phải là tiếng Anh. Nếu upload tiếng Việt sẽ báo lỗi.

### 2. Xem sơ đồ tư duy

1. Vào trang **Vocabulary** (Từ vựng)
2. Click tab **"Sơ đồ tư duy"** (biểu tượng mạng lưới)
3. Đợi đồ thị load (khoảng 2-5 giây)

### 3. Tương tác với đồ thị

**Điều khiển:**
- 🔄 **Reset View**: Đưa đồ thị về vị trí ban đầu
- 📐 **Layout**: Chọn kiểu bố cục
  - Tree (Dagre): Dạng cây phân cấp
  - Breadth First: Dạng tầng
  - Circle: Dạng vòng tròn
  - Grid: Dạng lưới
  - Force Directed: Dạng lực hút

**Thao tác:**
- 🖱️ **Zoom**: Cuộn chuột lên/xuống
- ✋ **Pan**: Kéo thả để di chuyển
- 👆 **Select**: Click vào node để xem thông tin
- 🔍 **Deselect**: Click vào vùng trống

### 4. Hiểu các thành phần

**Màu sắc node:**
- 🔴 **Đỏ (Root)**: Tài liệu gốc
- 🔵 **Xanh dương (Cluster)**: Chủ đề/cụm từ vựng
- 🟢 **Xanh lá (Phrase)**: Cụm từ
- 🟡 **Vàng (Word)**: Từ đơn

**Loại mối quan hệ:**
- **Mũi tên đen**: Cluster chứa phrase/word
- **Mũi tên xám**: Từ gần nghĩa (similarity > 0.7)

**Thông tin node:**
- **Label**: Tên từ/cụm từ
- **Type**: Loại node (root/cluster/phrase/word)
- **Cluster**: Thuộc cluster nào
- **ID**: Mã định danh

## 🎯 Ví dụ thực tế

### Ví dụ 1: Tài liệu về Climate Change

**Upload:** `climate_change.pdf`

**Kết quả:**
- 3 clusters (topics):
  - Topic 1: Climate Science & Global Warming
  - Topic 2: Environmental Policy & Conservation
  - Topic 3: Renewable Energy & Sustainability
- 40 phrases (cụm từ)
- 10 words (từ đơn)
- 15 semantic relations (từ gần nghĩa)

**Sơ đồ:**
```
Document (Root)
├── Topic 1: Climate Science
│   ├── climate change
│   ├── global warming (similar to climate change)
│   ├── greenhouse gases
│   └── carbon dioxide
├── Topic 2: Environmental Policy
│   ├── environmental protection
│   ├── conservation efforts
│   └── sustainable development
└── Topic 3: Renewable Energy
    ├── solar power
    ├── wind energy
    └── clean energy
```

### Ví dụ 2: Tài liệu về Machine Learning

**Upload:** `machine_learning.pdf`

**Kết quả:**
- 4 clusters:
  - Topic 1: Neural Networks & Deep Learning
  - Topic 2: Supervised Learning & Classification
  - Topic 3: Unsupervised Learning & Clustering
  - Topic 4: Model Evaluation & Optimization

## ❓ Câu hỏi thường gặp

### Q1: Tại sao không thấy sơ đồ?

**A:** Có thể do:
1. Chưa upload tài liệu → Upload tài liệu mới
2. Backend chưa xử lý xong → Đợi thêm 30 giây
3. Lỗi kết nối → Kiểm tra backend URL trong `.env`

### Q2: Sơ đồ quá rối, làm sao sắp xếp lại?

**A:** Thử các layout khác nhau:
- **Tree (Dagre)**: Tốt nhất cho đồ thị phân cấp
- **Circle**: Tốt cho xem tổng quan
- **Force Directed**: Tốt cho xem mối quan hệ

### Q3: Làm sao biết từ nào quan trọng?

**A:** 
- Node càng lớn = càng quan trọng
- Cluster có nhiều node = chủ đề chính
- Semantic role "core" = từ cốt lõi

### Q4: Có thể export sơ đồ không?

**A:** Hiện tại chưa có tính năng export. Có thể:
- Screenshot (Windows + Shift + S)
- Hoặc thêm tính năng export PNG/JSON sau

### Q5: Tài liệu tiếng Việt có được không?

**A:** Không. Hệ thống chỉ hỗ trợ tiếng Anh. Upload tiếng Việt sẽ báo lỗi:
```
⚠️ Text appears to be non-English. This system currently supports English text only.
```

## 🔧 Xử lý lỗi

### Lỗi: "Cannot find module 'cytoscape'"

**Giải pháp:**
```powershell
npm install cytoscape cytoscape-dagre
```

### Lỗi: "Document not found"

**Giải pháp:**
1. Upload tài liệu mới
2. Đợi pipeline xử lý xong
3. Refresh trang

### Lỗi: "Không thể tải knowledge graph"

**Giải pháp:**
1. Kiểm tra backend: https://perceptive-charm-production-eb6c.up.railway.app/health
2. Kiểm tra `.env` có đúng URL không
3. Thử upload tài liệu mới

### Đồ thị bị lag/chậm

**Giải pháp:**
1. Giảm số lượng phrases (max_phrases=20 thay vì 40)
2. Chọn layout đơn giản hơn (Grid thay vì Force Directed)
3. Refresh trang

## 📚 Tài liệu tham khảo

- **Backend API**: https://perceptive-charm-production-eb6c.up.railway.app/docs
- **Cytoscape.js**: https://js.cytoscape.org/
- **Setup Guide**: KNOWLEDGE_GRAPH_SETUP.md

## 💡 Tips & Tricks

### Tip 1: Upload tài liệu chất lượng cao

- Tài liệu có cấu trúc rõ ràng (headings, paragraphs)
- Độ dài 500-2000 từ (tối ưu)
- Nội dung học thuật (academic)

### Tip 2: Sử dụng layout phù hợp

- **Tree**: Tốt cho tài liệu có cấu trúc phân cấp
- **Circle**: Tốt cho xem tổng quan nhanh
- **Force Directed**: Tốt cho phân tích mối quan hệ

### Tip 3: Kết hợp với Flashcards

1. Xem sơ đồ tư duy để hiểu cấu trúc
2. Học flashcards theo từng cluster
3. Ôn tập theo chủ đề

### Tip 4: Tìm từ gần nghĩa

- Nhìn vào các mũi tên "similar_to"
- Học cùng lúc các từ gần nghĩa
- Hiểu sự khác biệt giữa các từ

## 🎓 Kết luận

Sơ đồ tư duy giúp bạn:
- ✅ Hiểu cấu trúc tài liệu
- ✅ Nhận diện chủ đề chính
- ✅ Tìm từ gần nghĩa
- ✅ Học từ vựng theo ngữ cảnh
- ✅ Ôn tập hiệu quả hơn

Chúc bạn học tốt! 🚀
