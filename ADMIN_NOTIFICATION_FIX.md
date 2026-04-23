# Admin Notification Fix - Complete Guide

## Problem
Admin users are getting "Forbidden - Admin access required" error when trying to send notifications.

## Root Cause
The admin user's role in the database is not set to "admin", or the JWT token is out of sync with the database.

## Solution

### Step 1: Verify Admin User Exists

**Option A: Using Debug Endpoint (Easiest)**

1. Make sure development server is running: `npm run dev`
2. Open browser and go to: `http://localhost:3000/api/debug/check-users-count`
3. Look for users with `"role": "admin"`

**Expected output:**
```json
{
  "success": true,
  "stats": {
    "totalUsers": 5,
    "adminUsers": 1,
    "regularUsers": 4
  },
  "users": [
    {
      "email": "admin@example.com",
      "role": "admin",
      "fullName": "Admin User"
    }
  ]
}
```

**Option B: Using Script**

1. Run: `npx ts-node scripts/check-admin-users.ts`
2. This will show all users and their roles

### Step 2: Create Admin User (If Not Exists)

If no admin users found, you need to create one.

**Option A: Using MongoDB Atlas UI (Easiest)**

1. Go to MongoDB Atlas: https://cloud.mongodb.com
2. Login to your account
3. Go to your cluster
4. Click "Collections"
5. Find the "users" collection
6. Find your user document
7. Edit the document and add/update:
```json
{
  "role": "admin"
}
```
8. Save the document

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

Create a file `scripts/make-admin.ts`:
```typescript
import { MongoClient } from "mongodb";

async function makeAdmin(email: string) {
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
  console.error("Usage: npx ts-node scripts/make-admin.ts your-email@example.com");
  process.exit(1);
}

makeAdmin(email);
```

Then run:
```bash
npx ts-node scripts/make-admin.ts your-email@example.com
```

### Step 3: Logout and Login Again

After setting the admin role:

1. Go to your app
2. Click logout
3. Login again with your email and password
4. New JWT token will be created with role: "admin"

### Step 4: Test Admin Access

1. Go to `/admin/notifications`
2. Try to send a notification
3. Should work without "Forbidden" error

## Verification Checklist

- [ ] Admin user exists in database
- [ ] Admin user has `role: "admin"`
- [ ] Admin user logged out
- [ ] Admin user logged back in
- [ ] Can access `/admin/notifications`
- [ ] Can send notifications without error
- [ ] No "Forbidden - Admin access required" error

## Debug Endpoints

### Check Admin Auth Status
```
GET /api/debug/check-admin-auth
```
Shows current session and database user info

### Check All Users
```
GET /api/debug/check-users-count
```
Shows all users and their roles

### Test Admin Notification Flow
```
POST /api/debug/test-admin-notification
```
Tests complete admin notification flow

## Common Issues

### Issue 1: "adminUsers: 0"
**Cause**: No admin users in database
**Solution**: Follow Step 2 to create admin user

### Issue 2: "roleMatch: false"
**Cause**: JWT token has old role
**Solution**: Logout and login again

### Issue 3: "User not found in database"
**Cause**: User email doesn't match
**Solution**: Check email is correct, try logging out and in

### Issue 4: Still getting "Forbidden" error
**Cause**: Multiple possible issues
**Solution**:
1. Verify admin role is set in database
2. Logout and login again
3. Check browser console for errors
4. Check server logs for errors
5. Restart development server

## Files Modified

### New Debug Endpoints
- `app/api/debug/check-admin-auth/route.ts` - Check admin auth status
- `app/api/debug/check-users-count/route.ts` - Check all users
- `app/api/debug/test-admin-notification/route.ts` - Test admin notification

### New Scripts
- `scripts/check-admin-users.ts` - Check admin users in database

## Architecture

### How Admin Notification Works

```
User clicks "Gửi thông báo"
    ↓
Frontend calls /api/admin/notifications (POST)
    ↓
API calls checkAdminAuth()
    ↓
checkAdminAuth() gets session
    ↓
checkAdminAuth() queries database for user
    ↓
checkAdminAuth() checks if role === "admin"
    ↓
If admin → Return { isAdmin: true }
If not admin → Return { isAdmin: false, error: "Forbidden" }
    ↓
If admin → Create notification
If not admin → Return 403 error
```

### Why "Forbidden" Error Happens

```
Database: role = "admin"
JWT Token: role = "user" (cached from old login)
    ↓
User navigates to /admin/notifications
    ↓
Middleware checks JWT token
    ↓
JWT token has role: "user" → Allows access (middleware is lenient)
    ↓
Frontend calls /api/admin/notifications
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

### Solution: Refresh JWT Token

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

### Test 1: Create Admin User
1. Go to MongoDB Atlas
2. Update user role to "admin"
3. Verify in debug endpoint

### Test 2: Refresh JWT Token
1. Admin user logs out
2. Admin user logs back in
3. New JWT token created

### Test 3: Send Notification
1. Go to `/admin/notifications`
2. Fill in form
3. Click "Gửi thông báo"
4. Should see success message

### Test 4: Verify in Database
1. Go to MongoDB Atlas
2. Check notifications collection
3. Should see new notification

## Summary

| Step | Action | Time |
|------|--------|------|
| 1 | Check admin user exists | 2 min |
| 2 | Create admin user (if needed) | 2 min |
| 3 | Logout and login | 1 min |
| 4 | Test admin access | 1 min |
| **Total** | | **6 min** |

## Next Steps

1. Run debug endpoint to check admin users
2. Create admin user if needed
3. Logout and login
4. Test sending notification
5. Verify in database

