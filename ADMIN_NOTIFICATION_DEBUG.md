# Admin Notification Debug Guide

## Problem
Admin users are getting "Forbidden - Admin access required" error when trying to send notifications.

## Root Cause Analysis

The issue is likely one of these:
1. Admin user's role is not "admin" in database
2. JWT token has old role (cached)
3. Session role doesn't match database role
4. Database connection issue

## Debug Steps

### Step 1: Check Admin Auth Status

Go to: `http://localhost:3000/api/debug/check-admin-auth`

This will show:
- Current session info
- User data from database
- Whether session role matches database role

**Expected output:**
```json
{
  "success": true,
  "session": {
    "email": "admin@example.com",
    "role": "admin"
  },
  "database": {
    "email": "admin@example.com",
    "role": "admin",
    "isAdmin": true
  },
  "match": {
    "emailMatch": true,
    "roleMatch": true
  }
}
```

### Step 2: Check Users in Database

Go to: `http://localhost:3000/api/debug/check-users-count`

This will show:
- Total users in database
- Number of admin users
- List of all users with their roles

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
    },
    ...
  ]
}
```

### Step 3: Test Admin Notification

Go to: `http://localhost:3000/api/debug/test-admin-notification` (POST request)

This will test the complete flow:
1. Check session
2. Connect to database
3. Find user in database
4. Check admin auth
5. Return detailed results

**Expected output:**
```json
{
  "success": true,
  "message": "All checks passed - admin can send notifications",
  "details": {
    "sessionEmail": "admin@example.com",
    "databaseRole": "admin",
    "isAdmin": true
  }
}
```

## Common Issues & Solutions

### Issue 1: "No session found"
**Cause**: User is not logged in
**Solution**: 
1. Login to your account
2. Make sure you're logged in as admin user
3. Try again

### Issue 2: "User not found in database"
**Cause**: User email in session doesn't match database
**Solution**:
1. Check if user exists in database
2. Verify email is correct
3. Try logging out and logging back in

### Issue 3: "roleMatch: false"
**Cause**: JWT token has old role (cached)
**Solution**:
1. Logout
2. Login again
3. New JWT token will have current role from database

### Issue 4: "isAdmin: false" but role is "admin"
**Cause**: Database connection issue or role mismatch
**Solution**:
1. Check database connection
2. Verify role is exactly "admin" (case-sensitive)
3. Restart server
4. Try again

## How to Fix

### If Admin Role is Missing

1. Go to MongoDB Atlas
2. Find the user document
3. Add or update the role field:
```javascript
db.users.updateOne(
  { email: "admin@example.com" },
  { $set: { role: "admin" } }
)
```

### If JWT Token is Out of Sync

1. Admin user logs out
2. Admin user logs back in
3. New JWT token created with current role
4. Try sending notification again

### If Database Connection Fails

1. Check MONGO_URI in .env
2. Verify database is accessible
3. Check MongoDB Atlas connection status
4. Restart development server

## Testing Checklist

- [ ] Admin user is logged in
- [ ] Session shows role: "admin"
- [ ] Database shows role: "admin"
- [ ] Session role matches database role
- [ ] Admin auth check passes
- [ ] Can send notifications without error

## Files to Check

### Authentication
- `lib/authOptions.ts` - JWT callback
- `lib/adminAuth.ts` - Admin verification
- `middleware.ts` - Route protection

### Database
- `lib/mongodb.ts` - MongoDB connection
- `lib/db.ts` - Mongoose connection
- `.env` - Database configuration

### API Endpoints
- `app/api/admin/notifications/route.ts` - Send notifications
- `app/api/admin/users/route.ts` - List users
- `app/api/debug/check-admin-auth/route.ts` - Debug endpoint

## Debug Endpoints

### Check Admin Auth
```
GET /api/debug/check-admin-auth
```
Shows current session and database user info

### Check Users Count
```
GET /api/debug/check-users-count
```
Shows all users and their roles

### Test Admin Notification
```
POST /api/debug/test-admin-notification
```
Tests complete admin notification flow

## Next Steps

1. Run debug endpoints to identify the issue
2. Check the output for errors
3. Follow the solution for your specific issue
4. Test again to verify fix

## Support

If you're still having issues:
1. Check browser console for errors (F12)
2. Check server logs for error messages
3. Verify database connection
4. Try restarting development server
5. Check MongoDB Atlas for user data

