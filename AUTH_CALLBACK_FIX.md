# Auth Callback Fix - `/api/auth/callback/credentials:1 F`

## Problem
Error: `/api/auth/callback/credentials:1 F`

This means the NextAuth credentials callback (authorize function) is failing.

## Root Cause
The authorize callback had issues:
1. Missing error handling (try-catch)
2. Unsafe email normalization (could throw error if email is undefined)
3. No validation of credentials

## Fixes Applied

### Fix 1: Add Error Handling
```typescript
async authorize(credentials) {
  try {
    // ... code ...
  } catch (error) {
    console.error("[Auth] Authorize error:", error);
    return null;
  }
}
```

### Fix 2: Validate Credentials
```typescript
if (!credentials?.email || !credentials?.password) {
  console.log("[Auth] Missing email or password");
  return null;
}
```

### Fix 3: Safe Email Normalization
```typescript
// Before (unsafe):
const normalizedEmail = credentials?.email?.trim().toLowerCase();

// After (safe):
const normalizedEmail = credentials.email.trim().toLowerCase();
```

### Fix 4: Add Try-Catch to JWT Callback
```typescript
async jwt({ token, user }) {
  try {
    // ... code ...
  } catch (error) {
    console.error("[JWT] Callback error:", error);
  }
  return token;
}
```

### Fix 5: Add Try-Catch to Session Callback
```typescript
async session({ session, token }) {
  try {
    // ... code ...
  } catch (error) {
    console.error("[Session] Callback error:", error);
  }
  return session;
}
```

## Files Modified

1. **lib/authOptions.ts**
   - Added error handling to authorize callback
   - Added credentials validation
   - Safe email normalization
   - Added try-catch to JWT callback
   - Added try-catch to session callback

2. **app/api/debug/test-login/route.ts** (NEW)
   - Test login flow step-by-step
   - Shows where it fails

## How to Test

### Test 1: Test Login Endpoint
```
POST http://localhost:3000/api/debug/test-login
Content-Type: application/json

{
  "email": "admin@example.com",
  "password": "your_password"
}
```

Expected output if successful:
```json
{
  "success": true,
  "message": "Login test passed",
  "user": {
    "id": "507f1f77bcf86cd799439011",
    "email": "admin@example.com",
    "role": "admin",
    "fullName": "Admin User"
  }
}
```

### Test 2: Actual Login
1. Go to `/auth/login`
2. Enter email and password
3. Should login successfully
4. Check server logs for `[Auth]`, `[JWT]`, `[Session]` logs

### Test 3: Check Admin Access
1. After login, go to `/admin/users`
2. Should see users list
3. Go to `/admin/notifications`
4. Should be able to send notification

## Common Issues & Solutions

### Issue 1: "Missing email or password"
**Cause**: Credentials not provided
**Solution**: Check login form is sending email and password

### Issue 2: "User not found"
**Cause**: Email doesn't match in database
**Solution**:
1. Check email is correct
2. Check user exists in database
3. Verify email is normalized (lowercase)

### Issue 3: "Password incorrect"
**Cause**: Password doesn't match
**Solution**:
1. Check password is correct
2. Verify password is hashed correctly in database

### Issue 4: Still getting callback error
**Cause**: Other error in callback
**Solution**:
1. Check server logs for detailed error
2. Check database connection
3. Check User model is correct

## Server Logs to Check

Look for these logs:
```
[Auth] Authorize - normalized email: admin@example.com
[Auth] User authorized: { email: "admin@example.com", role: "admin" }
[JWT] Refreshing token for email: admin@example.com
[JWT] Token updated with role: admin
[Session] Session updated: { email: "admin@example.com", role: "admin" }
```

If you see errors, they will be logged as:
```
[Auth] Authorize error: ...
[JWT] Callback error: ...
[Session] Callback error: ...
```

## Testing Checklist

- [ ] Test login endpoint returns success
- [ ] Server logs show no errors
- [ ] Can login to app
- [ ] Session has role: "admin"
- [ ] Can access `/admin/users`
- [ ] Can send notifications
- [ ] No "Forbidden" errors

## Summary

All auth callbacks now have:
1. ✅ Error handling (try-catch)
2. ✅ Input validation
3. ✅ Safe operations
4. ✅ Detailed logging

**Status**: Ready to test

