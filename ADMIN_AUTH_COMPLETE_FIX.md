# Admin Auth Complete Fix - Detailed Solution

## Problems
1. Admin cannot send notifications (403 error)
2. Admin cannot see users list (0 users shown)
3. Both issues are caused by `checkAdminAuth()` failing

## Root Cause
The `checkAdminAuth()` function is not properly verifying admin status. This could be due to:
1. Admin user doesn't have `role: "admin"` in database
2. JWT token has old role (cached)
3. Session role doesn't match database role
4. Database connection issue

## Complete Fix (10 minutes)

### Step 1: Check Admin Auth Status (2 minutes)

**Go to this URL:**
```
http://localhost:3000/api/debug/admin-auth-detailed
```

**This will show you:**
- Current session info
- User data from database
- Whether admin verification passed or failed
- Exact error message

**Expected output if working:**
```json
{
  "success": true,
  "message": "Admin verified successfully",
  "details": {
    "sessionEmail": "admin@example.com",
    "sessionRole": "admin",
    "databaseEmail": "admin@example.com",
    "databaseRole": "admin",
    "isAdmin": true
  }
}
```

### Step 2: Identify the Problem

Based on the output from Step 1:

**If `"step": "session"`:**
- Problem: User is not logged in
- Solution: Login to your account

**If `"step": "database_connection"`:**
- Problem: Cannot connect to database
- Solution: Check MONGO_URI in .env, restart server

**If `"step": "user_not_found"`:**
- Problem: User email doesn't match
- Solution: Check email is correct, logout and login again

**If `"step": "role_check"` and `"isAdmin": false`:**
- Problem: User role is not "admin" in database
- Solution: Follow Step 3 to set admin role

**If `"roleMatch": false`:**
- Problem: JWT token has old role
- Solution: Logout and login again

### Step 3: Set Admin Role (3 minutes)

If the debug endpoint shows `"isAdmin": false`, you need to set the admin role.

**Option A: Using MongoDB Atlas UI (Easiest)**

1. Go to https://cloud.mongodb.com
2. Login to your account
3. Click your cluster
4. Click "Collections"
5. Find "users" collection
6. Find your user document
7. Click "Edit" (pencil icon)
8. Add or update this field:
```json
"role": "admin"
```
9. Click "Update"

**Option B: Using MongoDB Shell**

1. Go to MongoDB Atlas
2. Click "Connect" → "Shell"
3. Run this command:
```javascript
db.users.updateOne(
  { email: "your-email@example.com" },
  { $set: { role: "admin" } }
)
```

**Option C: Using Node.js Script**

Create file `scripts/set-admin-role.ts`:
```typescript
import { MongoClient } from "mongodb";

async function setAdminRole(email: string) {
  const mongoUri = process.env.MONGO_URI;
  const dbName = process.env.MONGO_DB;

  if (!mongoUri || !dbName) {
    console.error("❌ Missing MONGO_URI or MONGO_DB");
    process.exit(1);
  }

  const client = new MongoClient(mongoUri);

  try {
    await client.connect();
    const db = client.db(dbName);

    const result = await db.collection("users").updateOne(
      { email: email.toLowerCase() },
      { $set: { role: "admin" } }
    );

    if (result.matchedCount === 0) {
      console.log(`❌ User not found: ${email}`);
    } else if (result.modifiedCount === 0) {
      console.log(`⚠️  User already has role: admin`);
    } else {
      console.log(`✅ User ${email} is now admin`);
    }
  } finally {
    await client.close();
  }
}

const email = process.argv[2];
if (!email) {
  console.error("Usage: npx ts-node scripts/set-admin-role.ts your-email@example.com");
  process.exit(1);
}

setAdminRole(email);
```

Then run:
```bash
npx ts-node scripts/set-admin-role.ts your-email@example.com
```

### Step 4: Refresh JWT Token (2 minutes)

After setting admin role:

1. Go to your app
2. Click logout
3. Login again with your email and password
4. New JWT token will be created with `role: "admin"`

### Step 5: Verify Admin Access (2 minutes)

1. Go to `/admin/users`
2. Should see list of users (not "0 users")
3. Go to `/admin/notifications`
4. Try sending a notification
5. Should work without "Forbidden" error

## Verification Checklist

- [ ] Ran debug endpoint: `/api/debug/admin-auth-detailed`
- [ ] Got `"success": true` response
- [ ] Admin user has `"role": "admin"` in database
- [ ] Logged out and logged back in
- [ ] Can see users list in `/admin/users`
- [ ] Can send notifications in `/admin/notifications`
- [ ] No "Forbidden - Admin access required" error

## Debug Endpoints

### Detailed Admin Auth Check
```
GET /api/debug/admin-auth-detailed
```
Shows step-by-step admin verification process

### Check All Users
```
GET /api/debug/check-users-count
```
Shows all users and their roles

### Check Admin Auth Status
```
GET /api/debug/check-admin-auth
```
Shows current session and database user info

## Common Issues & Solutions

### Issue 1: "step": "session"
**Cause**: User not logged in
**Solution**: Login to your account

### Issue 2: "step": "database_connection"
**Cause**: Cannot connect to database
**Solution**: 
1. Check MONGO_URI in .env
2. Verify database is accessible
3. Restart development server

### Issue 3: "step": "user_not_found"
**Cause**: User email doesn't match
**Solution**:
1. Check email is correct
2. Logout and login again
3. Check database for user

### Issue 4: "step": "role_check" and "isAdmin": false
**Cause**: User role is not "admin"
**Solution**: Follow Step 3 to set admin role

### Issue 5: "roleMatch": false
**Cause**: JWT token has old role
**Solution**: Logout and login again

### Issue 6: Still getting 403 error after all steps
**Cause**: Multiple possible issues
**Solution**:
1. Check server logs for errors
2. Verify admin role is set in database
3. Clear browser cookies
4. Restart development server
5. Try logout and login again

## Files Modified

### Updated Files
- `lib/adminAuth.ts` - Added detailed logging

### New Debug Endpoints
- `app/api/debug/admin-auth-detailed/route.ts` - Detailed admin auth check

### New Scripts
- `scripts/set-admin-role.ts` - Set admin role in database

## How It Works

### Admin Auth Flow
```
1. User logs in
   ↓
2. JWT token created with role from database
   ↓
3. User navigates to /admin/users
   ↓
4. Frontend calls /api/admin/users
   ↓
5. API calls checkAdminAuth()
   ↓
6. checkAdminAuth() gets session
   ↓
7. checkAdminAuth() queries database
   ↓
8. checkAdminAuth() checks if role === "admin"
   ↓
9. If admin → Return { isAdmin: true }
   If not admin → Return { isAdmin: false, error: "Forbidden" }
   ↓
10. If admin → Return users list
    If not admin → Return 403 error
```

### Why 403 Error Happens
```
Database: role = "admin"
JWT Token: role = "user" (cached from old login)
    ↓
User navigates to /admin/users
    ↓
Frontend calls /api/admin/users
    ↓
API calls checkAdminAuth()
    ↓
checkAdminAuth() checks database
    ↓
Database has role: "admin" ✓
    ↓
But session role is still "user" from JWT cache
    ↓
API returns 403 (Forbidden)
```

### Solution: Refresh JWT
```
User logs out
    ↓
Old JWT token deleted
    ↓
User logs back in
    ↓
New JWT token created with current role from database
    ↓
New JWT token has role: "admin"
    ↓
User can now access admin pages
```

## Testing

### Test 1: Admin Auth
1. Run: `GET /api/debug/admin-auth-detailed`
2. Should get `"success": true`

### Test 2: Users List
1. Go to `/admin/users`
2. Should see users (not "0 users")

### Test 3: Send Notification
1. Go to `/admin/notifications`
2. Fill form and click "Gửi thông báo"
3. Should see success message

### Test 4: Database
1. Go to MongoDB Atlas
2. Check notifications collection
3. Should see new notification

## Summary

| Step | Action | Time |
|------|--------|------|
| 1 | Check admin auth | 2 min |
| 2 | Identify problem | 1 min |
| 3 | Set admin role | 3 min |
| 4 | Refresh JWT | 2 min |
| 5 | Verify access | 2 min |
| **Total** | | **10 min** |

## Next Steps

1. Run debug endpoint
2. Follow solution for your specific issue
3. Verify admin access works
4. Test all admin features

