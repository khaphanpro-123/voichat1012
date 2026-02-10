# ⚠️ URGENT: PHẢI RESTART SERVER

## Vấn Đề Bạn Gặp

Bạn thấy output:
```
[3B.4] Selecting representative phrases per cluster...
✓ Selected 9 representative phrases
```

Đây là **CODE CŨ**! Python đang cache code cũ.

## Code Mới Phải Hiển Thị

```
[3B.4] Assigning cluster metadata to all phrases...
✓ Kept ALL 45 phrases (no filtering)
ℹ️  Each phrase has cluster_rank and centroid_similarity metadata
```

## Giải Pháp: Clear Cache + Restart

### Bước 1: Stop Server
```bash
# Nhấn Ctrl+C trong terminal đang chạy server
```

### Bước 2: Clear Python Cache
```bash
cd python-api

# Windows
clear_cache_and_verify.bat

# Hoặc manual:
# Xóa tất cả __pycache__
for /d /r . %d in (__pycache__) do @if exist "%d" rd /s /q "%d"
# Xóa tất cả .pyc files
del /s /q *.pyc
```

### Bước 3: Restart Server
```bash
python main.py
```

### Bước 4: Upload Document Lại
- Upload document qua API
- Kiểm tra output console
- Phải thấy message mới: "Kept ALL X phrases"

## Verify Code Mới

Chạy lệnh này để verify code đã update:

```bash
python -c "from phrase_centric_extractor import PhraseCentricExtractor; import inspect; code = inspect.getsource(PhraseCentricExtractor._select_cluster_representatives); print('NEW CODE' if 'Keep ALL phrases' in code else 'OLD CODE')"
```

**Expected output**: `NEW CODE`

## Tại Sao Bị Cache?

Python import modules và cache chúng trong memory:
- Lần đầu import → Load code vào memory
- Lần sau import → Dùng code trong memory (không đọc file)
- Khi sửa file → Memory vẫn giữ code cũ
- **Giải pháp**: Restart Python process

## Kiểm Tra Kết Quả

Sau khi restart, upload document và kiểm tra:

### ❌ Nếu Vẫn Thấy (OLD):
```
[3B.4] Selecting representative phrases per cluster...
✓ Selected 9 representative phrases
```
→ Cache chưa clear, làm lại Bước 2

### ✅ Nếu Thấy (NEW):
```
[3B.4] Assigning cluster metadata to all phrases...
✓ Kept ALL 45 phrases (no filtering)
```
→ Thành công! Code mới đã chạy

## Ví Dụ Kết Quả Mong Đợi

### Input
- Document có 45 phrases sau STEP 3B.3
- K-Means tìm K = 3 clusters

### Output (NEW CODE)
```
[3B.3] K-Means clustering with Elbow method...
  ✓ Optimal K = 3 clusters

[3B.4] Assigning cluster metadata to all phrases...
  ✓ Kept ALL 45 phrases (no filtering)
  ℹ️  Each phrase has cluster_rank and centroid_similarity metadata

✅ STEP 3B complete: 45 phrases after refinement
```

**Cluster breakdown**:
- Cluster 0: 20 phrases (tất cả được giữ)
- Cluster 1: 15 phrases (tất cả được giữ)
- Cluster 2: 10 phrases (tất cả được giữ)
- **Total**: 45 phrases (100%)

## Nếu Vẫn Không Work

1. **Check file đã save chưa**:
   ```bash
   # Tìm dòng "Keep ALL phrases" trong file
   findstr /C:"Keep ALL phrases" phrase_centric_extractor.py
   ```
   
   Phải thấy output:
   ```
   NEW BEHAVIOR: Keep ALL phrases in each cluster (no filtering)
   ```

2. **Check Python đang dùng file nào**:
   ```bash
   python -c "from phrase_centric_extractor import PhraseCentricExtractor; print(PhraseCentricExtractor.__file__)"
   ```
   
   Phải trỏ đến: `C:\copy_asd\python-api\phrase_centric_extractor.py`

3. **Force reload**:
   ```bash
   # Stop server
   # Delete ALL .pyc and __pycache__
   # Restart server
   ```

---

**TL;DR**: 
1. Stop server (Ctrl+C)
2. Run `clear_cache_and_verify.bat`
3. Restart server: `python main.py`
4. Upload document lại
5. Check output phải thấy "Kept ALL X phrases"
