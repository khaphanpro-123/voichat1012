# Admin Issues - Quick Summary & Fix

## Problems
1. ❌ Admin cannot send notifications (403 error)
2. ❌ Admin cannot see users list (shows "0 users")

## Root Cause
`checkAdminAuth()` is failing because:
- Admin user doesn't have `role: "admin"` in database, OR
- JWT token is cached with old role

## Quick Fix (5 minutes)

### Step 1: Check Admin Status
```
Go to: http://localhost:3000/api/debug/admin-auth-detailed
```

### Step 2: If Not Admin, Set Admin Role

**Using MongoDB Atlas:**
1. Go to https://cloud.mongodb.com
2. Find your user in "users" collection
3. Add: `"role": "admin"`
4. Save

**Or using MongoDB Shell:**
```javascript
db.users.updateOne(
  { email: "your-email@example.com" },
  { $set: { role: "admin" } }
)
```

### Step 3: Logout and Login
1. Logout
2. Login again
3. New JWT token created with admin role

### Step 4: Test
1. Go to `/admin/users` → Should see users list
2. Go to `/admin/notifications` → Should be able to send notification

## Verification

Go to: `http://localhost:3000/api/debug/admin-auth-detailed`

Should show:
```json
{
  "success": true,
  "details": {
    "databaseRole": "admin",
    "isAdmin": true
  }
}
```

## If Still Not Working

1. Check server logs for errors
2. Verify role is exactly "admin" (case-sensitive)
3. Clear browser cookies
4. Restart development server
5. Try logout/login again

## Files Updated
- `lib/adminAuth.ts` - Added detailed logging
- `app/api/debug/admin-auth-detailed/route.ts` - New debug endpoint

## Detailed Guide
See: `ADMIN_AUTH_COMPLETE_FIX.md`

