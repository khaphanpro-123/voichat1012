# Tạo tài khoản Admin thủ công

Nếu script `npm run create-admin` không chạy được do lỗi kết nối MongoDB, bạn có thể tạo tài khoản admin thủ công bằng cách sau:

## Cách 1: Sử dụng MongoDB Compass hoặc Atlas UI

1. Kết nối đến MongoDB database của bạn
2. Chọn database `autism_app`
3. Chọn collection `users`
4. Thêm document mới với nội dung sau:

```json
{
  "username": "admin",
  "email": "admin@gmail.com",
  "password": "$2a$12$HASH_PASSWORD_HERE",
  "fullName": "admin",
  "avatar": "/avatar-placeholder.png",
  "role": "admin",
  "emailVerified": true,
  "createdAt": { "$date": "2026-01-20T00:00:00.000Z" },
  "updatedAt": { "$date": "2026-01-20T00:00:00.000Z" }
}
```

**Lưu ý**: Bạn cần hash password trước. Sử dụng bcrypt với salt rounds = 12.

## Cách 2: Hash password trước

### Bước 1: Hash password

Tạo file `hashPassword.js`:

```javascript
const bcrypt = require('bcryptjs');

const password = 'jvm*YM>2';
const hashedPassword = bcrypt.hashSync(password, 12);

console.log('Hashed password:', hashedPassword);
```

Chạy:
```bash
node hashPassword.js
```

### Bước 2: Thêm vào MongoDB

Copy hash password và thêm vào MongoDB như Cách 1.

## Cách 3: Sử dụng MongoDB Shell

```javascript
use autism_app

db.users.insertOne({
  username: "admin",
  email: "admin@gmail.com",
  password: "$2a$12$YOUR_HASHED_PASSWORD_HERE",
  fullName: "admin",
  avatar: "/avatar-placeholder.png",
  role: "admin",
  emailVerified: true,
  createdAt: new Date(),
  updatedAt: new Date()
})
```

## Cách 4: Đăng ký thông thường rồi update role

1. Đăng ký tài khoản mới với email `admin@gmail.com` qua UI
2. Vào MongoDB và tìm user vừa tạo
3. Update field `role` từ `"user"` thành `"admin"`:

```javascript
db.users.updateOne(
  { email: "admin@gmail.com" },
  { $set: { role: "admin" } }
)
```

## Kiểm tra

Sau khi tạo xong, đăng nhập với:
- Email: `admin@gmail.com`
- Password: `jvm*YM>2`

Bạn sẽ thấy menu "Admin" xuất hiện trong sidebar.

## Troubleshooting

### Không thấy menu Admin
- Đăng xuất và đăng nhập lại
- Kiểm tra role trong database: `db.users.findOne({ email: "admin@gmail.com" })`
- Đảm bảo role là `"admin"` (string, không phải object)

### Không đăng nhập được
- Kiểm tra password đã được hash đúng chưa
- Thử đăng ký lại và update role (Cách 4)
- Kiểm tra email chính xác: `admin@gmail.com`

## Hash password mẫu

Đây là hash của password `jvm*YM>2` với bcrypt salt rounds = 12:

```
$2a$12$8KqVZxQxQxQxQxQxQxQxQeXXXXXXXXXXXXXXXXXXXXXXXXXXXX
```

(Lưu ý: Đây chỉ là ví dụ, bạn cần tạo hash thực tế)

## Tạo hash password online

Nếu không muốn chạy code, bạn có thể sử dụng các công cụ online:
- https://bcrypt-generator.com/
- Chọn rounds: 12
- Nhập password: `jvm*YM>2`
- Copy hash và dùng trong MongoDB
