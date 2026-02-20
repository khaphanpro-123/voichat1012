# Fix Railway Logging - Các Bước Thực Hiện Ngay

## 🎯 MỤC TIÊU
Giảm logging từ 500+ logs/sec xuống < 50 logs/sec trong 10 phút

## ✅ ĐÃ TẠO
- `python-api/utils/logger.py` - Logging utility mới

## 🔧 CÁC BƯỚC THỰC HIỆN

### Bước 1: Update phrase_centric_extractor.py (3 phút)

Thêm vào đầu file:
```python
from utils.logger import get_logger, log_summary, log_debug

logger = get_logger(__name__)
```

Tìm và thay thế các đoạn code sau:

#### Thay thế 1: Debug candidate phrases
```python
# ❌ XÓA (dòng ~200-250):
print("📋 DEBUG - ALL CANDIDATE PHRASES (53 total):")
for i, (phrase, freq) in enumerate(candidate_phrases.items(), 1):
    print(f"     {i}. '{phrase}' (freq: {freq})")

# ✅ THAY BẰNG:
log_summary(logger, "CANDIDATE_PHRASES", {
    'total': len(candidate_phrases),
    'top_10': list(candidate_phrases.items())[:10]
})
log_debug(logger, "All candidates", candidate_phrases)
```

#### Thay thế 2: Debug filtered phrases
```python
# ❌ XÓA:
print("📋 DEBUG - ALL PHRASES AFTER HARD FILTER (39 total):")
for i, (phrase, freq) in enumerate(filtered_phrases.items(), 1):
    print(f"     {i}. '{phrase}' (freq: {freq})")

# ✅ THAY BẰNG:
log_summary(logger, "FILTERED_PHRASES", {
    'total': len(filtered_phrases),
    'top_10': list(filtered_phrases.items())[:10]
})
```

### Bước 2: Update complete_pipeline_12_stages.py (3 phút)

Thêm vào đầu file:
```python
from utils.logger import get_logger, log_stage_start, log_stage_complete

logger = get_logger(__name__)
```

Thay thế các print statements:

```python
# ❌ XÓA tất cả các dòng như:
print("[STAGE 1] Document Ingestion & OCR...")
print(f"  ✓ Text length: {len(text)} chars")
print(f"  ✓ Word count: {word_count} words")

# ✅ THAY BẰNG:
log_stage_start(logger, "STAGE_1_INGESTION")
log_stage_complete(logger, "STAGE_1_INGESTION", {
    'text_length': len(text),
    'word_count': word_count
})
```

Áp dụng tương tự cho tất cả 12 stages.

### Bước 3: Set Railway Environment Variables (1 phút)

Vào Railway Dashboard → Your Service → Variables:

```bash
LOG_LEVEL=INFO
DEBUG_MODE=false
```

### Bước 4: Deploy (2 phút)

```bash
git add python-api/utils/logger.py
git add python-api/phrase_centric_extractor.py
git add python-api/complete_pipeline_12_stages.py
git commit -m "fix: reduce logging rate from 500+/sec to <50/sec"
git push origin main
```

### Bước 5: Verify (1 phút)

1. Mở Railway logs
2. Upload 1 document
3. Kiểm tra:
   - ✅ Chỉ thấy summary logs (không thấy 53 dòng phrases)
   - ✅ Log rate < 100/sec
   - ✅ Không có "rate limit" error

## 🚨 NẾU KHÔNG CÓ THỜI GIAN - QUICK FIX

Chỉ cần comment out các dòng print debug:

```python
# Trong phrase_centric_extractor.py
# Tìm và comment:

# print("📋 DEBUG - ALL CANDIDATE PHRASES...")
# for i, (phrase, freq) in enumerate(...):
#     print(f"     {i}. '{phrase}'...")

# print("📋 DEBUG - ALL PHRASES AFTER HARD FILTER...")
# for i, (phrase, freq) in enumerate(...):
#     print(f"     {i}. '{phrase}'...")
```

Deploy ngay:
```bash
git add .
git commit -m "fix: comment out verbose debug logging"
git push
```

## 📊 KẾT QUẢ MONG ĐỢI

### Trước:
```
[STAGE 4] Phrase Extraction...
📋 DEBUG - ALL CANDIDATE PHRASES (53 total):
     1. 'the modern life' (freq: 1)
     2. 'no role' (freq: 2)
     ... (51 dòng nữa)
📋 DEBUG - ALL PHRASES AFTER HARD FILTER (39 total):
     1. 'the modern life' (freq: 1)
     ... (38 dòng nữa)
```
**= 92+ log messages cho 1 document**

### Sau:
```
[STAGE_4_PHRASE_EXTRACTION] Started
[CANDIDATE_PHRASES] {'total': 53, 'top_10': [('important advantages', 4), ...]}
[FILTERED_PHRASES] {'total': 39, 'top_10': [('important advantages', 4), ...]}
[STAGE_4_PHRASE_EXTRACTION] Complete - {'candidates': 53, 'filtered': 39, 'time_ms': 150}
```
**= 4 log messages cho 1 document**

**Giảm 95% logging!**

## 💡 DEBUG KHI CẦN

Khi cần debug chi tiết, set:
```bash
DEBUG_MODE=true
```

Sẽ thấy tất cả logs chi tiết. Nhớ set lại `false` sau khi debug xong.
