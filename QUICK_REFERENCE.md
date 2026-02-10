# 🚀 Quick Reference - Visual Language Tutor

## 📍 Important URLs

### Development
- Frontend: `http://localhost:3000`
- Python API: `http://localhost:8000`
- API Docs: `http://localhost:8000/docs`

### Production (Update after deployment)
- Frontend: `https://your-app.vercel.app`
- Python API: `https://your-app.railway.app`
- API Docs: `https://your-app.railway.app/docs`

---

## 🔑 Environment Variables

### Required for Frontend (.env.local)
```env
NEXT_PUBLIC_PYTHON_API_URL=http://localhost:8000
MONGO_URI=mongodb+srv://...
NEXTAUTH_SECRET=your-secret
NEXTAUTH_URL=http://localhost:3000
JWT_SECRET=your-jwt-secret
OPENAI_API_KEY=sk-...  # or GOOGLE_GEMINI_API_KEY
```

### Required for Python API
```env
# Optional - API works without these
OPENAI_API_KEY=sk-...
GOOGLE_GEMINI_API_KEY=AIza...
```

---

## 🏃 Quick Start Commands

### Backend (Python API)
```bash
cd python-api
python -m venv venv
venv\Scripts\activate  # Windows
pip install -r requirements.txt
python -m spacy download en_core_web_sm
python download_nltk_data.py
python main.py
```

### Frontend (Next.js)
```bash
npm install
cp .env.example .env.local
# Edit .env.local with your keys
npm run dev
```

---

## 📡 API Endpoints

### Upload Document
```bash
POST /api/upload-document-complete
Content-Type: multipart/form-data

curl -X POST http://localhost:8000/api/upload-document-complete \
  -F "file=@document.pdf" \
  -F "max_phrases=40" \
  -F "max_words=10"
```

### Get Knowledge Graph
```bash
GET /api/knowledge-graph/{document_id}

curl http://localhost:8000/api/knowledge-graph/doc_20260210_123456
```

### Get Flashcards
```bash
GET /api/flashcards/{document_id}

curl http://localhost:8000/api/flashcards/doc_20260210_123456
```

### Health Check
```bash
GET /health

curl http://localhost:8000/health
```

---

## 🧪 Testing

### Test Python API
```bash
# Health check
curl http://localhost:8000/health

# API docs
start http://localhost:8000/docs

# Or run test script
cd python-api
TEST_ENDPOINTS.bat
```

### Test Frontend
```bash
# Visit in browser
http://localhost:3000/dashboard-new/documents

# Upload a document
# Check console for document_id
```

### Test Integration
```bash
# After uploading, test with document_id
curl http://localhost:8000/api/knowledge-graph/doc_20260210_123456
curl http://localhost:8000/api/flashcards/doc_20260210_123456

# Visit analysis page
http://localhost:3000/dashboard-new/vocabulary-analysis?doc=doc_20260210_123456
```

---

## 🚀 Deployment

### Python API → Railway
1. Push to GitHub
2. Railway.app → New Project → Deploy from GitHub
3. Set root directory: `python-api`
4. Copy Railway URL

### Frontend → Vercel
1. Push to GitHub
2. Vercel.com → Import Project
3. Add environment variables
4. Update `NEXT_PUBLIC_PYTHON_API_URL` with Railway URL
5. Deploy

---

## 📁 Key Files

### Backend
- `python-api/main.py` - FastAPI app + endpoints
- `python-api/complete_pipeline_12_stages.py` - Main pipeline
- `python-api/requirements.txt` - Dependencies
- `python-api/railway.json` - Deployment config

### Frontend
- `components/KnowledgeGraphViewer.tsx` - Knowledge Graph UI
- `components/FlashcardClusterView.tsx` - Flashcards UI
- `components/FileUploadOCR.tsx` - Upload UI
- `app/dashboard-new/vocabulary-analysis/page.tsx` - Analysis page

### Documentation
- `DEPLOYMENT_GUIDE.md` - Complete deployment guide
- `DEPLOYMENT_CHECKLIST.md` - Step-by-step checklist
- `TOM_TAT_DEPLOYMENT.md` - Vietnamese summary
- `COMPLETE_INTEGRATION_SUMMARY.md` - Full summary

---

## 🐛 Common Issues

### "Module not found" (Python)
```bash
pip install -r requirements.txt
python -m spacy download en_core_web_sm
python download_nltk_data.py
```

### "Document not found" (API)
- Ensure document was uploaded first
- Check document_id is correct
- Verify cache is working

### CORS Error
- Check Python API is running
- Verify `NEXT_PUBLIC_PYTHON_API_URL` is correct
- Check CORS config in `main.py`

### MongoDB Connection Error
- Verify `MONGO_URI` is correct
- Check IP whitelist (add `0.0.0.0/0` for Vercel)
- Test connection

---

## 📊 Pipeline Stages

```
STAGE 1:  Document Ingestion
STAGE 2:  Heading Detection
STAGE 3:  Context Intelligence + Phrase Extraction
STAGE 4:  Dense Retrieval (Semantic)
STAGE 5:  (Removed)
STAGE 6:  BM25 Filter (Filter only, no re-ranking)
STAGE 7:  Single-Word Extraction
STAGE 8:  Merge Phrases + Words (Keep 100%)
STAGE 9:  Contrastive Scoring
STAGE 10: Synonym Collapse (Disabled)
STAGE 11: Knowledge Graph + Mind Map
STAGE 12: Flashcard Generation (IPA, Audio, Synonyms)
```

---

## 🎯 Features

### Knowledge Graph (STAGE 11)
- ✅ Semantic clustering
- ✅ Relationship detection
- ✅ Mind map generation
- ✅ Interactive visualization
- ✅ Statistics dashboard

### Flashcards (STAGE 12)
- ✅ Grouped by cluster
- ✅ Synonym grouping (similarity > 0.85)
- ✅ IPA phonetics
- ✅ Audio URLs (Google TTS)
- ✅ Related words
- ✅ Difficulty levels
- ✅ Example sentences

---

## 📞 Support Resources

1. **DEPLOYMENT_GUIDE.md** - Full deployment instructions
2. **DEPLOYMENT_CHECKLIST.md** - Step-by-step checklist
3. **TOM_TAT_DEPLOYMENT.md** - Vietnamese summary
4. **VOCABULARY_ANALYSIS_INTEGRATION.md** - Frontend integration
5. **python-api/README.md** - Python API documentation

---

## 🔗 Useful Links

- Railway: https://railway.app/
- Render: https://render.com/
- Vercel: https://vercel.com/
- MongoDB Atlas: https://cloud.mongodb.com/
- Cloudinary: https://cloudinary.com/
- OpenAI: https://platform.openai.com/
- Google Gemini: https://makersuite.google.com/

---

## ✅ Quick Checklist

### Before Deployment
- [ ] Code committed to Git
- [ ] Environment variables configured
- [ ] Local testing complete

### Deployment
- [ ] Python API deployed to Railway/Render
- [ ] Frontend deployed to Vercel
- [ ] Environment variables set in production

### After Deployment
- [ ] Health check works
- [ ] Upload works
- [ ] Knowledge Graph displays
- [ ] Flashcards display
- [ ] Audio playback works

---

**Author**: Kiro AI  
**Date**: 2026-02-10  
**Version**: 5.2.0-filter-only-mode

**Status**: ✅ Ready for Production
