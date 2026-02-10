# 🚀 Deployment Guide - Visual Language Tutor

## 📋 Overview

This application consists of two parts:
1. **Frontend (Next.js)** - Deploy to Vercel
2. **Backend (Python FastAPI)** - Deploy to Railway/Render/Fly.io

---

## 🐍 Part 1: Deploy Python API (Backend)

### Option A: Railway (Recommended)

#### Step 1: Prepare Repository

```bash
# Ensure all files are committed
git add .
git commit -m "Prepare for deployment"
git push origin main
```

#### Step 2: Deploy to Railway

1. Go to [Railway.app](https://railway.app/)
2. Click "New Project" → "Deploy from GitHub repo"
3. Select your repository
4. Railway will auto-detect Python and use `railway.json` config
5. Set root directory to `python-api`

#### Step 3: Configure Environment Variables

In Railway dashboard, add these variables:

```env
# Optional: OpenAI API Key (if using GPT models)
OPENAI_API_KEY=sk-...

# Optional: Google Gemini API Key
GOOGLE_GEMINI_API_KEY=AIza...

# Port (Railway sets this automatically)
PORT=8000
```

#### Step 4: Get Your API URL

After deployment, Railway will provide a URL like:
```
https://your-app-name.up.railway.app
```

Copy this URL - you'll need it for frontend configuration.

---

### Option B: Render

#### Step 1: Create New Web Service

1. Go to [Render.com](https://render.com/)
2. Click "New" → "Web Service"
3. Connect your GitHub repository
4. Configure:
   - **Name**: `visual-language-tutor-api`
   - **Root Directory**: `python-api`
   - **Environment**: `Python 3`
   - **Build Command**: 
     ```bash
     pip install -r requirements.txt && python -m spacy download en_core_web_sm && python download_nltk_data.py
     ```
   - **Start Command**: 
     ```bash
     uvicorn main:app --host 0.0.0.0 --port $PORT
     ```

#### Step 2: Environment Variables

Add in Render dashboard:
```env
PYTHON_VERSION=3.11.7
OPENAI_API_KEY=sk-...  # Optional
GOOGLE_GEMINI_API_KEY=AIza...  # Optional
```

#### Step 3: Get Your API URL

After deployment, Render provides:
```
https://your-app-name.onrender.com
```

---

### Option C: Fly.io

#### Step 1: Install Fly CLI

```bash
# Windows (PowerShell)
iwr https://fly.io/install.ps1 -useb | iex

# Mac/Linux
curl -L https://fly.io/install.sh | sh
```

#### Step 2: Login and Deploy

```bash
cd python-api
fly auth login
fly launch
```

Follow prompts:
- App name: `visual-language-tutor-api`
- Region: Choose closest to your users
- Database: No
- Deploy now: Yes

#### Step 3: Set Environment Variables

```bash
fly secrets set OPENAI_API_KEY=sk-...
fly secrets set GOOGLE_GEMINI_API_KEY=AIza...
```

#### Step 4: Get Your API URL

```
https://your-app-name.fly.dev
```

---

## 🌐 Part 2: Deploy Frontend (Next.js)

### Deploy to Vercel

#### Step 1: Push to GitHub

```bash
git add .
git commit -m "Ready for Vercel deployment"
git push origin main
```

#### Step 2: Import to Vercel

1. Go to [Vercel.com](https://vercel.com/)
2. Click "Add New" → "Project"
3. Import your GitHub repository
4. Vercel auto-detects Next.js configuration

#### Step 3: Configure Environment Variables

In Vercel dashboard, add ALL variables from `.env.example`:

**Critical Variables:**

```env
# Python API URL (from Railway/Render/Fly.io)
NEXT_PUBLIC_PYTHON_API_URL=https://your-python-api.railway.app

# MongoDB
MONGO_URI=mongodb+srv://username:password@cluster.mongodb.net/database
MONGO_DB=autism_app

# NextAuth
NEXTAUTH_SECRET=your-nextauth-secret-here
NEXTAUTH_URL=https://your-app.vercel.app

# JWT
JWT_SECRET=your-jwt-secret-here

# Cloudinary
CLOUDINARY_CLOUD_NAME=your-cloud-name
CLOUDINARY_API_KEY=your-api-key
CLOUDINARY_API_SECRET=your-api-secret
CLOUDINARY_UPLOAD_PRESET=your-preset
NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME=your-cloud-name
NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET=your-preset

# AI APIs (at least one required)
OPENAI_API_KEY=sk-...
GOOGLE_GEMINI_API_KEY=AIza...
GROQ_API_KEY=gsk_...  # Optional

# Google OAuth
GOOGLE_CLIENT_ID=xxxxx.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-xxxxx

# Other APIs (optional)
LLM_MODEL=gpt-4o-mini
COHERE_API_KEY=your-cohere-key
UNSPLASH_ACCESS_KEY=your-unsplash-key
```

#### Step 4: Deploy

Click "Deploy" - Vercel will build and deploy automatically.

#### Step 5: Update NEXTAUTH_URL

After first deployment:
1. Copy your Vercel URL (e.g., `https://your-app.vercel.app`)
2. Update `NEXTAUTH_URL` environment variable
3. Redeploy

---

## 🔧 Local Development Setup

### Backend (Python API)

```bash
cd python-api

# Create virtual environment
python -m venv venv

# Activate (Windows)
venv\Scripts\activate

# Activate (Mac/Linux)
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Download NLP models
python -m spacy download en_core_web_sm
python download_nltk_data.py

# Run server
python main.py
```

Server runs at: `http://localhost:8000`

### Frontend (Next.js)

```bash
# Install dependencies
npm install

# Create .env.local
cp .env.example .env.local

# Edit .env.local and add your keys
# Set NEXT_PUBLIC_PYTHON_API_URL=http://localhost:8000

# Run development server
npm run dev
```

App runs at: `http://localhost:3000`

---

## 🧪 Testing the Integration

### 1. Test Python API

```bash
# Health check
curl http://localhost:8000/health

# Or visit in browser
http://localhost:8000/docs
```

### 2. Test Frontend

1. Go to `http://localhost:3000/dashboard-new/documents`
2. Upload a document (PDF, DOCX, or TXT)
3. Wait for processing
4. After upload completes, you should see vocabulary extracted

### 3. Test STAGE 11 & 12 Integration

After uploading a document:

```bash
# Get document_id from upload response (e.g., "doc_20260210_123456")

# Test Knowledge Graph API
curl http://localhost:8000/api/knowledge-graph/doc_20260210_123456

# Test Flashcards API
curl http://localhost:8000/api/flashcards/doc_20260210_123456
```

Then visit:
- `http://localhost:3000/dashboard-new/vocabulary-analysis?doc=doc_20260210_123456`

---

## 🔍 Troubleshooting

### Python API Issues

**Error: "Module not found"**
```bash
pip install -r requirements.txt
```

**Error: "spacy model not found"**
```bash
python -m spacy download en_core_web_sm
```

**Error: "NLTK data not found"**
```bash
python download_nltk_data.py
```

**Port already in use**
```bash
# Change port in main.py
uvicorn.run(app, host="0.0.0.0", port=8001)
```

### Frontend Issues

**Error: "NEXT_PUBLIC_PYTHON_API_URL is not defined"**
- Check `.env.local` file exists
- Ensure variable starts with `NEXT_PUBLIC_`
- Restart dev server after adding env vars

**CORS Error**
- Python API has CORS enabled for all origins
- Check Python API is running
- Check URL is correct in `.env.local`

**MongoDB Connection Error**
- Verify `MONGO_URI` is correct
- Check MongoDB Atlas allows connections from your IP
- For Vercel: Add `0.0.0.0/0` to MongoDB whitelist

### Deployment Issues

**Railway/Render Build Fails**
- Check `requirements.txt` is valid
- Ensure Python version is 3.11.x
- Check build logs for specific errors

**Vercel Build Fails**
- Check all required env vars are set
- Verify MongoDB connection string
- Check build logs in Vercel dashboard

**API Not Responding**
- Check service is running in Railway/Render dashboard
- Verify URL is correct
- Check service logs for errors

---

## 📊 Monitoring

### Python API

**Railway**: View logs in dashboard
```bash
# Or use CLI
railway logs
```

**Render**: View logs in dashboard

**Fly.io**: 
```bash
fly logs
```

### Frontend (Vercel)

View logs in Vercel dashboard:
- Build logs
- Function logs
- Edge logs

---

## 🔐 Security Checklist

- [ ] All API keys stored in environment variables
- [ ] MongoDB whitelist configured
- [ ] NEXTAUTH_SECRET is strong and unique
- [ ] JWT_SECRET is strong and unique
- [ ] CORS configured properly
- [ ] Rate limiting enabled (if needed)
- [ ] File upload size limits set
- [ ] Input validation enabled

---

## 📈 Performance Tips

### Python API

1. **Enable caching**: Results are cached in memory
2. **Use smaller models**: For faster processing
3. **Limit file sizes**: Max 10MB recommended
4. **Scale horizontally**: Add more instances if needed

### Frontend

1. **Enable Vercel Analytics**: Monitor performance
2. **Use Image Optimization**: Next.js automatic
3. **Enable ISR**: For static pages
4. **Monitor bundle size**: Keep under 200KB

---

## 🆘 Support

If you encounter issues:

1. Check logs (Railway/Render/Vercel dashboard)
2. Verify environment variables
3. Test API endpoints directly
4. Check GitHub Issues
5. Contact support

---

## 📝 Changelog

### v5.2.0 (2026-02-10)
- ✅ Added STAGE 11 & 12 API endpoints
- ✅ Added Railway deployment config
- ✅ Updated frontend to use environment variables
- ✅ Added comprehensive deployment guide

---

**Author**: Kiro AI  
**Date**: 2026-02-10  
**Version**: 5.2.0-filter-only-mode
