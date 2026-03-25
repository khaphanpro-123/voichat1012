# Voice Chat Vocabulary Save Fix - Complete

## Vấn đề

1. **Lỗi khi gõ vào ô tìm kiếm** trong `/vocabulary`
   - Error: `X is not defined`
   - Icon `X` chưa được import từ lucide-react

2. **Từ vựng từ voice chat không lưu vào database**
   - Từ vựng chỉ hiển thị cục bộ trong `/chat`
   - Không xuất hiện trong `/vocabulary`
   - Có thể do:
     - Lỗi bị im lặng với `.catch(() => {})`
     - Conflict giữa Mongoose và MongoDB native client
     - AI không trả về vocabulary trong response

## Giải pháp đã thực hiện

### 1. Sửa lỗi import icon X

**File:** `app/dashboard-new/vocabulary/page.tsx`

```typescript
// BEFORE
import {
  BookOpen,
  Search,
  // ... other icons
  Network,
} from "lucide-react";

// AFTER
import {
  BookOpen,
  Search,
  // ... other icons
  Network,
  X,  // ✅ Added
} from "lucide-react";
```

### 2. Thêm logging chi tiết

**File:** `app/api/voice-chat-enhanced/route.ts`

#### 2.1. Logging AI Response

```typescript
const parsed = parseJsonFromAI(result.content);

console.log("🤖 AI Response:", result.content.substring(0, 200));
console.log("📊 Parsed JSON:", parsed ? "Success" : "Failed");

if (!parsed || !parsed.english) {
  console.warn("⚠️ JSON parsing failed, using fallback");
  // ...
}

console.log("✅ Parsed vocabulary:", parsed.vocabulary?.length || 0, "items");
console.log("✅ Parsed structures:", parsed.structures?.length || 0, "items");
```

#### 2.2. Logging Auto-Save

```typescript
// BEFORE
if (autoSave && userId !== "anonymous") {
  saveVocabulary(userId, response.vocabulary).catch(() => {});
  saveStructures(userId, response.structures).catch(() => {});
}

// AFTER
if (autoSave && userId !== "anonymous") {
  console.log(`🔄 Auto-saving vocabulary for user ${userId}...`);
  console.log(`📝 Vocabulary items to save:`, response.vocabulary?.length || 0);
  console.log(`📝 Structure items to save:`, response.structures?.length || 0);
  
  saveVocabulary(userId, response.vocabulary).catch((err) => {
    console.error("❌ Failed to save vocabulary:", err);
  });
  saveStructures(userId, response.structures).catch((err) => {
    console.error("❌ Failed to save structures:", err);
  });
} else {
  console.log(`⚠️ Auto-save skipped: autoSave=${autoSave}, userId=${userId}`);
}
```

### 3. Đảm bảo vocabulary/structures luôn là array

```typescript
// Ensure vocabulary and structures are always arrays
const enhancedResponse: EnhancedResponse = {
  english: parsed.english,
  vietnamese: parsed.vietnamese || "",
  grammarStructure: parsed.grammarStructure,
  vocabulary: Array.isArray(parsed.vocabulary) ? parsed.vocabulary : [],
  structures: Array.isArray(parsed.structures) ? parsed.structures : []
};
```

### 4. Chuyển sang MongoDB Native Client

**Lý do:** Tránh conflict giữa Mongoose (dùng trong models) và MongoDB native client (dùng trong API routes)

#### 4.1. saveVocabulary()

```typescript
// BEFORE - Using Mongoose
await connectDB();
const Vocabulary = (await import("@/app/models/Vocabulary")).default;
const result = await Vocabulary.findOneAndUpdate(
  { userId, word: item.word.toLowerCase() },
  vocabData,
  { upsert: true, new: true }
);

// AFTER - Using MongoDB Native Client
const getClientPromise = (await import("@/lib/mongodb")).default;
const client = await getClientPromise();
const db = client.db("viettalk");
const collection = db.collection("vocabulary");

const result = await collection.updateOne(
  { userId, word: item.word.toLowerCase() },
  { $set: vocabData },
  { upsert: true }
);

console.log(`✅ Saved: ${item.word} (matched: ${result.matchedCount}, modified: ${result.modifiedCount}, upserted: ${result.upsertedCount})`);
```

#### 4.2. saveStructures()

```typescript
// Same pattern as saveVocabulary
const getClientPromise = (await import("@/lib/mongodb")).default;
const client = await getClientPromise();
const db = client.db("viettalk");
const collection = db.collection("vocabulary");

const result = await collection.updateOne(
  { userId, word: item.pattern, type: "structure" },
  { $set: structureData },
  { upsert: true }
);
```

#### 4.3. getSaved()

```typescript
// BEFORE - Using Mongoose
await connectDB();
const Vocabulary = (await import("@/app/models/Vocabulary")).default;
const vocabulary = await Vocabulary.find({ 
  userId, 
  source: "voice_chat",
  type: { $ne: "structure" }
}).sort({ createdAt: -1 }).limit(50);

// AFTER - Using MongoDB Native Client
const getClientPromise = (await import("@/lib/mongodb")).default;
const client = await getClientPromise();
const db = client.db("viettalk");
const collection = db.collection("vocabulary");

const vocabulary = await collection.find({ 
  userId, 
  source: "voice_chat",
  type: { $ne: "structure" }
}).sort({ created_at: -1 }).limit(50).toArray();
```

### 5. Thêm skip logging

```typescript
async function saveVocabulary(userId: string, items: VocabularyItem[]) {
  if (!items || items.length === 0 || userId === "anonymous") {
    console.log(`⏭️ Skipping vocabulary save: items=${items?.length || 0}, userId=${userId}`);
    return;
  }
  // ...
}
```

### 6. Re-throw errors để debug

```typescript
} catch (err) {
  console.error("❌ Save vocabulary error:", err);
  console.error("Error details:", err instanceof Error ? err.message : err);
  throw err; // ✅ Re-throw to see in catch handler
}
```

## Cách kiểm tra

### Bước 1: Test Search Box

1. Mở `/vocabulary`
2. Gõ vào ô tìm kiếm
3. ✅ Không còn lỗi "X is not defined"
4. Click nút X để clear search

### Bước 2: Test Voice Chat Save

1. Mở `/dashboard-new/chat`
2. Mở Console (F12)
3. Đảm bảo "Tự động lưu từ vựng" được BẬT
4. Chat với AI: "Hello, how are you?"
5. Xem console logs:

```
🤖 AI Response: {"english":"Hi! I'm doing great...
📊 Parsed JSON: Success
✅ Parsed vocabulary: 2 items
✅ Parsed structures: 1 items
🔄 Auto-saving vocabulary for user 67xxxxx...
📝 Vocabulary items to save: 2
📝 Structure items to save: 1
💾 Saving 2 vocabulary items for user 67xxxxx
  💾 Saving word: great {...}
  ✅ Saved: great (matched: 0, modified: 0, upserted: 1)
  💾 Saving word: doing {...}
  ✅ Saved: doing (matched: 0, modified: 0, upserted: 1)
✅ Successfully saved 2 vocabulary items
```

6. Mở `/vocabulary`
7. Click filter "🎤 Voice Chat"
8. ✅ Thấy từ vựng từ chat

### Bước 3: Verify Database

```javascript
// MongoDB query
db.vocabulary.find({ 
  userId: "YOUR_USER_ID", 
  source: "voice_chat" 
}).count()

// Should return > 0
```

## Logs để debug

### Success Case

```
🤖 AI Response: {"english":"Hello! How can I help...
📊 Parsed JSON: Success
✅ Parsed vocabulary: 3 items
✅ Parsed structures: 1 items
🔄 Auto-saving vocabulary for user 67xxxxx...
📝 Vocabulary items to save: 3
📝 Structure items to save: 1
💾 Saving 3 vocabulary items for user 67xxxxx
  💾 Saving word: help {...}
  ✅ Saved: help (matched: 0, modified: 0, upserted: 1)
✅ Successfully saved 3 vocabulary items
```

### Skip Case (autoSave OFF)

```
⚠️ Auto-save skipped: autoSave=false, userId=67xxxxx
```

### Skip Case (anonymous user)

```
⚠️ Auto-save skipped: autoSave=true, userId=anonymous
```

### Error Case

```
❌ Failed to save vocabulary: MongoError: ...
❌ Save vocabulary error: Error: ...
Error details: Connection timeout
```

## Files đã sửa

1. ✅ `app/dashboard-new/vocabulary/page.tsx`
   - Thêm import icon `X`

2. ✅ `app/api/voice-chat-enhanced/route.ts`
   - Thêm logging chi tiết cho AI response
   - Thêm logging cho auto-save
   - Đảm bảo vocabulary/structures là array
   - Chuyển sang MongoDB native client
   - Thêm skip logging
   - Re-throw errors để debug

## Lợi ích

### 1. Tránh conflict Mongoose vs MongoDB Native

- Mongoose: Dùng cho models với schema validation
- MongoDB Native: Dùng cho API routes, linh hoạt hơn
- Không còn conflict về connection pooling

### 2. Logging chi tiết

- Biết chính xác AI có trả về vocabulary không
- Biết autoSave có được bật không
- Biết userId có phải anonymous không
- Biết lỗi cụ thể khi save fail

### 3. Error visibility

- Không còn im lặng bỏ qua lỗi
- Errors được log ra console
- Dễ debug và fix

## Troubleshooting

### Nếu vẫn không lưu được:

1. **Kiểm tra AI response**
   ```
   🤖 AI Response: ...
   📊 Parsed JSON: Failed  ← Vấn đề ở đây
   ```
   → AI không trả về JSON đúng format

2. **Kiểm tra autoSave**
   ```
   ⚠️ Auto-save skipped: autoSave=false
   ```
   → Bật "Tự động lưu từ vựng" trong settings

3. **Kiểm tra userId**
   ```
   ⚠️ Auto-save skipped: userId=anonymous
   ```
   → Đăng nhập vào hệ thống

4. **Kiểm tra vocabulary array**
   ```
   📝 Vocabulary items to save: 0
   ```
   → AI không trả về vocabulary items

5. **Kiểm tra MongoDB connection**
   ```
   ❌ Save vocabulary error: MongoError: ...
   ```
   → Verify MONGO_URI trong .env

## Next Steps

Nếu vẫn có vấn đề:

1. Share console logs đầy đủ
2. Kiểm tra MongoDB collection trực tiếp
3. Test với user account khác
4. Verify AI API keys có hoạt động không
5. Check network tab trong DevTools
