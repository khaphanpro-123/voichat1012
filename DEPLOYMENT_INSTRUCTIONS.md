# 🚀 Hướng Dẫn Deploy Đầy Đủ

## 📋 Tổng Quan

Dự án này có 2 phần cần deploy riêng biệt:
1. **Frontend (TypeScript/Next.js)** → Deploy lên **Vercel**
2. **Backend (Python/FastAPI)** → Deploy lên **Railway**

---

## 🎯 PHẦN 1: Deploy Frontend (TypeScript) lên Vercel

### Bước 1: Chuẩn bị

```bash
# Kiểm tra build local trước
npm install
npm run build
npm run start
```

### Bước 2: Tạo file vercel.json (nếu chưa có)

Tạo file `vercel.json` ở root project:

```json
{
  "buildCommand": "npm run build",
  "devCommand": "npm run dev",
  "installCommand": "npm install",
  "framework": "nextjs",
  "regions": ["sin1"],
  "env": {
    "NEXT_PUBLIC_API_URL": "@api_url",
    "MONGODB_URI": "@mongodb_uri",
    "NEXTAUTH_SECRET": "@nextauth_secret",
    "NEXTAUTH_URL": "@nextauth_url"
  }
}
```

### Bước 3: Deploy lên Vercel

**Option A: Qua Vercel CLI**
```bash
# Install Vercel CLI
npm i -g vercel

# Login
vercel login

# Deploy
vercel --prod
```

**Option B: Qua Vercel Dashboard**
1. Truy cập https://vercel.com
2. Click "New Project"
3. Import Git repository
4. Chọn framework: Next.js
5. Configure environment variables
6. Click "Deploy"

### Bước 4: Cấu hình Environment Variables trên Vercel

Vào Settings → Environment Variables, thêm:

```
NEXT_PUBLIC_API_URL=https://your-python-api.railway.app
MONGODB_URI=mongodb+srv://...
NEXTAUTH_SECRET=your-secret-key
NEXTAUTH_URL=https://your-app.vercel.app
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
```

---

## 🐍 PHẦN 2: Deploy Backend (Python) lên Railway

### Bước 1: Chuẩn bị

```bash
cd python-api

# Test local
python main.py
```

### Bước 2: Kiểm tra các file cấu hình

✅ **railway.json** (đã có)
```json
{
  "$schema": "https://railway.app/railway.schema.json",
  "build": {
    "builder": "NIXPACKS",
    "buildCommand": "pip install --no-cache-dir -r requirements-railway.txt && pip install --no-cache-dir https://github.com/explosion/spacy-models/releases/download/en_core_web_sm-3.7.0/en_core_web_sm-3.7.0-py3-none-any.whl && python download_nltk_data.py",
    "watchPatterns": ["**/*.py", "requirements-railway.txt"]
  },
  "deploy": {
    "startCommand": "uvicorn main:app --host 0.0.0.0 --port $PORT --workers 1",
    "restartPolicyType": "ON_FAILURE",
    "restartPolicyMaxRetries": 10
  }
}
```

✅ **Procfile** (đã có)
```
web: uvicorn main:app --host 0.0.0.0 --port $PORT
```

✅ **runtime.txt** (đã có)
```
python-3.11.7
```

✅ **requirements-railway.txt** (đã tối ưu - <2GB)

### Bước 3: Deploy lên Railway

**Option A: Qua Railway CLI**
```bash
# Install Railway CLI
npm i -g @railway/cli

# Login
railway login

# Link project
railway link

# Deploy
railway up
```

**Option B: Qua Railway Dashboard**
1. Truy cập https://railway.app
2. Click "New Project"
3. Chọn "Deploy from GitHub repo"
4. Chọn repository và branch
5. Set Root Directory: `python-api`
6. Railway sẽ tự động detect và deploy

### Bước 4: Cấu hình trên Railway

**Environment Variables:**
```
PORT=8000
PYTHON_VERSION=3.11.7
```

**Settings:**
- Root Directory: `python-api`
- Build Command: (Railway tự động dùng railway.json)
- Start Command: (Railway tự động dùng railway.json)

### Bước 5: Kiểm tra deployment

Sau khi deploy xong, Railway sẽ cung cấp URL:
```
https://your-app.railway.app
```

Test API:
```bash
curl https://your-app.railway.app/health
```

---

## 🔗 PHẦN 3: Kết nối Frontend với Backend

### Bước 1: Cập nhật API URL trên Vercel

Sau khi Python API đã deploy lên Railway, cập nhật environment variable trên Vercel:

```
NEXT_PUBLIC_API_URL=https://your-python-api.railway.app
```

### Bước 2: Redeploy Frontend

```bash
vercel --prod
```

Hoặc trigger redeploy từ Vercel Dashboard.

### Bước 3: Test integration

1. Truy cập frontend: `https://your-app.vercel.app`
2. Upload document
3. Kiểm tra API call đến Railway backend

---

## 📊 Monitoring & Logs

### Vercel Logs
```bash
vercel logs
```

Hoặc xem trên Dashboard → Deployments → Logs

### Railway Logs
```bash
railway logs
```

Hoặc xem trên Dashboard → Deployments → View Logs

---

## 🐛 Troubleshooting

### Frontend (Vercel)

**Lỗi: Build failed**
```bash
# Check build locally
npm run build

# Check dependencies
npm install
```

**Lỗi: API connection failed**
- Kiểm tra `NEXT_PUBLIC_API_URL` đã đúng chưa
- Kiểm tra CORS settings trên Python API

### Backend (Railway)

**Lỗi: Image size exceeded**
- Đã fix bằng `requirements-railway.txt` (loại bỏ ultralytics, easyocr)
- Image size hiện tại: ~2GB (dưới limit 4.8GB)

**Lỗi: Build timeout**
- Railway có thể mất 5-10 phút để build lần đầu
- Kiểm tra logs để xem progress

**Lỗi: Module not found**
```bash
# Kiểm tra requirements-railway.txt có đủ dependencies
pip install -r requirements-railway.txt
```

---

## 🔐 Security Checklist

- [ ] Đã set NEXTAUTH_SECRET (random string)
- [ ] Đã set MONGODB_URI với credentials an toàn
- [ ] Đã enable CORS chỉ cho domain của bạn
- [ ] Đã set rate limiting trên API
- [ ] Đã remove debug logs trong production

---

## 📈 Performance Tips

### Frontend (Vercel)
- Enable Edge Functions cho API routes
- Use ISR (Incremental Static Regeneration) cho static pages
- Optimize images với next/image

### Backend (Railway)
- Use 1 worker (đã set trong railway.json)
- Enable caching cho embeddings
- Monitor memory usage

---

## 💰 Cost Estimation

### Vercel
- **Free tier**: 100GB bandwidth/month
- **Pro**: $20/month (unlimited bandwidth)

### Railway
- **Free tier**: $5 credit/month (~500 hours)
- **Developer**: $5/month + usage
- **Team**: $20/month + usage

**Estimated cost**: $0-10/month cho hobby project

---

## 🎉 Deployment Complete!

Sau khi hoàn thành các bước trên:

✅ Frontend: `https://your-app.vercel.app`
✅ Backend: `https://your-python-api.railway.app`
✅ Integration: Frontend → Backend working

**Next steps:**
1. Setup custom domain (optional)
2. Enable monitoring & alerts
3. Setup CI/CD pipeline
4. Add backup strategy

---

## 📞 Support

Nếu gặp vấn đề:
1. Check logs trên Vercel/Railway Dashboard
2. Verify environment variables
3. Test API endpoints manually
4. Check CORS settings

Good luck! 🚀
