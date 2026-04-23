# Quick Admin Notification Fix

## Problem
Admin getting "Forbidden - Admin access required" when sending notifications

## Root Cause
Admin user's role is not set to "admin" in database, OR JWT token is out of sync

## Quick Fix (5 minutes)

### Step 1: Check if Admin User Exists
```
Go to: http://localhost:3000/api/debug/check-users-count
Look for: "role": "admin"
```

### Step 2: If No Admin User, Create One

**Using MongoDB Atlas:**
1. Go to https://cloud.mongodb.com
2. Click your cluster → Collections
3. Find "users" collection
4. Find your user document
5. Edit and add: `"role": "admin"`
6. Save

**Or using MongoDB Shell:**
```javascript
db.users.updateOne(
  { email: "your-email@example.com" },
  { $set: { role: "admin" } }
)
```

### Step 3: Logout and Login
1. Click logout
2. Login again
3. New JWT token created with admin role

### Step 4: Test
1. Go to `/admin/notifications`
2. Try sending notification
3. Should work now ✅

## Verification

Go to: `http://localhost:3000/api/debug/check-admin-auth`

Should show:
```json
{
  "success": true,
  "database": {
    "role": "admin",
    "isAdmin": true
  },
  "match": {
    "roleMatch": true
  }
}
```

## If Still Not Working

1. Check browser console (F12) for errors
2. Check server logs for errors
3. Verify role is exactly "admin" (case-sensitive)
4. Restart development server
5. Try logout/login again

## Debug Endpoints

- `GET /api/debug/check-admin-auth` - Check current admin status
- `GET /api/debug/check-users-count` - List all users and roles
- `POST /api/debug/test-admin-notification` - Test admin notification flow

