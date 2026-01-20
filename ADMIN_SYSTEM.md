# Hệ thống Admin - EnglishPal

## Tổng quan

Hệ thống admin cho phép quản trị viên quản lý người dùng, xem thống kê và gửi thông báo đến người học.

## Tài khoản Admin

### Thông tin đăng nhập
- **Username**: admin
- **Email**: admin@gmail.com
- **Password**: jvm*YM>2
- **Role**: admin

### Tạo tài khoản admin

Chạy lệnh sau để tạo tài khoản admin:

```bash
npm run create-admin
```

Hoặc sử dụng Node.js trực tiếp:

```bash
npx ts-node scripts/createAdmin.ts
```

## Chức năng Admin

### 1. Dashboard Admin (`/admin`)
- Xem tổng quan thống kê hệ thống
- Tổng số người dùng, phiên học, từ vựng
- Phân bố cấp độ người học
- Top 5 người dùng tích cực nhất
- Hoạt động gần đây (7 ngày)

### 2. Quản lý người dùng (`/admin/users`)
- Xem danh sách tất cả người dùng
- Tìm kiếm người dùng theo tên, username, email
- Thêm tài khoản người học mới
- Xóa tài khoản người học
- Xem thống kê từng người dùng

### 3. Thống kê chi tiết người dùng (`/admin/users/[userId]`)
- Thông tin cá nhân
- Cấp độ học tập
- Số phiên học tập
- Số từ vựng đã học
- Biểu đồ hoạt động 30 ngày
- Danh sách phiên học gần đây
- Danh sách từ vựng gần đây

### 4. Gửi thông báo (`/admin/notifications`)
- Gửi thông báo đến tất cả người học
- Hỗ trợ nhiều loại thông báo:
  - **Văn bản**: Thông báo text đơn giản
  - **Hình ảnh**: Thông báo kèm hình ảnh
  - **Âm thanh**: Thông báo kèm file audio
  - **Liên kết**: Thông báo kèm link
  - **Tài liệu**: Thông báo kèm file tài liệu

## Chức năng người dùng

### Xem thông báo
- Người dùng có thể xem thông báo từ sidebar
- Hiển thị số lượng thông báo chưa đọc
- Tự động cập nhật mỗi 30 giây
- Đánh dấu đã đọc khi click vào thông báo
- Hiển thị media (hình ảnh, audio, link, tài liệu)

## Cấu trúc API

### Admin APIs

#### GET `/api/admin/users`
Lấy danh sách tất cả người dùng (chỉ admin)

#### POST `/api/admin/users`
Tạo tài khoản người học mới (chỉ admin)

#### DELETE `/api/admin/users?userId={userId}`
Xóa tài khoản người học (chỉ admin)

#### GET `/api/admin/statistics`
Lấy thống kê tổng quan hệ thống (chỉ admin)

#### GET `/api/admin/statistics/[userId]`
Lấy thống kê chi tiết của một người dùng (chỉ admin)

#### POST `/api/admin/notifications`
Gửi thông báo mới (chỉ admin)

#### GET `/api/admin/notifications`
Lấy danh sách tất cả thông báo (chỉ admin)

### User APIs

#### GET `/api/notifications`
Lấy thông báo của người dùng hiện tại

#### PATCH `/api/notifications`
Đánh dấu thông báo đã đọc

## Models

### Notification Model
```typescript
{
  title: string;
  content: string;
  type: "text" | "image" | "audio" | "link" | "document";
  mediaUrl?: string;
  documentUrl?: string;
  linkUrl?: string;
  targetUsers: string[] | "all";
  createdBy: ObjectId;
  readBy: ObjectId[];
  createdAt: Date;
  updatedAt: Date;
}
```

### User Model (đã có role field)
```typescript
{
  username: string;
  email: string;
  password: string;
  fullName: string;
  avatar?: string;
  role: "user" | "admin";
  emailVerified?: boolean;
  createdAt: Date;
}
```

## Bảo mật

- Tất cả API admin đều được bảo vệ bởi middleware `checkAdminAuth`
- Chỉ tài khoản có `role: "admin"` mới có thể truy cập
- Session được kiểm tra qua NextAuth
- Unauthorized users sẽ nhận lỗi 401 hoặc 403

## Navigation

### Admin Navigation
- Admin có thêm mục "Admin" trong sidebar
- Màu cam/đỏ để phân biệt với menu thường
- Chỉ hiển thị khi user có role admin

### User Navigation
- Thêm nút "Thông báo" trong sidebar
- Hiển thị badge số lượng thông báo chưa đọc
- Click để mở panel thông báo

## Deployment

### Environment Variables
Đảm bảo các biến môi trường sau đã được cấu hình:
- `MONGO_URI`: MongoDB connection string
- `NEXTAUTH_SECRET`: NextAuth secret key
- `NEXTAUTH_URL`: Application URL

### Build & Deploy
```bash
npm install
npm run build
npm start
```

### Tạo admin sau khi deploy
```bash
npm run create-admin
```

## Lưu ý

1. **Mật khẩu admin**: Mật khẩu `jvm*YM>2` chứa ký tự đặc biệt, cần encode khi dùng trong URL
2. **Xóa người dùng**: Khi xóa người dùng, tất cả dữ liệu liên quan (progress, sessions, vocabulary) cũng bị xóa
3. **Thông báo**: Thông báo được gửi đến tất cả người dùng (`targetUsers: "all"`)
4. **Auto-refresh**: Thông báo tự động cập nhật mỗi 30 giây
5. **Real-time**: Hiện tại dùng polling, có thể nâng cấp lên WebSocket sau

## Troubleshooting

### Admin không thể đăng nhập
- Kiểm tra role trong database: `db.users.findOne({ email: "admin@gmail.com" })`
- Đảm bảo role là "admin" không phải "user"

### Không thấy menu Admin
- Kiểm tra session có chứa thông tin user
- Kiểm tra API `/api/users/me` trả về role đúng

### Thông báo không hiển thị
- Kiểm tra MongoDB connection
- Kiểm tra API `/api/notifications` có trả về data
- Kiểm tra console log có lỗi không

## Future Enhancements

- [ ] WebSocket cho real-time notifications
- [ ] Email notifications
- [ ] Push notifications
- [ ] Notification scheduling
- [ ] User-specific notifications (không chỉ "all")
- [ ] Notification templates
- [ ] Rich text editor cho content
- [ ] File upload cho media
- [ ] Analytics dashboard
- [ ] Export reports
