# ✅ Admin Simple - Checklist

## Đã Hoàn Thành

- [x] Tạo auth logic đơn giản (`lib/simpleAdminAuth.ts`)
- [x] Tạo API stats (`/api/admin-simple/stats`)
- [x] Tạo API users (`/api/admin-simple/users`)
- [x] Tạo API notifications (`/api/admin-simple/notifications`)
- [x] Tạo dashboard page (`/admin-simple`)
- [x] Tạo users page (`/admin-simple/users`)
- [x] Tạo notifications page (`/admin-simple/notifications`)
- [x] Cập nhật middleware
- [x] Tạo test page (`test-admin-simple.html`)
- [x] Tạo documentation

## Cần Test

### Test 1: Login
- [ ] Login với admin account
- [ ] Check session có role admin

### Test 2: Dashboard
- [ ] Vào `/admin-simple`
- [ ] Xem stats hiển thị đúng
- [ ] Click vào "Manage Users"
- [ ] Click vào "Send Notifications"

### Test 3: Users Page
- [ ] Vào `/admin-simple/users`
- [ ] Xem danh sách users
- [ ] Check số lượng users đúng
- [ ] Check thông tin users hiển thị đầy đủ

### Test 4: Notifications Page
- [ ] Vào `/admin-simple/notifications`
- [ ] Điền form gửi thông báo
- [ ] Click "Send Notification"
- [ ] Check thông báo gửi thành công

### Test 5: APIs
- [ ] Test `/api/admin-simple/stats`
- [ ] Test `/api/admin-simple/users`
- [ ] Test `/api/admin-simple/notifications` (GET)
- [ ] Test `/api/admin-simple/notifications` (POST)

### Test 6: Auth
- [ ] Non-admin user không vào được
- [ ] Unauthenticated user redirect to login
- [ ] Admin user vào được tất cả pages

## Nếu Có Lỗi

### Lỗi 403 (Forbidden)
1. Check user có role admin không
2. Check session có email không
3. Check database connection

### Lỗi không thấy users
1. Check database có users không
2. Check API response trong Network tab
3. Check console logs

### Lỗi không gửi được notification
1. Check admin auth
2. Check form data
3. Check database connection

## Sau Khi Test Xong

Nếu tất cả hoạt động tốt:
- [ ] Có thể xóa `/admin` cũ
- [ ] Có thể xóa `/api/admin` cũ
- [ ] Rename `/admin-simple` → `/admin`
- [ ] Rename `/api/admin-simple` → `/api/admin`
- [ ] Update links trong app

## Quick Commands

### Check admin user
```javascript
db.users.findOne({ email: "admin@example.com" })
```

### Set user as admin
```javascript
db.users.updateOne(
  { email: "admin@example.com" },
  { $set: { role: "admin" } }
)
```

### Test API
```javascript
fetch('/api/admin-simple/stats')
  .then(r => r.json())
  .then(console.log)
```

## URLs

- Dashboard: `http://localhost:3000/admin-simple`
- Users: `http://localhost:3000/admin-simple/users`
- Notifications: `http://localhost:3000/admin-simple/notifications`
- Test Page: `http://localhost:3000/test-admin-simple.html`
