# ✅ STEP 3B.4: Keep ALL Phrases (No Filtering)

## Thay Đổi

### Trước Đây (OLD)
```python
# 3B.4: Select Representative Phrases per Cluster
# - Giữ TẤT CẢ 'core' phrases
# - Chỉ giữ top-3 'umbrella' phrases gần centroid nhất mỗi cluster
# → Kết quả: Bị mất nhiều phrases

Ví dụ:
- Cluster 0: 20 phrases → Giữ 8 phrases (5 core + 3 umbrella)
- Cluster 1: 15 phrases → Giữ 7 phrases (4 core + 3 umbrella)
- Cluster 2: 10 phrases → Giữ 6 phrases (3 core + 3 umbrella)
→ Tổng: 45 phrases → 21 phrases (mất 24 phrases)
```

### Bây Giờ (NEW)
```python
# 3B.4: Assign Cluster Metadata (Keep ALL phrases)
# - Giữ TẤT CẢ phrases trong mỗi cluster
# - Chỉ thêm metadata: cluster_rank, centroid_similarity
# → Kết quả: KHÔNG mất phrases nào

Ví dụ:
- Cluster 0: 20 phrases → Giữ 20 phrases (100%)
- Cluster 1: 15 phrases → Giữ 15 phrases (100%)
- Cluster 2: 10 phrases → Giữ 10 phrases (100%)
→ Tổng: 45 phrases → 45 phrases (không mất gì)
```

## Lý Do Thay Đổi

### Vấn Đề Cũ
- User upload document → Có 70 từ vựng
- Sau STEP 3B.4 → Chỉ còn 30 từ vựng
- User thắc mắc: "Tại sao mất 40 từ?"

### Giải Pháp Mới
- Giữ TẤT CẢ từ vựng sau clustering
- Không lọc bỏ phrases nào
- Chỉ thêm metadata để biết phrase nào quan trọng hơn

## Code Changes

### File: `phrase_centric_extractor.py`

#### 1. Method `_select_cluster_representatives()`

**OLD**:
```python
def _select_cluster_representatives(
    self,
    phrases: List[Dict],
    embeddings: np.ndarray,
    top_k_per_cluster: int = 3  # Chỉ lấy top-3
) -> List[Dict]:
    """
    Select representative phrases per cluster
    - Keep ALL 'core' phrases
    - Keep top-k closest to centroid per cluster
    """
    # ... logic chọn đại diện ...
    
    # Combine core + top-k
    selected_phrases.extend([p for _, p in core_phrases])
    selected_phrases.extend([p for _, p in top_k_non_core])
    
    return selected_phrases  # Trả về ÍT phrases
```

**NEW**:
```python
def _select_cluster_representatives(
    self,
    phrases: List[Dict],
    embeddings: np.ndarray,
    top_k_per_cluster: int = None  # IGNORED - không dùng nữa
) -> List[Dict]:
    """
    Select representative phrases per cluster
    
    NEW BEHAVIOR: Keep ALL phrases in each cluster (no filtering)
    - Assign cluster_rank metadata (1 = closest to centroid)
    - Assign centroid_similarity metadata
    - Return ALL phrases, not just representatives
    """
    # ... logic tính rank và similarity ...
    
    # KEEP ALL PHRASES - no filtering
    all_phrases.extend([p for _, p in cluster_phrases])
    
    return all_phrases  # Trả về TẤT CẢ phrases
```

#### 2. Call Site in `extract_vocabulary()`

**OLD**:
```python
# 3B.4: Select Representative Phrases per Cluster
print(f"\n  [3B.4] Selecting representative phrases per cluster...")
filtered_phrases = self._select_cluster_representatives(
    filtered_phrases,
    embeddings,
    top_k_per_cluster=3  # Chỉ lấy 3
)
print(f"  ✓ Selected {len(filtered_phrases)} representative phrases")
```

**NEW**:
```python
# 3B.4: Assign Cluster Metadata (Keep ALL phrases)
print(f"\n  [3B.4] Assigning cluster metadata to all phrases...")
filtered_phrases = self._select_cluster_representatives(
    filtered_phrases,
    embeddings
)
print(f"  ✓ Kept ALL {len(filtered_phrases)} phrases (no filtering)")
print(f"  ℹ️  Each phrase has cluster_rank and centroid_similarity metadata")
```

## Metadata Được Thêm

Mỗi phrase sau STEP 3B.4 có:

```python
{
    'phrase': 'climate change',
    'frequency': 6,
    'tfidf_score': 0.85,
    'semantic_role': 'core',
    'cluster_id': 0,
    'cluster_rank': 1,           # ← NEW: Rank trong cluster (1 = gần centroid nhất)
    'centroid_similarity': 0.92, # ← NEW: Độ tương đồng với centroid
    'cluster_centroid': [0.1, 0.2, ...],  # Embedding của centroid
    ...
}
```

## Lợi Ích

### ✅ Không Mất Từ Vựng
- User upload 70 từ → Giữ 70 từ
- Không bị lọc bỏ phrases nào

### ✅ Vẫn Có Metadata Chất Lượng
- `cluster_rank`: Biết phrase nào quan trọng trong cluster
- `centroid_similarity`: Biết phrase nào đại diện cho cluster
- Có thể dùng metadata này để sort/filter sau nếu cần

### ✅ Linh Hoạt Hơn
- Nếu muốn lọc → Dùng `cluster_rank <= 3` sau
- Nếu muốn giữ tất cả → Không cần làm gì
- User có quyền quyết định

## Testing

### Test 1: Verify No Filtering
```bash
cd python-api
python -c "
from phrase_centric_extractor import PhraseCentricExtractor

text = '''
Climate change is a pressing issue. Global warming affects ecosystems.
Greenhouse gases trap heat. Carbon emissions must be reduced.
Renewable energy is essential. Solar power is clean. Wind energy is sustainable.
'''

extractor = PhraseCentricExtractor()
result = extractor.extract_vocabulary(text, 'Test', max_phrases=50)

print(f'Total phrases: {len(result)}')
print('All phrases have cluster metadata:')
for p in result[:5]:
    print(f\"  - {p['phrase']}: cluster_id={p.get('cluster_id')}, rank={p.get('cluster_rank')}\")
"
```

### Expected Output
```
[STEP 3B] Statistical + Semantic Refinement...
  [3B.1] Computing TF-IDF scores...
  [3B.2] Computing SBERT embeddings...
  [3B.3] K-Means clustering with Elbow method...
  ✓ Optimal K = 3 clusters
  [3B.4] Assigning cluster metadata to all phrases...
  ✓ Kept ALL 15 phrases (no filtering)
  ℹ️  Each phrase has cluster_rank and centroid_similarity metadata

Total phrases: 15
All phrases have cluster metadata:
  - climate change: cluster_id=0, rank=1
  - global warming: cluster_id=0, rank=2
  - greenhouse gases: cluster_id=1, rank=1
  - carbon emissions: cluster_id=1, rank=2
  - renewable energy: cluster_id=2, rank=1
```

## Migration Guide

### Nếu Code Cũ Dựa Vào Filtering
```python
# OLD - Giả định chỉ có representative phrases
for phrase in phrases:
    # Tất cả phrases đều quan trọng
    process(phrase)

# NEW - Có thể filter bằng metadata nếu cần
for phrase in phrases:
    if phrase.get('cluster_rank', 999) <= 3:
        # Chỉ xử lý top-3 per cluster
        process(phrase)
    else:
        # Hoặc xử lý tất cả
        process(phrase)
```

### Nếu Muốn Behavior Cũ
```python
# Filter manually sau STEP 3B
phrases = extractor.extract_vocabulary(text, title, max_phrases=100)

# Keep only top-3 per cluster
filtered = []
clusters = {}
for p in phrases:
    cid = p.get('cluster_id', 0)
    if cid not in clusters:
        clusters[cid] = []
    clusters[cid].append(p)

for cid, cluster_phrases in clusters.items():
    # Sort by cluster_rank
    sorted_phrases = sorted(cluster_phrases, key=lambda x: x.get('cluster_rank', 999))
    # Take top-3
    filtered.extend(sorted_phrases[:3])

# Use filtered list
```

---

**Status**: ✅ COMPLETED  
**Date**: 2026-02-09  
**Version**: 5.0.0-simplified  
**Impact**: STEP 3B.4 now keeps ALL phrases, no filtering
