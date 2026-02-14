# 🚀 Deploy qua Dashboard (Không cần CLI)

## Cách này KHÔNG CẦN cài Railway CLI hay Vercel CLI!

---

## 🐍 PHẦN 1: Deploy Backend (Python) qua Railway Dashboard

### Bước 1: Tạo tài khoản Railway

1. Truy cập: https://railway.app
2. Click "Login" → Chọn "Login with GitHub"
3. Authorize Railway truy cập GitHub

### Bước 2: Push code lên GitHub (nếu chưa)

```bash
git add .
git commit -m "Ready for deployment"
git push origin main
```

### Bước 3: Tạo Project mới trên Railway

1. Vào Railway Dashboard: https://railway.app/dashboard
2. Click "New Project"
3. Chọn "Deploy from GitHub repo"
4. Chọn repository của bạn
5. Railway sẽ scan và detect Python app

### Bước 4: Configure Project

**Settings → General:**
- Project Name: `voichat-python-api` (hoặc tên bạn muốn)

**Settings → Environment:**
- Root Directory: `python-api`
- Build Command: (để trống, Railway sẽ dùng railway.json)
- Start Command: (để trống, Railway sẽ dùng railway.json)

**Settings → Variables:**
- Không cần thêm gì (PORT tự động)

### Bước 5: Deploy

1. Railway sẽ tự động build và deploy
2. Đợi 5-10 phút (lần đầu build lâu)
3. Xem logs để theo dõi progress

### Bước 6: Lấy URL

1. Vào tab "Settings"
2. Scroll xuống "Domains"
3. Click "Generate Domain"
4. Railway sẽ tạo URL: `https://your-app.up.railway.app`

**LƯU LẠI URL NÀY!** Bạn sẽ cần cho frontend.

### Bước 7: Test API

Mở browser hoặc dùng curl:
```
https://your-app.up.railway.app/health
```

Nếu thấy response JSON → ✅ Backend deployed thành công!

---

## 🎨 PHẦN 2: Deploy Frontend (TypeScript) qua Vercel Dashboard

### Bước 1: Tạo tài khoản Vercel

1. Truy cập: https://vercel.com
2. Click "Sign Up" → Chọn "Continue with GitHub"
3. Authorize Vercel truy cập GitHub

### Bước 2: Import Project

1. Vào Vercel Dashboard: https://vercel.com/dashboard
2. Click "Add New..." → "Project"
3. Import repository của bạn
4. Vercel sẽ tự detect Next.js

### Bước 3: Configure Project

**Framework Preset:** Next.js (auto-detected)

**Root Directory:** `.` (root)

**Build Command:** `npm run build` (auto-filled)

**Output Directory:** `.next` (auto-filled)

**Install Command:** `npm install` (auto-filled)

### Bước 4: Environment Variables

Click "Environment Variables" và thêm:

```
NEXT_PUBLIC_API_URL
Value: https://your-railway-url.up.railway.app
(Thay bằng URL Railway từ Bước 6 phần trước)

MONGODB_URI
Value: mongodb+srv://your-connection-string

NEXTAUTH_SECRET
Value: your-random-secret-key-here

NEXTAUTH_URL
Value: https://your-app.vercel.app
(Sẽ có sau khi deploy, có thể thêm sau)
```

**Tạo NEXTAUTH_SECRET:**
```bash
# Trên PowerShell
-join ((48..57) + (65..90) + (97..122) | Get-Random -Count 32 | % {[char]$_})
```

### Bước 5: Deploy

1. Click "Deploy"
2. Đợi 2-5 phút
3. Vercel sẽ build và deploy

### Bước 6: Lấy URL

Sau khi deploy xong, Vercel sẽ cho URL:
```
https://your-app.vercel.app
```

### Bước 7: Cập nhật NEXTAUTH_URL

1. Vào Settings → Environment Variables
2. Tìm `NEXTAUTH_URL`
3. Update value: `https://your-app.vercel.app`
4. Click "Save"

### Bước 8: Redeploy

1. Vào tab "Deployments"
2. Click "..." trên deployment mới nhất
3. Click "Redeploy"
4. Chọn "Use existing Build Cache"
5. Click "Redeploy"

---

## 🔗 PHẦN 3: Kết nối Frontend ↔ Backend

### Kiểm tra kết nối

1. Mở frontend: `https://your-app.vercel.app`
2. Thử upload document
3. Mở DevTools (F12) → Network tab
4. Xem API calls đến Railway backend

Nếu thấy:
- ✅ Status 200 → Thành công!
- ❌ Status 404/500 → Kiểm tra lại URL
- ❌ CORS error → Kiểm tra CORS settings

---

## 🔧 Cập nhật CORS (nếu cần)

Nếu gặp CORS error, cập nhật file `python-api/main.py`:

```python
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "https://your-app.vercel.app",  # Thay bằng URL Vercel thực tế
        "http://localhost:3000"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

Sau đó:
1. Commit và push lên GitHub
2. Railway sẽ tự động redeploy

---

## 📊 Monitoring

### Railway Dashboard

**Logs:**
1. Vào project trên Railway
2. Click tab "Deployments"
3. Click vào deployment
4. Xem logs real-time

**Metrics:**
1. Tab "Metrics"
2. Xem CPU, Memory, Network usage

### Vercel Dashboard

**Logs:**
1. Vào project trên Vercel
2. Click tab "Deployments"
3. Click vào deployment
4. Click "View Function Logs"

**Analytics:**
1. Tab "Analytics"
2. Xem traffic, performance

---

## 🐛 Troubleshooting

### Railway Build Failed

**Lỗi: "Image size exceeded"**
- Đã fix bằng `requirements-railway.txt`
- Nếu vẫn lỗi, check logs để xem package nào lớn

**Lỗi: "Build timeout"**
- Railway free tier có limit 10 phút
- Lần đầu build lâu hơn (5-10 phút)
- Nếu timeout, thử deploy lại

**Lỗi: "Module not found"**
- Check `requirements-railway.txt` có đủ dependencies
- Check `railway.json` build command đúng

### Vercel Build Failed

**Lỗi: "Build exceeded maximum duration"**
- Vercel free tier: 45 giây build time
- Check dependencies có quá nhiều không
- Có thể cần upgrade plan

**Lỗi: "Module not found"**
- Check `package.json` có đủ dependencies
- Thử xóa `node_modules` và reinstall

### Frontend không connect Backend

**Lỗi: "Failed to fetch"**
- Check `NEXT_PUBLIC_API_URL` đã đúng chưa
- Check Railway backend đang chạy
- Check CORS settings

**Lỗi: "CORS policy"**
- Update CORS trong `python-api/main.py`
- Thêm Vercel domain vào `allow_origins`

---

## ✅ Success Checklist

- [ ] Railway backend deployed: `https://xxx.up.railway.app`
- [ ] Railway health check OK: `/health` returns 200
- [ ] Vercel frontend deployed: `https://xxx.vercel.app`
- [ ] Frontend loads correctly
- [ ] Upload document works
- [ ] API calls to Railway successful
- [ ] Clustering works (3 flashcards)

---

## 🎉 Deployment Complete!

**URLs:**
- Frontend: `https://your-app.vercel.app`
- Backend: `https://your-app.up.railway.app`
- API Docs: `https://your-app.up.railway.app/docs`

**Next Steps:**
1. ✅ Test all features
2. ✅ Setup custom domain (optional)
3. ✅ Enable monitoring
4. ✅ Setup alerts

---

## 💡 Tips

### Auto-deploy on Git Push

**Railway:**
- Đã enable mặc định
- Mỗi lần push → auto deploy

**Vercel:**
- Đã enable mặc định
- Mỗi lần push → auto deploy

### Custom Domain

**Railway:**
1. Settings → Domains
2. Add custom domain
3. Update DNS records

**Vercel:**
1. Settings → Domains
2. Add domain
3. Update DNS records

### Cost Optimization

**Railway Free Tier:**
- $5 credit/month
- ~500 hours runtime
- Tip: Enable sleep mode khi không dùng

**Vercel Free Tier:**
- 100GB bandwidth/month
- Unlimited deployments
- Tip: Optimize images, enable caching

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

Good luck! 🚀
