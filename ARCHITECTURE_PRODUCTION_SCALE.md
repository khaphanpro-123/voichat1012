# 🏗️ ARCHITECTURE CHO PRODUCTION SCALE

## 📊 YÊU CẦU HỆ THỐNG

**Scale:**
- Nhiều users (1,000 - 100,000+ users)
- Mỗi user có nhiều documents (10-1,000 documents)
- Documents lớn (1MB - 50MB, 1,000 - 100,000 words)
- Concurrent uploads (10-100 users cùng lúc)

**Challenges:**
- ❌ Timeout (documents lớn xử lý lâu > 60s)
- ❌ Rate limit (quá nhiều logs)
- ❌ Memory (nhiều documents cùng lúc)
- ❌ Cost (Railway/Vercel có giới hạn)

---

## 🎯 GIẢI PHÁP KHUYẾN NGHỊ: ASYNC QUEUE ARCHITECTURE

### Architecture Overview

```
┌─────────────┐
│   Browser   │
│  (Upload)   │
└──────┬──────┘
       │ 1. Upload file
       ↓
┌─────────────────────────────────────────────────────┐
│              Vercel (Frontend + API)                │
│  ┌──────────────────────────────────────────────┐  │
│  │  /api/upload-document-async                  │  │
│  │  - Validate file                             │  │
│  │  - Upload to S3/Cloudflare R2                │  │
│  │  - Create job in MongoDB                     │  │
│  │  - Push to Redis queue                       │  │
│  │  - Return job_id immediately                 │  │
│  └──────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────┘
       │
       │ 2. Push to queue
       ↓
┌─────────────────────────────────────────────────────┐
│              Redis Queue (Upstash)                  │
│  ┌──────────────────────────────────────────────┐  │
│  │  Queue: document_processing                  │  │
│  │  - job_id                                    │  │
│  │  - user_id                                   │  │
│  │  - file_url (S3)                             │  │
│  │  - priority                                  │  │
│  └──────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────┘
       │
       │ 3. Worker pulls job
       ↓
┌─────────────────────────────────────────────────────┐
│         Railway Worker (Python)                     │
│  ┌──────────────────────────────────────────────┐  │
│  │  Worker Process (Celery/RQ)                  │  │
│  │  - Pull job from queue                       │  │
│  │  - Download file from S3                     │  │
│  │  - Process document (no timeout!)            │  │
│  │  - Save results to MongoDB                   │  │
│  │  - Update job status                         │  │
│  │  - Send webhook/notification                 │  │
│  └──────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────┘
       │
       │ 4. Poll status
       ↓
┌─────────────────────────────────────────────────────┐
│              Frontend (Polling)                     │
│  ┌──────────────────────────────────────────────┐  │
│  │  GET /api/job-status/{job_id}                │  │
│  │  - Poll every 2 seconds                      │  │
│  │  - Show progress bar                         │  │
│  │  - Display results when done                 │  │
│  └──────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────┘
```

---

## 🔧 IMPLEMENTATION CHI TIẾT

### 1. File Storage (S3/Cloudflare R2)

**Tại sao cần:**
- Vercel có giới hạn request size (4.5MB)
- Railway có giới hạn memory
- Cần lưu file để retry nếu fail

**Chọn service:**

| Service | Free Tier | Pricing | Khuyến nghị |
|---------|-----------|---------|-------------|
| AWS S3 | 5GB | $0.023/GB | ✅ Standard |
| Cloudflare R2 | 10GB | $0.015/GB | ✅✅ Rẻ hơn |
| Vercel Blob | 500MB | $0.15/GB | ⚠️ Đắt |

**Implementation:**

```typescript
// lib/storage.ts
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3"

const s3 = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
})

export async function uploadFile(
  file: File,
  userId: string
): Promise<string> {
  const key = `documents/${userId}/${Date.now()}-${file.name}`
  
  await s3.send(new PutObjectCommand({
    Bucket: process.env.S3_BUCKET!,
    Key: key,
    Body: Buffer.from(await file.arrayBuffer()),
    ContentType: file.type,
  }))
  
  return `https://${process.env.S3_BUCKET}.s3.amazonaws.com/${key}`
}
```

---

### 2. Queue System (Redis/Upstash)

**Tại sao cần:**
- Decouple upload và processing
- Handle concurrent requests
- Retry mechanism
- Priority queue

**Chọn service:**

| Service | Free Tier | Pricing | Khuyến nghị |
|---------|-----------|---------|-------------|
| Upstash Redis | 10,000 commands/day | $0.2/100K | ✅✅ Serverless |
| Redis Cloud | 30MB | $0.026/GB | ✅ Standard |
| Railway Redis | $5/month | $5/month | ⚠️ Không có free |

**Implementation:**

```typescript
// lib/queue.ts
import { Redis } from "@upstash/redis"

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_URL!,
  token: process.env.UPSTASH_REDIS_TOKEN!,
})

export async function enqueueJob(job: {
  jobId: string
  userId: string
  fileUrl: string
  fileName: string
  priority?: number
}) {
  // Push to queue
  await redis.lpush("document_queue", JSON.stringify(job))
  
  // Set job status
  await redis.hset(`job:${job.jobId}`, {
    status: "queued",
    createdAt: Date.now(),
  })
  
  return job.jobId
}

export async function getJobStatus(jobId: string) {
  return await redis.hgetall(`job:${jobId}`)
}
```

---

### 3. API Routes (Vercel)

**Upload API:**

```typescript
// app/api/upload-document-async/route.ts
import { NextRequest, NextResponse } from "next/server"
import { uploadFile } from "@/lib/storage"
import { enqueueJob } from "@/lib/queue"
import { v4 as uuidv4 } from "uuid"

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get("file") as File
    const userId = formData.get("userId") as string
    
    // Validate file
    if (!file || file.size > 50 * 1024 * 1024) {
      return NextResponse.json(
        { error: "File too large (max 50MB)" },
        { status: 400 }
      )
    }
    
    // Upload to S3
    const fileUrl = await uploadFile(file, userId)
    
    // Create job
    const jobId = uuidv4()
    await enqueueJob({
      jobId,
      userId,
      fileUrl,
      fileName: file.name,
    })
    
    // Return immediately
    return NextResponse.json({
      jobId,
      status: "queued",
      message: "Document queued for processing",
    })
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    )
  }
}
```

**Status API:**

```typescript
// app/api/job-status/[jobId]/route.ts
import { NextRequest, NextResponse } from "next/server"
import { getJobStatus } from "@/lib/queue"

export async function GET(
  request: NextRequest,
  { params }: { params: { jobId: string } }
) {
  const status = await getJobStatus(params.jobId)
  
  if (!status) {
    return NextResponse.json(
      { error: "Job not found" },
      { status: 404 }
    )
  }
  
  return NextResponse.json(status)
}
```

---

### 4. Worker (Railway Python)

**Worker Process:**

```python
# worker.py
import redis
import json
import requests
from complete_pipeline_12_stages import CompletePipeline12Stages

# Connect to Redis
redis_client = redis.from_url(os.getenv("UPSTASH_REDIS_URL"))

# Initialize pipeline
pipeline = CompletePipeline12Stages()

def process_job(job_data):
    job_id = job_data["jobId"]
    file_url = job_data["fileUrl"]
    
    try:
        # Update status: processing
        redis_client.hset(f"job:{job_id}", "status", "processing")
        redis_client.hset(f"job:{job_id}", "progress", "0")
        
        # Download file from S3
        response = requests.get(file_url)
        text = extract_text_from_pdf(response.content)
        
        # Update progress
        redis_client.hset(f"job:{job_id}", "progress", "20")
        
        # Process document (no timeout!)
        result = pipeline.process_document(
            text=text,
            document_id=job_id,
            document_title=job_data["fileName"],
            max_phrases=40,
            generate_flashcards=True
        )
        
        # Update progress
        redis_client.hset(f"job:{job_id}", "progress", "90")
        
        # Save to MongoDB
        save_to_mongodb(result)
        
        # Update status: completed
        redis_client.hset(f"job:{job_id}", "status", "completed")
        redis_client.hset(f"job:{job_id}", "progress", "100")
        redis_client.hset(f"job:{job_id}", "result", json.dumps(result))
        
    except Exception as e:
        # Update status: failed
        redis_client.hset(f"job:{job_id}", "status", "failed")
        redis_client.hset(f"job:{job_id}", "error", str(e))

# Main worker loop
while True:
    # Block and wait for job (BRPOP)
    job = redis_client.brpop("document_queue", timeout=5)
    
    if job:
        job_data = json.loads(job[1])
        process_job(job_data)
```

**Dockerfile:**

```dockerfile
# Dockerfile
FROM python:3.10-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install -r requirements.txt

COPY . .

CMD ["python", "worker.py"]
```

---

### 5. Frontend (Polling)

```typescript
// app/dashboard-new/documents-async/page.tsx
'use client'

import { useState } from 'react'

export default function DocumentsAsyncPage() {
  const [jobId, setJobId] = useState<string | null>(null)
  const [status, setStatus] = useState<any>(null)
  
  const handleUpload = async (file: File) => {
    const formData = new FormData()
    formData.append("file", file)
    formData.append("userId", "user123")
    
    // Upload and get job ID
    const { jobId } = await fetch("/api/upload-document-async", {
      method: "POST",
      body: formData,
    }).then(r => r.json())
    
    setJobId(jobId)
    
    // Start polling
    const interval = setInterval(async () => {
      const status = await fetch(`/api/job-status/${jobId}`)
        .then(r => r.json())
      
      setStatus(status)
      
      if (status.status === "completed" || status.status === "failed") {
        clearInterval(interval)
      }
    }, 2000)  // Poll every 2 seconds
  }
  
  return (
    <div>
      <input type="file" onChange={(e) => {
        if (e.target.files?.[0]) {
          handleUpload(e.target.files[0])
        }
      }} />
      
      {status && (
        <div>
          <p>Status: {status.status}</p>
          <p>Progress: {status.progress}%</p>
          
          {status.status === "completed" && (
            <div>
              {/* Display flashcards */}
              {JSON.parse(status.result).flashcards.map(card => (
                <div key={card.id}>{card.word}</div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
```

---

## 💰 CHI PHÍ ƯỚC TÍNH

### Scenario: 10,000 users, 10 documents/user/month

**Storage (Cloudflare R2):**
- 10,000 users × 10 docs × 5MB = 500GB
- Cost: 500GB × $0.015 = $7.5/month

**Queue (Upstash Redis):**
- 10,000 users × 10 docs × 100 commands = 10M commands
- Cost: 10M / 100K × $0.2 = $20/month

**Worker (Railway):**
- 1 worker instance: $5/month
- 2 workers (for redundancy): $10/month

**Database (MongoDB Atlas):**
- M10 cluster (2GB RAM): $57/month

**Total: ~$95/month**

---

## 📊 SO SÁNH VỚI GIẢI PHÁP KHÁC

| Giải pháp | Chi phí | Scalability | Complexity | Khuyến nghị |
|-----------|---------|-------------|------------|-------------|
| Sync (hiện tại) | $0 | ⭐ | ⭐ | ❌ Không scale |
| Async Queue | $95/month | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ | ✅✅✅ Production |
| Serverless (AWS Lambda) | $50/month | ⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ✅✅ Alternative |
| Batch Processing | $20/month | ⭐⭐⭐ | ⭐⭐ | ⚠️ Limited |

---

## 🚀 ROADMAP IMPLEMENTATION

### Phase 1: MVP (1 tuần)

**Mục tiêu:** Async processing cơ bản

1. Setup Upstash Redis (1 giờ)
2. Setup Cloudflare R2 (1 giờ)
3. Implement upload API (2 giờ)
4. Implement worker (4 giờ)
5. Implement polling frontend (2 giờ)
6. Testing (4 giờ)

**Total: ~14 giờ (1 tuần part-time)**

---

### Phase 2: Production (2 tuần)

**Mục tiêu:** Production-ready với monitoring

1. Add retry mechanism (2 giờ)
2. Add priority queue (2 giờ)
3. Add progress tracking (2 giờ)
4. Add webhook notifications (2 giờ)
5. Add monitoring (Sentry) (2 giờ)
6. Add logging (Datadog) (2 giờ)
7. Load testing (4 giờ)

**Total: ~16 giờ (2 tuần part-time)**

---

### Phase 3: Scale (1 tháng)

**Mục tiêu:** Scale to 100K+ users

1. Multiple workers (auto-scaling)
2. CDN for file delivery
3. Database sharding
4. Caching layer (Redis)
5. Rate limiting per user
6. Admin dashboard

---

## 📋 CHECKLIST IMPLEMENTATION

### Setup Infrastructure

- [ ] Create Cloudflare R2 bucket
- [ ] Create Upstash Redis instance
- [ ] Setup environment variables
- [ ] Test S3 upload
- [ ] Test Redis connection

### Backend Implementation

- [ ] Implement upload API
- [ ] Implement status API
- [ ] Implement worker process
- [ ] Add error handling
- [ ] Add retry logic

### Frontend Implementation

- [ ] Update upload UI
- [ ] Implement polling
- [ ] Add progress bar
- [ ] Handle errors
- [ ] Display results

### Testing

- [ ] Test with small file (1MB)
- [ ] Test with large file (50MB)
- [ ] Test concurrent uploads (10 users)
- [ ] Test error scenarios
- [ ] Load testing (100 users)

---

## 💡 KẾT LUẬN

**Cho hệ thống nhiều users, nhiều documents lớn:**

✅ **KHUYẾN NGHỊ: Async Queue Architecture**

**Lý do:**
- Không bị timeout (xử lý bao lâu cũng được)
- Scalable (thêm workers khi cần)
- Better UX (progress bar, không block)
- Production-grade
- Chi phí hợp lý (~$95/month cho 10K users)

**Không khuyến nghị:**
- ❌ Sync processing (timeout, không scale)
- ❌ Batch processing (không real-time)
- ❌ Serverless only (cold start, timeout)

**Next steps:**
1. Setup infrastructure (Upstash + R2)
2. Implement Phase 1 MVP (1 tuần)
3. Test với real users
4. Scale up khi cần
