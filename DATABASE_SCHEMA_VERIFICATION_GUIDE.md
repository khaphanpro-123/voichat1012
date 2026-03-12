# HƯỚNG DẪN KIỂM TRA DATABASE SCHEMA

## Mục đích

Kiểm tra tất cả các bảng và mối quan hệ trong MongoDB có đúng với thiết kế dữ liệu hay không.

## Các mối quan hệ được kiểm tra

### Nhóm 1:1 (Quan hệ định danh)

1. **User ⟷ UserProgress**
   - Parent: `users._id` → Child: `user_progress.userId`
   - Cardinality: 1 → 0..1
   - Mô tả: Chứa level, XP và streak

2. **User ⟷ UserApiKeys**
   - Parent: `users._id` → Child: `user_api_keys.userId`
   - Cardinality: 1 → 0..1
   - Mô tả: Lưu API keys cá nhân

### Nhóm 1:N (Quan hệ sở hữu)

3. **User ⟷ Document**
   - Parent: `users._id` → Child: `documents.userId`
   - Cardinality: 1 → 0..N

4. **User ⟷ Vocabulary**
   - Parent: `users._id` → Child: `vocabulary.userId`
   - Cardinality: 1 → 0..N

5. **User ⟷ LearningSession**
   - Parent: `users._id` → Child: `learning_sessions.userId`
   - Cardinality: 1 → 0..N

6. **User ⟷ GrammarError**
   - Parent: `users._id` → Child: `grammar_errors.userId`
   - Cardinality: 1 → 0..N

7. **User ⟷ Analysis**
   - Parent: `users._id` → Child: `analyses.userId`
   - Cardinality: 1 → 0..N

8. **User ⟷ Assessment**
   - Parent: `users._id` → Child: `assessments.userId`
   - Cardinality: 1 → 0..N

9. **User ⟷ Notification (Creator)**
   - Parent: `users._id` → Child: `notifications.createdBy`
   - Cardinality: 1 → 0..N

### Nhóm liên kết chéo

10. **Document ⟷ Vocabulary**
    - Parent: `documents._id` → Child: `vocabulary.sourceDocument`
    - Cardinality: 1 → 0..N

11. **User ⟷ Notification (Readers)**
    - Parent: `users._id` → Child: `notifications.readBy[]`
    - Cardinality: N → M (Many-to-Many)

---

## Cách sử dụng

### Bước 1: Cài đặt dependencies

```bash
npm install mongodb
```

### Bước 2: Cấu hình MongoDB URI

Tạo file `.env` hoặc set environment variable:

```bash
MONGODB_URI=mongodb://localhost:27017/voichat
# hoặc
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/voichat
```

### Bước 3: Chạy script kiểm tra

```bash
npx ts-node scripts/verify-database-schema.ts
```

### Bước 4: Xem kết quả

Script sẽ in ra console và tạo file `DATABASE_VERIFICATION_REPORT.md`

---

## Các kiểm tra được thực hiện

### 1. Kiểm tra tồn tại bảng
- ✅ Bảng parent có tồn tại không
- ✅ Bảng child có tồn tại không
- ⚠️  Warning nếu bảng rỗng

### 2. Kiểm tra Orphaned Children
- ❌ Fail nếu có child không có parent
- Ví dụ: `vocabulary.userId` trỏ đến user không tồn tại

### 3. Kiểm tra Cardinality (1:1)
- ❌ Fail nếu 1 parent có nhiều hơn 1 child
- Ví dụ: 1 user có 2 bản ghi `user_progress`

### 4. Kiểm tra Foreign Key References
- ❌ Fail nếu FK trỏ đến record không tồn tại
- Sample check: Lấy 1 child ngẫu nhiên, kiểm tra parent có tồn tại không

### 5. Kiểm tra N:M Relationship
- ❌ Fail nếu field không phải array
- Ví dụ: `notifications.readBy` phải là array

---

## Ví dụ Output

```
🔍 DATABASE SCHEMA VERIFICATION
================================================================================
✅ Connected to MongoDB

📊 Checking: User ⟷ UserProgress
--------------------------------------------------------------------------------
Status: ✅ PASS
Statistics:
  - parentCount: 150
  - childCount: 145
  - orphanedChildren: 0
  - multipleChildren: 0

📊 Checking: User ⟷ Vocabulary
--------------------------------------------------------------------------------
Status: ⚠️ WARNING
Issues:
  - Found 5 orphaned children without userId
Statistics:
  - parentCount: 150
  - childCount: 1250
  - orphanedChildren: 5

================================================================================
📈 SUMMARY
================================================================================
✅ Passed: 9/11
⚠️  Warnings: 1/11
❌ Failed: 1/11

✅ Report saved to DATABASE_VERIFICATION_REPORT.md
```

---

## Cách sửa lỗi phổ biến

### Lỗi 1: Orphaned Children

**Vấn đề**: Child có FK trỏ đến parent không tồn tại

**Cách sửa**:
```javascript
// Option 1: Xóa orphaned children
db.vocabulary.deleteMany({ userId: { $exists: false } });

// Option 2: Gán cho user mặc định
db.vocabulary.updateMany(
  { userId: { $exists: false } },
  { $set: { userId: "default_user_id" } }
);
```

### Lỗi 2: Multiple Children (Vi phạm 1:1)

**Vấn đề**: 1 parent có nhiều child trong quan hệ 1:1

**Cách sửa**:
```javascript
// Giữ lại bản ghi mới nhất, xóa các bản cũ
const duplicates = await db.user_progress.aggregate([
  { $group: { _id: "$userId", count: { $sum: 1 }, docs: { $push: "$$ROOT" } } },
  { $match: { count: { $gt: 1 } } }
]);

for (const dup of duplicates) {
  // Giữ lại doc mới nhất
  const toKeep = dup.docs.sort((a, b) => b.createdAt - a.createdAt)[0];
  const toDelete = dup.docs.filter(d => d._id !== toKeep._id);
  
  await db.user_progress.deleteMany({
    _id: { $in: toDelete.map(d => d._id) }
  });
}
```

### Lỗi 3: Missing Foreign Key Field

**Vấn đề**: Child không có field FK

**Cách sửa**:
```javascript
// Thêm field FK với giá trị null hoặc default
db.vocabulary.updateMany(
  { userId: { $exists: false } },
  { $set: { userId: null } }
);
```

### Lỗi 4: Wrong Data Type (N:M)

**Vấn đề**: Field N:M không phải array

**Cách sửa**:
```javascript
// Convert single value to array
db.notifications.updateMany(
  { readBy: { $type: "string" } },
  [{ $set: { readBy: ["$readBy"] } }]
);

// Convert null to empty array
db.notifications.updateMany(
  { readBy: null },
  { $set: { readBy: [] } }
);
```

---

## Tạo indexes để tối ưu

Sau khi verify, nên tạo indexes cho các FK:

```javascript
// User relationships
db.user_progress.createIndex({ userId: 1 }, { unique: true });
db.user_api_keys.createIndex({ userId: 1 }, { unique: true });
db.documents.createIndex({ userId: 1 });
db.vocabulary.createIndex({ userId: 1 });
db.learning_sessions.createIndex({ userId: 1 });
db.grammar_errors.createIndex({ userId: 1 });
db.analyses.createIndex({ userId: 1 });
db.assessments.createIndex({ userId: 1 });
db.notifications.createIndex({ createdBy: 1 });

// Document relationships
db.vocabulary.createIndex({ sourceDocument: 1 });

// N:M relationships
db.notifications.createIndex({ readBy: 1 });
```

---

## Tích hợp vào CI/CD

Thêm vào `package.json`:

```json
{
  "scripts": {
    "verify:db": "ts-node scripts/verify-database-schema.ts",
    "test:db": "npm run verify:db"
  }
}
```

Thêm vào GitHub Actions:

```yaml
- name: Verify Database Schema
  run: npm run verify:db
  env:
    MONGODB_URI: ${{ secrets.MONGODB_URI }}
```

---

## Lưu ý quan trọng

1. **Backup trước khi sửa**: Luôn backup database trước khi chạy các lệnh sửa lỗi
2. **Test trên staging**: Test script trên staging environment trước
3. **Chạy định kỳ**: Nên chạy script này định kỳ (hàng tuần) để phát hiện lỗi sớm
4. **Monitor production**: Set up alerts nếu có orphaned records

---

## Troubleshooting

### Lỗi: Cannot connect to MongoDB
```bash
# Kiểm tra connection string
echo $MONGODB_URI

# Test connection
mongosh $MONGODB_URI
```

### Lỗi: Collection not found
```bash
# List all collections
mongosh $MONGODB_URI --eval "db.getCollectionNames()"
```

### Script chạy quá lâu
```bash
# Giảm số lượng checks bằng cách comment out một số relationships
# trong file verify-database-schema.ts
```

---

## Kết quả mong đợi

Sau khi chạy script, bạn sẽ có:

1. ✅ Console output với status từng relationship
2. ✅ File `DATABASE_VERIFICATION_REPORT.md` với báo cáo chi tiết
3. ✅ Danh sách các vấn đề cần sửa
4. ✅ Statistics về số lượng records

Nếu tất cả PASS, database schema của bạn đã đúng với thiết kế!
