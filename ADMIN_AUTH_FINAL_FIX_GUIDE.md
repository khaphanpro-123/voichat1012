# Admin Auth Final Fix Guide

## Problem Summary
Admin users cannot:
1. See users list on `/admin/users` (shows "0 users")
2. Send notifications (403 error)
3. Access admin pages (redirected to dashboard)

## Root Causes Fixed

### 1. JWT Callback Not Refreshing Role on Token Refresh
**Issue**: The JWT callback only set the role during initial login (`if (user)`), but when the token was refreshed, it didn't update the role from the database.

**Fix**: Modified `lib/authOptions.ts` to always refresh the role from the database on every token refresh:
```typescript
// Always refresh role from database on token refresh
if (token.email) {
  const normalizedEmail = token.email.trim().toLowerCase();
  const dbUser = await User.findOne({ email: normalizedEmail });
  if (dbUser) {
    token.role = dbUser.role;  // ← Always update role
  }
}
```

### 2. Email Normalization Issues
**Issue**: Email in session might have different case/format than in database, causing queries to fail.

**Fix**: Normalize email everywhere:
- `lib/authOptions.ts` - authorize callback
- `lib/authOptions.ts` - JWT callback
- `lib/adminAuth.ts` - admin verification

### 3. Session Role Not Set
**Issue**: The session callback wasn't ensuring the role was always set from the JWT token.

**Fix**: Modified `lib/authOptions.ts` session callback to always set role:
```typescript
(session.user as any).role = token.role || "user";
```

### 4. TypeScript Error in user-progress
**Issue**: Generic type argument on untyped function call.

**Fix**: Removed generic type argument from `apiCache.get<any>()` → `apiCache.get()`

## Files Modified

1. **lib/authOptions.ts**
   - JWT callback: Always refresh role from database
   - Session callback: Ensure role is always set

2. **lib/adminAuth.ts**
   - Added detailed logging with ✅/❌ indicators
   - Improved error messages

3. **app/api/user-progress/route.ts**
   - Fixed TypeScript error with generic type argument

4. **app/api/debug/full-auth-flow/route.ts** (NEW)
   - Comprehensive debug endpoint to trace entire auth flow

## Testing Steps

### Step 1: Verify Admin User Exists in Database
```bash
# Connect to MongoDB and run:
db.users.findOne({ email: "admin@example.com" })
# Should return: { email: "admin@example.com", role: "admin", ... }
```

### Step 2: Test Login
```bash
# POST to /api/debug/test-login
{
  "email": "admin@example.com",
  "password": "your_password"
}

# Expected response:
{
  "success": true,
  "user": {
    "email": "admin@example.com",
    "role": "admin"
  }
}
```

### Step 3: Test Full Auth Flow (After Login)
```bash
# GET /api/debug/full-auth-flow
# This will show:
# - Session email and role
# - MongoDB query result
# - Mongoose query result
# - Admin status
```

### Step 4: Test Admin Auth Check
```bash
# GET /api/debug/admin-auth-detailed
# Should return:
{
  "success": true,
  "details": {
    "isAdmin": true,
    "sessionRole": "admin",
    "databaseRole": "admin"
  }
}
```

### Step 5: Test Users API
```bash
# GET /api/admin/users
# Should return list of users with stats
```

### Step 6: Test Notifications API
```bash
# GET /api/admin/notifications
# Should return list of notifications
```

## Debug Logging

All auth-related code now includes detailed logging:

### JWT Callback Logs
```
[JWT] Initial login - role set to: admin
[JWT] Refreshing token for email: admin@example.com
[JWT] Token refreshed with role: admin
```

### Session Callback Logs
```
[Session] Session updated: {
  email: "admin@example.com",
  role: "admin",
  hasRole: true
}
```

### Admin Auth Logs
```
[AdminAuth] ✅ Database connected
[AdminAuth] Email normalization: { original: "Admin@Example.com", normalized: "admin@example.com" }
[AdminAuth] ✅ Admin verified successfully
```

## Common Issues & Solutions

### Issue: "User not found in database"
**Cause**: Email normalization mismatch
**Solution**: 
1. Check database: `db.users.findOne({ email: "admin@example.com" })`
2. Verify email is lowercase in database
3. Check session email: `console.log(session.user.email)`

### Issue: "User role is not admin"
**Cause**: Role not set in database or JWT token
**Solution**:
1. Verify user has `role: "admin"` in database
2. Check JWT callback logs for role refresh
3. Test `/api/debug/full-auth-flow` to see role at each step

### Issue: "No session found"
**Cause**: User not logged in or session expired
**Solution**:
1. Login again
2. Check NEXTAUTH_SECRET is set
3. Check session strategy is "jwt"

### Issue: Middleware redirects to dashboard
**Cause**: `token.role` is not "admin"
**Solution**:
1. Check JWT callback is setting role
2. Test `/api/debug/full-auth-flow`
3. Verify middleware is checking `token.role === "admin"`

## Verification Checklist

- [ ] Admin user exists in database with `role: "admin"`
- [ ] Login test passes with correct role
- [ ] Full auth flow shows role at each step
- [ ] Admin auth check returns `isAdmin: true`
- [ ] `/api/admin/users` returns user list
- [ ] `/api/admin/notifications` returns notifications
- [ ] Admin can access `/admin` pages
- [ ] Admin can send notifications
- [ ] Middleware logs show role is "admin"

## Key Insights

1. **JWT Token Refresh**: The role must be refreshed from the database on every token refresh, not just during initial login.

2. **Email Normalization**: Email must be normalized (trim + lowercase) at all entry points:
   - Login (authorize callback)
   - Token refresh (JWT callback)
   - Admin verification (checkAdminAuth)

3. **Session Role**: The session role must be set from the JWT token, not queried separately.

4. **Middleware Role Check**: The middleware checks `token.role`, so the JWT callback must ensure this is always set correctly.

## Next Steps

1. Verify admin user exists in database
2. Test login endpoint
3. Test full auth flow endpoint
4. Check server logs for any errors
5. Test admin pages and APIs
6. Monitor logs for any issues

If issues persist, check the detailed logs from each endpoint to identify where the role is being lost.
