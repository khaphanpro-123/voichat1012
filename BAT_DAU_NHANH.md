# 🚀 Bắt Đầu Nhanh - Visual Language Tutor

## 📋 Tổng Quan

Hệ thống trích xuất từ vựng tự động với 12 giai đoạn xử lý, tạo Knowledge Graph và Flashcards.

---

## 🎯 Bạn Cần Làm Gì?

### 1. Deploy Python API (Backend)
- Chọn Railway hoặc Render
- Deploy từ GitHub
- Lấy URL của API

### 2. Deploy Frontend (Next.js)
- Deploy lên Vercel
- Thêm environment variables
- Cập nhật URL của Python API

### 3. Test
- Upload tài liệu
- Xem Knowledge Graph
- Học Flashcards

---

## 🏃 Bắt Đầu Ngay

### Bước 1: Chuẩn Bị Code

```bash
# Push code lên GitHub
git add .
git commit -m "Ready for deployment"
git push origin main
```

### Bước 2: Deploy Python API

#### Option A: Railway (Khuyến nghị)

1. Vào https://railway.app/
2. Đăng nhập bằng GitHub
3. Click "New Project" → "Deploy from GitHub repo"
4. Chọn repository của bạn
5. Set root directory: `python-api`
6. Đợi deploy xong
7. Copy URL (ví dụ: `https://your-app.railway.app`)

#### Option B: Render

1. Vào https://render.com/
2. Đăng nhập bằng GitHub
3. "New Web Service" → Connect GitHub
4. Chọn repository
5. Config:
   - Root Directory: `python-api`
   - Build Command: `pip install -r requirements.txt && python -m spacy download en_core_web_sm && python download_nltk_data.py`
   - Start Command: `uvicorn main:app --host 0.0.0.0 --port $PORT`
6. Deploy
7. Copy URL (ví dụ: `https://your-app.onrender.com`)

### Bước 3: Deploy Frontend

1. Vào https://vercel.com/
2. Đăng nhập bằng GitHub
3. "Add New" → "Project"
4. Import repository của bạn
5. Vercel tự động detect Next.js
6. Thêm Environment Variables (xem bên dưới)
7. Click "Deploy"
8. Copy URL (ví dụ: `https://your-app.vercel.app`)

### Bước 4: Cập Nhật Environment Variables

Trong Vercel dashboard, thêm:

```env
# Python API URL (từ Railway/Render)
NEXT_PUBLIC_PYTHON_API_URL=https://your-app.railway.app

# MongoDB (bắt buộc)
MONGO_URI=mongodb+srv://username:password@cluster.mongodb.net/database
MONGO_DB=autism_app

# NextAuth (bắt buộc)
NEXTAUTH_SECRET=your-secret-here-32-characters-minimum
NEXTAUTH_URL=https://your-app.vercel.app

# JWT (bắt buộc)
JWT_SECRET=your-jwt-secret-32-characters-minimum

# Cloudinary (bắt buộc cho upload ảnh)
CLOUDINARY_CLOUD_NAME=your-cloud-name
CLOUDINARY_API_KEY=your-api-key
CLOUDINARY_API_SECRET=your-api-secret
CLOUDINARY_UPLOAD_PRESET=your-preset
NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME=your-cloud-name
NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET=your-preset

# AI API (ít nhất 1 trong 2)
OPENAI_API_KEY=sk-...
# hoặc
GOOGLE_GEMINI_API_KEY=AIza...

# Google OAuth (bắt buộc cho đăng nhập Google)
GOOGLE_CLIENT_ID=xxxxx.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-xxxxx

# Khác (tùy chọn)
LLM_MODEL=gpt-4o-mini
GROQ_API_KEY=gsk_...
```

### Bước 5: Test

1. Vào `https://your-app.vercel.app`
2. Đăng nhập
3. Vào `/dashboard-new/documents`
4. Upload 1 file (PDF, DOCX, hoặc TXT)
5. Đợi xử lý xong
6. Xem từ vựng được trích xuất

---

## 🧪 Test Local (Trước Khi Deploy)

### Backend (Python API)

```bash
# Vào thư mục python-api
cd python-api

# Tạo virtual environment
python -m venv venv

# Kích hoạt (Windows)
venv\Scripts\activate

# Kích hoạt (Mac/Linux)
source venv/bin/activate

# Cài đặt dependencies
pip install -r requirements.txt

# Download models
python -m spacy download en_core_web_sm
python download_nltk_data.py

# Chạy server
python main.py
```

Mở trình duyệt: `http://localhost:8000`

### Frontend (Next.js)

```bash
# Cài đặt dependencies
npm install

# Tạo file .env.local
cp .env.example .env.local

# Sửa .env.local, thêm:
NEXT_PUBLIC_PYTHON_API_URL=http://localhost:8000
MONGO_URI=mongodb+srv://...
# ... (các keys khác)

# Chạy dev server
npm run dev
```

Mở trình duyệt: `http://localhost:3000`

---

## 📡 API Endpoints

### 1. Upload Tài Liệu

```bash
POST /api/upload-document-complete

# Test bằng curl
curl -X POST http://localhost:8000/api/upload-document-complete \
  -F "file=@document.pdf" \
  -F "max_phrases=40" \
  -F "max_words=10"
```

**Response**:
```json
{
  "document_id": "doc_20260210_123456",
  "vocabulary": [...],
  "flashcards": [...]
}
```

### 2. Lấy Knowledge Graph

```bash
GET /api/knowledge-graph/{document_id}

# Test
curl http://localhost:8000/api/knowledge-graph/doc_20260210_123456
```

### 3. Lấy Flashcards

```bash
GET /api/flashcards/{document_id}

# Test
curl http://localhost:8000/api/flashcards/doc_20260210_123456
```

---

## 🎨 Tích Hợp vào UI

### Thêm Button "Xem Phân Tích"

Sửa file `components/FileUploadOCR.tsx`:

```tsx
// Thêm state để lưu document_id
const [lastDocumentId, setLastDocumentId] = useState<string | null>(null)

// Trong hàm handleUpload, sau khi upload thành công:
const documentId = `doc_${timestamp}`
setLastDocumentId(documentId)

// Thêm button trong phần review:
{step === "review" && lastDocumentId && (
  <div className="mt-6 flex gap-3">
    <button
      onClick={() => router.push(`/dashboard-new/vocabulary-analysis?doc=${lastDocumentId}`)}
      className="px-6 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700"
    >
      📊 Xem Knowledge Graph
    </button>
    
    <button
      onClick={generateFlashcards}
      className="px-6 py-3 bg-purple-600 text-white rounded-xl hover:bg-purple-700"
    >
      🎴 Tạo Flashcards
    </button>
  </div>
)}
```

---

## 🔍 Workflow Hoàn Chỉnh

```
1. User upload tài liệu
   ↓
2. Frontend gửi đến Python API
   ↓
3. Python API xử lý qua 12 stages:
   - Trích xuất cụm từ (phrases)
   - Trích xuất từ đơn (single words)
   - Tạo Knowledge Graph
   - Tạo Flashcards
   ↓
4. Python API lưu kết quả vào cache
   ↓
5. Trả về document_id + vocabulary + flashcards
   ↓
6. User click "Xem Knowledge Graph"
   ↓
7. Frontend fetch từ /api/knowledge-graph/{document_id}
   ↓
8. Hiển thị:
   - Graph visualization
   - Mind map
   - Clusters
   - Statistics
   ↓
9. User click "Học Flashcards"
   ↓
10. Frontend fetch từ /api/flashcards/{document_id}
    ↓
11. Hiển thị flashcards với:
    - Từ đồng nghĩa
    - Phiên âm IPA
    - Audio
    - Từ liên quan
```

---

## 🐛 Xử Lý Lỗi

### Lỗi: "Module not found" (Python)

```bash
pip install -r requirements.txt
python -m spacy download en_core_web_sm
python download_nltk_data.py
```

### Lỗi: "Document not found"

- Đảm bảo đã upload tài liệu trước
- Kiểm tra document_id đúng chưa
- Xem logs của Python API

### Lỗi: CORS

- Kiểm tra Python API đang chạy
- Xác nhận `NEXT_PUBLIC_PYTHON_API_URL` đúng
- Xem CORS config trong `main.py`

### Lỗi: MongoDB Connection

- Kiểm tra `MONGO_URI` đúng chưa
- Thêm `0.0.0.0/0` vào IP whitelist (MongoDB Atlas)
- Test connection

---

## 📁 Files Quan Trọng

### Backend
- `python-api/main.py` - API endpoints
- `python-api/complete_pipeline_12_stages.py` - Pipeline chính
- `python-api/requirements.txt` - Dependencies
- `python-api/railway.json` - Config deploy

### Frontend
- `components/KnowledgeGraphViewer.tsx` - UI Knowledge Graph
- `components/FlashcardClusterView.tsx` - UI Flashcards
- `components/FileUploadOCR.tsx` - UI Upload
- `app/dashboard-new/vocabulary-analysis/page.tsx` - Trang phân tích

### Documentation
- `DEPLOYMENT_GUIDE.md` - Hướng dẫn deploy (English)
- `DEPLOYMENT_CHECKLIST.md` - Checklist từng bước
- `TOM_TAT_DEPLOYMENT.md` - Tóm tắt (Vietnamese)
- `BAT_DAU_NHANH.md` - File này

---

## ✅ Checklist

### Trước Deploy
- [ ] Code đã push lên GitHub
- [ ] Environment variables đã chuẩn bị
- [ ] Test local thành công

### Deploy
- [ ] Python API đã deploy (Railway/Render)
- [ ] Frontend đã deploy (Vercel)
- [ ] Environment variables đã set

### Sau Deploy
- [ ] Health check hoạt động
- [ ] Upload tài liệu thành công
- [ ] Knowledge Graph hiển thị
- [ ] Flashcards hiển thị
- [ ] Audio playback hoạt động

---

## 🎯 Tính Năng

### Knowledge Graph (STAGE 11)
- ✅ Phân cụm từ vựng theo chủ đề
- ✅ Tạo mối quan hệ ngữ nghĩa
- ✅ Tạo mind map
- ✅ Visualization tương tác
- ✅ Thống kê chi tiết

### Flashcards (STAGE 12)
- ✅ Nhóm theo cluster/chủ đề
- ✅ Gộp từ đồng nghĩa (similarity > 0.85)
- ✅ Phiên âm IPA
- ✅ Audio (Google TTS)
- ✅ Từ liên quan
- ✅ Độ khó
- ✅ Câu ví dụ

---

## 📞 Hỗ Trợ

Nếu gặp vấn đề:

1. Xem logs (Railway/Render/Vercel dashboard)
2. Đọc `DEPLOYMENT_GUIDE.md`
3. Đọc `TOM_TAT_DEPLOYMENT.md`
4. Kiểm tra environment variables
5. Test API endpoints trực tiếp

---

## 🔗 Links Hữu Ích

- Railway: https://railway.app/
- Render: https://render.com/
- Vercel: https://vercel.com/
- MongoDB Atlas: https://cloud.mongodb.com/
- Cloudinary: https://cloudinary.com/
- OpenAI: https://platform.openai.com/
- Google Gemini: https://makersuite.google.com/

---

## 🎉 Kết Luận

Sau khi hoàn thành các bước trên, bạn sẽ có:

1. ✅ Python API chạy trên Railway/Render
2. ✅ Frontend chạy trên Vercel
3. ✅ Hệ thống trích xuất từ vựng tự động
4. ✅ Knowledge Graph visualization
5. ✅ Flashcards với audio và từ đồng nghĩa
6. ✅ Tích hợp hoàn chỉnh

**Chúc bạn thành công! 🚀**

---

**Tác giả**: Kiro AI  
**Ngày**: 2026-02-10  
**Version**: 5.2.0-filter-only-mode  
**Status**: ✅ Sẵn Sàng Production
