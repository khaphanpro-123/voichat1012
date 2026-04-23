# Current Issues Diagnosis & Solutions

## Issue 1: Translation Feature Not Working ❌

### Problem
The "Dịch sang Tiếng Việt" (Translate to Vietnamese) button in vocabulary page doesn't work.

### Root Cause
`GOOGLE_API_KEY` environment variable is set to placeholder value:
```env
GOOGLE_API_KEY=your_google_api_key_here
```

### Solution
1. Get a real Google API key from [Google AI Studio](https://aistudio.google.com/app/apikey)
2. Replace the placeholder in `.env`:
```env
GOOGLE_API_KEY=your_actual_key_here
```
3. Restart development server
4. Test translation feature

### Verification
- Check browser console for translation errors
- Look for API response in Network tab
- Should see 200 status, not 401/403

---

## Issue 2: Admin Users Getting 403 Errors ❌

### Problem
Admin users with `role: "admin"` get 403 errors when:
- Clicking "Gửi thông báo" (Send Notification)
- Clicking "Quản lý người dùng" (Manage Users)
- Accessing `/admin/users` or `/admin/notifications`

### Root Cause: JWT Token Caching

When you manually change a user's role in database:

```
Database: role = "admin"
JWT Token (in browser): role = "user" (cached from old login)
```

**Flow:**
1. User logs in with `role: "user"` → JWT created with `role: "user"`
2. Admin manually changes role in database to `role: "admin"`
3. User navigates to `/admin/users`
4. Middleware checks JWT token → sees `role: "user"` → allows access (because JWT callback tries to refresh)
5. API calls `checkAdminAuth()` → checks database → finds `role: "admin"` ✓
6. BUT: Session still has old role from JWT cache
7. API returns 403 (Forbidden)

### Why This Happens
- JWT tokens are cached in browser
- JWT callback runs on every request but might not update immediately
- Session role might be out of sync with database role

### Solution: User Must Logout and Login Again

**Steps:**
1. User logs out
2. User logs back in
3. New JWT token created with current role from database
4. User can now access admin pages

### How to Test
1. Create a test user with `role: "user"`
2. User logs in → redirected to `/dashboard-new` ✓
3. Manually change role in database: `db.users.updateOne({email: "test@example.com"}, {$set: {role: "admin"}})`
4. User tries to access `/admin/users` → might see 403 error
5. User logs out and logs back in
6. User can now access `/admin/users` ✓

### Verification Checklist
- [ ] User can access `/admin` after logout/login
- [ ] User can send notifications
- [ ] User can manage users
- [ ] No redirect loop
- [ ] No 403 errors after logout/login

---

## Issue 3: Admin Redirect Loop (FIXED) ✅

### Status: RESOLVED
- Removed all 403 redirects from admin pages
- Middleware now handles all redirects
- No more race conditions

### Files Fixed:
- `app/admin/page.tsx` - Removed 403 redirect
- `app/admin/users/page.tsx` - Removed 403 redirect
- `app/admin/users/[userId]/page.tsx` - Removed 403 redirect

---

## Architecture Overview

### Authentication Flow
```
User Login
    ↓
Credentials Provider validates password
    ↓
JWT Callback runs:
  - Gets user from database
  - Extracts role from database
  - Stores role in JWT token
    ↓
Session Callback runs:
  - Copies role from JWT to session
    ↓
JWT Token stored in browser (cached)
```

### Admin Access Flow
```
User navigates to /admin/users
    ↓
Middleware checks JWT token
    ↓
JWT token has role: "admin" → Allow access
    ↓
Admin page loads
    ↓
Admin page calls /api/admin/users
    ↓
checkAdminAuth() checks database
    ↓
Database has role: "admin" → Return 200
    ↓
Page displays users
```

### If Role Changed in Database
```
Database role changed: "user" → "admin"
    ↓
User still has old JWT token (cached)
    ↓
User navigates to /admin/users
    ↓
Middleware checks JWT token (still "user")
    ↓
JWT Callback tries to refresh from database
    ↓
But session might still have old role
    ↓
API checks database (finds "admin")
    ↓
Session role is "user" → API returns 403
    ↓
User must logout and login to refresh JWT
```

---

## Troubleshooting Guide

### Symptom: 403 Error on Admin Pages
**Cause**: JWT token out of sync with database
**Solution**: Logout and login again

### Symptom: Translation Button Not Working
**Cause**: Missing or invalid GOOGLE_API_KEY
**Solution**: Add real API key to .env

### Symptom: Redirect Loop
**Cause**: Page redirects conflicting with middleware
**Solution**: Already fixed - removed page redirects

### Symptom: Can't Access Admin After Role Change
**Cause**: JWT token not refreshed
**Solution**: Logout and login again

---

## Files to Check

### Core Auth Files
- `lib/authOptions.ts` - JWT callback configuration
- `lib/adminAuth.ts` - Admin role verification
- `middleware.ts` - Route protection and redirects

### Admin Pages
- `app/admin/page.tsx` - Admin dashboard
- `app/admin/users/page.tsx` - Users management
- `app/admin/notifications/page.tsx` - Notifications

### API Endpoints
- `app/api/admin/notifications/route.ts` - Send notifications
- `app/api/admin/users/route.ts` - Manage users
- `app/api/translate-vocabulary-full/route.ts` - Translation

### Environment
- `.env` - Development environment variables
- `.env.production` - Production environment variables

---

## Next Steps

### Immediate Actions
1. [ ] Add real GOOGLE_API_KEY to `.env`
2. [ ] Test translation feature
3. [ ] Test admin role assignment and logout/login flow

### Verification
1. [ ] Create test admin user
2. [ ] Verify can access `/admin` pages
3. [ ] Verify can send notifications
4. [ ] Verify can manage users
5. [ ] Test role change → logout → login flow

### Monitoring
- Check browser console for errors
- Check server logs for API errors
- Monitor JWT token in browser DevTools
- Verify database role matches session role

---

## Key Insights

### JWT Token Caching
- JWT tokens are cached in browser for performance
- Role changes in database don't immediately affect JWT
- User must logout and login to refresh JWT
- This is by design for security and performance

### Middleware vs Page Redirects
- **Middleware**: Server-side, atomic, reliable
- **Page Redirects**: Client-side, can conflict with middleware
- **Best Practice**: Always use middleware for auth redirects

### Admin Role Assignment
- Change role in database
- User must logout and login
- New JWT will have updated role
- Then user can access admin pages

---

## Summary

| Issue | Status | Solution |
|-------|--------|----------|
| Translation not working | ❌ | Add GOOGLE_API_KEY |
| Admin 403 errors | ❌ | Logout and login |
| Redirect loop | ✅ | Already fixed |
| JWT caching | ℹ️ | By design |

**Status**: 1 issue needs API key, 1 issue needs user action, 1 issue fixed

