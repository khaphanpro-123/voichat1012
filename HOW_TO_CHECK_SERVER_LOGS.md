# How to Check Server Logs

## Why Check Server Logs?
Server logs show detailed error messages that help identify the exact problem with admin auth.

## Where to Find Server Logs

### If Running Locally (npm run dev)

**Terminal/Console Output:**
1. Open the terminal where you ran `npm run dev`
2. Look for messages starting with `[AdminAuth]` or `[Debug]`
3. These show what's happening in the admin auth process

**Example output:**
```
[AdminAuth] Session: { hasSession: true, email: 'admin@example.com', role: 'admin' }
[AdminAuth] Database connected
[AdminAuth] User from database: { found: true, email: 'admin@example.com', role: 'admin' }
[AdminAuth] Admin verified successfully
```

### If Running on Vercel (Production)

1. Go to https://vercel.com
2. Login to your account
3. Click your project
4. Click "Deployments"
5. Click the latest deployment
6. Click "Logs"
7. Look for `[AdminAuth]` or `[Debug]` messages

## What to Look For

### Success Logs
```
[AdminAuth] Admin verified successfully
```
✅ Admin auth is working

### Error Logs

**"No session found"**
```
[AdminAuth] No session found
```
❌ User is not logged in

**"User not found in database"**
```
[AdminAuth] User from database: { found: false }
```
❌ User email doesn't match

**"User role is not admin"**
```
[AdminAuth] User role is not admin: user
```
❌ User role is "user" not "admin"

**"Database connection failed"**
```
[AdminAuth] Error: connect ECONNREFUSED
```
❌ Cannot connect to database

## How to Read Logs

### Step 1: Trigger the Action
1. Go to `/admin/users` or `/admin/notifications`
2. Try to perform an action (view users or send notification)

### Step 2: Check Terminal
1. Look at the terminal where `npm run dev` is running
2. Find the most recent `[AdminAuth]` or `[Debug]` messages
3. Read the error message

### Step 3: Identify the Problem
Based on the error message, follow the solution:

| Error | Cause | Solution |
|-------|-------|----------|
| "No session found" | Not logged in | Login to account |
| "User not found" | Email mismatch | Logout and login |
| "User role is not admin" | Role not set | Set role to "admin" |
| "Database connection failed" | DB error | Check MONGO_URI, restart |

## Example: Debugging Admin Notification Error

### Step 1: Try to Send Notification
1. Go to `/admin/notifications`
2. Fill form and click "Gửi thông báo"
3. Get 403 error

### Step 2: Check Server Logs
Terminal shows:
```
[AdminAuth] Session: { hasSession: true, email: 'admin@example.com', role: 'admin' }
[AdminAuth] Database connected
[AdminAuth] User from database: { found: true, email: 'admin@example.com', role: 'user' }
[AdminAuth] User role is not admin: user
```

### Step 3: Identify Problem
- Session role: "admin"
- Database role: "user"
- Problem: Role mismatch (JWT has old role)

### Step 4: Solution
1. Logout
2. Login again
3. New JWT token created with current role from database

## Detailed Logging

I've added detailed logging to `lib/adminAuth.ts`. Now when you try to access admin features, you'll see:

```
[AdminAuth] Session: { hasSession: true, email: '...', role: '...' }
[AdminAuth] Database connected
[AdminAuth] User from database: { found: true, email: '...', role: '.