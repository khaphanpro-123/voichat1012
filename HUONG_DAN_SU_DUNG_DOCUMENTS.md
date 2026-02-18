# HƯỚNG DẪN SỬ DỤNG - TRANG DOCUMENTS HOÀN CHỈNH

## 🎯 Tổng quan

Trang Documents cho phép bạn:
1. Upload file PDF/DOCX
2. Trích xuất TẤT CẢ từ vựng tự động
3. Xem sơ đồ tư duy (mindmap) của các từ
4. Nghe phát âm từ và câu
5. Tự động lưu vào database

## 📖 Hướng dẫn từng bước

### Bước 1: Upload file

```
┌─────────────────────────────────────────┐
│  📤 Click để chọn file PDF/DOCX         │
│     Hỗ trợ PDF, DOCX, DOC               │
└─────────────────────────────────────────┘
```

1. Click vào vùng upload
2. Chọn file PDF hoặc DOCX từ máy tính
3. File name sẽ hiển thị

### Bước 2: Trích xuất từ vựng

```
[Trích xuất từ vựng] ← Click button này
```

1. Click button "Trích xuất từ vựng"
2. Đợi xử lý (10-30 giây tùy file size)
3. Loading spinner sẽ hiển thị

### Bước 3: Xem kết quả

#### 3.1. Success Banner
```
✅ Trích xuất thành công!
Đã tìm thấy 46 từ vựng và lưu vào database
```

#### 3.2. Sơ đồ tư duy (Mindmap)
```
┌─────────────────────────────────────────┐
│  🔍 Sơ đồ tư duy (Mindmap)              │
│  [48 Entities] [156 Relations]          │
│                                          │
│         ●────●                           │
│        /      \                          │
│       ●   ●●   ●  ← Keyword chính (xanh)│
│        \      /                          │
│         ●────●    ← Từ liên quan (lá)   │
│                                          │
│  💡 Keyword chính ở giữa (xanh dương)   │
└─────────────────────────────────────────┘
```

**Cách đọc**:
- **Node xanh dương (giữa)**: Keyword chính, quan trọng nhất
- **Node xanh lá (xung quanh)**: Các từ liên quan
- **Đường nối**: Mối quan hệ giữa các từ

#### 3.3. Danh sách từ vựng

**Card layout (2 cột)**:
```
┌──────────────────────────────────────┐
│ the idea                      [0.85] │ ← Điểm quan trọng
│ /ðə aɪˈdɪə/                    🔊   │ ← Phát âm từ
│                                      │
│ 📖 Nghĩa:                            │
│ A thought or suggestion              │
│                                      │
│ ┌──────────────────────────────────┐ │
│ │ "The idea is important"      🔊  │ │ ← Phát âm câu
│ └──────────────────────────────────┘ │
│                                      │
│ 🔄 Từ đồng nghĩa:                    │
│ [concept] [thought] [notion]         │ ← Synonyms
└──────────────────────────────────────┘
```

### Bước 4: Sử dụng tính năng

#### 4.1. Phát âm từ
1. Click icon 🔊 bên cạnh từ
2. Nghe phát âm tiếng Anh chuẩn
3. Tốc độ chậm (0.8x) để dễ nghe

#### 4.2. Phát âm câu
1. Click icon 🔊 trong box màu vàng (context sentence)
2. Nghe phát âm cả câu
3. Giúp hiểu cách dùng từ trong ngữ cảnh

#### 4.3. Xem từ đồng nghĩa
- Các tag màu tím/hồng ở dưới mỗi card
- Hover để xem shadow effect
- Click để... (có thể thêm tính năng sau)

#### 4.4. Scroll xem tất cả từ
- Danh sách có max-height 800px
- Scroll để xem tất cả từ vựng
- Không giới hạn số lượng

## 🎨 Giải thích màu sắc

### Background
- **Gradient**: Blue → White → Purple
- Tạo cảm giác nhẹ nhàng, chuyên nghiệp

### Cards
- **White → Blue gradient**: Nền card
- **Blue border**: Hover effect
- **Shadow**: Tạo độ sâu

### Buttons
- **Blue → Purple gradient**: Primary actions
- **Green**: Success states
- **Red**: Error states
- **Yellow**: Context/Warning

### Graph
- **Blue (#3b82f6)**: Center node (keyword chính)
- **Green (#10b981)**: Child nodes (từ liên quan)
- **Gray (#cbd5e1)**: Connections

## 📊 Hiểu điểm số (Score)

### Ý nghĩa
- **0.8 - 1.0**: Rất quan trọng (Advanced)
- **0.4 - 0.8**: Quan trọng (Intermediate)
- **0.0 - 0.4**: Ít quan trọng (Beginner)

### Cách tính
- Dựa trên tần suất xuất hiện
- Vị trí trong văn bản
- Mối quan hệ với từ khác
- BM25 algorithm

## 💾 Auto-save

### Khi nào save?
**Ngay sau khi upload thành công!**

### Save gì?
1. **Flashcards** → Collection `vocabulary`
   - Word/Phrase
   - Meaning
   - Example (context sentence)
   - Level (auto-calculated)
   - Pronunciation
   - Synonyms

2. **Knowledge Graph** → Collection `knowledge_graphs`
   - Document ID
   - Entities (nodes)
   - Relations (edges)
   - Created timestamp

### Notification
```
✅ Đã lưu vào database thành công!
(Hiển thị 3 giây)
```

## 🔍 Xem lại dữ liệu đã lưu

### Vocabulary
```
Vào trang: /dashboard-new/vocabulary
Xem tất cả từ đã học
```

### Knowledge Graphs
```
(Có thể thêm trang riêng sau)
Hoặc query MongoDB:
db.knowledge_graphs.find()
```

## 📱 Responsive

### Desktop (≥768px)
- 2 cột cards
- Canvas full width
- Font size lớn
- Padding rộng

### Tablet (≥640px, <768px)
- 2 cột cards (nhỏ hơn)
- Canvas scale
- Font size trung bình

### Mobile (<640px)
- 1 cột cards
- Canvas fit screen
- Font size nhỏ
- Padding compact

## ⚡ Performance Tips

### Upload file
- File nhỏ (<5MB): ~10 giây
- File trung bình (5-10MB): ~20 giây
- File lớn (>10MB): ~30 giây

### Render
- Canvas: ~100ms
- Cards: ~200ms
- Total: ~300ms

### Auto-save
- Batch save: ~500ms
- Không block UI

## 🐛 Troubleshooting

### Lỗi upload
```
❌ Upload failed: 500
```
**Giải pháp**:
1. Kiểm tra file format (PDF/DOCX)
2. Kiểm tra file size (<20MB)
3. Thử lại sau 1 phút
4. Check Railway backend status

### Không hiển thị graph
**Nguyên nhân**: Không có entities/relations
**Giải pháp**: File quá ngắn, thử file dài hơn

### TTS không hoạt động
**Nguyên nhân**: Browser không hỗ trợ
**Giải pháp**: Dùng Chrome/Edge (hỗ trợ tốt nhất)

### Không save vào database
**Nguyên nhân**: MongoDB connection issue
**Giải pháp**: Check `.env` có `MONGODB_URI`

## 🎯 Use Cases

### 1. Học từ vựng từ sách
1. Scan/PDF sách
2. Upload lên trang
3. Xem từ vựng quan trọng
4. Nghe phát âm
5. Lưu vào database
6. Review sau trên trang vocabulary

### 2. Chuẩn bị thi IELTS
1. Upload đề thi reading
2. Xem từ vựng academic
3. Học từ đồng nghĩa
4. Xem context sentence
5. Luyện phát âm

### 3. Đọc báo/article
1. Copy text vào Word
2. Save as DOCX
3. Upload
4. Học từ vựng mới
5. Xem sơ đồ tư duy

### 4. Phân tích văn bản
1. Upload document
2. Xem mindmap
3. Hiểu cấu trúc chủ đề
4. Tìm keywords chính
5. Xem mối quan hệ giữa concepts

## 🚀 Tips & Tricks

### Tip 1: Upload file chất lượng
- Dùng PDF có text (không phải scan)
- DOCX format tốt hơn PDF
- Tránh file có nhiều hình ảnh

### Tip 2: Tối ưu learning
- Focus vào từ có score cao (>0.7)
- Học synonyms để mở rộng vốn từ
- Nghe phát âm nhiều lần
- Đọc context sentence để hiểu cách dùng

### Tip 3: Sử dụng mindmap
- Tìm keyword chính (node xanh giữa)
- Học các từ liên quan xung quanh
- Hiểu mối quan hệ giữa concepts

### Tip 4: Review thường xuyên
- Vào trang vocabulary
- Review từ đã lưu
- Spaced repetition

## 📈 Roadmap (Tương lai)

### Phase 1 (Hiện tại)
- [x] Upload & extract
- [x] Mindmap graph
- [x] TTS
- [x] Auto-save
- [x] Synonyms & context

### Phase 2 (Sắp tới)
- [ ] Interactive graph (click node → show details)
- [ ] Export flashcards to Anki
- [ ] Share document với friends
- [ ] Collaborative learning

### Phase 3 (Xa hơn)
- [ ] AI chat về document
- [ ] Quiz generation
- [ ] Progress tracking
- [ ] Gamification

---

**Trang documents đã HOÀN CHỈNH với đầy đủ tính năng!**

🎉 **Enjoy learning!**
