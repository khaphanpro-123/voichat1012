# ⚡ Quick Deploy - 5 Minutes

## ✅ Đã Fix: pnpm-lock.yaml issue

Đã xóa `pnpm-lock.yaml` và cấu hình Vercel dùng npm thay vì pnpm.

---

## 🚀 Deploy Ngay (Qua Dashboard)

### 1️⃣ Deploy Backend (Railway) - 5 phút

1. **Vào Railway**: https://railway.app
2. **Login with GitHub**
3. **New Project** → **Deploy from GitHub repo**
4. **Chọn repo**: `voichat1012`
5. **Configure**:
   - Root Directory: `python-api`
   - Để Railway tự động detect settings
6. **Deploy** → Đợi 5-10 phút
7. **Generate Domain**:
   - Settings → Domains → Generate Domain
   - Lưu URL: `https://xxx.up.railway.app`

**Test Backend:**
```
https://xxx.up.railway.app/health
```

---

### 2️⃣ Deploy Frontend (Vercel) - 3 phút

1. **Vào Vercel**: https://vercel.com
2. **Login with GitHub**
3. **Import Project** → Chọn repo `voichat1012`
4. **Configure**:
   - Framework: Next.js (auto-detected)
   - Root Directory: `.` (root)
   - Build Command: `npm run build`
   - Install Command: `npm install --legacy-peer-deps`

5. **Environment Variables** (QUAN TRỌNG):
   ```
   NEXT_PUBLIC_API_URL
   Value: https://xxx.up.railway.app
   (Thay bằng Railway URL từ bước 1)

   MONGODB_URI
   Value: mongodb+srv://your-connection-string

   NEXTAUTH_SECRET
   Value: (tạo random string 32 ký tự)

   NEXTAUTH_URL
   Value: https://your-app.vercel.app
   (Có thể để trống, sẽ update sau)
   ```

6. **Deploy** → Đợi 2-5 phút

7. **Update NEXTAUTH_URL**:
   - Sau khi deploy xong, copy Vercel URL
   - Settings → Environment Variables
   - Update `NEXTAUTH_URL` với URL vừa copy
   - Redeploy: Deployments → ... → Redeploy

---

## 🎯 Tạo NEXTAUTH_SECRET

**Windows PowerShell:**
```powershell
-join ((48..57) + (65..90) + (97..122) | Get-Random -Count 32 | % {[char]$_})
```

**Online:**
https://generate-secret.vercel.app/32

---

## ✅ Verify Deployment

### Backend (Railway)
```bash
curl https://xxx.up.railway.app/health
```

Expected:
```json
{
  "status": "healthy",
  "timestamp": "...",
  "systems": {...}
}
```

### Frontend (Vercel)
1. Mở: `https://your-app.vercel.app`
2. Upload document
3. Kiểm tra API calls (F12 → Network)

---

## 🐛 Troubleshooting

### Vercel Build Failed: "pnpm-lock.yaml outdated"
✅ **ĐÃ FIX** - Đã xóa pnpm-lock.yaml và dùng npm

### Vercel Build Failed: "peer dependency"
✅ **ĐÃ FIX** - Đã thêm `.npmrc` với `legacy-peer-deps=true`

### Railway Build Failed: "Image too large"
✅ **ĐÃ FIX** - Đã tối ưu `requirements-railway.txt` (<2GB)

### Frontend không connect Backend
**Check:**
1. `NEXT_PUBLIC_API_URL` đã đúng chưa?
2. Railway backend đang chạy?
3. CORS settings trong `python-api/main.py`

**Fix CORS:**
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

---

## 📊 Expected Results

### Backend
- ✅ Health check: 200 OK
- ✅ API docs: `https://xxx.up.railway.app/docs`
- ✅ 12-stage pipeline working
- ✅ Clustering: 3 clusters
- ✅ Flashcards: 3 cards (not 1)

### Frontend
- ✅ Loads correctly
- ✅ Upload document works
- ✅ API calls successful
- ✅ Vocabulary analysis displays
- ✅ Flashcards grouped by cluster

---

## 🎉 Success!

Nếu mọi thứ OK:
- ✅ Backend: `https://xxx.up.railway.app`
- ✅ Frontend: `https://xxx.vercel.app`
- ✅ Integration working
- ✅ Clustering working (3 flashcards)

**Congratulations! 🚀**

---

## 📝 Next Steps

1. **Custom Domain** (Optional)
   - Railway: Settings → Domains
   - Vercel: Settings → Domains

2. **Monitoring**
   - Railway: Dashboard → Metrics
   - Vercel: Dashboard → Analytics

3. **Auto-deploy**
   - Already enabled!
   - Push to GitHub → Auto deploy

---

## 💰 Cost

**Free Tier:**
- Railway: $5 credit/month (~500 hours)
- Vercel: 100GB bandwidth/month
- MongoDB Atlas: 512MB storage

**Total: $0/month** 🎉

---

## 🆘 Need Help?

**Logs:**
- Railway: Dashboard → Deployments → Logs
- Vercel: Dashboard → Deployments → Function Logs

**Docs:**
- Railway: https://docs.railway.app
- Vercel: https://vercel.com/docs

**Support:**
- Railway Discord: https://discord.gg/railway
- Vercel Discord: https://vercel.com/discord

Good luck! 🍀
