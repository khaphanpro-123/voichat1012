# EnglishPal - Phân Tích Kiến Trúc Hệ Thống (Phần 2: Backend)

## 🔧 Backend Architecture

### Backend Stack
- **Framework**: Next.js API Routes (Node.js/TypeScript)
- **Secondary Backend**: Python FastAPI (Railway)
- **Database**: MongoDB Atlas
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

**Request**:
```json
{
  "messages": [
    {"role": "user", "content": "Explain this grammar rule"},
    {"role": "assistant", "content": "..."}
  ]
}
```

**Response**: Streaming text via SSE
```
data: {"choices":[{"delta":{"content":"The"}}]}
data: {"choices":[{"delta":{"content":" grammar"}}]}
data: [DONE]
```

**2. /api/vocabulary** (app/api/vocabulary/route.ts)
- **Methods**: GET, POST, DELETE
- **Purpose**: CRUD operations for vocabulary
- **Features**:
  - Save words from documents
  - Filter by source (document, voice_chat, manual)
  - Pagination support

**GET Request**:
```
GET /api/vocabulary?limit=1000&source=document
```

**POST Request**:
```json
{
  "word": "resource",
  "meaning": "a supply of something",
  "example": "The company invested in renewable resources",
  "type": "noun",
  "level": "intermediate",
  "source": "document"
}
```

**3. /api/translate-vocabulary-full** (app/api/translate-vocabulary-full/route.ts)
- **Method**: POST
- **Purpose**: Translate all vocabulary elements to Vietnamese
- **Features**:
  - Translates meanings, examples, collocations, phrases, synonyms, antonyms
  - Uses Google Generative AI

**Request**:
```json
{
  "word": "resource",
  "meaning": "a supply of something",
  "example": "The company invested in renewable resources",
  "collocations": ["human resource", "natural resource"],
  "phrases": ["a valuable resource", "limited resources"],
  "nounPhrases": ["a natural resource"],
  "sentences": ["The company invested in renewable resources"],
  "synonyms": ["asset", "tool", "means"],
  "antonyms": ["liability", "obstacle"]
}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "meaningVi": "một nguồn cung cấp của cái gì đó",
    "exampleVi": "Công ty đã đầu tư vào các tài nguyên tái tạo",
    "collocationsVi": ["nguồn nhân lực", "tài nguyên thiên nhiên"],
    "phrasesVi": ["một tài nguyên quý giá", "tài nguyên hạn chế"],
    "nounPhrasesVi": ["một tài nguyên thiên nhiên"],
    "sentencesVi": ["Công ty đã đầu tư vào các tài nguyên tái tạo"],
    "synonymsVi": ["tài sản", "công cụ", "phương tiện"],
    "antonymsVi": ["trách nhiệm", "chướng ngại vật"]
  }
}
```

**4. /api/documents** (app/api/documents/route.ts)
- **Methods**: POST, GET
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

**Request**:
```json
{
  "word": "resource",
  "meaning": "a supply of something"
}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "collocations": ["human resource", "natural resource"],
    "phrases": ["a valuable resource", "limited resources"],
    "nounPhrases": ["a natural resource"],
    "sentences": ["The company invested in renewable resources"],
    "synonyms": ["asset", "tool", "means"],
    "antonyms": ["liability", "obstacle"]
  }
}
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
- **Input**: Raw text from documents
- **Output**: Ranked list of important words

**2. Phrase-Centric Extractor** (python-api/phrase_centric_extractor.py)
- **Purpose**: Extract meaningful phrases from documents
- **Algorithm**:
  - Noun phrase detection
  - Collocation extraction
  - Semantic similarity
  - Frequency-based ranking

**3. Word Ranker** (python-api/word_ranker.py)
- **Purpose**: Rank words by importance
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
    ↓
Response → Frontend
```

### Error Handling
```typescript
try {
  // API operation
  const result = await fetch(url);
  if (!result.ok) {
    throw new Error(`API error: ${result.status}`);
  }
  return await result.json();
} catch (error) {
  console.error("Error:", error);
  return Response.json(
    { error: error.message },
    { status: 500 }
  );
}
```

### Authentication in API Routes
```typescript
import { getServerSession } from "next-auth/next";

export async function POST(req: Request) {
  const session = await getServerSession();
  
  if (!session) {
    return Response.json(
      { error: "Unauthorized" },
      { status: 401 }
    );
  }
  
  // Process request with authenticated user
  const userId = session.user.id;
  // ...
}
```

### Database Operations
```typescript
import { connectToDatabase } from "@/lib/mongodb";

export async function GET(req: Request) {
  const { db } = await connectToDatabase();
  
  const words = await db
    .collection("vocabulary")
    .find({ userId: new ObjectId(userId) })
    .toArray();
  
  return Response.json(words);
}
```

### Streaming Responses (AI Chat)
```typescript
export async function POST(req: Request) {
  const { messages } = await req.json();
  
  const stream = new ReadableStream({
    async start(controller) {
      const response = await fetch(aiProviderUrl, {
        method: "POST",
        body: JSON.stringify({ messages })
      });
      
      const reader = response.body.getReader();
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        controller.enqueue(value);
      }
      controller.close();
    }
  });
  
  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache"
    }
  });
}
```

---

**Next**: See ARCHITECTURE_PART3_DATABASE.md for database details
