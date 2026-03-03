# Hướng Dẫn: IPA và Phân Nhóm Fuzzy

## ✅ Đã Hoàn Thành

### 1. IPA Generation (Backend)
- ✅ Thêm `_get_ipa_phonetics()` method vào `complete_pipeline.py`
- ✅ Gọi method sau khi merge vocabulary
- ✅ Thêm `ipa` và `phonetic` fields vào mỗi vocabulary item
- ✅ Commit: 98477d7
- ✅ Pushed to Railway

### 2. Difficulty Levels (Backend)
- ✅ Thêm `importance_score` mapping
- ✅ Thêm `difficulty` và `difficulty_label` fields
- ✅ 4 mức độ: critical (0.8+), important (0.6-0.79), moderate (0.4-0.59), easy (0-0.39)
- ✅ Commit: f7d1d65

## 🔧 Cần Làm: Frontend Grouping

### Vấn Đề Hiện Tại:
Frontend hiển thị tất cả vocabulary items trong một list dài, không phân nhóm theo mức độ quan trọng.

### Giải Pháp:
Cần sửa `app/dashboard-new/documents-simple/page.tsx` để:
1. Group vocabulary theo `importance_score`
2. Hiển thị 4 nhóm riêng biệt với màu sắc khác nhau
3. Hiển thị IPA phonetics bên cạnh từ

### Code Cần Thêm:

**Vị trí:** Dòng ~330-420 trong `app/dashboard-new/documents-simple/page.tsx`

**Thay thế phần render vocabulary list hiện tại bằng:**

```typescript
{/* Vocabulary List - Grouped by Difficulty */}
<div className="border rounded-lg p-4">
  <h3 className="font-bold mb-3 text-lg">
    📚 Danh sách từ vựng ({(result.vocabulary || result.flashcards)?.length || 0} từ)
  </h3>
  
  {(() => {
    const vocab = result.vocabulary || result.flashcards || [];
    
    // Group by difficulty
    const groups = {
      critical: vocab.filter((v: any) => (v.importance_score || 0) >= 0.8),
      important: vocab.filter((v: any) => (v.importance_score || 0) >= 0.6 && (v.importance_score || 0) < 0.8),
      moderate: vocab.filter((v: any) => (v.importance_score || 0) >= 0.4 && (v.importance_score || 0) < 0.6),
      easy: vocab.filter((v: any) => (v.importance_score || 0) < 0.4)
    };
    
    const groupConfig = [
      { key: 'critical', label: '🔴 Rất quan trọng', bgColor: 'bg-red-50', borderColor: 'border-red-200' },
      { key: 'important', label: '🟠 Quan trọng', bgColor: 'bg-orange-50', borderColor: 'border-orange-200' },
      { key: 'moderate', label: '🟡 Trung bình', bgColor: 'bg-yellow-50', borderColor: 'border-yellow-200' },
      { key: 'easy', label: '🟢 Dễ', bgColor: 'bg-green-50', borderColor: 'border-green-200' }
    ];
    
    return groupConfig.map(group => {
      const items = groups[group.key as keyof typeof groups];
      if (items.length === 0) return null;
      
      return (
        <div key={group.key} className="mb-6">
          <h4 className="font-semibold text-md mb-3 flex items-center gap-2">
            {group.label}
            <span className="text-sm text-gray-500">({items.length} từ)</span>
          </h4>
          <div className="space-y-3">
            {items.map((card: any, idx: number) => (
              <div key={idx} className={`p-4 ${group.bgColor} rounded-lg border ${group.borderColor}`}>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <p className="font-bold text-lg">{card.word || card.phrase}</p>
                      {/* IPA Phonetics */}
                      {(card.ipa || card.phonetic) && (
                        <span className="text-sm text-blue-600 font-mono">
                          /{card.ipa || card.phonetic}/
                        </span>
                      )}
                      {/* Speak button */}
                      <button onClick={() => speakText(card.word || card.phrase || "")}>
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                        </svg>
                      </button>
                    </div>
                    {/* Rest of card content... */}
                  </div>
                  <div className="ml-4">
                    <div className="px-3 py-1 bg-blue-600 text-white rounded-full text-sm font-bold">
                      {(card.importance_score || 0).toFixed(2)}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      );
    });
  })()}
</div>
```

### Các Thay Đổi Chính:

1. **Grouping Logic:**
   ```typescript
   const groups = {
     critical: vocab.filter((v: any) => (v.importance_score || 0) >= 0.8),
     important: vocab.filter((v: any) => (v.importance_score || 0) >= 0.6 && (v.importance_score || 0) < 0.8),
     moderate: vocab.filter((v: any) => (v.importance_score || 0) >= 0.4 && (v.importance_score || 0) < 0.6),
     easy: vocab.filter((v: any) => (v.importance_score || 0) < 0.4)
   };
   ```

2. **Group Headers:**
   ```typescript
   <h4 className="font-semibold text-md mb-3">
     {group.label}
     <span className="text-sm text-gray-500">({items.length} từ)</span>
   </h4>
   ```

3. **IPA Display:**
   ```typescript
   {(card.ipa || card.phonetic) && (
     <span className="text-sm text-blue-600 font-mono">
       /{card.ipa || card.phonetic}/
     </span>
   )}
   ```

4. **Color Coding:**
   - 🔴 Rất quan trọng: `bg-red-50 border-red-200`
   - 🟠 Quan trọng: `bg-orange-50 border-orange-200`
   - 🟡 Trung bình: `bg-yellow-50 border-yellow-200`
   - 🟢 Dễ: `bg-green-50 border-green-200`

## 📊 Kết Quả Mong Đợi

### Trước:
```
📚 Danh sách từ vựng (44 từ)
- the products (0.00)
- the job (0.00)
- relationship (1.06)
- biodiversity (1.03)
...
```

### Sau:
```
📚 Danh sách từ vựng (44 từ)

🔴 Rất quan trọng (8 từ)
- relationship /rɪˈleɪʃənʃɪp/ (1.06)
- biodiversity /ˌbaɪoʊdaɪˈvɜːrsəti/ (1.03)
- knowledge /ˈnɑːlɪdʒ/ (0.84)
...

🟠 Quan trọng (12 từ)
- meaningful /ˈmiːnɪŋfəl/ (0.83)
- government /ˈɡʌvərnmənt/ (0.88)
...

🟡 Trung bình (15 từ)
- shopping /ˈʃɑːpɪŋ/ (0.74)
- discount /ˈdɪskaʊnt/ (0.74)
...

🟢 Dễ (9 từ)
- the products /ðə ˈprɑːdʌkts/ (0.00)
- the job /ðə dʒɑːb/ (0.00)
...
```

## 🚀 Deployment

### Backend (Đã Deploy):
- ✅ IPA generation: commit 98477d7
- ✅ Difficulty levels: commit f7d1d65
- ✅ Railway deployed

### Frontend (Cần Deploy):
1. Sửa `app/dashboard-new/documents-simple/page.tsx`
2. Commit changes
3. Push to trigger Vercel deploy
4. Test upload mới

## 📝 Testing

Sau khi deploy frontend:
1. Upload tài liệu mới
2. Kiểm tra 4 nhóm hiển thị đúng
3. Kiểm tra IPA hiển thị bên cạnh từ
4. Kiểm tra màu sắc phân biệt rõ ràng

---

**Trạng thái:** Backend ✅ | Frontend ⏳  
**Commit:** 98477d7 (IPA), f7d1d65 (Difficulty)  
**Cần làm:** Sửa frontend grouping logic
