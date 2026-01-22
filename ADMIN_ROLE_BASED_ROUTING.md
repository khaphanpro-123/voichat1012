# Hệ thống phân quyền Admin - Role-based Routing

## ✅ Đã hoàn thành

### 1. Kiểm tra role khi đăng nhập
**File**: `components/auth/login-form.tsx`

Sau khi đăng nhập thành công, hệ thống sẽ:
1. Gọi API `/api/users/me` để lấy thông tin user
2. Kiểm tra field `role` trong database
3. Redirect dựa trên role:
   - **role = "admin"** → Chuyển đến `/admin` (Admin Dashboard)
   - **role = "user"** → Chuyển đến `/dashboard-new` (User Dashboard)

```typescript
// Check user role to redirect accordingly
const userRes = await fetch("/api/users/me");
const userData = await userRes.json();

if (userData.success && userData.user) {
  if (userData.user.role === "admin") {
    router.push("/admin");  // Admin dashboard
  } else {
    router.push("/dashboard-new");  // User dashboard
  }
}
```

### 2. Giao diện Admin riêng biệt
**File**: `components/AdminLayout.tsx`

Tạo layout hoàn toàn riêng cho admin với:

#### Thiết kế khác biệt
- **Màu sắc**: Cam/đỏ (thay vì xanh lá của user)
- **Logo**: 👨‍💼 Admin Panel
- **Background**: Gradient slate (xám bạc)

#### Menu Admin
- 📊 Dashboard - Tổng quan thống kê
- 👥 Quản lý người dùng - Xem, thêm, xóa user
- 📢 Gửi thông báo - Gửi notification cho tất cả user
- 📈 Thống kê - Xem chi tiết từng user

#### Tính năng đặc biệt
- **Chuyển sang chế độ user**: Admin có thể click "Chế độ người dùng" để truy cập dashboard user
- **Không có menu user**: Admin layout không hiển thị các menu như Voice Chat, Học qua hình ảnh, v.v.
- **Logout riêng**: Modal xác nhận đăng xuất với text "tài khoản admin"

### 3. Cập nhật tất cả trang Admin
Tất cả các trang admin đã được cập nhật để sử dụng `AdminLayout`:

✅ `app/admin/page.tsx` - Dashboard admin
✅ `app/admin/users/page.tsx` - Quản lý người dùng  
✅ `app/admin/users/[userId]/page.tsx` - Chi tiết người dùng
✅ `app/admin/notifications/page.tsx` - Gửi thông báo

### 4. Phân biệt rõ ràng Admin vs User

| Tính năng | Admin | User |
|-----------|-------|------|
| **Layout** | AdminLayout (cam/đỏ) | DashboardLayout (xanh lá) |
| **URL** | `/admin/*` | `/dashboard-new/*` |
| **Logo** | 👨‍💼 Admin Panel | 🇬🇧 EnglishPal |
| **Menu** | Quản lý, Thống kê, Thông báo | Voice Chat, Học tập, Từ vựng |
| **Quyền** | Xem tất cả user, Thêm/Xóa user | Chỉ xem dữ liệu của mình |
| **Chuyển đổi** | Có thể vào chế độ user | Không thể vào admin |

## 🎯 Luồng hoạt động

### Đăng nhập với role "admin"
```
1. User nhập email: admin@gmail.com, password: jvm*YM>2
2. NextAuth xác thực thành công
3. Gọi /api/users/me → Trả về { role: "admin" }
4. Redirect đến /admin
5. Hiển thị AdminLayout với menu admin
```

### Đăng nhập với role "user"
```
1. User nhập email: user@example.com, password: ******
2. NextAuth xác thực thành công
3. Gọi /api/users/me → Trả về { role: "user" }
4. Redirect đến /dashboard-new
5. Hiển thị DashboardLayout với menu user
```

### Admin muốn dùng chức năng user
```
1. Admin đang ở /admin
2. Click "Chế độ người dùng" trong sidebar
3. Chuyển đến /dashboard-new
4. Vẫn giữ role admin nhưng dùng giao diện user
5. Có thể quay lại /admin bất cứ lúc nào
```

## 📁 Files đã tạo/sửa

### Tạo mới
- `components/AdminLayout.tsx` - Layout riêng cho admin

### Cập nhật
- `components/auth/login-form.tsx` - Thêm role-based redirect
- `app/admin/page.tsx` - Dùng AdminLayout
- `app/admin/users/page.tsx` - Dùng AdminLayout
- `app/admin/users/[userId]/page.tsx` - Dùng AdminLayout
- `app/admin/notifications/page.tsx` - Dùng AdminLayout

## 🔒 Bảo mật

### API Protection
Tất cả API admin vẫn được bảo vệ bởi `checkAdminAuth` middleware:
- Kiểm tra session
- Kiểm tra role === "admin"
- Trả về 403 nếu không phải admin

### Frontend Protection
- Admin pages kiểm tra authentication
- Redirect về `/auth/login` nếu chưa đăng nhập
- Redirect về `/dashboard-new` nếu không phải admin (khi gọi API fail)

## 🎨 UI/UX Improvements

### AdminLayout Features
1. **Sidebar riêng**: Menu admin chuyên biệt
2. **Màu sắc phân biệt**: Cam/đỏ vs Xanh lá
3. **Icon đặc trưng**: 👨‍💼 vs 🇬🇧
4. **Responsive**: Hoạt động tốt trên mobile
5. **Smooth animations**: Framer Motion transitions
6. **Mobile menu**: Hamburger menu cho mobile

### User Experience
- **Rõ ràng**: User biết mình đang ở chế độ nào
- **Linh hoạt**: Admin có thể chuyển đổi dễ dàng
- **Nhất quán**: Mỗi role có giao diện riêng biệt
- **Trực quan**: Màu sắc và icon giúp phân biệt

## 🚀 Deployment

### Đã commit và push
```
Commit: e375cad - Add role-based redirect and separate AdminLayout for admin pages
```

### Vercel auto-deploy
- Admin: https://voichat1012.vercel.app/admin
- User: https://voichat1012.vercel.app/dashboard-new

## 📝 Testing

### Test Admin Login
1. Đăng nhập với `admin@gmail.com` / `jvm*YM>2`
2. Kiểm tra redirect đến `/admin`
3. Kiểm tra giao diện màu cam/đỏ
4. Kiểm tra menu admin hiển thị đúng
5. Click "Chế độ người dùng" → Chuyển đến `/dashboard-new`

### Test User Login
1. Đăng nhập với tài khoản user bình thường
2. Kiểm tra redirect đến `/dashboard-new`
3. Kiểm tra giao diện màu xanh lá
4. Kiểm tra menu user hiển thị đúng
5. Không thấy menu "Admin" trong sidebar

### Test API Protection
1. Đăng nhập với user
2. Thử truy cập `/api/admin/users` → Nhận 403 Forbidden
3. Thử truy cập `/admin` → Có thể vào nhưng API sẽ fail

## ✨ Kết luận

Hệ thống đã được cập nhật hoàn chỉnh với:
- ✅ Role-based redirect khi đăng nhập
- ✅ Giao diện admin riêng biệt hoàn toàn
- ✅ Phân quyền rõ ràng giữa admin và user
- ✅ Admin có thể dùng cả 2 chế độ
- ✅ User chỉ có thể dùng chế độ user
- ✅ Bảo mật chặt chẽ ở cả frontend và backend
- ✅ UI/UX trực quan và dễ sử dụng

Admin và User giờ đây có trải nghiệm hoàn toàn riêng biệt!
