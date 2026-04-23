# Quick Fix Guide - 2 Issues to Resolve

## Issue 1: Translation Feature Not Working (5 minutes)

### What's Wrong
Translation button in vocabulary page doesn't work because API key is missing.

### How to Fix

**Step 1: Get Google API Key**
1. Go to https://aistudio.google.com/app/apikey
2. Click "Create API Key"
3. Copy the generated key

**Step 2: Add to .env**
Open `.env` and replace:
```env
# OLD (doesn't work)
GOOGLE_API_KEY=your_google_api_key_here

# NEW (with your actual key)
GOOGLE_API_KEY=AIzaSyD...your_actual_key...
```

**Step 3: Restart Server**
- Stop development server (Ctrl+C)
- Start it again: `npm run dev`

**Step 4: Test**
1. Go to vocabulary page
2. Click "Dịch sang Tiếng Việt"
3. Should see "Đang dịch..." then Vietnamese translation

---

## Issue 2: Admin Users Getting 403 Errors (1 minute per user)

### What's Wrong
When you manually change a user's role to "admin" in database, they get 403 errors because their JWT token is cached with old role.

### How to Fix

**For Each Admin User:**
1. Tell them to logout
2. Tell them to login again
3. They can now access admin pages

**Why This Works**
- Logout clears old JWT token
- Login creates new JWT token with current role from database
- New token has `role: "admin"`
- Can now access `/admin` pages

### Testing

**Test 1: Create New Admin User**
1. Register new user (gets `role: "user"`)
2. Manually change role in database: `db.users.updateOne({email: "test@example.com"}, {$set: {role: "admin"}})`
3. User logs out and logs back in
4. User can now access `/admin` ✓

**Test 2: Verify Admin Can Send Notifications**
1. Admin user logs in
2. Go to `/admin/notifications`
3. Fill form and click "Gửi thông báo"
4. Should see success message ✓

**Test 3: Verify Admin Can Manage Users**
1. Admin user logs in
2. Go to `/admin/users`
3. Should see list of users ✓
4. Can add/delete users ✓

---

## Verification Checklist

### Translation Feature
- [ ] Added GOOGLE_API_KEY to .env
- [ ] Restarted development server
- [ ] Tested translation button
- [ ] Saw Vietnamese translation appear

### Admin Access
- [ ] Created test admin user
- [ ] User logged out and logged back in
- [ ] User can access `/admin` pages
- [ ] User can send notifications
- [ ] User can manage users
- [ ] No 403 errors

---

## Common Issues & Solutions

### Translation Still Not Working
**Check:**
1. Is GOOGLE_API_KEY set in .env? (not placeholder)
2. Did you restart server after changing .env?
3. Check browser console for errors
4. Check Network tab for API response

**Solution:**
1. Verify API key is valid
2. Restart server
3. Clear browser cache
4. Try again

### Admin Still Getting 403
**Check:**
1. Did user logout and login again?
2. Is role actually "admin" in database?
3. Check browser console for errors
4. Check server logs

**Solution:**
1. User must logout and login
2. Verify role in database
3. Check JWT token in browser DevTools
4. Restart server if needed

### Can't Find GOOGLE_API_KEY in .env
**Solution:**
1. Open `.env` file
2. Look for line: `GOOGLE_API_KEY=`
3. If not found, add it:
```env
# Google Generative AI (for translations)
GOOGLE_API_KEY=your_actual_key_here
```

---

## Files Modified

### For Translation Fix
- `.env` - Add GOOGLE_API_KEY

### For Admin Access
- No code changes needed
- Just user logout/login

---

## Timeline

| Task | Time | Status |
|------|------|--------|
| Get Google API Key | 2 min | ⏳ |
| Add to .env | 1 min | ⏳ |
| Restart server | 1 min | ⏳ |
| Test translation | 1 min | ⏳ |
| **Translation Total** | **5 min** | ⏳ |
| Admin logout/login | 1 min per user | ⏳ |
| Test admin access | 2 min | ⏳ |
| **Admin Total** | **3 min** | ⏳ |

---

## Support

If issues persist:
1. Check `CURRENT_ISSUES_DIAGNOSIS.md` for detailed troubleshooting
2. Check browser console for error messages
3. Check server logs for API errors
4. Verify environment variables are set correctly

