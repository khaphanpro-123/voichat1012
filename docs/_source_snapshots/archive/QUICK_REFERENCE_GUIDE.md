# EnglishPal - Quick Reference Guide

## 🎯 System Overview (1 Minute Read)

**EnglishPal** is an AI-powered English learning platform with:
- Smart vocabulary extraction from documents
- Bilingual learning (English + Vietnamese)
- AI chat assistant
- Knowledge graph expansion
- Topic modeling

---

## 🏗️ Architecture at a Glance

```
Frontend (Vercel)
    ↓
Next.js API Routes
    ↓
┌─────────────────────────────────────┐
│ MongoDB (Database)                  │
│ Python Backend (NLP Processing)     │
│ Cloudflare R2 (Storage)             │
│ Upstash Redis (Cache)               │
│ Google AI (Translation)             │
└─────────────────────────────────────┘
```

---

## 📱 Frontend Stack

| Component | Technology | Purpose |
|-----------|-----------|---------|
| Framework | Next.js 15 | Web app |
| UI Library | React 19 | Components |
| Styling | Tailwind CSS | Design |
| Animation | Framer Motion | Transitions |
| UI Components | Radix UI | Accessible UI |
| Icons | Lucide React | Icons |
| Auth | NextAuth | Login |

---

## 🔧 Backend Stack

| Component | Technology | Purpose |
|-----------|-----------|---------|
| API Server | Next.js Routes | REST API |
| Processing | Python FastAPI | NLP |
| Database | MongoDB | Data |
| Cache | Redis | Sessions |
| Storage | Cloudflare R2 | Files |
| AI | Google Generative AI | Translation |

---

## 📂 Project Structure

```
app/
├── dashboard-new/
│   ├── ai-chat/          # AI Chat page
│   ├── vocabulary/       # Vocabulary page
│   ├── documents-simple/ # Document upload
│   └── [other pages]
├── api/
│   ├── ai-chat/          # Chat endpoint
│   ├── vocabulary/       # Vocabulary CRUD
│   ├── documents/        # Document processing
│   └── [other endpoints]
└── auth/                 # Auth pages

components/
├── DashboardLayout.tsx   # Main layout
├── FloatingAiChat.tsx    # Chat widget
├── CameraCapture.tsx     # Camera
└── [other components]

lib/
├── mongodb.ts            # DB connection
├── file-processing-pipeline.ts
└── redis-client.ts
```

---

## 🔑 Key API Endpoints

### Vocabulary
```
GET  /api/vocabulary              # List words
POST /api/vocabulary              # Create word
DELETE /api/vocabulary?id=...     # Delete word
POST /api/vocabulary-expand       # Get knowledge graph
```

### AI Chat
```
POST /api/ai-chat                 # Chat with streaming
```

### Translation
```
POST /api/translate-vocabulary-full  # Translate all elements
```

### Documents
```
POST /api/documents               # Upload document
GET  /api/documents               # List documents
POST /api/ocr-extract             # Extract text from image
```

---

## 💾 Database Collections

### users
```javascript
{
  _id, email, name, password, role, level, createdAt
}
```

### vocabulary
```javascript
{
  _id, userId, word, meaning, meaningVi, example, exampleVi,
  type, level, timesReviewed, isLearned, source, ipa, createdAt
}
```

### documents
```javascript
{
  _id, userId, title, content, fileType, uploadedAt, status
}
```

### chat_sessions
```javascript
{
  _id, userId, title, messages: [{role, content, timestamp}], createdAt
}
```

---

## 🧠 Vocabulary Extraction Pipeline (11 Steps)

1. **Text Preprocessing** - Clean text
2. **Sentence Segmentation** - Split into sentences
3. **POS Tagging** - Identify parts of speech
4. **Phrase Extraction** - Extract phrases
5. **Semantic Embeddings** - Convert to vectors
6. **TF-IDF Scoring** - Statistical importance
7. **Frequency Analysis** - Count occurrences
8. **Length Normalization** - Prefer medium-length words
9. **Hybrid Scoring** - Combine all factors
10. **Clustering** - Group similar words
11. **Ranking & Filtering** - Sort and filter

**Final Score Formula**:
```
Score = (0.3 × Semantic) + (0.3 × TF-IDF) + (0.2 × Frequency) + (0.2 × Length)
```

---

## 🚀 Deployment

### Frontend
- **Platform**: Vercel
- **URL**: https://voichat1012.vercel.app
- **Build**: `npm run build:prod`

### Backend
- **Platform**: Railway
- **URL**: https://voichat1012-production.up.railway.app
- **Language**: Python FastAPI

### Database
- **Platform**: MongoDB Atlas
- **Tier**: M0 (Free)

### Storage
- **Platform**: Cloudflare R2
- **Bucket**: document-uploads

### Cache
- **Platform**: Upstash Redis

---

## 🔐 Security

- ✅ HTTPS enforced
- ✅ Passwords hashed (bcryptjs)
- ✅ JWT authentication
- ✅ CORS configured
- ✅ Input validation (Zod)
- ✅ Rate limiting (Redis)
- ✅ Environment variables

---

## 📊 Key Features

### Learning
- ✅ Vocabulary management
- ✅ Knowledge graph (collocations, synonyms, antonyms)
- ✅ Bilingual support (English + Vietnamese)
- ✅ Quiz with 3 question types
- ✅ Document processing (PDF, images, text)

### AI
- ✅ AI chat with streaming
- ✅ Multiple AI providers (Groq, OpenAI, Gemini)
- ✅ Smart vocabulary extraction
- ✅ Topic modeling
- ✅ Auto-translation

### UX
- ✅ Responsive design
- ✅ Floating AI chat widget
- ✅ Smooth animations
- ✅ Accessible components
- ✅ Admin dashboard

---

## 🛠️ Development Commands

```bash
# Setup development
npm run dev:setup

# Development server
npm run dev

# Build for production
npm run build:prod

# Start production server
npm start

# Run tests
npm test

# Lint code
npm run lint
```

---

## 📝 Environment Variables

```env
# Frontend
NEXT_PUBLIC_API_URL=https://voichat1012-production.up.railway.app
NEXTAUTH_URL=https://voichat1012.vercel.app
NEXTAUTH_SECRET=...

# Database
MONGO_URI=mongodb+srv://...

# AI Services
GOOGLE_API_KEY=...
OPENAI_API_KEY=...

# Storage
R2_ACCOUNT_ID=...
R2_ACCESS_KEY_ID=...
R2_SECRET_ACCESS_KEY=...

# Cache
UPSTASH_REDIS_URL=...
UPSTASH_REDIS_TOKEN=...
```

---

## 🐛 Troubleshooting

### API Connection Error
```
Check: NEXT_PUBLIC_API_URL in .env
Verify: Railway backend is running
```

### Database Connection Error
```
Check: MONGO_URI in environment
Verify: MongoDB Atlas network access
```

### OCR Not Working
```
Check: Browser camera permissions
Try: Server-side OCR fallback
```

### Translation Timeout
```
Check: Google API key
Verify: Rate limits
```

---

## 📚 Documentation Files

1. **ARCHITECTURE_PART1_FRONTEND.md** - Frontend details
2. **ARCHITECTURE_PART2_BACKEND.md** - Backend details
3. **ARCHITECTURE_PART3_DATABASE_HOSTING.md** - Database & hosting
4. **ARCHITECTURE_PART4_ALGORITHMS.md** - Algorithms
5. **ARCHITECTURE_PART5_DATAFLOW_SUMMARY.md** - Data flow
6. **QUICK_REFERENCE_GUIDE.md** - This file

---

## 🎓 Learning Path

1. Read **QUICK_REFERENCE_GUIDE.md** (this file) - 5 min
2. Read **ARCHITECTURE_PART1_FRONTEND.md** - 10 min
3. Read **ARCHITECTURE_PART2_BACKEND.md** - 10 min
4. Read **ARCHITECTURE_PART3_DATABASE_HOSTING.md** - 10 min
5. Read **ARCHITECTURE_PART4_ALGORITHMS.md** - 15 min
6. Read **ARCHITECTURE_PART5_DATAFLOW_SUMMARY.md** - 10 min

**Total**: ~60 minutes to understand the entire system

---

## 🔗 Useful Links

- **Frontend**: https://voichat1012.vercel.app
- **Backend API**: https://voichat1012-production.up.railway.app
- **GitHub**: [Your repository]
- **MongoDB Atlas**: https://cloud.mongodb.com
- **Vercel Dashboard**: https://vercel.com
- **Railway Dashboard**: https://railway.app

---

## 👥 Team & Support

For questions about:
- **Frontend**: Check ARCHITECTURE_PART1_FRONTEND.md
- **Backend**: Check ARCHITECTURE_PART2_BACKEND.md
- **Database**: Check ARCHITECTURE_PART3_DATABASE_HOSTING.md
- **Algorithms**: Check ARCHITECTURE_PART4_ALGORITHMS.md
- **Data Flow**: Check ARCHITECTURE_PART5_DATAFLOW_SUMMARY.md

---

**Last Updated**: 2026-04-21
**Version**: 1.0
**Status**: Complete ✅
