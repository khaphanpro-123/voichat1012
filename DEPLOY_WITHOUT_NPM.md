# 🚀 Deploy Không Cần npm/Node.js Local

## ✅ Bạn KHÔNG CẦN cài npm hay Node.js local!

Deploy hoàn toàn qua web dashboard.

---

## 📋 Current Status

✅ **Code đã push lên GitHub**: Commit `5f6d053`
✅ **Railway config đã fix**: requirements-railway.txt
✅ **Vercel config đã có**: vercel.json, .npmrc, .vercelignore

---

## 🐍 BƯỚC 1: Deploy Backend (Railway)

### 1.1 Vào Railway Dashboard
1. Mở browser: https://railway.app
2. Login with GitHub
3. Authorize Railway

### 1.2 Tạo Project Mới
1. Click "New Project"
2. Chọn "Deploy from GitHub repo"
3. Chọn repository: `voichat1012`
4. Railway sẽ scan và detect Python app

### 1.3 Configure Project
1. Click vào project vừa tạo
2. Click "Settings" (icon bánh răng)
3. **Root Directory**: Nhập `python-api`
4. **Build Command**: Để trống (Railway dùng railway.json)
5. **Start Command**: Để trống (Railway dùng railway.json)

### 1.4 Deploy
1. Railway sẽ tự động trigger build
2. Đợi 5-10 phút (xem logs)
3. Build sẽ:
   - Install Python 3.11.7
   - Install dependencies từ requirements-railway.txt
   - Install spacy model
   - Download NLTK data

### 1.5 Generate Domain
1. Vào "Settings"
2. Scroll xuống "Networking"
3. Click "Generate Domain"
4. Railway tạo URL: `https://xxx.up.railway.app`
5. **LƯU LẠI URL NÀY!**

### 1.6 Test Backend
Mở browser hoặc dùng curl:
```
https://xxx.up.railway.app/health
```

Expected response:
```json
{
  "status": "healthy",
  "timestamp": "2026-02-14T...",
  "systems": {
    "phrase_extractor": true,
    "knowledge_graph": false,
    "rag_system": false
  }
}
```

✅ Nếu thấy response này → Backend deployed thành công!

---

## 🎨 BƯỚC 2: Deploy Frontend (Vercel)

### 2.1 Vào Vercel Dashboard
1. Mở browser: https://vercel.com
2. Click "Sign Up" hoặc "Login"
3. Chọn "Continue with GitHub"
4. Authorize Vercel

### 2.2 Import Project
1. Click "Add New..." → "Project"
2. Tìm repository: `voichat1012`
3. Click "Import"

### 2.3 Configure Build Settings
Vercel sẽ tự động detect Next.js:

**Framework Preset**: Next.js ✅ (auto-detected)
**Root Directory**: `.` (root) ✅
**Build Command**: `npm run build` ✅ (auto-filled)
**Output Directory**: `.next` ✅ (auto-filled)
**Install Command**: `npm install --legacy-peer-deps` ✅ (từ vercel.json)

→ Không cần thay đổi gì!

### 2.4 Add Environment Variables

Click "Environment Variables" và thêm:

#### Variable 1: NEXT_PUBLIC_API_URL
```
Name: NEXT_PUBLIC_API_URL
Value: https://xxx.up.railway.app
(Thay bằng Railway URL từ Bước 1.5)
```

#### Variable 2: MONGODB_URI
```
Name: MONGODB_URI
Value: mongodb+srv://username:password@cluster.mongodb.net/dbname
(Lấy từ MongoDB Atlas)
```

#### Variable 3: NEXTAUTH_SECRET
```
Name: NEXTAUTH_SECRET
Value: (tạo random string 32 ký tự)
```

**Tạo NEXTAUTH_SECRET:**
- Vào: https://generate-secret.vercel.app/32
- Copy string được tạo
- Paste vào Value

#### Variable 4: NEXTAUTH_URL
```
Name: NEXTAUTH_URL
Value: https://your-app.vercel.app
(Để trống bây giờ, sẽ update sau)
```

### 2.5 Deploy
1. Click "Deploy"
2. Vercel sẽ:
   - Clone repo
   - Install dependencies (npm install)
   - Build Next.js app (npm run build)
   - Deploy to edge network
3. Đợi 2-5 phút

### 2.6 Get Vercel URL
Sau khi deploy xong:
1. Vercel hiển thị URL: `https://xxx.vercel.app`
2. Click "Visit" để xem app
3. **LƯU LẠI URL NÀY!**

### 2.7 Update NEXTAUTH_URL
1. Vào "Settings" → "Environment Variables"
2. Tìm `NEXTAUTH_URL`
3. Click "Edit"
4. Update value: `https://xxx.vercel.app` (URL vừa lấy)
5. Click "Save"

### 2.8 Redeploy
1. Vào tab "Deployments"
2. Click "..." trên deployment mới nhất
3. Click "Redeploy"
4. Chọn "Use existing Build Cache"
5. Click "Redeploy"

---

## 🔗 BƯỚC 3: Test Integration

### 3.1 Test Backend
```
https://xxx.up.railway.app/health
```
→ Should return 200 OK

### 3.2 Test Frontend
```
https://xxx.vercel.app
```
→ Should load homepage

### 3.3 Test Upload
1. Mở frontend: `https://xxx.vercel.app`
2. Login/Register
3. Upload document
4. Mở DevTools (F12) → Network tab
5. Xem API calls đến Railway backend
6. Kiểm tra response

Expected:
- ✅ API call: `https://xxx.up.railway.app/api/upload-document-complete`
- ✅ Status: 200 OK
- ✅ Response: vocabulary, flashcards
- ✅ Flashcards: 3 cards (grouped by cluster)

---

## 🎉 Success!

Nếu mọi thứ OK:
- ✅ Backend: `https://xxx.up.railway.app` → Health check OK
- ✅ Frontend: `https://xxx.vercel.app` → Loads correctly
- ✅ Integration: Upload works, API calls successful
- ✅ Clustering: 3 flashcards (not 1)

**Congratulations! Your app is live! 🚀**

---

## 🐛 Troubleshooting

### Railway Build Failed
**Check logs:**
1. Railway Dashboard → Deployments
2. Click vào deployment failed
3. Xem logs để tìm lỗi

**Common issues:**
- Image too large → Đã fix với requirements-railway.txt
- Module not found → Check requirements-railway.txt
- Build timeout → Đợi và retry

### Vercel Build Failed
**Check logs:**
1. Vercel Dashboard → Deployments
2. Click vào deployment failed
3. Xem "Build Logs"

**Common issues:**
- pnpm-lock.yaml outdated → Đã fix (đã xóa)
- Peer dependency → Đã fix (.npmrc)
- Build timeout → Retry

### Frontend không connect Backend
**Check:**
1. `NEXT_PUBLIC_API_URL` đã đúng chưa?
2. Railway backend đang chạy?
3. CORS settings

**Fix CORS:**
Nếu gặp CORS error, update `python-api/main.py`:
```python
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "https://your-vercel-app.vercel.app",
        "http://localhost:3000"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

Sau đó commit và push → Railway auto-redeploy.

---

## 📊 Monitoring

### Railway
- Dashboard → Metrics
- CPU, Memory, Network usage
- Logs real-time

### Vercel
- Dashboard → Analytics
- Page views, performance
- Function logs

---

## 💰 Cost

**Free Tier:**
- Railway: $5 credit/month (~500 hours)
- Vercel: 100GB bandwidth/month
- MongoDB Atlas: 512MB storage

**Total: $0/month** 🎉

---

## 📝 Next Steps

1. **Custom Domain** (Optional)
   - Railway: Settings → Domains → Add custom domain
   - Vercel: Settings → Domains → Add domain

2. **Auto-deploy**
   - Already enabled!
   - Push to GitHub → Auto deploy on both platforms

3. **Monitoring**
   - Setup alerts on Railway
   - Enable Vercel Analytics

4. **Backup**
   - MongoDB Atlas auto-backup
   - Code on GitHub

---

## 🆘 Need Help?

**Railway:**
- Docs: https://docs.railway.app
- Discord: https://discord.gg/railway
- Status: https://status.railway.app

**Vercel:**
- Docs: https://vercel.com/docs
- Discord: https://vercel.com/discord
- Status: https://vercel-status.com

Good luck! 🍀
