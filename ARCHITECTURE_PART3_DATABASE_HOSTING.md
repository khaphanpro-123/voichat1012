# EnglishPal - Phân Tích Kiến Trúc Hệ Thống (Phần 3: Database & Hosting)

## 💾 Database Design

### MongoDB Collections

**1. users**
```javascript
{
  _id: ObjectId,
  email: string,
  name: string,
  password: string (hashed with bcryptjs),
  role: "user" | "admin",
  level: "beginner" | "intermediate" | "advanced",
  image?: string,
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
  timesReviewed: number,
  isLearned: boolean,
  source: string,  // "document", "voice_chat", "manual", etc.
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
  status: "pending" | "processing" | "completed",
  wordCount: number
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
      content: string,
      timestamp: Date
    }
  ],
  createdAt: Date,
  updatedAt: Date
}
```

**5. notifications**
```javascript
{
  _id: ObjectId,
  userId: ObjectId,
  title: string,
  message: string,
  type: "info" | "warning" | "success" | "error",
  isRead: boolean,
  createdAt: Date
}
```

### Database Connection (lib/mongodb.ts)
```typescript
import { MongoClient, type Db } from "mongodb";

const options = {
  maxPoolSize: 5,        // M0 free tier limit
  minPoolSize: 1,
  maxIdleTimeMS: 30000,
  serverSelectionTimeoutMS: 5000,
  connectTimeoutMS: 10000,
  socketTimeoutMS: 45000,
};

export async function connectToDatabase(): Promise<{
  client: MongoClient;
  db: Db;
}> {
  const mongoClient = await getClientPromise();
  const db = mongoClient.db(getAppDbName());
  return { client: mongoClient, db };
}
```

### Indexes for Performance
```javascript
// Vocabulary collection
db.vocabulary.createIndex({ userId: 1, word: 1 });
db.vocabulary.createIndex({ userId: 1, source: 1 });
db.vocabulary.createIndex({ userId: 1, type: 1 });

// Chat sessions
db.chat_sessions.createIndex({ userId: 1, createdAt: -1 });

// Notifications
db.notifications.createIndex({ userId: 1, isRead: 1 });
```

---

## 🚀 Hosting & Deployment

### Frontend Hosting (Vercel)
- **URL**: https://voichat1012.vercel.app
- **Build Command**: `npm run build:prod`
- **Deployment**: Auto-deploy from GitHub
- **Environment**: Production
- **Features**:
  - Automatic HTTPS
  - Global CDN
  - Serverless functions
  - Analytics included

**Vercel Environment Variables**:
```
MONGO_URI=mongodb+srv://...
NEXTAUTH_SECRET=...
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
COHERE_API_KEY=...
GOOGLE_API_KEY=...
NEXT_PUBLIC_API_URL=https://voichat1012-production.up.railway.app
```

### Backend Hosting (Railway)
- **URL**: https://voichat1012-production.up.railway.app
- **Language**: Python (FastAPI)
- **Deployment**: Auto-deploy from GitHub (python-api folder)
- **Environment**: Production
- **Features**:
  - Auto-scaling
  - Environment variables
  - Logs & monitoring
  - Database integration

**Railway Configuration** (python-api/nixpacks.toml):
```toml
[build]
cmds = ["pip install -r requirements.txt"]

[start]
cmd = "uvicorn main:app --host 0.0.0.0 --port $PORT"
```

### Database Hosting (MongoDB Atlas)
- **Provider**: MongoDB Atlas (Cloud)
- **Tier**: M0 (Free)
- **Region**: AWS (configurable)
- **Features**:
  - Automatic backups
  - 500 connection limit
  - 512MB storage
  - Monitoring & alerts

**Connection String**:
```
mongodb+srv://username:password@cluster.mongodb.net/database?retryWrites=true&w=majority
```

### Storage (Cloudflare R2)
- **Purpose**: Document storage (async uploads)
- **Bucket**: document-uploads
- **Features**:
  - S3-compatible API
  - No egress fees
  - Global distribution

**Configuration** (lib/r2-client.ts):
```typescript
import { S3Client } from "@aws-sdk/client-s3";

const r2 = new S3Client({
  region: "auto",
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY
  },
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`
});
```

### Cache (Upstash Redis)
- **Purpose**: Session caching, rate limiting
- **Features**:
  - Serverless Redis
  - Global distribution
  - REST API

**Configuration** (lib/redis-client.ts):
```typescript
import { Redis } from "@upstash/redis";

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_URL,
  token: process.env.UPSTASH_REDIS_TOKEN
});
```

### Deployment Architecture
```
GitHub Repository
    ↓
    ├─→ Vercel (Frontend)
    │       ↓
    │   Next.js App
    │       ↓
    │   Serverless Functions
    │
    └─→ Railway (Backend)
            ↓
        Python FastAPI
            ↓
        NLP Processing

Shared Resources:
├─ MongoDB Atlas (Database)
├─ Cloudflare R2 (Storage)
└─ Upstash Redis (Cache)
```

### Deployment Process

**Frontend (Vercel)**:
1. Push to GitHub
2. Vercel detects changes
3. Runs `npm run build:prod`
4. Deploys to CDN
5. Auto-HTTPS enabled

**Backend (Railway)**:
1. Push to GitHub (python-api folder)
2. Railway detects changes
3. Installs dependencies
4. Runs `uvicorn main:app`
5. Auto-scales if needed

### Environment Configuration

**Development** (.env.local):
```env
NEXT_PUBLIC_API_URL=http://localhost:3000
NEXTAUTH_URL=http://localhost:3000
MONGO_URI=mongodb://localhost:27017/englishpal
NODE_ENV=development
```

**Production** (.env.production):
```env
NEXT_PUBLIC_API_URL=https://voichat1012-production.up.railway.app
NEXTAUTH_URL=https://voichat1012.vercel.app
MONGO_URI=mongodb+srv://...
NODE_ENV=production
```

### Monitoring & Logging

**Vercel Analytics**:
- Page load times
- Core Web Vitals
- Error tracking
- Usage analytics

**Railway Logs**:
- Application logs
- Error logs
- Performance metrics
- Rate limiting alerts

**MongoDB Atlas Monitoring**:
- Connection count
- Query performance
- Storage usage
- Backup status

---

## 🔐 Security Measures

### Authentication
- **Method**: NextAuth with JWT
- **Providers**: Email/Password, Google OAuth
- **Session**: Secure HTTP-only cookies
- **Token**: JWT with 30-day expiration

### Authorization
- **Role-based**: User vs Admin
- **Middleware**: Protected API routes
- **Database**: User role stored in MongoDB

### Data Security
- **Passwords**: Hashed with bcryptjs (10 rounds)
- **API Keys**: Environment variables only
- **CORS**: Configured for production domains
- **HTTPS**: Enforced in production

### Rate Limiting
- **Redis**: Upstash Redis for rate limiting
- **Limit**: 100 requests per minute per IP
- **Bypass**: Admin users

### Input Validation
```typescript
import { z } from "zod";

const vocabularySchema = z.object({
  word: z.string().min(1).max(100),
  meaning: z.string().min(1).max(500),
  example: z.string().max(1000).optional(),
  type: z.enum(["noun", "verb", "adjective", "adverb", "other"]),
  level: z.enum(["beginner", "intermediate", "advanced"])
});

const validated = vocabularySchema.parse(data);
```

---

**Next**: See ARCHITECTURE_PART4_ALGORITHMS.md for algorithm details
