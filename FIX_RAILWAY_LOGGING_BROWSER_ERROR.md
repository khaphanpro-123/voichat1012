# Phương Án Giải Quyết: Railway Logging + Browser Error

## 🎯 MỤC TIÊU
1. Giảm logging từ 500+ logs/sec xuống < 100 logs/sec
2. Fix browser error khi load documents page
3. Tối ưu performance và chi phí

---

## ⚠️ VẤN ĐỀ 1: RAILWAY RATE LIMIT (500 logs/sec)

### Nguyên nhân
```python
# Code hiện tại - LOG QUÁ NHIỀU
for phrase in candidate_phrases:
    print(f"     {i}. '{phrase}' (freq: {freq})")  # ❌ 53 logs cho 53 phrases
```

**Tác động:**
- 1 document = 53+ log messages
- 10 concurrent requests = 530+ logs/sec → **VỰT QUÁ GIỚI HẠN**
- Railway drop 379 messages → mất thông tin debug

### Giải pháp: 3-TIER LOGGING STRATEGY

#### **Tier 1: Production Logging (Mặc định)**
```python
import os
import logging

# Cấu hình logging level từ environment
LOG_LEVEL = os.getenv('LOG_LEVEL', 'INFO')  # INFO cho production
logging.basicConfig(level=LOG_LEVEL)
logger = logging.getLogger(__name__)

class PhraseCentricExtractor:
    def __init__(self):
        self.debug_mode = os.getenv('DEBUG_MODE', 'false').lower() == 'true'
    
    def extract_phrases(self, text):
        # ✅ CHỈ LOG SUMMARY, KHÔNG LOG TỪNG PHRASE
        logger.info(f"[STAGE 4] Phrase Extraction started")
        
        candidates = self._extract_candidates(text)
        
        # ✅ LOG SUMMARY ONLY
        logger.info(f"  ✓ Extracted {len(candidates)} candidate phrases")
        
        # ✅ CHỈ LOG DETAIL KHI DEBUG MODE
        if self.debug_mode:
            logger.debug(f"📋 Candidate phrases: {candidates[:10]}...")  # Chỉ 10 đầu
        
        filtered = self._filter_phrases(candidates)
        logger.info(f"  ✓ Filtered to {len(filtered)} phrases")
        
        return filtered
```

#### **Tier 2: Structured Logging (Thay vì print)**
```python
# ❌ TRƯỚC: Print từng phrase
for i, phrase in enumerate(phrases):
    print(f"     {i}. '{phrase}' (freq: {freq})")

# ✅ SAU: Log structured data 1 lần
logger.info(f"Phrase extraction complete", extra={
    'total_phrases': len(phrases),
    'top_phrases': phrases[:5],  # Chỉ top 5
    'document_id': doc_id
})
```

#### **Tier 3: Batch Logging**
```python
# ✅ BATCH LOG - Gom nhiều thông tin vào 1 log
def log_pipeline_summary(self, stages_data):
    summary = {
        'stage_1': {'sentences': stages_data['sentences']},
        'stage_2': {'headings': stages_data['headings']},
        'stage_3': {'context_sentences': stages_data['context']},
        'stage_4': {'phrases': len(stages_data['phrases'])},
        'total_time': stages_data['time']
    }
    logger.info(f"Pipeline complete: {summary}")
```

---

## ⚠️ VẤN ĐỀ 2: BROWSER ERROR (Minified React #31)

### Nguyên nhân
Error #31 = "Element type is invalid" - Component không render được

**Có thể do:**
1. Data từ API không đúng format
2. Component import sai
3. Hydration mismatch
4. State update trong render

### Giải pháp: DEBUG + FIX COMPONENT

#### **Bước 1: Xem chi tiết error**
```typescript
// Thêm error boundary vào documents-simple/page.tsx
'use client';

import { Component, ReactNode } from 'react';

class ErrorBoundary extends Component<
  { children: ReactNode },
  { hasError: boolean; error: Error | null }
> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: any) {
    console.error('❌ Document page error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="p-4 bg-red-50 border border-red-200 rounded">
          <h2 className="text-red-800 font-bold">Something went wrong</h2>
          <pre className="text-sm mt-2">{this.state.error?.message}</pre>
          <button 
            onClick={() => this.setState({ hasError: false, error: null })}
            className="mt-4 px-4 py-2 bg-red-600 text-white rounded"
          >
            Try again
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

export default function DocumentsPage() {
  return (
    <ErrorBoundary>
      {/* Your existing page content */}
    </ErrorBoundary>
  );
}
```

#### **Bước 2: Validate API Response**
```typescript
// Thêm validation cho API response
async function fetchDocuments() {
  try {
    const response = await fetch('/api/documents');
    const data = await response.json();
    
    // ✅ VALIDATE DATA STRUCTURE
    if (!data || !Array.isArray(data.documents)) {
      console.error('❌ Invalid API response:', data);
      return { documents: [], error: 'Invalid data format' };
    }
    
    // ✅ VALIDATE EACH DOCUMENT
    const validDocuments = data.documents.filter(doc => {
      const isValid = doc.id && doc.title && doc.content;
      if (!isValid) {
        console.warn('⚠️ Invalid document:', doc);
      }
      return isValid;
    });
    
    return { documents: validDocuments, error: null };
  } catch (error) {
    console.error('❌ Fetch error:', error);
    return { documents: [], error: error.message };
  }
}
```

#### **Bước 3: Safe Component Rendering**
```typescript
// Render an toàn với fallback
function DocumentList({ documents }: { documents: any[] }) {
  // ✅ EARLY RETURN nếu không có data
  if (!documents || documents.length === 0) {
    return <div>No documents found</div>;
  }
  
  return (
    <div>
      {documents.map((doc, index) => {
        // ✅ VALIDATE từng document trước khi render
        if (!doc || !doc.id) {
          console.warn(`⚠️ Skipping invalid document at index ${index}`);
          return null;
        }
        
        return (
          <div key={doc.id}>
            <h3>{doc.title || 'Untitled'}</h3>
            <p>{doc.content || 'No content'}</p>
          </div>
        );
      })}
    </div>
  );
}
```

---

## 🔧 IMPLEMENTATION PLAN

### Phase 1: Fix Logging (URGENT - 30 phút)

1. **Tạo logging utility**
```python
# python-api/utils/logger.py
import os
import logging
from typing import Dict, Any

LOG_LEVEL = os.getenv('LOG_LEVEL', 'INFO')
DEBUG_MODE = os.getenv('DEBUG_MODE', 'false').lower() == 'true'

logging.basicConfig(
    level=LOG_LEVEL,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)

def get_logger(name: str):
    return logging.getLogger(name)

def log_summary(logger, stage: str, data: Dict[str, Any]):
    """Log summary only, not details"""
    logger.info(f"[{stage}] {data}")

def log_debug(logger, message: str, data: Any = None):
    """Log debug info only if DEBUG_MODE=true"""
    if DEBUG_MODE and data:
        logger.debug(f"{message}: {data}")
    elif DEBUG_MODE:
        logger.debug(message)
```

2. **Update phrase_centric_extractor.py**
```python
from utils.logger import get_logger, log_summary, log_debug

logger = get_logger(__name__)

class PhraseCentricExtractor:
    def extract_phrases(self, sentences):
        # ❌ XÓA: 53 dòng log chi tiết
        # for phrase in candidates:
        #     print(f"     {i}. '{phrase}'")
        
        # ✅ THÊM: 1 dòng log summary
        log_summary(logger, "STAGE 4", {
            'total_candidates': len(candidates),
            'after_filter': len(filtered),
            'top_5': filtered[:5]
        })
        
        # ✅ CHỈ LOG DETAIL KHI DEBUG
        log_debug(logger, "All candidates", candidates)
```

3. **Update complete_pipeline_12_stages.py**
```python
from utils.logger import get_logger, log_summary

logger = get_logger(__name__)

class CompletePipeline:
    def process(self, text):
        # ❌ XÓA: Nhiều print statements
        # ✅ THÊM: Batch logging
        
        results = {}
        start_time = time.time()
        
        # Stage 1
        sentences = self.extract_sentences(text)
        results['stage_1'] = len(sentences)
        
        # Stage 2
        headings = self.detect_headings(sentences)
        results['stage_2'] = len(headings)
        
        # ... other stages
        
        # ✅ LOG 1 LẦN DUY NHẤT
        results['total_time'] = time.time() - start_time
        log_summary(logger, "PIPELINE_COMPLETE", results)
```

4. **Set environment variables**
```bash
# Railway environment variables
LOG_LEVEL=INFO          # INFO cho production, DEBUG cho development
DEBUG_MODE=false        # true chỉ khi cần debug
```

### Phase 2: Fix Browser Error (1 giờ)

1. **Add error boundary** (code ở trên)
2. **Add API validation** (code ở trên)
3. **Test locally**
```bash
npm run dev
# Mở browser console và kiểm tra error chi tiết
```

4. **Deploy và monitor**

---

## 📊 KẾT QUẢ MONG ĐỢI

### Trước khi fix:
- ❌ 500+ logs/sec → Railway rate limit
- ❌ 379 messages dropped
- ❌ Browser crash với minified error
- ❌ Không debug được vì mất logs

### Sau khi fix:
- ✅ < 50 logs/sec (giảm 90%)
- ✅ Không drop messages
- ✅ Browser hiển thị error rõ ràng
- ✅ Debug dễ dàng với DEBUG_MODE

---

## 🚀 TRIỂN KHAI NGAY

### Bước 1: Fix Logging (5 phút)
```bash
cd python-api
# Tạo utils/logger.py
# Update phrase_centric_extractor.py
# Update complete_pipeline_12_stages.py
```

### Bước 2: Deploy
```bash
git add .
git commit -m "fix: reduce logging rate and add error boundary"
git push origin main
```

### Bước 3: Set Railway Environment
```
LOG_LEVEL=INFO
DEBUG_MODE=false
```

### Bước 4: Monitor
- Kiểm tra Railway logs → should be < 100 logs/sec
- Kiểm tra browser → should show clear error or work

---

## 💡 BEST PRACTICES ĐI FORWARD

1. **Logging Strategy:**
   - Production: INFO level, summary only
   - Development: DEBUG level, full details
   - Never log in loops (batch instead)

2. **Error Handling:**
   - Always use Error Boundaries
   - Validate API responses
   - Provide fallback UI

3. **Monitoring:**
   - Track log rate in Railway
   - Set up alerts for rate limit
   - Monitor browser errors in Sentry/LogRocket

4. **Cost Optimization:**
   - Reduce logs = reduce Railway costs
   - Use structured logging for better analysis
   - Enable debug mode only when needed
