# Middleware Fix - Admin Access Issue

## Vấn Đề Tìm Thấy

### 1. Redirect Loop trong Middleware
**Code có vấn đề**:
```typescript
// Check if user is admin but trying to access user dashboard
if (pathname.startsWith("/dashboard-new") && token.role === "admin") {
  console.log("✅ Admin user accessing user dashboard, redirecting to admin panel")
  return NextResponse.redirect(new URL("/admin", request.url))
}
```

**Vấn đề**:
- Admin user bị force redirect từ `/dashboard-new` sang `/admin`
- Có thể gây conflict hoặc loop
- Admin không thể truy cập user dashboard nếu muốn
- Không cần thiết vì admin có thể tự chọn

**Hậu quả**:
- Admin bị redirect liên tục
- Có thể ảnh hưởng đến session/token
- Gây confusion cho user

## Đã Fix

### Xóa Redirect Logic Không Cần Thiết
**Trước**:
```typescript
if (isProtectedRoute) {
  if (!token) {
    return NextResponse.redirect(new URL("/auth/login", request.url))
  }

  // Check admin route
  if ((pathname.startsWith("/admin") || pathname.startsWith("/admin-simple")) && token.role !== "admin") {
    return NextResponse.redirect(new URL("/dashboard-new", request.url))
  }

  // ❌ PROBLEM: Force redirect admin from dashboard
  if (pathname.startsWith("/dashboard-new") && token.role === "admin") {
    return NextResponse.redirect(new URL("/admin", request.url))
  }
}
```

**Sau**:
```typescript
if (isProtectedRoute) {
  if (!token) {
    return NextResponse.redirect(new URL("/auth/login", request.url))
  }

  // Check admin route
  if ((pathname.startsWith("/admin") || pathname.startsWith("/admin-simple")) && token.role !== "admin") {
    return NextResponse.redirect(new URL("/dashboard-new", request.url))
  }
  
  // ✅ FIXED: Removed force redirect
  // Admin can access both /admin and /dashboard-new
}
```

## Logic Middleware Sau Khi Fix

### 1. Unauthenticated Users
- Redirect to `/auth/login`

### 2. Authenticated Non-Admin Users
- Can access: `/dashboard-new`, `/assessment`, `/profile`
- Cannot access: `/admin`, `/admin-simple`
- If try to access admin routes → redirect to `/dashboard-new`

### 3. Authenticated Admin Users
- Can access: `/admin`, `/admin-simple`, `/dashboard-new`, `/assessment`, `/profile`
- No forced redirects
- Admin can choose where to go

### 4. Auth Pages
- If already authenticated → redirect based on role
  - Admin → `/admin`
  - User → `/dashboard-new`

## Test Endpoints

### 1. Test Admin Flow
```bash
GET /api/debug/test-admin-flow
```
**Shows**:
- Session info
- JWT token info
- Middleware decision
- API test result

### 2. Test Full Auth
```bash
GET /api/debug/full-auth-flow
```
**Shows**:
- Session
- MongoDB query
- Mongoose query
- Admin status

### 3. Test Admin Auth
```bash
GET /api/debug/admin-auth-detailed
```
**Shows**:
- Detailed admin verification
- Step-by-step checks

## Test Page

Open `test-admin-complete.html` để test:
1. Admin Flow Debug
2. Full Auth Flow
3. Admin APIs
4. Admin Auth

## Expected Behavior After Fix

### Admin User Login
1. Login at `/auth/login`
2. Middleware checks token → has `role: "admin"`
3. Redirect to `/admin` (from auth page)
4. Admin can navigate freely:
   - `/admin` ✅
   - `/admin-simple` ✅
   - `/dashboard-new` ✅ (no forced redirect)
   - `/admin/users` ✅
   - `/admin/notifications` ✅

### Non-Admin User Login
1. Login at `/auth/login`
2. Middleware checks token → has `role: "user"`
3. Redirect to `/dashboard-new`
4. User can navigate:
   - `/dashboard-new` ✅
   - `/assessment` ✅
   - `/profile` ✅
   - `/admin` ❌ (redirect to `/dashboard-new`)

## Debugging

### Check Middleware Logs
```
✅ User already authenticated, redirecting to dashboard
❌ No token found, redirecting to login
❌ User is not admin, redirecting to user dashboard
```

### Check JWT Token
```javascript
// In browser console
fetch('/api/debug/test-admin-flow')
  .then(r => r.json())
  .then(data => {
    console.log('Token role:', data.summary.token.role);
    console.log('Middleware will allow:', data.summary.middleware.willAllow);
  });
```

### Check Session
```javascript
fetch('/api/debug/full-auth-flow')
  .then(r => r.json())
  .then(data => {
    console.log('Session role:', data.summary.sessionRole);
    console.log('Is admin:', data.summary.isAdmin);
  });
```

## Common Issues

### Issue: Admin still can't access /admin/users
**Possible causes**:
1. JWT token doesn't have `role: "admin"`
2. Session doesn't have role
3. Database user doesn't have `role: "admin"`

**Debug**:
```bash
# Test admin flow
GET /api/debug/test-admin-flow

# Check diagnosis section:
# - sessionHasRole: should be true
# - tokenHasRole: should be true
# - middlewareWillBlock: should be false
```

### Issue: API returns 403
**Possible causes**:
1. `checkAdminAuth()` failing
2. Database connection issue
3. Email normalization issue

**Debug**:
```bash
# Test admin auth
GET /api/debug/admin-auth-detailed

# Check each step:
# - Session found
# - Email normalized
# - User found in database
# - Role is "admin"
```

### Issue: Users list shows 0 users
**Possible causes**:
1. Database has no users with `role: "user"`
2. Database connection issue
3. Query error

**Debug**:
```bash
# Test users API directly
GET /api/admin/users

# Check response:
# - success: true
# - users: array
# - total: number
```

## Files Modified

1. `middleware.ts` - Removed force redirect for admin users
2. `app/api/debug/test-admin-flow/route.ts` - New debug endpoint
3. `test-admin-complete.html` - New test page

## Next Steps

1. Open `test-admin-complete.html`
2. Click "Test Admin Flow"
3. Check diagnosis section
4. If `middlewareWillBlock: false` → middleware is OK
5. If `middlewareWillBlock: true` → JWT token doesn't have admin role
6. Test other endpoints to find exact issue

## Summary

Middleware đã được fix bằng cách xóa logic force redirect admin users. Giờ admin có thể truy cập tất cả routes mà không bị redirect không mong muốn.
