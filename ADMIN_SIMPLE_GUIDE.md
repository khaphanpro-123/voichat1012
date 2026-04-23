# Admin Simple - Hướng Dẫn Sử Dụng

## Tổng Quan

Đây là admin panel mới, được viết lại từ đầu với nguyên tắc:
- **Đơn giản**: Không có logic phức tạp
- **Rõ ràng**: Dễ đọc, dễ debug
- **Hoạt động**: Chỉ làm những gì cần thiết

## Cấu Trúc

```
app/
├── admin-simple/                    # Frontend pages
│   ├── page.tsx                     # Dashboard chính
│   ├── users/page.tsx               # Quản lý users
│   └── notifications/page.tsx       # Gửi thông báo
│
app/api/admin-simple/                # Backend APIs
├── stats/route.ts                   # Thống kê
├── users/route.ts                   # API users
└── notifications/route.ts           # API notifications

lib/
└── simpleAdminAuth.ts               # Auth logic đơn giản
```

## Tính Năng

### 1. Dashboard (`/admin-simple`)
- Hiển thị thống kê tổng quan
- Link đến các trang quản lý

### 2. Quản Lý Users (`/admin-simple/users`)
- Xem danh sách tất cả users
- Hiển thị thông tin cơ bản

### 3. Gửi Thông Báo (`/admin-simple/notifications`)
- Gửi thông báo đến tất cả users
- Hỗ trợ nhiều loại: text, image, audio, document

## Auth Logic

File: `lib/simpleAdminAuth.ts`

```typescript
export async function isUserAdmin() {
  // 1. Lấy session
  const session = await getServerSession(authOptions);
  
  // 2. Lấy user từ database
  const email = session.user.email.trim().toLowerCase();
  const user = await db.collection("users").findOne({ email });
  
  // 3. Check role
  return user?.role === "admin";
}
```

**Đơn giản, rõ ràng, không có logic phức tạp!**

## API Endpoints

### GET /api/admin-simple/stats
Lấy thống kê tổng quan
```json
{
  "success": true,
  "stats": {
    "totalUsers": 10,
    "totalVocabulary": 500,
    "totalDocuments": 20
  }
}
```

### GET /api/admin-simple/users
Lấy danh sách users
```json
{
  "success": true,
  "users": [...],
  "total": 10
}
```

### POST /api/admin-simple/notifications
Gửi thông báo
```json
{
  "title": "Test",
  "content": "Hello",
  "type": "text"
}
```

## Cách Sử Dụng

### 1. Đảm bảo user có role admin
```javascript
// Trong MongoDB
db.users.updateOne(
  { email: "admin@example.com" },
  { $set: { role: "admin" } }
)
```

### 2. Login với tài khoản admin
- Vào `/auth/login`
- Đăng nhập với email admin

### 3. Truy cập admin panel
- Vào `/admin-simple`
- Hoặc click link từ dashboard

## Debug

### Check admin status
```javascript
// Trong browser console
fetch('/api/admin-simple/stats')
  .then(r => r.json())
  .then(console.log)
```

### Check server logs
```
✅ User admin@example.com is admin: true
✅ Found 10 users
✅ Notification sent: 507f1f77bcf86cd799439011
```

## So Sánh với Admin Cũ

| Feature | Admin Cũ | Admin Simple |
|---------|----------|--------------|
| Files | 10+ files | 7 files |
| Auth logic | Complex | Simple |
| Error handling | Multiple layers | Direct |
| Debug | Hard | Easy |
| Code lines | 500+ | 200 |

## Ưu Điểm

1. **Dễ đọc**: Code rõ ràng, không có abstraction phức tạp
2. **Dễ debug**: Console logs đơn giản với ✅/❌
3. **Dễ mở rộng**: Thêm feature mới dễ dàng
4. **Ít lỗi**: Ít code = ít bug

## Lưu Ý

- Admin cũ (`/admin`) vẫn hoạt động
- Admin mới (`/admin-simple`) độc lập hoàn toàn
- Có thể xóa admin cũ sau khi test xong

## Test Checklist

- [ ] Login với admin account
- [ ] Truy cập `/admin-simple`
- [ ] Xem stats hiển thị đúng
- [ ] Vào `/admin-simple/users` - xem danh sách users
- [ ] Vào `/admin-simple/notifications` - gửi thông báo test
- [ ] Check console logs không có lỗi

## Troubleshooting

### Không vào được admin panel
1. Check user có role admin không
2. Check đã login chưa
3. Check middleware logs

### Không thấy users
1. Check database có users không
2. Check API response trong Network tab
3. Check console logs

### Không gửi được notification
1. Check admin auth
2. Check form data
3. Check API response

## Next Steps

Sau khi test xong và hoạt động tốt:
1. Có thể xóa folder `/admin` cũ
2. Có thể xóa `/api/admin` cũ
3. Rename `/admin-simple` → `/admin`
4. Rename `/api/admin-simple` → `/api/admin`
