# ✅ Deploy Checklist

## 📋 Trước khi Deploy

### Frontend (TypeScript/Next.js)
- [ ] Test build local: `npm run build`
- [ ] Test start local: `npm run start`
- [ ] Kiểm tra `.env.local` có đầy đủ variables
- [ ] Kiểm tra `vercel.json` đã tạo
- [ ] Install Vercel CLI: `npm i -g vercel`

### Backend (Python/FastAPI)
- [ ] Test local: `cd python-api && python main.py`
- [ ] Kiểm tra `requirements-railway.txt` (đã tối ưu)
- [ ] Kiểm tra `railway.json` (đã có)
- [ ] Kiểm tra `Procfile` (đã có)
- [ ] Kiểm tra `runtime.txt` (Python 3.11.7)
- [ ] Install Railway CLI: `npm i -g @railway/cli`

---

## 🚀 Deploy Backend TRƯỚC (Railway)

### Bước 1: Login Railway
```bash
railway login
```

### Bước 2: Deploy
```bash
cd python-api
railway up
```

### Bước 3: Lấy URL
Sau khi deploy xong, Railway sẽ cho URL:
```
https://your-app-name.railway.app
```

**LƯU Ý URL NÀY!** Bạn sẽ cần nó cho frontend.

### Bước 4: Test API
```bash
curl https://your-app-name.railway.app/health
```

Expected response:
```json
{
  "status": "healthy",
  "timestamp": "...",
  "systems": {...}
}
```

---

## 🎨 Deploy Frontend SAU (Vercel)

### Bước 1: Cập nhật vercel.json

Mở `vercel.json` và thay thế URL:
```json
{
  "rewrites": [
    {
      "source": "/api/python/:path*",
      "destination": "https://YOUR-RAILWAY-URL.railway.app/api/:path*"
    }
  ]
}
```

### Bước 2: Login Vercel
```bash
vercel login
```

### Bước 3: Deploy
```bash
vercel --prod
```

### Bước 4: Set Environment Variables

Trên Vercel Dashboard → Settings → Environment Variables:

```
NEXT_PUBLIC_API_URL=https://your-railway-url.railway.app
MONGODB_URI=mongodb+srv://...
NEXTAUTH_SECRET=your-random-secret-key
NEXTAUTH_URL=https://your-vercel-app.vercel.app
```

### Bước 5: Redeploy
```bash
vercel --prod
```

---

## 🔗 Kết nối Frontend ↔ Backend

### Kiểm tra CORS trên Python API

File `python-api/main.py` đã có CORS:
```python
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Trong production nên thay bằng domain cụ thể
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

**Recommended**: Thay `allow_origins=["*"]` bằng:
```python
allow_origins=[
    "https://your-app.vercel.app",
    "http://localhost:3000"  # For local dev
]
```

---

## ✅ Verification

### 1. Test Backend
```bash
curl https://your-railway-url.railway.app/health
```

### 2. Test Frontend
Mở browser: `https://your-vercel-app.vercel.app`

### 3. Test Integration
1. Upload document trên frontend
2. Kiểm tra Network tab (F12)
3. Xem API call đến Railway backend
4. Kiểm tra response

---

## 🐛 Common Issues

### Issue 1: Frontend không connect được Backend
**Solution:**
- Kiểm tra `NEXT_PUBLIC_API_URL` đã đúng chưa
- Kiểm tra CORS settings
- Kiểm tra Railway backend đang chạy

### Issue 2: Railway build failed - Image too large
**Solution:**
- Đã fix bằng `requirements-railway.txt`
- Nếu vẫn lỗi, xóa thêm packages không cần thiết

### Issue 3: Vercel build failed
**Solution:**
```bash
# Clear cache
rm -rf .next node_modules
npm install
npm run build
```

### Issue 4: Environment variables không work
**Solution:**
- Vercel: Phải prefix bằng `NEXT_PUBLIC_` cho client-side
- Railway: Không cần prefix
- Sau khi thay đổi env vars, phải redeploy

---

## 📊 Monitoring

### Vercel
- Dashboard: https://vercel.com/dashboard
- Logs: `vercel logs`
- Analytics: Vercel Dashboard → Analytics

### Railway
- Dashboard: https://railway.app/dashboard
- Logs: `railway logs`
- Metrics: Railway Dashboard → Metrics

---

## 🎉 Success!

Nếu tất cả đều OK:

✅ Backend: `https://your-app.railway.app` → Status 200
✅ Frontend: `https://your-app.vercel.app` → Loads correctly
✅ Integration: Upload document → Works!

**Congratulations! 🎊**

---

## 📝 Next Steps

1. **Custom Domain** (Optional)
   - Vercel: Settings → Domains
   - Railway: Settings → Domains

2. **Monitoring & Alerts**
   - Setup Vercel Analytics
   - Setup Railway notifications

3. **CI/CD**
   - Auto-deploy on git push
   - Already enabled by default!

4. **Backup**
   - MongoDB Atlas backups
   - Code on GitHub

---

## 💡 Tips

- **Free tier limits:**
  - Vercel: 100GB bandwidth/month
  - Railway: $5 credit/month (~500 hours)

- **Cost optimization:**
  - Use Railway sleep mode for dev
  - Enable Vercel edge caching
  - Optimize images

- **Security:**
  - Never commit `.env` files
  - Use strong NEXTAUTH_SECRET
  - Restrict CORS to your domain

---

## 🆘 Need Help?

1. Check logs: `vercel logs` / `railway logs`
2. Check status: `vercel ls` / `railway status`
3. Restart: Redeploy on dashboard
4. Contact support: Vercel/Railway Discord

Good luck! 🚀
