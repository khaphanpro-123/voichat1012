# 🚀 Deployment Guide - Vercel + Railway

## Kiến trúc hệ thống

```
Frontend (Vercel) ←→ Backend API (Railway)
     ↓                      ↓
  MongoDB Atlas        Python Processing
```

## 🔧 Environment Configuration

### Development (Local)
```bash
# Setup development environment
npm run env:dev
npm run dev

# Or combined
npm run dev:setup
```

### Production (Vercel)
```bash
# Setup production environment
npm run env:prod
npm run build:prod
```

## 📋 Environment Variables

### Frontend (.env.local - Development)
```env
NEXT_PUBLIC_API_URL=http://localhost:3000
NEXTAUTH_URL=http://localhost:3000
NODE_ENV=development
```

### Frontend (.env.production - Production)
```env
NEXT_PUBLIC_API_URL=https://voichat1012-production.up.railway.app
NEXTAUTH_URL=https://voichat1012.vercel.app
NODE_ENV=production
```

### Vercel Environment Variables
Cần set trong Vercel Dashboard:
```
MONGO_URI=mongodb+srv://...
NEXTAUTH_SECRET=...
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
COHERE_API_KEY=...
NEXT_PUBLIC_API_URL=https://voichat1012-production.up.railway.app
```

## 🚂 Railway Backend

### Current Status
- ✅ Backend đang chạy: `https://voichat1012-production.up.railway.app`
- ✅ Processing documents và vocabulary extraction
- ⚠️ Rate limiting: 500 logs/sec (cần monitor)

### Railway Logs Analysis
```
Computing hybrid scores (semantic + frequency + length)
TF-IDF embeddings (Railway-compatible)
Extracting 4 features for 60 candidates
Cluster 11: 1 phrases
Railway rate limit: 500 logs/sec reached
```

## 🔍 Console Errors - Giải pháp

### 1. 404 Favicon Error
```javascript
// next.config.js - thêm
module.exports = {
  // ... existing config
  async rewrites() {
    return [
      {
        source: '/favicon.ico',
        destination: '/api/favicon'
      }
    ]
  }
}
```

### 2. 500 Internal Server Error
**Nguyên nhân:** Conflict giữa local và production URLs

**Giải pháp:** Sử dụng environment-specific configuration

### 3. Railway Rate Limiting
**Hiện tại:** 500 logs/sec limit reached
**Giải pháp:** 
- Reduce logging verbosity
- Implement log batching
- Use Railway Pro plan if needed

## 🚀 Deployment Steps

### Vercel Deployment
1. **Connect Repository**
   ```bash
   vercel --prod
   ```

2. **Set Environment Variables**
   - Go to Vercel Dashboard → Project → Settings → Environment Variables
   - Add all production variables

3. **Build Settings**
   ```
   Build Command: npm run build:prod
   Output Directory: .next
   Install Command: npm install
   ```

### Railway Backend (Already deployed)
- ✅ Current URL: `https://voichat1012-production.up.railway.app`
- ✅ Auto-deploys from `python-api/` folder
- ⚠️ Monitor rate limits and performance

## 🔧 Troubleshooting

### Console Errors in /chat
1. **Clear browser cache**
2. **Check environment variables**
   ```bash
   npm run env:dev  # Reset to development
   ```
3. **Restart development server**
   ```bash
   npm run dev:setup
   ```

### Railway Backend Issues
1. **Check Railway logs**
2. **Monitor rate limits**
3. **Verify API endpoints**

### MongoDB Connection
1. **Check MONGO_URI in environment**
2. **Verify MongoDB Atlas network access**
3. **Test connection with debug tool**

## 📊 Monitoring

### Development
- Console logs for vocabulary saving
- MongoDB connection status
- API response times

### Production
- Vercel Analytics
- Railway metrics
- MongoDB Atlas monitoring
- Error tracking (Sentry recommended)

## 🎯 Next Steps

1. **Fix console errors** ✅ (Environment configuration)
2. **Monitor Railway performance** (Rate limiting)
3. **Optimize logging** (Reduce verbosity)
4. **Add error tracking** (Sentry integration)
5. **Performance monitoring** (Vercel Analytics)