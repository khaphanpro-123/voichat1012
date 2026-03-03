# Các Vấn Đề Còn Lại Cần Fix

## ✅ Đã Hoàn Thành
- Upload thành công với 68 vocabulary items
- Backend pipeline hoạt động tốt
- POS tags được generate
- Difficulty levels được tính toán

## ❌ Vấn Đề Còn Lại

### 1. IPA Không Hiển Thị

**Nguyên nhân:** Thư viện `eng-to-ipa` chưa được cài đặt trên Railway

**Giải pháp:**
Thêm vào `python-api/requirements.txt`:
```
eng-to-ipa>=0.0.2
```

Hoặc `python-api/requirements-railway.txt`:
```
eng-to-ipa>=0.0.2
```

**Kiểm tra:**
```bash
# Trong Railway logs, tìm:
# "⚠️  Could not load IPA library"
```

### 2. Chưa Phân Chia Fuzzy Groups

**Vấn đề:** Frontend hiển thị tất cả từ trong một list dài, chưa group theo mức độ

**Cần làm:**

#### Backend: Thêm grouping logic
```python
# Trong main.py, sau khi convert numpy types
vocabulary_by_difficulty = {
    'critical': [],      # 0.8 - 1.0
    'important': [],     # 0.6 - 0.79
    'moderate': [],      # 0.4 - 0.59
    'easy': []          # 0.0 - 0.39
}

for item in vocabulary:
    difficulty = item.get('difficulty', 'easy')
    vocabulary_by_difficulty[difficulty].append(item)

# Thêm vào response
return JSONResponse(content={
    ...
    'vocabulary': vocabulary,
    'vocabulary_by_difficulty': vocabulary_by_difficulty,
    ...
})
```

#### Frontend: Hiển thị theo groups
```tsx
{/* Group by difficulty */}
{result.vocabulary_by_difficulty && (
  <div className="space-y-6">
    {/* Critical - Rất quan trọng */}
    {result.vocabulary_by_difficulty.critical?.length > 0 && (
      <div>
        <h3 className="text-lg font-bold text-red-600 mb-3">
          🔴 Rất Quan Trọng ({result.vocabulary_by_difficulty.critical.length})
        </h3>
        <div className="space-y-2">
          {result.vocabulary_by_difficulty.critical.map((card, idx) => (
            // Render card
          ))}
        </div>
      </div>
    )}
    
    {/* Important - Quan trọng */}
    {result.vocabulary_by_difficulty.important?.length > 0 && (
      <div>
        <h3 className="text-lg font-bold text-orange-600 mb-3">
          🟠 Quan Trọng ({result.vocabulary_by_difficulty.important.length})
        </h3>
        {/* ... */}
      </div>
    )}
    
    {/* Moderate - Trung bình */}
    {result.vocabulary_by_difficulty.moderate?.length > 0 && (
      <div>
        <h3 className="text-lg font-bold text-yellow-600 mb-3">
          🟡 Trung Bình ({result.vocabulary_by_difficulty.moderate.length})
        </h3>
        {/* ... */}
      </div>
    )}
    
    {/* Easy - Dễ */}
    {result.vocabulary_by_difficulty.easy?.length > 0 && (
      <div>
        <h3 className="text-lg font-bold text-green-600 mb-3">
          🟢 Dễ ({result.vocabulary_by_difficulty.easy.length})
        </h3>
        {/* ... */}
      </div>
    )}
  </div>
)}
```

### 3. Hiển Thị Chưa Đồng Bộ

**Vấn đề:** 
- Một số từ có IPA, một số không
- Một số từ có câu ví dụ, một số không

**Đã fix:** Backend đã đảm bảo tất cả items có POS, IPA (nếu có thể), và context_sentence

**Cần kiểm tra:** Frontend có hiển thị đúng không

## 🔧 Action Items

### Ưu tiên 1: Cài đặt eng-to-ipa
```bash
# Thêm vào requirements.txt
echo "eng-to-ipa>=0.0.2" >> python-api/requirements.txt

# Commit và push
git add python-api/requirements.txt
git commit -m "feat: add eng-to-ipa library for IPA phonetics"
git push origin main
```

### Ưu tiên 2: Thêm vocabulary grouping
1. Cập nhật `python-api/main.py` - thêm `vocabulary_by_difficulty`
2. Cập nhật `app/dashboard-new/documents-simple/page.tsx` - hiển thị theo groups
3. Test và verify

### Ưu tiên 3: Kiểm tra hiển thị
1. Upload tài liệu mới
2. Kiểm tra tất cả từ có POS tag
3. Kiểm tra IPA (sau khi cài eng-to-ipa)
4. Kiểm tra câu ví dụ

## 📋 Checklist

- [ ] Cài đặt eng-to-ipa trên Railway
- [ ] Thêm vocabulary_by_difficulty vào backend response
- [ ] Cập nhật frontend để hiển thị theo groups
- [ ] Test IPA generation
- [ ] Test grouping display
- [ ] Verify tất cả items có đầy đủ thông tin

## 🎯 Kết Quả Mong Đợi

### Sau khi hoàn thành:

```
🔴 Rất Quan Trọng (15 từ)
├─ modern life [noun] /ˈmɒdən laɪf/ - 0.95
├─ important advantages [noun] /ɪmˈpɔːtənt ədˈvɑːntɪdʒɪz/ - 0.92
└─ ...

🟠 Quan Trọng (20 từ)
├─ computer [noun] /kəmˈpjuːtə/ - 0.75
├─ teacher [noun] /ˈtiːtʃə/ - 0.72
└─ ...

🟡 Trung Bình (18 từ)
├─ screen [noun] /skriːn/ - 0.55
└─ ...

🟢 Dễ (15 từ)
├─ idea [noun] /aɪˈdɪə/ - 0.35
└─ ...
```

## 📝 Notes

- Railway logs cho thấy pipeline hoạt động tốt
- 68 vocabulary items được extract thành công
- Cần focus vào presentation layer (grouping + IPA display)
- Backend logic đã sẵn sàng, chỉ cần expose data đúng cách

---

**Trạng thái:** Backend OK, cần fix Frontend + IPA library  
**Ưu tiên:** IPA library > Grouping > Display consistency
