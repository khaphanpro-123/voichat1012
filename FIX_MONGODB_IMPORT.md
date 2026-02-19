# ✅ FIX MONGODB IMPORT ERROR

## 🔴 VẤN ĐỀ

### Lỗi 500 Internal Server Error

```
POST /api/vocabulary → 500 (Internal Server Error)
POST /api/documents → 500 (Internal Server Error)
POST /api/knowledge-graph → 500 (Internal Server Error)
```

### Nguyên nhân

**File `lib/mongodb.ts` export:**
```typescript
export default getClientPromise;  // ✅ Đúng
```

**Nhưng API routes import SAI:**
```typescript
import clientPromise from "@/lib/mongodb"  // ❌ SAI
const client = await clientPromise  // ❌ Lỗi: clientPromise is a function
```

**Phải import ĐÚNG:**
```typescript
import getClientPromise from "@/lib/mongodb"  // ✅ ĐÚNG
const client = await getClientPromise()  // ✅ Call function
```

---

## ✅ ĐÃ FIX

### Files đã sửa:

1. **app/api/vocabulary/route.ts**
   - ✅ Đổi `import clientPromise` → `import getClientPromise`
   - ✅ Đổi `await clientPromise` → `await getClientPromise()`

2. **app/api/documents/route.ts**
   - ✅ Đổi `import clientPromise` → `import getClientPromise`
   - ✅ Đổi `await clientPromise` → `await getClientPromise()` (3 chỗ: POST, GET, DELETE)

3. **app/api/knowledge-graph/route.ts**
   - ✅ Đổi `import clientPromise` → `import getClientPromise`
   - ✅ Đổi `await clientPromise` → `await getClientPromise()` (2 chỗ: POST, GET)

---

## 🚀 DEPLOY

```bash
git add .
git commit -m "fix: Correct MongoDB import in API routes"
git push origin main
```

---

## 🧪 TEST SAU KHI DEPLOY

### 1. Test Vocabulary API

```bash
# Mở browser console (F12)
# Upload document
# Check Network tab:
POST /api/vocabulary → Status 200 ✅
Response: { success: true, word: "..." }
```

### 2. Test Documents API

```bash
POST /api/documents → Status 200 ✅
Response: { success: true, document_id: "..." }
```

### 3. Test Knowledge Graph API

```bash
POST /api/knowledge-graph → Status 200 ✅
Response: { success: true, id: "..." }
```

---

## 📊 KẾT QUẢ MONG ĐỢI

### Trước fix
```
❌ POST /api/vocabulary → 500 (Internal Server Error)
❌ POST /api/documents → 500 (Internal Server Error)
❌ POST /api/knowledge-graph → 500 (Internal Server Error)
```

### Sau fix
```
✅ POST /api/vocabulary → 200 OK
✅ POST /api/documents → 200 OK
✅ POST /api/knowledge-graph → 200 OK
✅ Data được save vào MongoDB
```

---

## 💡 LƯU Ý

**Lỗi này xảy ra vì:**
- `lib/mongodb.ts` export default là một FUNCTION: `getClientPromise`
- Nhưng API routes import như một PROMISE: `clientPromise`
- Khi gọi `await clientPromise`, nó await một function thay vì call function
- Kết quả: TypeError hoặc 500 error

**Cách fix đúng:**
```typescript
// ✅ ĐÚNG
import getClientPromise from "@/lib/mongodb"
const client = await getClientPromise()  // Call function

// ❌ SAI
import clientPromise from "@/lib/mongodb"
const client = await clientPromise  // Await function (wrong!)
```

---

## 📋 CHECKLIST

- [x] Fix vocabulary API import
- [x] Fix documents API import (3 methods)
- [x] Fix knowledge-graph API import (2 methods)
- [ ] Deploy và test
- [ ] Verify MongoDB data được save

---

**Deploy ngay để fix lỗi 500!**
