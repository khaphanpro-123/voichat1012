# PHÂN TÍCH VẤN ĐỀ ABLATION STUDY

## 🚨 VẤN ĐỀ CHÍNH

**Tất cả 4 cases đều cho kết quả giống hệt nhau vì chúng đều chạy cùng một pipeline hoàn chỉnh!**

---

## 1. NGUYÊN NHÂN GỐC RỄ

### 1.1 Implementation hiện tại

```python
def run_pipeline_case(text: str, document_title: str, case_id: int, n_topics: int = 3):
    """Chạy pipeline cho một case cụ thể"""
    
    # ❌ VẤN ĐỀ: Tất cả cases đều chạy cùng một pipeline!
    pipeline = CompletePipelineNew(n_topics=n_topics)
    result = pipeline.process_document(text=text, document_title=document_title)
    
    # Không có logic để disable/enable các stages khác nhau
    return result
```

### 1.2 Mô tả các cases trong code

```python
# CASE 1: Baseline - Steps: 1,2,4,7,8,12
# CASE 2: + Context - Steps: 1,2,3,4,7,8,12  
# CASE 3: + Filtering - Steps: 1,2,3,4,5,6,7,8,9,12
# CASE 4: Full Pipeline - Steps: 1,2,3,4,5,6,7,8,9,10,11,12
```

**Nhưng thực tế**: Tất cả đều chạy full pipeline (steps 1-12)!

---

## 2. TẠI SAO KẾT QUẢ GIỐNG NHAU?

### 2.1 Cùng một pipeline
- Tất cả 4 cases đều gọi `CompletePipelineNew()`
- Không có tham số nào để control stages nào được enable/disable
- `case_id` parameter không được sử dụng

### 2.2 Chỉ khác n_topics
```python
case1_result = run_pipeline_case(text, title, 1, n_topics=3)  # 3 topics
case2_result = run_pipeline_case(text, title, 2, n_topics=3)  # 3 topics  
case3_result = run_pipeline_case(text, title, 3, n_topics=5)  # 5 topics
case4_result = run_pipeline_case(text, title, 4, n_topics=5)  # 5 topics
```

**Kết quả**: Case 1&2 giống nhau, Case 3&4 giống nhau (chỉ khác số topics)

---

## 3. THIẾT KẾ ĐÚNG CỦA ABLATION STUDY

### 3.1 Case 1: Baseline (Steps 1,2,4,7,8,12)
```
✅ Stage 1: Document Ingestion
✅ Stage 2: Heading Detection  
❌ Stage 3: Context Intelligence (SKIP)
✅ Stage 4: Phrase Extraction
❌ Stage 5: Single Word Extraction (SKIP)
❌ Stage 6: Independent Scoring (SKIP)
✅ Stage 7: Merge (chỉ phrases)
✅ Stage 8: Learned Final Scoring
❌ Stage 9: Topic Modeling (SKIP)
❌ Stage 10: Within-Topic Ranking (SKIP)  
❌ Stage 11: Knowledge Graph (SKIP)
✅ Stage 12: Flashcard Generation
```

### 3.2 Case 2: + Context Intelligence (Steps 1,2,3,4,7,8,12)
```
✅ Stage 1: Document Ingestion
✅ Stage 2: Heading Detection
✅ Stage 3: Context Intelligence (ADD)
✅ Stage 4: Phrase Extraction (with context)
❌ Stage 5: Single Word Extraction (SKIP)
❌ Stage 6: Independent Scoring (SKIP)
✅ Stage 7: Merge
✅ Stage 8: Learned Final Scoring
❌ Stage 9: Topic Modeling (SKIP)
❌ Stage 10: Within-Topic Ranking (SKIP)
❌ Stage 11: Knowledge Graph (SKIP)
✅ Stage 12: Flashcard Generation
```

### 3.3 Case 3: + Filtering & Scoring (Steps 1,2,3,4,5,6,7,8,9,12)
```
✅ Stage 1: Document Ingestion
✅ Stage 2: Heading Detection
✅ Stage 3: Context Intelligence
✅ Stage 4: Phrase Extraction
✅ Stage 5: Single Word Extraction (ADD)
✅ Stage 6: Independent Scoring (ADD)
✅ Stage 7: Merge (phrases + words)
✅ Stage 8: Learned Final Scoring
✅ Stage 9: Topic Modeling (ADD)
❌ Stage 10: Within-Topic Ranking (SKIP)
❌ Stage 11: Knowledge Graph (SKIP)
✅ Stage 12: Flashcard Generation
```

### 3.4 Case 4: Full Pipeline (Steps 1,2,3,4,5,6,7,8,9,10,11,12)
```
✅ ALL STAGES ENABLED
```

---

## 4. GIẢI PHÁP FIX

### 4.1 Tạo Configurable Pipeline

```python
class ConfigurablePipeline:
    def __init__(self, enabled_stages: List[int], n_topics: int = 5):
        self.enabled_stages = enabled_stages
        self.n_topics = n_topics
        
        # Initialize components based on enabled stages
        if 2 in enabled_stages:
            self.heading_detector = HeadingDetector()
        if 4 in enabled_stages:
            self.phrase_extractor = PhraseCentricExtractor()
        if 5 in enabled_stages:
            self.word_extractor = SingleWordExtractorV2()
        # etc...
    
    def process_document(self, text: str, document_title: str) -> Dict:
        result = {'vocabulary': []}
        
        # Stage 1: Always enabled
        normalized_text = self._normalize_text(text)
        
        # Stage 2: Heading Detection
        headings = []
        if 2 in self.enabled_stages:
            headings = self.heading_detector.detect_headings(normalized_text)
        
        # Stage 3: Context Intelligence
        context_map = {}
        if 3 in self.enabled_stages:
            sentences = context_intelligence.build_sentences(normalized_text)
            context_map = {'sentences': sentences, 'headings': headings}
        
        # Stage 4: Phrase Extraction
        phrases = []
        if 4 in self.enabled_stages:
            phrases = self.phrase_extractor.extract_vocabulary(normalized_text)
        
        # Stage 5: Single Word Extraction
        words = []
        if 5 in self.enabled_stages:
            words = self.word_extractor.extract_single_words(
                normalized_text, phrases, headings
            )
        
        # Stage 6: Independent Scoring
        if 6 in self.enabled_stages:
            # Apply independent scoring
            pass
        
        # Stage 7: Merge
        if 7 in self.enabled_stages:
            result['vocabulary'] = phrases + words
        else:
            result['vocabulary'] = phrases  # Only phrases if no merge
        
        # Stage 8: Learned Final Scoring
        if 8 in self.enabled_stages:
            # Apply learned scoring
            pass
        
        # Stage 9: Topic Modeling
        if 9 in self.enabled_stages:
            # Apply topic modeling
            pass
        
        # Stage 10: Within-Topic Ranking
        if 10 in self.enabled_stages:
            # Apply within-topic ranking
            pass
        
        # Stage 11: Knowledge Graph
        if 11 in self.enabled_stages:
            # Build knowledge graph
            pass
        
        # Stage 12: Flashcard Generation
        if 12 in self.enabled_stages:
            result['flashcards'] = self._generate_flashcards(result['vocabulary'])
        
        return result
```

### 4.2 Update run_pipeline_case

```python
def run_pipeline_case(
    text: str,
    document_title: str,
    case_id: int,
    n_topics: int = 3
) -> Dict:
    """Chạy pipeline cho một case cụ thể với stages khác nhau"""
    
    # Define enabled stages for each case
    case_stages = {
        1: [1, 2, 4, 7, 8, 12],           # Baseline
        2: [1, 2, 3, 4, 7, 8, 12],       # + Context Intelligence
        3: [1, 2, 3, 4, 5, 6, 7, 8, 9, 12],  # + Filtering & Scoring
        4: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]  # Full Pipeline
    }
    
    enabled_stages = case_stages.get(case_id, case_stages[4])
    
    start_time = time.time()
    
    # Create configurable pipeline
    pipeline = ConfigurablePipeline(
        enabled_stages=enabled_stages,
        n_topics=n_topics
    )
    
    result = pipeline.process_document(
        text=text,
        document_title=document_title
    )
    
    latency = time.time() - start_time
    
    vocabulary = result.get('vocabulary', [])
    predicted_words = [
        v.get('word') or v.get('phrase') or v.get('text', '') 
        for v in vocabulary
    ]
    
    return {
        'vocabulary': vocabulary,
        'predicted_words': predicted_words,
        'latency': round(latency, 2),
        'total_words': len(vocabulary),
        'enabled_stages': enabled_stages
    }
```

---

## 5. KẾT QUẢ MONG ĐỢI SAU KHI FIX

### 5.1 Case 1 (Baseline)
- **Chỉ có phrases** (không có single words)
- **Không có context intelligence** → scores thấp hơn
- **Không có topic modeling** → không có clustering
- **F1-Score**: ~0.65-0.75

### 5.2 Case 2 (+ Context)
- **Có context intelligence** → scores cao hơn Case 1
- **Vẫn chỉ có phrases**
- **F1-Score**: ~0.70-0.80 (+5-10% so với Case 1)

### 5.3 Case 3 (+ Filtering)
- **Có cả phrases và single words**
- **Có independent scoring và topic modeling**
- **F1-Score**: ~0.80-0.90 (+10-15% so với Case 2)

### 5.4 Case 4 (Full Pipeline)
- **Tất cả features enabled**
- **Có knowledge graph và within-topic ranking**
- **F1-Score**: ~0.85-0.95 (+5-10% so với Case 3)

---

## 6. HÀNH ĐỘNG CẦN THỰC HIỆN

1. **Tạo ConfigurablePipeline class** với stage control
2. **Update run_pipeline_case** để sử dụng different stage configurations
3. **Test từng case riêng biệt** để đảm bảo results khác nhau
4. **Validate ablation study** với expected performance differences

**Ưu tiên**: Implement ConfigurablePipeline trước để có ablation study thực sự meaningful!