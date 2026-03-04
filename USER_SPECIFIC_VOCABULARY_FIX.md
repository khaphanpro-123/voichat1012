# ✅ Fix: Vocabulary Per-User Storage

## ❌ Vấn Đề Trước Đây

**Vocabulary được share cho TẤT CẢ users:**
```javascript
// OLD CODE - Không có userId
await collection.insertOne({
  word: "climate",
  meaning: "khí hậu",
  // ❌ Không có userId - tất cả users thấy từ này
})

await collection.find({})  // ❌ Lấy TẤT CẢ từ của mọi người
```

**Hậu quả:**
- User A upload tài liệu → Từ vựng lưu vào database
- User B vào `/vocabulary` → Thấy từ của User A ❌
- User B xóa từ → Từ của User A bị xóa ❌

---

## ✅ Giải Pháp

### 1. Thêm Authentication Check

```typescript
// Get user session
const session = await getServerSession(authOptions)
if (!session?.user) {
  return NextResponse.json(
    { error: "Unauthorized - Please login" },
    { status: 401 }
  )
}

const userId = (session.user as any).id
```

### 2. Save với userId

```typescript
// Insert new word WITH userId
await collection.insertOne({
  userId,  // ✅ IMPORTANT: Save with userId
  word: "climate",
  meaning: "khí hậu",
  ...
})
```

### 3. Filter by userId khi GET

```typescript
// Get vocabulary FOR THIS USER ONLY
const query: any = { userId }  // ✅ Filter by userId

const vocabulary = await collection
  .find(query)
  .sort({ created_at: -1 })
  .toArray()
```

### 4. Check userId khi DELETE

```typescript
// Delete only if belongs to this user
const result = await collection.deleteOne({ 
  _id: new ObjectId(wordId),
  userId  // ✅ Only delete own vocabulary
})
```

---

## 📊 Database Schema

### Trước:
```javascript
{
  _id: ObjectId("..."),
  word: "climate",
  meaning: "khí hậu",
  // ❌ Không có userId
  created_at: ISODate("...")
}
```

### Sau:
```javascript
{
  _id: ObjectId("..."),
  userId: "user_123",  // ✅ Có userId
  word: "climate",
  meaning: "khí hậu",
  example: "Climate change is real",
  ipa: "ˈklaɪmət",
  pronunciation: "ˈklaɪmət",
  level: "intermediate",
  source: "document_20260304",
  created_at: ISODate("...")
}
```

---

## 🔍 Testing

### Test 1: Upload và Auto-Save

**User A:**
1. Login as User A
2. Upload file → 44 từ
3. Vào `/vocabulary` → Thấy 44 từ ✅

**User B:**
1. Login as User B
2. Vào `/vocabulary` → Thấy 0 từ ✅ (không thấy từ của User A)
3. Upload file → 30 từ
4. Vào `/vocabulary` → Thấy 30 từ ✅

**User A lại:**
1. Vào `/vocabulary` → Vẫn thấy 44 từ ✅ (không bị ảnh hưởng bởi User B)

### Test 2: Delete

**User A:**
1. Xóa 1 từ → Success ✅
2. Từ của User A bị xóa ✅

**User B:**
1. Vào `/vocabulary` → Vẫn thấy đầy đủ 30 từ ✅ (không bị ảnh hưởng)

---

## 🚨 QUAN TRỌNG: Migration

### Vấn Đề:

Database hiện tại có từ vựng KHÔNG CÓ userId:
```javascript
// Old documents
{
  _id: ObjectId("..."),
  word: "climate",
  // ❌ Không có userId
}
```

### Giải Pháp:

**Option 1: Xóa tất cả từ cũ (Recommended)**
```javascript
// Trong MongoDB
db.vocabulary.deleteMany({ userId: { $exists: false } })
```

**Option 2: Assign to admin user**
```javascript
// Assign tất cả từ cũ cho admin
db.vocabulary.updateMany(
  { userId: { $exists: false } },
  { $set: { userId: "admin_user_id" } }
)
```

**Option 3: Để nguyên (Not recommended)**
- Từ cũ sẽ không hiển thị cho ai
- Vì query filter by userId

---

## 📝 API Changes

### POST /api/vocabulary

**Before:**
```typescript
// No authentication
// Anyone can save
```

**After:**
```typescript
// ✅ Requires authentication
// ✅ Saves with userId
// ✅ Returns userId in response

Response:
{
  success: true,
  message: "Vocabulary saved",
  word: "climate",
  userId: "user_123"  // ✅ NEW
}
```

### GET /api/vocabulary

**Before:**
```typescript
// Returns ALL vocabulary from ALL users
```

**After:**
```typescript
// ✅ Requires authentication
// ✅ Returns only THIS user's vocabulary

Response: [
  {
    _id: "...",
    userId: "user_123",  // ✅ NEW
    word: "climate",
    ...
  }
]
```

### DELETE /api/vocabulary

**Before:**
```typescript
// Can delete ANY word
```

**After:**
```typescript
// ✅ Requires authentication
// ✅ Can only delete OWN vocabulary

// If trying to delete other user's word:
Response: {
  error: "Word not found or unauthorized",
  status: 404
}
```

---

## 🎯 Kết Quả

### ✅ Đã Fix:
- Vocabulary per-user (mỗi user có bộ từ riêng)
- Authentication required
- Cannot see other users' vocabulary
- Cannot delete other users' vocabulary

### ⏳ Cần Test:
1. Login và upload file
2. Check console logs
3. Vào `/vocabulary` xem có từ không
4. Login user khác và check không thấy từ của user trước

---

## 🔧 Troubleshooting

### Lỗi: "Unauthorized - Please login"

**Nguyên nhân:** Chưa login hoặc session expired

**Giải pháp:**
1. Logout
2. Login lại
3. Upload file

### Lỗi: "User ID not found in session"

**Nguyên nhân:** Session không có userId

**Giải pháp:**
1. Check NextAuth configuration
2. Ensure userId is in session callback
3. Check `authOptions` in `/api/auth/[...nextauth]/route.ts`

### Từ vựng không hiển thị

**Nguyên nhân:** 
- Từ cũ không có userId
- Hoặc userId không match

**Giải pháp:**
1. Check MongoDB: `db.vocabulary.find({ userId: "your_user_id" })`
2. Nếu không có → Auto-save chưa hoạt động
3. Check console logs khi upload

---

**Commit:** 538ebb0  
**Status:** ✅ Per-user vocabulary implemented  
**Đang chờ:** Vercel deploy (2-3 phút) ⏳
