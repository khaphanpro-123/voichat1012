# ✅ Deployment Checklist

Use this checklist to deploy your application to production.

---

## 📋 Pre-Deployment

### Code Preparation
- [ ] All code committed to Git
- [ ] `.env.example` updated with all required variables
- [ ] `.gitignore` excludes sensitive files
- [ ] No hardcoded API keys or secrets
- [ ] All dependencies in `requirements.txt` and `package.json`

### Testing
- [ ] Python API runs locally (`python main.py`)
- [ ] Frontend runs locally (`npm run dev`)
- [ ] Upload document works
- [ ] Knowledge Graph displays
- [ ] Flashcards display
- [ ] Audio playback works

---

## 🐍 Python API Deployment

### Step 1: Choose Platform
- [ ] Railway (Recommended) ✅
- [ ] Render
- [ ] Fly.io

### Step 2: Deploy to Railway

- [ ] Go to [Railway.app](https://railway.app/)
- [ ] Sign in with GitHub
- [ ] Click "New Project"
- [ ] Select "Deploy from GitHub repo"
- [ ] Choose your repository
- [ ] Set root directory: `python-api`
- [ ] Wait for deployment to complete

### Step 3: Configure Environment Variables

In Railway dashboard, add:
- [ ] `OPENAI_API_KEY` (optional)
- [ ] `GOOGLE_GEMINI_API_KEY` (optional)
- [ ] `PORT` (auto-set by Railway)

### Step 4: Get API URL

- [ ] Copy Railway URL (e.g., `https://your-app.railway.app`)
- [ ] Test health check: `curl https://your-app.railway.app/health`
- [ ] Save URL for frontend configuration

---

## 🌐 Frontend Deployment

### Step 1: Update Environment Variables

Create `.env.local` with:
- [ ] `NEXT_PUBLIC_PYTHON_API_URL=https://your-app.railway.app`
- [ ] `MONGO_URI=mongodb+srv://...`
- [ ] `NEXTAUTH_SECRET=...`
- [ ] `NEXTAUTH_URL=http://localhost:3000` (will update after Vercel deploy)
- [ ] `JWT_SECRET=...`
- [ ] `CLOUDINARY_CLOUD_NAME=...`
- [ ] `CLOUDINARY_API_KEY=...`
- [ ] `CLOUDINARY_API_SECRET=...`
- [ ] `OPENAI_API_KEY=...` or `GOOGLE_GEMINI_API_KEY=...`
- [ ] `GOOGLE_CLIENT_ID=...`
- [ ] `GOOGLE_CLIENT_SECRET=...`

### Step 2: Deploy to Vercel

- [ ] Go to [Vercel.com](https://vercel.com/)
- [ ] Sign in with GitHub
- [ ] Click "Add New" → "Project"
- [ ] Import your repository
- [ ] Vercel auto-detects Next.js

### Step 3: Add Environment Variables in Vercel

Copy ALL variables from `.env.local` to Vercel:
- [ ] `NEXT_PUBLIC_PYTHON_API_URL`
- [ ] `MONGO_URI`
- [ ] `MONGO_DB`
- [ ] `NEXTAUTH_SECRET`
- [ ] `NEXTAUTH_URL` (use temporary value, will update)
- [ ] `JWT_SECRET`
- [ ] `CLOUDINARY_CLOUD_NAME`
- [ ] `CLOUDINARY_API_KEY`
- [ ] `CLOUDINARY_API_SECRET`
- [ ] `CLOUDINARY_UPLOAD_PRESET`
- [ ] `NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME`
- [ ] `NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET`
- [ ] `OPENAI_API_KEY` or `GOOGLE_GEMINI_API_KEY`
- [ ] `GROQ_API_KEY` (optional)
- [ ] `GOOGLE_CLIENT_ID`
- [ ] `GOOGLE_CLIENT_SECRET`
- [ ] `LLM_MODEL`
- [ ] Other optional keys

### Step 4: Deploy

- [ ] Click "Deploy"
- [ ] Wait for build to complete
- [ ] Copy Vercel URL (e.g., `https://your-app.vercel.app`)

### Step 5: Update NEXTAUTH_URL

- [ ] Go to Vercel dashboard → Settings → Environment Variables
- [ ] Update `NEXTAUTH_URL` to your Vercel URL
- [ ] Redeploy (Deployments → ... → Redeploy)

---

## 🧪 Post-Deployment Testing

### Python API Tests

- [ ] Health check: `curl https://your-app.railway.app/health`
- [ ] API docs: Visit `https://your-app.railway.app/docs`
- [ ] Test upload (use Postman or curl)

### Frontend Tests

- [ ] Visit `https://your-app.vercel.app`
- [ ] Login works
- [ ] Register works
- [ ] Navigate to `/dashboard-new/documents`
- [ ] Upload a document
- [ ] Verify vocabulary extracted
- [ ] Check document ID in response

### Integration Tests

- [ ] After upload, test Knowledge Graph:
  ```bash
  curl https://your-app.railway.app/api/knowledge-graph/{document_id}
  ```
- [ ] Test Flashcards:
  ```bash
  curl https://your-app.railway.app/api/flashcards/{document_id}
  ```
- [ ] Visit vocabulary analysis page:
  ```
  https://your-app.vercel.app/dashboard-new/vocabulary-analysis?doc={document_id}
  ```
- [ ] Verify Knowledge Graph displays
- [ ] Verify Flashcards display
- [ ] Test audio playback
- [ ] Test synonyms grouping
- [ ] Test related words

---

## 🔧 Configuration Verification

### MongoDB
- [ ] Connection string is correct
- [ ] Database name is correct
- [ ] IP whitelist includes `0.0.0.0/0` (for Vercel)
- [ ] Test connection from Vercel

### Cloudinary
- [ ] Cloud name is correct
- [ ] API keys are correct
- [ ] Upload preset exists
- [ ] Test image upload

### Google OAuth
- [ ] Client ID is correct
- [ ] Client secret is correct
- [ ] Authorized redirect URIs include:
  - `https://your-app.vercel.app/api/auth/callback/google`
- [ ] Test Google login

### AI APIs
- [ ] At least one AI API key is set (OpenAI or Gemini)
- [ ] API key is valid
- [ ] Test vocabulary extraction

---

## 🐛 Troubleshooting

### Python API Issues

**Build fails on Railway/Render**
- [ ] Check build logs
- [ ] Verify `requirements.txt` is valid
- [ ] Ensure Python version is 3.11+
- [ ] Check `railway.json` build command

**API not responding**
- [ ] Check service is running in dashboard
- [ ] Check logs for errors
- [ ] Verify URL is correct
- [ ] Test health endpoint

**Module not found errors**
- [ ] Ensure all dependencies in `requirements.txt`
- [ ] Check build command includes model downloads
- [ ] Verify `download_nltk_data.py` runs

### Frontend Issues

**Build fails on Vercel**
- [ ] Check build logs
- [ ] Verify all env vars are set
- [ ] Check MongoDB connection
- [ ] Verify no syntax errors

**CORS errors**
- [ ] Check Python API CORS config
- [ ] Verify `NEXT_PUBLIC_PYTHON_API_URL` is correct
- [ ] Check Python API is running

**MongoDB connection errors**
- [ ] Verify connection string
- [ ] Check IP whitelist
- [ ] Test connection from Vercel region

**NextAuth errors**
- [ ] Verify `NEXTAUTH_SECRET` is set
- [ ] Check `NEXTAUTH_URL` matches Vercel URL
- [ ] Verify Google OAuth credentials

---

## 📊 Monitoring

### Python API
- [ ] Set up Railway/Render monitoring
- [ ] Check logs regularly
- [ ] Monitor response times
- [ ] Monitor error rates

### Frontend
- [ ] Enable Vercel Analytics
- [ ] Check function logs
- [ ] Monitor build times
- [ ] Monitor error rates

---

## 🔐 Security Checklist

- [ ] All API keys in environment variables
- [ ] No secrets in code
- [ ] MongoDB whitelist configured
- [ ] NEXTAUTH_SECRET is strong (32+ characters)
- [ ] JWT_SECRET is strong (32+ characters)
- [ ] CORS configured properly
- [ ] File upload size limits set (10MB)
- [ ] Rate limiting considered (future)

---

## 📈 Performance Optimization

### Python API
- [ ] Consider upgrading Railway/Render plan if slow
- [ ] Monitor memory usage
- [ ] Consider adding Redis cache (future)
- [ ] Consider horizontal scaling (future)

### Frontend
- [ ] Enable Vercel Analytics
- [ ] Monitor bundle size
- [ ] Optimize images
- [ ] Enable ISR for static pages (future)

---

## 🎯 Final Steps

- [ ] Update README with production URLs
- [ ] Document any custom configuration
- [ ] Share credentials with team (securely)
- [ ] Set up monitoring alerts
- [ ] Plan for backups
- [ ] Schedule regular updates

---

## ✅ Deployment Complete!

Once all items are checked:

1. ✅ Python API is live
2. ✅ Frontend is live
3. ✅ Integration works
4. ✅ All features tested
5. ✅ Monitoring enabled
6. ✅ Security configured

**Your application is now in production! 🎉**

---

## 📞 Support

If you encounter issues:

1. Check logs (Railway/Render/Vercel dashboards)
2. Review `DEPLOYMENT_GUIDE.md`
3. Check `TOM_TAT_DEPLOYMENT.md` (Vietnamese)
4. Review `COMPLETE_INTEGRATION_SUMMARY.md`
5. Contact development team

---

**Author**: Kiro AI  
**Date**: 2026-02-10  
**Version**: 5.2.0-filter-only-mode
