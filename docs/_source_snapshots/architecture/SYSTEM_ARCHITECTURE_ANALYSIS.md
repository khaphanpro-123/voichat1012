ntonyms
✅ **Multiple Learning Modes**: Quiz, flashcards, practice
✅ **Document Processing**: PDF, images, text files
✅ **AI Chat**: Real-time streaming responses
✅ **Floating Widget**: Access AI chat from anywhere
✅ **Topic Modeling**: Auto-group related words
✅ **Responsive Design**: Mobile + desktop support
✅ **Admin Dashboard**: User management & analytics

---

**Last Updated**: 2026-04-21
**Version**: 1.0
**Author**: System Architecture Analysis
outes | API server |
| Processing | Python FastAPI | NLP processing |
| Database | MongoDB Atlas | Data storage |
| Cache | Upstash Redis | Session/cache |
| Storage | Cloudflare R2 | File storage |
| AI | Google Generative AI | Translation/chat |
| Hosting | Vercel + Railway | Deployment |
| Auth | NextAuth | Authentication |

---

## 🎯 KEY FEATURES

✅ **Bilingual Learning**: English + Vietnamese translations
✅ **Smart Vocabulary Extraction**: 11-step AI pipeline
✅ **Knowledge Graph**: Collocations, synonyms, aecurity
- **Passwords**: Hashed with bcryptjs
- **API Keys**: Environment variables only
- **CORS**: Configured for production domains
- **HTTPS**: Enforced in production

### Rate Limiting
- **Redis**: Upstash Redis for rate limiting
- **Limit**: 100 requests per minute per IP
- **Bypass**: Admin users

---

## 📊 SUMMARY TABLE

| Component | Technology | Purpose |
|-----------|-----------|---------|
| Frontend | Next.js 15 + React 19 | Web UI |
| Styling | Tailwind CSS | Design system |
| Backend | Next.js API R## Admin
- `GET /api/admin/users` - List users
- `GET /api/admin/statistics` - System statistics
- `POST /api/admin/notifications` - Send notifications

---

## 8️⃣ SECURITY & AUTHENTICATION

### Authentication
- **Method**: NextAuth with JWT
- **Providers**: Email/Password, Google OAuth
- **Session**: Secure HTTP-only cookies
- **Token**: JWT with 30-day expiration

### Authorization
- **Role-based**: User vs Admin
- **Middleware**: Protected API routes
- **Database**: User role stored in MongoDB

### Data SET /api/auth/session` - Get current session

### Vocabulary
- `GET /api/vocabulary` - List all words
- `POST /api/vocabulary` - Create word
- `DELETE /api/vocabulary?id=...` - Delete word
- `POST /api/vocabulary-expand` - Expand knowledge graph

### Documents
- `POST /api/documents` - Upload document
- `GET /api/documents` - List documents
- `POST /api/ocr-extract` - Extract text from image

### AI Services
- `POST /api/ai-chat` - Chat with AI
- `POST /api/translate-vocabulary-full` - Translate vocabulary

#ph (collocations, synonyms, etc.)
    ↓
Auto-fetch Vietnamese translations
    ↓
Display bilingual content
    ↓
User can take quiz
```

### AI Chat Flow
```
User sends message
    ↓
Save to chat session
    ↓
Send to AI provider (Groq/OpenAI/Gemini)
    ↓
Stream response (SSE)
    ↓
Display in real-time
    ↓
Save to chat history
    ↓
Persist in localStorage
```

---

## 7️⃣ API ENDPOINTS SUMMARY

### Authentication
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `GA FLOW

### Document Upload Flow
```
User uploads document
    ↓
File type detection
    ↓
If image → OCR extraction
If PDF → PDF parsing
If text → Direct processing
    ↓
Text normalization
    ↓
Send to Python backend
    ↓
11-step pipeline processing
    ↓
Vocabulary extraction
    ↓
Save to MongoDB
    ↓
Display in vocabulary page
```

### Vocabulary Learning Flow
```
User views vocabulary
    ↓
Load from MongoDB
    ↓
Display with English meaning
    ↓
User clicks "Expand Knowledge"
    ↓
Fetch knowledge graact.js (Client-side) + Server-side fallback

**Steps**:
1. Load image
2. Preprocess (grayscale, threshold)
3. Run OCR
4. Extract text
5. Normalize output
6. Pass to vocabulary extraction

**Fallback**: If client-side fails, use server-side OCR

### Translation Pipeline

**Algorithm**: Google Generative AI (Gemini 1.5 Flash)

**Process**:
1. Collect all vocabulary elements
2. Create translation prompt
3. Send to Gemini API
4. Parse JSON response
5. Cache translations
6. Display with Vietnamese

---

## 6️⃣ DATnces

**Implementation**: 
- Uses Google Generative AI
- Semantic similarity via embeddings
- Pattern matching via regex

### Topic Modeling

**Algorithm**: KMeans Clustering on Embeddings

**Steps**:
1. Generate embeddings for all words
2. Apply KMeans clustering
3. Identify cluster centers
4. Assign words to clusters
5. Label clusters by core phrase

**Parameters**:
- Number of clusters: Auto-detected
- Embedding dimension: 384
- Distance metric: Cosine similarity

### OCR Processing

**Algorithm**: Tesser+ (0.2 × Frequency) + (0.2 × Length)
```

**Step 10: Clustering**
- Group similar words
- Use KMeans clustering
- Reduce redundancy

**Step 11: Ranking & Filtering**
- Sort by final score
- Filter by threshold
- Return top N words

### Knowledge Graph Expansion

**Algorithm**: Semantic Similarity + Pattern Matching

**Steps**:
1. Find collocations (words that frequently appear together)
2. Extract synonyms (similar semantic meaning)
3. Extract antonyms (opposite meaning)
4. Find noun phrases
5. Extract example sente

**Step 6: TF-IDF Scoring**
```
TF-IDF = (Term Frequency) × (Inverse Document Frequency)
TF = (word count in doc) / (total words in doc)
IDF = log(total docs / docs containing word)
```

**Step 7: Frequency Analysis**
- Count word occurrences
- Calculate frequency rank
- Normalize by document length

**Step 8: Length Normalization**
- Prefer medium-length words
- Penalize very short/long words
- Formula: 1 / (1 + |length - optimal|)

**Step 9: Hybrid Scoring**
```
Score = (0.3 × Semantic) + (0.3 × TF-IDF) l characters
- Normalize whitespace
- Convert to lowercase
- Remove HTML tags

**Step 2: Sentence Segmentation**
- Split text into sentences
- Preserve sentence boundaries
- Handle abbreviations

**Step 3: POS Tagging**
- Identify parts of speech
- Tag nouns, verbs, adjectives, etc.
- Use NLTK tagger

**Step 4: Phrase Extraction**
- Extract noun phrases
- Extract verb phrases
- Extract adjective phrases

**Step 5: Semantic Embeddings**
- Convert words to vectors
- Use transformer models
- Dimension: 384-768d/route.ts

### Cache
- **Platform**: Upstash Redis
- **Purpose**: Session caching, rate limiting
- **Configuration**: lib/redis-client.ts

### Deployment Architecture
```
GitHub Repository
    ↓
Vercel (Frontend)  ←→  Railway (Backend)
    ↓                      ↓
Next.js App          Python FastAPI
    ↓                      ↓
MongoDB Atlas ←→ Cloudflare R2 ←→ Upstash Redis
```

---

## 5️⃣ ALGORITHMS & PROCESSING

### Vocabulary Extraction Pipeline (11 Steps)

**Step 1: Text Preprocessing**
- Remove specia
- **Platform**: Railway
- **URL**: https://voichat1012-production.up.railway.app
- **Language**: Python (FastAPI)
- **Deployment**: Auto-deploy from GitHub (python-api folder)
- **Environment**: Production

### Database Hosting
- **Platform**: MongoDB Atlas
- **Tier**: M0 (Free)
- **Region**: AWS (configurable)
- **Backup**: Automatic daily backups

### Storage
- **Platform**: Cloudflare R2
- **Purpose**: Document storage (async uploads)
- **Bucket**: document-uploads
- **Configuration**: app/api/async-uploatent: string,
      timestamp: Date
    }
  ],
  createdAt: Date,
  updatedAt: Date
}
```

### Database Connection
- **Provider**: MongoDB Atlas (Cloud)
- **Connection Pool**: 5 max connections (M0 free tier limit)
- **Timeout**: 45 seconds
- **File**: lib/mongodb.ts

---

## 4️⃣ HOSTING & DEPLOYMENT

### Frontend Hosting
- **Platform**: Vercel
- **URL**: https://voichat1012.vercel.app
- **Build Command**: `npm run build:prod`
- **Deployment**: Auto-deploy from GitHub
- **Environment**: Production

### Backend Hosting  timesReviewed: number,
  isLearned: boolean,
  source: string,
  ipa?: string,
  createdAt: Date,
  updatedAt: Date
}
```

**3. documents**
```javascript
{
  _id: ObjectId,
  userId: ObjectId,
  title: string,
  content: string,
  fileType: "pdf" | "image" | "text",
  uploadedAt: Date,
  processedAt: Date,
  status: "pending" | "processing" | "completed"
}
```

**4. chat_sessions**
```javascript
{
  _id: ObjectId,
  userId: ObjectId,
  title: string,
  messages: [
    {
      role: "user" | "assistant",
      con↓
Response → Frontend
```

---

## 3️⃣ DATABASE DESIGN

### MongoDB Collections

**1. users**
```javascript
{
  _id: ObjectId,
  email: string,
  name: string,
  password: string (hashed),
  role: "user" | "admin",
  level: "beginner" | "intermediate" | "advanced",
  createdAt: Date,
  updatedAt: Date
}
```

**2. vocabulary**
```javascript
{
  _id: ObjectId,
  userId: ObjectId,
  word: string,
  meaning: string,
  meaningVi?: string,
  example: string,
  exampleVi?: string,
  type: string,
  level: string,
portance
- **Scoring Factors**:
  - Semantic importance (embeddings)
  - Frequency in document
  - Word length
  - Part-of-speech
  - Position in text

**4. Ablation Study** (python-api/ablation_study.py)
- **Purpose**: Analyze feature importance
- **Features Tested**:
  - Semantic embeddings
  - TF-IDF scoring
  - Frequency analysis
  - Length normalization
  - Clustering

### API Routes Structure
```
Next.js API Routes (TypeScript)
    ↓
MongoDB Operations
    ↓
Python Backend (FastAPI)
    ↓
NLP Processing
    gging
  4. Phrase extraction
  5. Semantic embeddings
  6. TF-IDF scoring
  7. Frequency analysis
  8. Length normalization
  9. Hybrid scoring
  10. Clustering
  11. Ranking & filtering

**2. Phrase-Centric Extractor** (python-api/phrase_centric_extractor.py)
- **Purpose**: Extract meaningful phrases from documents
- **Algorithm**:
  - Noun phrase detection
  - Collocation extraction
  - Semantic similarity
  - Frequency-based ranking

**3. Word Ranker** (python-api/word_ranker.py)
- **Purpose**: Rank words by im }
  ```

**6. /api/ocr-extract** (app/api/ocr-extract/route.ts)
- **Method**: POST
- **Purpose**: Server-side OCR processing
- **Features**:
  - Tesseract.js integration
  - Image-to-text conversion
  - Text normalization

### Python Backend (Railway)

**URL**: `https://voichat1012-production.up.railway.app`

#### Main Components

**1. Complete Pipeline** (python-api/complete_pipeline.py)
- **Purpose**: 11-step vocabulary extraction pipeline
- **Steps**:
  1. Text preprocessing
  2. Sentence segmentation
  3. POS ta**Methods**: POST, GET
- **Purpose**: Document upload and processing
- **Features**:
  - File type detection (PDF, image, text)
  - OCR processing
  - Vocabulary extraction
  - Async queue support

**5. /api/vocabulary-expand** (app/api/vocabulary-expand/route.ts)
- **Method**: POST
- **Purpose**: Expand word with knowledge graph
- **Features**:
  - Collocations extraction
  - Synonyms/antonyms
  - Example sentences
  - Noun phrases
- **Request**:
  ```json
  {
    "word": "resource",
    "meaning": "..."
 full** (app/api/translate-vocabulary-full/route.ts)
- **Method**: POST
- **Purpose**: Translate all vocabulary elements to Vietnamese
- **Features**:
  - Translates meanings, examples, collocations, phrases, synonyms, antonyms
  - Uses Google Generative AI
- **Request**:
  ```json
  {
    "word": "resource",
    "meaning": "...",
    "example": "...",
    "collocations": [...],
    "phrases": [...],
    "synonyms": [...],
    "antonyms": [...]
  }
  ```

**4. /api/documents** (app/api/documents/route.ts)
- "user", "content": "..."}
    ]
  }
  ```

**2. /api/vocabulary** (app/api/vocabulary/route.ts)
- **Methods**: GET, POST, DELETE
- **Purpose**: CRUD operations for vocabulary
- **Features**:
  - Save words from documents
  - Filter by source (document, voice_chat, manual)
  - Pagination support
- **Request (POST)**:
  ```json
  {
    "word": "resource",
    "meaning": "...",
    "example": "...",
    "type": "noun",
    "level": "intermediate",
    "source": "document"
  }
  ```

**3. /api/translate-vocabulary-DB Atlas
- **Cache**: Upstash Redis
- **Storage**: Cloudflare R2 (S3-compatible)
- **AI Services**: Google Generative AI, OpenAI, Cohere

### Next.js API Routes (app/api/)

#### Core Endpoints

**1. /api/ai-chat** (app/api/ai-chat/route.ts)
- **Method**: POST
- **Purpose**: AI chat with streaming responses
- **Providers**: Groq, OpenAI, Gemini
- **Features**:
  - Server-sent events (SSE) streaming
  - Multi-provider support
  - API key validation
- **Request**:
  ```json
  {
    "messages": [
      {"role": ring;
    level: string;
    timesReviewed: number;
    isLearned: boolean;
    source?: string;
    ipa?: string;
  }
  ```

### Frontend Data Flow
```
User Action
    ↓
React Component (State Update)
    ↓
API Call (fetch/SWR)
    ↓
Next.js API Route
    ↓
Backend Processing
    ↓
Response → Component State
    ↓
UI Re-render
```

---

## 2️⃣ BACKEND ARCHITECTURE

### Backend Stack
- **Framework**: Next.js API Routes (Node.js/TypeScript)
- **Secondary Backend**: Python FastAPI (Railway)
- **Database**: Mongo# 4. Vocabulary Page (app/dashboard-new/vocabulary/page.tsx)
- **Purpose**: Vocabulary management and learning
- **Features**:
  - Word list with filtering (type, source)
  - Knowledge graph expansion
  - Vietnamese translations
  - Quiz mode with 3 question types
  - Bilingual display (English + Vietnamese)
- **Data Structure**:
  ```typescript
  interface VocabularyWord {
    _id: string;
    word: string;
    meaning: string;
    meaningVi?: string;
    example: string;
    exampleVi?: string;
    type: stnce (localStorage)
  - Real-time streaming responses
  - Support for multiple AI providers (Groq, OpenAI, Gemini)
- **Storage**: Uses localStorage with keys:
  - `floating_aic_sessions`: Chat sessions
  - `floating_aic_active`: Active chat ID

#### 3. CameraCapture (components/CameraCapture.tsx)
- **Purpose**: Camera capture for document scanning
- **Features**:
  - Environment camera access
  - Fallback camera support
  - Image compression
  - Error handling
- **Browser APIs**: MediaStream API, Canvas API

###e)
  - Navigation menu with 12+ pages
  - User profile section
  - Notifications panel
  - Admin section (role-based)
  - Logout confirmation modal
- **State Management**:
  - `isSidebarOpen`: Mobile sidebar toggle
  - `isAdmin`: Admin role check
  - `unreadCount`: Notification counter
  - `level`: User learning level

#### 2. FloatingAiChat (components/FloatingAiChat.tsx)
- **Purpose**: Floating AI chat widget accessible from any page
- **Features**:
  - Minimize/maximize functionality
  - Chat history persisteraCapture.tsx       # Camera capture component
├── VocabularyQuiz.tsx      # Quiz component
└── [other components]

lib/
├── mongodb.ts             # MongoDB connection
├── file-processing-pipeline.ts  # File processing
├── redis-client.ts        # Redis connection
└── r2-client.ts           # Cloudflare R2 storage
```

### Key Frontend Components

#### 1. DashboardLayout (components/DashboardLayout.tsx)
- **Purpose**: Main layout wrapper for all dashboard pages
- **Features**:
  - Responsive sidebar (desktop/mobilice
│   └── image-learning/    # Image-based learning
├── api/                    # Next.js API routes (backend)
│   ├── ai-chat/           # AI chat endpoint
│   ├── vocabulary/        # Vocabulary CRUD
│   ├── documents/         # Document processing
│   ├── translate-vocabulary-full/  # Translation service
│   └── [other endpoints]
└── auth/                   # Authentication pages

components/
├── DashboardLayout.tsx     # Main layout wrapper
├── FloatingAiChat.tsx      # Floating AI chat widget
├── Cameanagement**: React Hooks + SWR (for data fetching)
- **Authentication**: NextAuth 4.24.11

### Project Structure
```
app/
├── dashboard-new/          # Main dashboard pages
│   ├── ai-chat/           # AI Chat interface
│   ├── vocabulary/        # Vocabulary management
│   ├── documents-simple/  # Document upload & processing
│   ├── chat/              # Voice chat
│   ├── pronunciation/     # Pronunciation practice
│   ├── listening/         # Listening exercises
│   ├── writing-practice/  # Writing pract & Processing
6. Data Flow
7. API Endpoints
8. Security & Authentication

---

## 1️⃣ FRONTEND ARCHITECTURE

### Framework & Technologies
- **Framework**: Next.js 15.5.9 (React 19)
- **Language**: TypeScript 5
- **Styling**: Tailwind CSS 3.4.15 + Framer Motion 12.23.12
- **UI Components**: Radix UI (comprehensive component library)
- **State M Phân Tích Chi Tiết Kiến Trúc Hệ Thống

## 📋 Mục Lục
1. Frontend Architecture
2. Backend Architecture
3. Database Design
4. Hosting & Deployment
5. Algorithms# EnglishPal -