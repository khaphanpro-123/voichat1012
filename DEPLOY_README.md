# 🚀 Quick Deploy Guide

## 📌 TL;DR - Deploy trong 10 phút

### Option 1: Qua Dashboard (RECOMMENDED - Không cần CLI)
👉 Đọc: **DEPLOY_VIA_DASHBOARD.md**

### Option 2: Qua CLI (Advanced)
👉 Đọc: **DEPLOYMENT_INSTRUCTIONS.md**

---

## 🎯 Quick Steps (Dashboard Method)

### 1️⃣ Deploy Backend (Railway)
1. Vào https://railway.app
2. Login with GitHub
3. New Project → Deploy from GitHub
4. Chọn repo → Set Root Directory: `python-api`
5. Đợi build (5-10 phút)
6. Generate Domain → Lưu URL

### 2️⃣ Deploy Frontend (Vercel)
1. Vào https://vercel.com
2. Login with GitHub
3. Import Project → Chọn repo
4. Add Environment Variables:
   - `NEXT_PUBLIC_API_URL` = Railway URL
   - `MONGODB_URI` = MongoDB connection string
   - `NEXTAUTH_SECRET` = random string
5. Deploy (2-5 phút)

### 3️⃣ Done! 🎉
- Frontend: `https://your-app.vercel.app`
- Backend: `https://your-app.up.railway.app`

---

## 📚 Detailed Guides

| File | Description |
|------|-------------|
| **DEPLOY_VIA_DASHBOARD.md** | ⭐ Deploy qua web dashboard (EASY) |
| **DEPLOYMENT_INSTRUCTIONS.md** | Deploy qua CLI (Advanced) |
| **DEPLOY_CHECKLIST.md** | Checklist từng bước |
| **deploy.bat** | Script tự động deploy |
| **check-deploy-ready.bat** | Kiểm tra sẵn sàng deploy |

---

## ⚡ Prerequisites

### Cần có:
- ✅ GitHub account
- ✅ Railway account (free)
- ✅ Vercel account (free)
- ✅ MongoDB Atlas (free tier)

### Không cần:
- ❌ Railway CLI
- ❌ Vercel CLI
- ❌ Docker
- ❌ Server riêng

---

## 🔑 Environment Variables

### Frontend (Vercel)
```env
NEXT_PUBLIC_API_URL=https://your-railway-url.up.railway.app
MONGODB_URI=mongodb+srv://...
NEXTAUTH_SECRET=random-32-char-string
NEXTAUTH_URL=https://your-vercel-app.vercel.app
```

### Backend (Railway)
```env
# Không cần set gì, Railway tự động set PORT
```

---

## 💰 Cost

### Free Tier (Đủ cho hobby project)
- **Railway**: $5 credit/month (~500 hours)
- **Vercel**: 100GB bandwidth/month
- **MongoDB Atlas**: 512MB storage

### Total: **$0/month** 🎉

---

## 🐛 Common Issues

| Issue | Solution |
|-------|----------|
| Railway build failed | Check logs, đã dùng `requirements-railway.txt` |
| Vercel build failed | Check `npm run build` local |
| CORS error | Update `allow_origins` trong `main.py` |
| API not connecting | Check `NEXT_PUBLIC_API_URL` |

---

## ✅ Verify Deployment

### Backend Health Check
```bash
curl https://your-railway-url.up.railway.app/health
```

Expected:
```json
{
  "status": "healthy",
  "timestamp": "...",
  "systems": {...}
}
```

### Frontend
1. Open: `https://your-vercel-app.vercel.app`
2. Upload document
3. Check if API calls work (F12 → Network)

---

## 📊 What's Deployed

### Backend (Python/FastAPI)
- ✅ 12-stage NLP pipeline
- ✅ Phrase extraction with clustering
- ✅ K-Means clustering (3 clusters)
- ✅ Flashcard generation
- ✅ Knowledge graph
- ✅ Image size optimized (<2GB)

### Frontend (TypeScript/Next.js)
- ✅ Document upload
- ✅ Vocabulary analysis
- ✅ Flashcard display
- ✅ Knowledge graph visualization
- ✅ User authentication

---

## 🎯 Next Steps After Deploy

1. **Test Features**
   - Upload document
   - Check clustering (should get 3 flashcards)
   - Verify knowledge graph

2. **Custom Domain** (Optional)
   - Railway: Settings → Domains
   - Vercel: Settings → Domains

3. **Monitoring**
   - Railway: Check logs & metrics
   - Vercel: Check analytics

4. **Optimize**
   - Enable caching
   - Optimize images
   - Setup CDN

---

## 🆘 Need Help?

1. **Check logs first:**
   - Railway: Dashboard → Deployments → Logs
   - Vercel: Dashboard → Deployments → Function Logs

2. **Read detailed guides:**
   - DEPLOY_VIA_DASHBOARD.md (step-by-step)
   - DEPLOYMENT_INSTRUCTIONS.md (CLI method)

3. **Common fixes:**
   - Redeploy: Usually fixes 80% of issues
   - Check env vars: Most common mistake
   - Check CORS: If API not connecting

---

## 🎉 Success!

Nếu mọi thứ OK:
- ✅ Backend health check returns 200
- ✅ Frontend loads correctly
- ✅ Upload document works
- ✅ Get 3 flashcards (not 1)
- ✅ Clustering works correctly

**Congratulations! Your app is live! 🚀**

---

## 📞 Support

- Railway Docs: https://docs.railway.app
- Vercel Docs: https://vercel.com/docs
- Railway Discord: https://discord.gg/railway
- Vercel Discord: https://vercel.com/discord

Good luck! 🍀
