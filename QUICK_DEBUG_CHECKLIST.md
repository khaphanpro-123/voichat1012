# Quick Debug Checklist - 5 Dòng Log

## 🔥 Checklist Debug Nhanh (Copy-Paste)

Thêm 5 dòng log này vào `lib/adminAuth.ts`:

```typescript
console.log("1. Session:", session);
console.log("2. Email from session:", session?.user?.email);
const email = session?.user?.email?.trim().toLowerCase();
console.log("3. Normalized email:", email);
const user = await db.collection("users").findOne({ email });
console.log("4. User found:", user);
console.log("5. Is admin:", user?.role === "admin");
```

---

## 🧪 Test Endpoint

```
GET http://localhost:3000/api/debug/admin-auth-detailed
```

---

## ✅ Expected Success Output

```json
{
  "success": true,
  "details": {
    "isAdmin": true,
    "databaseRole": "admin"
  }
}
```

---

## ❌ Common Failures & Fixes

### Failure 1: "step": "session"
**Cause**: User not logged in
**Fix**: Login to your account

### Failure 2: "step": "session_email"
**Cause**: Email is undefined in session
**Fix**: Check NextAuth session callback

### Failure 3: "step": "user_not_found"
**Cause**: Email doesn't match in database
**Fix**: 
1. Check email is normalized (lowercase, no spaces)
2. Verify user exists in database
3. Check email matches exactly

### Failure 4: "step": "role_check"
**Cause**: User role is not "admin"
**Fix**: Set role to "admin" in database

---

## 🔧 Quick Fixes

### Fix 1: Set Admin Role
```javascript
db.users.updateOne(
  { email: "your-email@example.com" },
  { $set: { role: "admin" } }
)
```

### Fix 2: Logout and Login
1. Logout
2. Login again
3. New JWT token created

### Fix 3: Check Database
```javascript
db.users.findOne({ email: "your-email@example.com" })
```

---

## 📋 Files with Fixes

- ✅ `lib/adminAuth.ts` - Email validation + normalization
- ✅ `lib/authOptions.ts` - Email normalization in auth
- ✅ `app/api/debug/admin-auth-detailed/route.ts` - Debug endpoint

---

## 🚀 Next Steps

1. Restart server
2. Go to debug endpoint
3. Check output
4. If failing, check server logs
5. Apply quick fixes above

