# Giới Thiệu Kiến Trúc Hệ Thống - Visual Language Tutor

## Tổng Quan

Hệ thống Visual Language Tutor là một ứng dụng web full-stack hỗ trợ học tiếng Anh thông qua AI, được xây dựng với kiến trúc hiện đại, tách biệt giữa Frontend (Next.js) và Backend (FastAPI Python), kết nối với nhiều dịch vụ cloud và AI.

---

## 1. CÔNG NGHỆ FRONTEND

### 1.1. Framework & Core Libraries

**Next.js 15 + React 19** - Framework chính cho frontend

```json
// package.json
{
  "dependencies": {
    "next": "^15.5.9",
    "react": "^19",
    "react-dom": "^19",
    "typescript": "^5"
  }
}
```

**Lý do chọn:**
- Server-side rendering (SSR) cho SEO tốt
- API Routes tích hợp sẵn
- File-based routing đơn giản
- Tối ưu hóa performance tự động

### 1.2. UI & Styling

**Tailwind CSS + Radix UI + Framer Motion**

```json
{
  "dependencies": {
    "tailwindcss": "^3.4.15",
    "@radix-ui/react-dialog": "1.1.4",
    "@radix-ui/react-dropdown-menu": "2.1.4",
    "framer-motion": "^12.23.12",
    "lucide-react": "^0.454.0"
  }
}
```

**Ví dụ sử dụng:**

```tsx
// components/VoiceChatEnhanced.tsx
import { motion, AnimatePresence } from "framer-motion";
import { Mic, Volume2, Settings } from "lucide-react";

export default function VoiceChatEnhanced() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl p-4 bg-gradient-to-r from-pink-500 to-violet-500"
    >
      <Mic className="w-5 h-5" />
    </motion.div>
  );
}
```

### 1.3. Authentication

**NextAuth.js** - Xác thực người dùng

```typescript
// lib/authOptions.ts
import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { connectDB } from "@/lib/db";
import User from "@/app/models/User";

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        await connectDB();
        const user = await User.findOne({ email: credentials?.email });
        if (!user) return null;
        
        const isValid = await comparePassword(
          credentials?.password || "", 
          user.password
        );
        if (!isValid) return null;
        
        return {
          id: user._id.toString(),
          email: user.email,
          name: user.name
        };
      }
    })
  ],
  session: { strategy: "jwt" },
  pages: {
    signIn: "/auth/login"
  }
};
```

---

## 2. CÔNG NGHỆ BACKEND

### 2.1. Framework & Core

**FastAPI (Python)** - REST API Backend

```python
# python-api/main.py
from fastapi import FastAPI, HTTPException, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(
    title="Visual Language Tutor API",
    version="2.0",
    description="Complete 11-Step Pipeline + Phrase-Centric Extraction"
)

# CORS - Cho phép frontend kết nối
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.post("/api/upload-document-complete")
async def upload_document(
    file: UploadFile = File(...),
    level: str = Form("intermediate")
):
    # Xử lý upload tài liệu
    pass
```

### 2.2. NLP & AI Libraries

**Core NLP Stack:**

```txt
# python-api/requirements-railway.txt
# NLP Processing
spacy==3.7.2              # Phân tích ngữ pháp, POS tagging
nltk==3.8.1               # Tokenization, lemmatization
scikit-learn==1.3.2       # K-Means clustering, TF-IDF

# Embeddings & Transformers
transformers==4.36.0      # BERT, sentence embeddings
sentence-transformers==2.2.0  # Semantic similarity
tokenizers==0.15.0

# Document Processing
PyPDF2==3.0.1            # PDF parsing
python-docx==1.1.0       # Word document parsing

# Search & Ranking
rank-bm25==0.2.2         # BM25 ranking algorithm

# Phonetics
eng-to-ipa>=0.0.2        # IPA pronunciation
```

**Ví dụ sử dụng:**

```python
# python-api/phrase_centric_extractor.py
import spacy
from sentence_transformers import SentenceTransformer
from sklearn.cluster import KMeans

class PhraseCentricExtractor:
    def __init__(self):
        # Load spaCy model
        self.nlp = spacy.load("en_core_web_sm")
        
        # Load sentence transformer
        self.embedder = SentenceTransformer('all-MiniLM-L6-v2')
        
    def extract_phrases(self, text: str):
        # Phân tích văn bản
        doc = self.nlp(text)
        
        # Trích xuất noun phrases
        phrases = [chunk.text for chunk in doc.noun_chunks]
        
        # Tính embeddings
        embeddings = self.embedder.encode(phrases)
        
        # Clustering với K-Means
        kmeans = KMeans(n_clusters=5)
        clusters = kmeans.fit_predict(embeddings)
        
        return phrases, clusters
```

---

## 3. CƠ SỞ DỮ LIỆU

### 3.1. MongoDB - Database Chính

**Mongoose ODM** - Object Document Mapper

```typescript
// lib/db.ts
import mongoose from "mongoose";

interface CachedConnection {
  conn: typeof mongoose | null;
  promise: Promise<typeof mongoose> | null;
}

let cached: CachedConnection = (global as any)._mongoose;

const connectionOptions = {
  dbName: process.env.MONGO_DB || undefined,
  maxPoolSize: 10,        // Connection pool
  minPoolSize: 2,
  serverSelectionTimeoutMS: 5000,
  socketTimeoutMS: 45000,
  bufferCommands: true,
};

export async function connectDB(): Promise<typeof mongoose> {
  const MONGO_URI = process.env.MONGO_URI;
  if (!MONGO_URI) {
    throw new Error("Missing MONGO_URI environment variable");
  }

  // Reuse existing connection
  if (cached.conn) {
    return cached.conn;
  }

  // Create new connection
  if (!cached.promise) {
    cached.promise = mongoose
      .connect(MONGO_URI, connectionOptions)
      .then((m) => {
        console.log("[DB] Connected to MongoDB");
        return m;
      });
  }

  cached.conn = await cached.promise;
  return cached.conn;
}
```

### 3.2. Schema Definition

**Vocabulary Model** - Ví dụ về schema

```typescript
// app/models/Vocabulary.ts
import mongoose, { Schema, Document } from "mongoose";

export interface IVocabulary extends Document {
  userId: string;
  word: string;
  type: string;
  meaning: string;
  example: string;
  exampleTranslation: string;
  ipa?: string;
  level: 'beginner' | 'intermediate' | 'advanced';
  source?: string;
  
  // Spaced Repetition System
  easeFactor: number;
  interval: number;
  repetitions: number;
  nextReviewDate: Date;
  
  // Learning Progress
  timesReviewed: number;
  timesCorrect: number;
  timesIncorrect: number;
  isLearned: boolean;
}

const VocabularySchema = new Schema({
  userId: { type: String, required: true, index: true },
  word: { type: String, required: true, trim: true },
  type: { type: String, required: true },
  meaning: { type: String, required: true },
  example: { type: String, required: true },
  exampleTranslation: { type: String, required: true },
  ipa: { type: String },
  level: { 
    type: String, 
    enum: ['beginner', 'intermediate', 'advanced'], 
    default: 'intermediate' 
  },
  source: { type: String },
  
  // SRS fields
  easeFactor: { type: Number, default: 2.5 },
  interval: { type: Number, default: 1 },
  repetitions: { type: Number, default: 0 },
  nextReviewDate: { type: Date, default: Date.now },
  
  // Progress tracking
  timesReviewed: { type: Number, default: 0 },
  timesCorrect: { type: Number, default: 0 },
  timesIncorrect: { type: Number, default: 0 },
  isLearned: { type: Boolean, default: false },
}, {
  timestamps: true
});

// Compound indexes for efficient queries
VocabularySchema.index({ userId: 1, word: 1 }, { unique: true });
VocabularySchema.index({ userId: 1, nextReviewDate: 1 });
VocabularySchema.index({ userId: 1, isLearned: 1 });

export default mongoose.models.Vocabulary || 
  mongoose.model<IVocabulary>("Vocabulary", VocabularySchema);
```

### 3.3. Redis - Caching & Queue

**Upstash Redis** - Serverless Redis

```typescript
// lib/redis-client.ts
import { Redis } from '@upstash/redis';

export class RedisQueueClient {
  private client: Redis;

  constructor() {
    const url = process.env.UPSTASH_REDIS_URL;
    const token = process.env.UPSTASH_REDIS_TOKEN;

    this.client = new Redis({ url, token });
  }

  // Push job to priority queue
  async pushToQueue(job: QueueJob): Promise<void> {
    await this.client.zadd('job_queue', {
      score: job.priority,
      member: JSON.stringify(job),
    });

    // Set initial status
    await this.setJobStatus(job.jobId, {
      status: 'queued',
      progress: 0,
      queuedAt: job.queuedAt,
    });
  }

  // Pop highest priority job
  async popFromQueue(): Promise<QueueJob | null> {
    const result = await this.client.zpopmax('job_queue', 1);
    if (!result || result.length === 0) return null;
    
    const [jobData] = result;
    return JSON.parse(jobData as string) as QueueJob;
  }

  // Cache job status
  async setJobStatus(
    jobId: string,
    status: CachedJobStatus,
    ttl: number = 24 * 60 * 60
  ): Promise<void> {
    await this.client.setex(
      `job:${jobId}:status`,
      ttl,
      JSON.stringify(status)
    );
  }
}
```

**Use cases:**
- Job queue cho xử lý tài liệu bất đồng bộ
- Cache kết quả API để giảm latency
- Session storage
- Rate limiting

---

## 4. CLOUD STORAGE

### 4.1. Cloudflare R2 - Object Storage

**AWS S3-compatible API**

```typescript
// lib/r2-client.ts
import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

export class R2Client {
  private client: S3Client;
  private bucket: string;

  constructor() {
    const accountId = process.env.R2_ACCOUNT_ID;
    const accessKeyId = process.env.R2_ACCESS_KEY_ID;
    const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
    this.bucket = process.env.R2_BUCKET || 'document-uploads';

    this.client = new S3Client({
      region: 'auto',
      endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
      credentials: { accessKeyId, secretAccessKey },
    });
  }

  // Upload file with retry logic
  async uploadFile(
    key: string,
    body: Buffer,
    contentType: string,
    options: { retries?: number } = {}
  ): Promise<string> {
    const retries = options.retries || 3;

    for (let attempt = 0; attempt < retries; attempt++) {
      try {
        // Upload to R2
        await this.client.send(
          new PutObjectCommand({
            Bucket: this.bucket,
            Key: key,
            Body: body,
            ContentType: contentType,
          })
        );

        // Generate signed URL (valid 7 days)
        const signedUrl = await this.getSignedUrl(key, 7 * 24 * 60 * 60);
        return signedUrl;
      } catch (error) {
        if (attempt < retries - 1) {
          // Exponential backoff: 1s, 2s, 4s
          const delay = Math.pow(2, attempt) * 1000;
          await new Promise(resolve => setTimeout(resolve, delay));
        } else {
          throw error;
        }
      }
    }
  }

  // Generate signed URL for secure access
  async getSignedUrl(key: string, expiresIn: number): Promise<string> {
    const command = new GetObjectCommand({
      Bucket: this.bucket,
      Key: key,
    });
    return await getSignedUrl(this.client, command, { expiresIn });
  }
}
```

**Lợi ích:**
- Chi phí thấp hơn AWS S3
- Không giới hạn egress bandwidth
- S3-compatible API
- CDN tích hợp sẵn

---

## 5. TÍCH HỢP AI

### 5.1. Multi-Provider AI System

**Hỗ trợ 3 providers với auto-fallback:**

```typescript
// lib/aiProvider.ts
const OPENAI_MODELS = ["gpt-4o-mini", "gpt-4o", "gpt-3.5-turbo"];
const GROQ_MODELS = ["llama-3.3-70b-versatile", "llama-3.1-8b-instant"];
const COHERE_MODELS = ["command-r-plus-08-2024", "command-r-08-2024"];

interface AIResponse {
  success: boolean;
  content: string;
  provider: "openai" | "groq" | "cohere";
  model: string;
  error?: string;
}

async function callOpenAI(
  prompt: string,
  apiKey: string,
  model: string,
  config: AIConfig
): Promise<AIResponse> {
  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: [{ role: "user", content: prompt }],
        temperature: config.temperature || 0.7,
        max_tokens: config.maxTokens || 1024,
      }),
    });

    if (!response.ok) {
      return { 
        success: false, 
        content: "", 
        provider: "openai", 
        model, 
        error: `HTTP_${response.status}` 
      };
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || "";
    
    return { success: true, content, provider: "openai", model };
  } catch (err) {
    return { 
      success: false, 
      content: "", 
      provider: "openai", 
      model, 
      error: String(err) 
    };
  }
}

// Main function with auto-fallback
export async function callAI(
  prompt: string,
  keys: AIKeys,
  config: AIConfig = {}
): Promise<AIResponse> {
  // Try Groq first (fastest, free)
  if (keys.groqKey) {
    for (const model of GROQ_MODELS) {
      const result = await callGroq(prompt, keys.groqKey, model, config);
      if (result.success) return result;
    }
  }

  // Fallback to OpenAI
  if (keys.openaiKey) {
    for (const model of OPENAI_MODELS) {
      const result = await callOpenAI(prompt, keys.openaiKey, model, config);
      if (result.success) return result;
    }
  }

  // Fallback to Cohere
  if (keys.cohereKey) {
    for (const model of COHERE_MODELS) {
      const result = await callCohere(prompt, keys.cohereKey, model, config);
      if (result.success) return result;
    }
  }

  return {
    success: false,
    content: "",
    provider: "openai",
    model: "none",
    error: "NO_AVAILABLE_PROVIDER"
  };
}
```

**Ưu điểm:**
- Tự động fallback khi một provider fail
- Hỗ trợ nhiều models
- Groq ưu tiên (nhanh, miễn phí)
- Dễ mở rộng thêm providers

---

## 6. KIẾN TRÚC TỔNG THỂ

### 6.1. Luồng Xử Lý Tài Liệu

```
┌─────────────┐
│   Browser   │
│  (Frontend) │
└──────┬──────┘
       │ 1. Upload file
       ▼
┌─────────────────┐
│   Next.js API   │
│   Route Handler │
└──────┬──────────┘
       │ 2. Forward to Python API
       ▼
┌──────────────────┐
│   FastAPI        │
│   Python Backend │
└──────┬───────────┘
       │ 3. Process document
       ├─► Parse PDF/DOCX
       ├─► Extract text
       ├─► NLP analysis (spaCy)
       ├─► Generate embeddings
       ├─► K-Means clustering
       └─► Rank vocabulary
       │
       │ 4. Save to R2
       ▼
┌──────────────────┐
│  Cloudflare R2   │
│  Object Storage  │
└──────────────────┘
       │
       │ 5. Save metadata
       ▼
┌──────────────────┐
│    MongoDB       │
│    Database      │
└──────────────────┘
       │
       │ 6. Return results
       ▼
┌─────────────┐
│   Browser   │
│  (Display)  │
└─────────────┘
```

### 6.2. Async Queue Architecture

```
┌─────────────┐
│   Client    │
└──────┬──────┘
       │ 1. Submit job
       ▼
┌──────────────────┐
│  Next.js API     │
│  /api/async-     │
│   upload         │
└──────┬───────────┘
       │ 2. Create job
       │    Generate UUID
       │    Upload to R2
       ▼
┌──────────────────┐
│  Upstash Redis   │
│  Priority Queue  │
└──────┬───────────┘
       │ 3. Worker polls
       ▼
┌──────────────────┐
│  Background      │
│  Worker          │
│  (Vercel Cron)   │
└──────┬───────────┘
       │ 4. Process job
       │    Download from R2
       │    Call Python API
       │    Save results
       ▼
┌──────────────────┐
│    MongoDB       │
│    Database      │
└──────────────────┘
       │
       │ 5. Poll status
       ▼
┌─────────────┐
│   Client    │
│  (Display)  │
└─────────────┘
```

### 6.3. Voice Chat Flow

```
┌─────────────┐
│   Browser   │
│  Web Speech │
│  API        │
└──────┬──────┘
       │ 1. Voice input
       │    (Speech Recognition)
       ▼
┌──────────────────┐
│  VoiceChat       │
│  Component       │
└──────┬───────────┘
       │ 2. Send text
       ▼
┌──────────────────┐
│  Next.js API     │
│  /api/voice-     │
│   chat-enhanced  │
└──────┬───────────┘
       │ 3. Call AI
       ▼
┌──────────────────┐
│  AI Provider     │
│  (Groq/OpenAI/   │
│   Cohere)        │
└──────┬───────────┘
       │ 4. Parse response
       │    Extract vocabulary
       │    Extract structures
       ▼
┌──────────────────┐
│    MongoDB       │
│    Save vocab    │
└──────────────────┘
       │
       │ 5. Return response
       ▼
┌─────────────┐
│   Browser   │
│  Text-to-   │
│  Speech     │
└─────────────┘
```

---

## 7. DEPLOYMENT

### 7.1. Frontend - Vercel

```bash
# Vercel deployment
vercel --prod

# Environment variables
MONGO_URI=mongodb+srv://...
NEXT_PUBLIC_API_URL=https://...railway.app
UPSTASH_REDIS_URL=https://...
R2_ACCOUNT_ID=...
```

### 7.2. Backend - Railway

```bash
# Railway deployment
railway up

# nixpacks.toml
[phases.setup]
nixPkgs = ["python310", "gcc"]

[phases.install]
cmds = ["pip install -r requirements-railway.txt"]

[start]
cmd = "uvicorn main:app --host 0.0.0.0 --port $PORT"
```

### 7.3. Database - MongoDB Atlas

```
Cluster: M0 (Free tier)
Region: AWS us-east-1
Connection: mongodb+srv://...
```

### 7.4. Cache - Upstash Redis

```
Type: Serverless Redis
Region: Global
Pricing: Pay-as-you-go
```

### 7.5. Storage - Cloudflare R2

```
Bucket: document-uploads
Region: Auto
Pricing: $0.015/GB/month
```

---

## 8. BIẾN MÔI TRƯỜNG

### 8.1. Frontend (.env)

```bash
# Database
MONGO_URI=mongodb+srv://username:password@cluster.mongodb.net/viettalk
MONGO_DB=viettalk

# Backend API
NEXT_PUBLIC_API_URL=https://voichat1012-production.up.railway.app

# Redis Cache
UPSTASH_REDIS_URL=https://...upstash.io
UPSTASH_REDIS_TOKEN=...

# R2 Storage
R2_ACCOUNT_ID=...
R2_ACCESS_KEY_ID=...
R2_SECRET_ACCESS_KEY=...
R2_BUCKET=document-uploads

# NextAuth
NEXTAUTH_SECRET=...
NEXTAUTH_URL=https://voichat1012.vercel.app
```

### 8.2. Backend (Railway)

```bash
# Python API
PORT=8000

# AI Providers (optional - users provide their own)
OPENAI_API_KEY=sk-...
GROQ_API_KEY=gsk_...
COHERE_API_KEY=...
```

---

## 9. API ENDPOINTS

### 9.1. Frontend API Routes

```
POST /api/vocabulary          - Lưu từ vựng
GET  /api/vocabulary          - Lấy danh sách từ vựng
DELETE /api/vocabulary?id=... - Xóa từ vựng

POST /api/voice-chat-enhanced - Voice chat với AI
POST /api/async-upload        - Upload tài liệu bất đồng bộ
GET  /api/task-status?jobId=  - Kiểm tra trạng thái job

POST /api/auth/login          - Đăng nhập
POST /api/auth/register       - Đăng ký
```

### 9.2. Backend API Routes

```
POST /api/upload-document-complete  - Xử lý tài liệu
POST /api/ablation-study            - Ablation study
POST /api/extract-vocabulary        - Trích xuất từ vựng
GET  /health                        - Health check
```

---

## 10. PERFORMANCE & OPTIMIZATION

### 10.1. Caching Strategy

```typescript
// Redis caching
const cacheKey = `vocab:${userId}:${documentId}`;
const cached = await redis.get(cacheKey);

if (cached) {
  return JSON.parse(cached);
}

const result = await processDocument(document);
await redis.setex(cacheKey, 3600, JSON.stringify(result)); // 1 hour TTL
return result;
```

### 10.2. Connection Pooling

```typescript
// MongoDB connection pool
const connectionOptions = {
  maxPoolSize: 10,
  minPoolSize: 2,
  serverSelectionTimeoutMS: 5000,
  socketTimeoutMS: 45000,
};
```

### 10.3. Lazy Loading

```python
# Python - lazy load heavy models
class PhraseCentricExtractor:
    def __init__(self):
        self._nlp = None
        self._embedder = None
    
    @property
    def nlp(self):
        if self._nlp is None:
            self._nlp = spacy.load("en_core_web_sm")
        return self._nlp
```

---

## 11. SECURITY

### 11.1. Authentication

- JWT tokens với NextAuth.js
- Bcrypt password hashing
- Session-based authentication

### 11.2. API Security

- CORS configuration
- Rate limiting (Redis)
- Input validation (Pydantic)
- SQL injection prevention (Mongoose ODM)

### 11.3. File Upload Security

- File type validation
- Size limits (50MB)
- Virus scanning (planned)
- Signed URLs với expiration

---

## 12. MONITORING & LOGGING

### 12.1. Logging

```python
# Python backend
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

logger.info(f"Processing document: {filename}")
logger.error(f"Failed to process: {error}")
```

```typescript
// Frontend
console.log("📚 Loaded vocabulary:", data.length, "items");
console.error("❌ Save vocabulary error:", err);
```

### 12.2. Error Tracking

- Vercel Analytics
- Railway logs
- MongoDB slow query logs

---

## 13. TESTING

### 13.1. Frontend Tests

```typescript
// __tests__/async-upload.test.ts
import { POST } from '@/app/api/async-upload/route';

describe('Async Upload API', () => {
  it('should create job and return jobId', async () => {
    const formData = new FormData();
    formData.append('file', new File(['test'], 'test.pdf'));
    
    const response = await POST(new Request('http://localhost', {
      method: 'POST',
      body: formData
    }));
    
    const data = await response.json();
    expect(data.jobId).toBeDefined();
  });
});
```

### 13.2. Backend Tests

```python
# python-api/test_ablation_api.py
import requests

def test_ablation_study():
    response = requests.post(
        "http://localhost:8000/api/ablation-study",
        json={"text": "This is a test."}
    )
    assert response.status_code == 200
    assert "vocabulary" in response.json()
```

---

## 14. KẾT LUẬN

Hệ thống Visual Language Tutor được xây dựng với kiến trúc hiện đại, scalable và maintainable:

**Điểm mạnh:**
- ✅ Tách biệt frontend/backend rõ ràng
- ✅ Sử dụng công nghệ mới nhất (Next.js 15, React 19)
- ✅ NLP pipeline mạnh mẽ với spaCy, transformers
- ✅ Multi-provider AI với auto-fallback
- ✅ Async processing với queue system
- ✅ Cloud-native với Vercel, Railway, MongoDB Atlas
- ✅ Cost-effective với Cloudflare R2, Upstash Redis

**Công nghệ chính:**
- Frontend: Next.js, React, TypeScript, Tailwind CSS
- Backend: FastAPI, Python, spaCy, transformers
- Database: MongoDB (Mongoose), Redis (Upstash)
- Storage: Cloudflare R2 (S3-compatible)
- AI: OpenAI, Groq, Cohere
- Deployment: Vercel, Railway

**Khả năng mở rộng:**
- Dễ dàng thêm AI providers mới
- Horizontal scaling với serverless
- Microservices architecture ready
- Plugin system cho NLP pipeline
