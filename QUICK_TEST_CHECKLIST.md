# Quick Test Checklist - Admin Auth Fix

## Before Testing
1. Make sure you have an admin user in the database:
   ```
   db.users.findOne({ email: "admin@example.com" })
   ```
   Should show: `{ email: "admin@example.com", role: "admin", ... }`

## Test Sequence

### Test 1: Login Test
**Endpoint**: `POST /api/debug/test-login`
**Body**:
```json
{
  "email": "admin@example.com",
  "password": "your_password"
}
```
**Expected**: 
```json
{
  "success": true,
  "user": {
    "email": "admin@example.com",
    "role": "admin"
  }
}
```
**Status**: ✅ / ❌

---

### Test 2: Full Auth Flow (After Login)
**Endpoint**: `GET /api/debug/full-auth-flow`
**Expected**: 
```json
{
  "success": true,
  "summary": {
    "isAdmin": true,
    "sessionRole": "admin",
    "mongodbRole": "admin",
    "mongooseRole": "admin"
  }
}
```
**Status**: ✅ / ❌

---

### Test 3: Admin Auth Check
**Endpoint**: `GET /api/debug/admin-auth-detailed`
**Expected**:
```json
{
  "success": true,
  "details": {
    "isAdmin": true,
    "sessionRole": "admin",
    "databaseRole": "admin"
  }
}
```
**Status**: ✅ / ❌

---

### Test 4: Get Users List
**Endpoint**: `GET /api/admin/users`
**Expected**:
```json
{
  "success": true,
  "users": [...],
  "total": 5
}
```
**Status**: ✅ / ❌

---

### Test 5: Get Notifications
**Endpoint**: `GET /api/admin/notifications`
**Expected**:
```json
{
  "success": true,
  "notifications": [...]
}
```
**Status**: ✅ / ❌

---

### Test 6: Send Notification
**Endpoint**: `POST /api/admin/notifications`
**Body**:
```json
{
  "title": "Test Notification",
  "content": "This is a test",
  "type": "text"
}
```
**Expected**:
```json
{
  "success": true,
  "message": "Gửi thông báo thành công"
}
```
**Status**: ✅ / ❌

---

### Test 7: Access Admin Pages
**URL**: `http://localhost:3000/admin`
**Expected**: Admin dashboard loads (not redirected to dashboard)
**Status**: ✅ / ❌

**URL**: `http://localhost:3000/admin/users`
**Expected**: Users list loads with data
**Status**: ✅ / ❌

---

## Troubleshooting

### If Test 1 Fails (Login)
- Check admin user exists in database
- Verify password is correct
- Check database connection

### If Test 2 Fails (Full Auth Flow)
- Make sure you're logged in first
- Check session is valid
- Verify email normalization

### If Test 3 Fails (Admin Auth Check)
- Check role is "admin" in database
- Verify JWT callback is setting role
- Check session has role

### If Test 4 Fails (Get Users)
- Check admin auth first (Test 3)
- Verify users exist in database
- Check database connection

### If Test 5 Fails (Get Notifications)
- Check admin auth first (Test 3)
- Verify notifications collection exists
- Check database connection

### If Test 6 Fails (Send Notification)
- Check admin auth first (Test 3)
- Verify notification model is correct
- Check database connection

### If Test 7 Fails (Access Admin Pages)
- Check middleware is allowing access
- Verify token has role: "admin"
- Check session is valid

## Server Logs to Check

Look for these patterns in server logs:

✅ **Good Signs**:
```
[JWT] Initial login - role set to: admin
[JWT] Token refreshed with role: admin
[Session] Session updated: { email: "admin@example.com", role: "admin" }
[AdminAuth] ✅ Admin verified successfully
```

❌ **Bad Signs**:
```
[AdminAuth] ❌ User role is not admin
[AdminAuth] ❌ User not found in database
[JWT] User not found in database
[Session] Session email is missing
```

## Summary

| Test | Status | Notes |
|------|--------|-------|
| 1. Login | ✅/❌ | |
| 2. Full Auth Flow | ✅/❌ | |
| 3. Admin Auth Check | ✅/❌ | |
| 4. Get Users | ✅/❌ | |
| 5. Get Notifications | ✅/❌ | |
| 6. Send Notification | ✅/❌ | |
| 7. Access Admin Pages | ✅/❌ | |

**Overall Status**: ✅ All Pass / ❌ Some Fail

If all tests pass, the admin auth system is working correctly!
