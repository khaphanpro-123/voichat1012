# 🐛 DEBUG: LỖI 404 ABLATION STUDY

## Vấn Đề

Tất cả API calls đều trả về 404:
- `/api/upload-document-complete` → 404
- `/api/ablation-study` → 404
- `/api/ablation-study/example` → 404

## Nguyên Nhân

Railway backend chưa deploy code mới có ablation endpoint.

## Giải Pháp

### ✅ Đã Làm

1. **Fix API URL** - Đổi từ `NEXT_PUBLIC_PYTHON_API_URL` sang `NEXT_PUBLIC_API_URL`
2. **Force Redeploy** - Push code mới với comment trigger deploy
3. **Đợi Railway Deploy** - 2-3 phút

### 🔍 Kiểm Tra Railway Deploy

#### 1. Xem Railway Logs

```
1. Vào https://railway.app
2. Login
3. Chọn project "voichat1012-production"
4. Click tab "Deployments"
5. Xem deployment mới nhất
6. Click "View Logs"
```

#### 2. Kiểm Tra Deploy Status

Tìm các dòng log:
```
✅ Build successful
✅ Deployment successful
✅ Service is running
```

#### 3. Test Endpoints

Sau khi deploy xong (2-3 phút), test:

```bash
# Test root endpoint
curl https://voichat1012-production.up.railway.app/

# Kết quả mong đợi:
{
  "status": "online",
  "version": "5.0.0-simplified",
  "endpoints": {
    "ablation_study": "/api/ablation-study (POST - run ablation study)",
    "ablation_example": "/api/ablation-study/example (GET - example request)"
  }
}
```

```bash
# Test ablation example
curl https://voichat1012-production.up.railway.app/api/ablation-study/example

# Kết quả mong đợi:
{
  "example_request": {
    "document_text": "...",
    "ground_truth_vocabulary": ["..."],
    "document_title": "..."
  }
}
```

### 🔧 Nếu Vẫn Lỗi 404

#### Kiểm Tra 1: Railway Environment Variables

```
1. Vào Railway dashboard
2. Click tab "Variables"
3. Kiểm tra các biến:
   - PYTHON_VERSION
   - PORT
   - Các API keys
```

#### Kiểm Tra 2: Railway Build Command

```
1. Vào Railway dashboard
2. Click tab "Settings"
3. Kiểm tra:
   - Build Command: (auto-detect)
   - Start Command: uvicorn main:app --host 0.0.0.0 --port $PORT
```

#### Kiểm Tra 3: File Structure

Đảm bảo các file tồn tại:
```
python-api/
├── main.py (có import ablation_router)
├── ablation_api_endpoint.py (có router)
├── complete_pipeline.py
└── requirements.txt
```

#### Kiểm Tra 4: Import Errors

Xem Railway logs tìm lỗi import:
```
ModuleNotFoundError: No module named 'ablation_api_endpoint'
```

Nếu có lỗi này, kiểm tra:
- File `ablation_api_endpoint.py` có tồn tại không
- File có syntax error không

### 🚀 Manual Redeploy

Nếu auto-deploy không hoạt động:

#### Cách 1: Railway Dashboard

```
1. Vào Railway dashboard
2. Click tab "Deployments"
3. Click "..." trên deployment mới nhất
4. Click "Redeploy"
```

#### Cách 2: Empty Commit

```bash
git commit --allow-empty -m "chore: force redeploy"
git push origin main
```

#### Cách 3: Restart Service

```
1. Vào Railway dashboard
2. Click tab "Settings"
3. Scroll xuống "Danger Zone"
4. Click "Restart Service"
```

## Timeline

| Thời Gian | Hành Động | Status |
|-----------|-----------|--------|
| 14:00 | Phát hiện lỗi 404 | ❌ |
| 14:10 | Fix API URL | ✅ |
| 14:20 | Force redeploy | ✅ |
| 14:25 | Railway deploying | 🔄 |
| 14:28 | Deploy complete | ⏳ |
| 14:30 | Test endpoints | ⏳ |

## Test Script

Mở file `test-railway-connection.html` trong browser:

```html
<!DOCTYPE html>
<html>
<body>
    <h1>Test Railway Backend</h1>
    <button onclick="testRoot()">Test Root</button>
    <button onclick="testAblation()">Test Ablation</button>
    <pre id="result"></pre>
    
    <script>
        const API = 'https://voichat1012-production.up.railway.app';
        
        async function testRoot() {
            const res = await fetch(`${API}/`);
            const data = await res.json();
            document.getElementById('result').textContent = 
                JSON.stringify(data, null, 2);
        }
        
        async function testAblation() {
            const res = await fetch(`${API}/api/ablation-study/example`);
            const data = await res.json();
            document.getElementById('result').textContent = 
                JSON.stringify(data, null, 2);
        }
    </script>
</body>
</html>
```

## Kết Quả Mong Đợi

### Root Endpoint (/)

```json
{
  "status": "online",
  "version": "5.0.0-simplified",
  "system": "Complete 12-Stage Pipeline + Phrase-Centric",
  "endpoints": {
    "upload_complete": "/api/upload-document-complete (phrases + words)",
    "upload_phrases": "/api/upload-document (phrases only)",
    "ablation_study": "/api/ablation-study (POST - run ablation study)",
    "ablation_example": "/api/ablation-study/example (GET - example request)"
  }
}
```

### Ablation Example (/api/ablation-study/example)

```json
{
  "example_request": {
    "document_text": "Machine learning is a subset of artificial intelligence...",
    "ground_truth_vocabulary": [
      "machine learning",
      "artificial intelligence",
      "algorithm",
      "neural network",
      "deep learning"
    ],
    "document_title": "Machine Learning Basics"
  },
  "usage": "POST /api/ablation-study with the above JSON body"
}
```

## Troubleshooting

### Lỗi: "Service Unavailable"

Railway đang restart, đợi 1-2 phút.

### Lỗi: "Internal Server Error"

Xem Railway logs để tìm lỗi Python.

### Lỗi: "Module not found"

File `ablation_api_endpoint.py` chưa được deploy.

## Liên Hệ

Nếu vẫn lỗi sau 5 phút:
1. Xem Railway logs
2. Check GitHub commits
3. Verify file structure

---

**Cập nhật:** 2026-03-12 14:30  
**Status:** 🔄 DEPLOYING  
**ETA:** 2-3 phút
