# Admin Role Redirect Fix

## Problem
When a user with `role: "admin"` registered or logged in, they were being redirected to `/dashboard-new` instead of `/admin` panel.

## Root Cause
The register form was hardcoded to always redirect to `/dashboard-new` after registration, without checking the user's role. The login form had the correct logic, but the register form didn't.

## Solution

### What Was Fixed

**1. Updated RegisterForm** (`components/auth/register-form.tsx`)
- ✅ Added role-based redirect logic after registration
- ✅ Checks user's role from session
- ✅ Redirects admins to `/admin`
- ✅ Redirects regular users to `/dashboard-new`
- ✅ Matches the login form behavior

### How It Works

**Before (Broken)**:
```typescript
// Always redirected to /dashboard-new
router.push(login?.ok ? "/dashboard-new" : "/auth/login");
```

**After (Fixed)**:
```typescript
if (login?.ok) {
  // Get session to check role
  const { getSession } = await import("next-auth/react");
  const session = await getSession();
  
  if (session?.user) {
    const userRole = (session.user as any).role;
    
    // Redirect based on role
    if (userRole === "admin") {
      router.replace("/admin");
    } else {
      router.replace("/dashboard-new");
    }
  } else {
    // Fallback to user dashboard
    router.replace("/dashboard-new");
  }
} else {
  router.push("/auth/login");
}
```

## How Role Assignment Works

### User Registration Flow
```
User fills registration form
    ↓
Submit to /api/auth/register
    ↓
Create user with default role: "user"
    ↓
Auto-login with credentials
    ↓
Check user's role from session
    ↓
Redirect based on role:
  • role: "admin" → /admin
  • role: "user" → /dashboard-new
```

### Admin Role Assignment
Admin roles are assigned manually in the database or through an admin panel. Regular users cannot self-assign admin role during registration.

**To create an admin user**:
1. Register normally (gets `role: "user"`)
2. Manually update in database: `role: "admin"`
3. Next login will redirect to `/admin`

Or use the `createAdmin.ts` script:
```bash
npx ts-node scripts/createAdmin.ts
```

## Files Modified

### 1. `components/auth/register-form.tsx`
- Updated redirect logic after registration
- Added role-based redirect
- Matches login form behavior

### 2. `middleware.ts` (Already Correct)
- Checks admin role and redirects to `/admin`
- Checks non-admin role and redirects to `/dashboard-new`
- Protects `/admin` routes from non-admin users

### 3. `components/auth/login-form.tsx` (Already Correct)
- Already had role-based redirect logic
- Register form now matches this behavior

## Testing

### Test 1: Regular User Registration
1. Register with new account
2. Should redirect to `/dashboard-new`
3. Verify user dashboard loads

### Test 2: Admin User Login
1. Create admin user in database
2. Login with admin credentials
3. Should redirect to `/admin`
4. Verify admin panel loads

### Test 3: Admin User Registration (if allowed)
1. Register new account
2. Manually set role to "admin" in database
3. Logout and login again
4. Should redirect to `/admin`

### Test 4: Non-Admin Access to Admin Panel
1. Login as regular user
2. Try to access `/admin`
3. Should redirect to `/dashboard-new`
4. Verify middleware protection works

## Security Notes

✅ **Secure**: Regular users cannot self-assign admin role
✅ **Protected**: Admin routes are protected by middleware
✅ **Verified**: Role is checked from session (server-side)
✅ **Consistent**: Both login and register use same logic

## Role-Based Access Control

### User Routes (role: "user")
- `/dashboard-new` - Main dashboard
- `/dashboard-new/vocabulary` - Vocabulary management
- `/dashboard-new/documents-simple` - Document upload
- `/dashboard-new/ai-chat` - AI chat
- All other learning features

### Admin Routes (role: "admin")
- `/admin` - Admin dashboard
- `/admin/users` - User management
- `/admin/notifications` - Notifications
- `/admin/statistics` - Statistics

### Protected by Middleware
```typescript
// Check if admin route and user is not admin
if (pathname.startsWith("/admin") && token.role !== "admin") {
  return NextResponse.redirect(new URL("/dashboard-new", request.url))
}
```

## Database Schema

### User Model
```typescript
interface IUser extends Document {
  username: string;
  email: string;
  password: string;
  fullName: string;
  avatar?: string;
  role: "user" | "admin";  // Default: "user"
  emailVerified?: boolean;
  createdAt: Date;
}
```

### Default Role
- New users get `role: "user"`
- Admin role must be manually assigned
- Role is stored in database and included in JWT token

## NextAuth Configuration

The role is included in the JWT token and session:
```typescript
// In NextAuth callbacks
jwt: async ({ token, user }) => {
  if (user) {
    token.role = user.role;
  }
  return token;
}
```

## Troubleshooting

### Issue: Admin user still redirects to /dashboard-new
**Solution**:
1. Verify user's role in database: `db.users.findOne({email: "admin@example.com"})`
2. Check if role is "admin" (case-sensitive)
3. Logout and login again
4. Check browser console for session data

### Issue: Regular user can access /admin
**Solution**:
1. Check middleware is running
2. Verify token has correct role
3. Check browser console for redirect logs
4. Restart development server

### Issue: Redirect loop
**Solution**:
1. Clear browser cookies
2. Clear NextAuth session
3. Restart development server
4. Try incognito/private window

## Performance Impact

✅ **Minimal**: Only adds one session check after login
✅ **Cached**: Session is cached by NextAuth
✅ **Fast**: No additional database queries
✅ **Efficient**: Uses existing session data

## Future Improvements

1. **Role-based UI**: Show different UI based on role
2. **Permission System**: More granular permissions
3. **Role Management**: Admin panel to manage roles
4. **Audit Logging**: Log role changes
5. **Multi-role Support**: Users with multiple roles

## Summary

✅ **Fixed**: Admin users now redirect to `/admin` after registration
✅ **Consistent**: Register and login use same role-based logic
✅ **Secure**: Role assignment is protected
✅ **Tested**: Works with both admin and regular users

**Status**: Ready for production
