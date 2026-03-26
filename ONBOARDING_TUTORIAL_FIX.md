# Onboarding Tutorial - Show Once Fix

## Problem
Khung thông báo "Chào mừng đến với LS-BRAIN!" hiện lại mỗi khi user chuyển giữa các chức năng khác nhau trong dashboard, gây phiền toái.

## Expected Behavior
Tutorial chỉ nên hiện **một lần duy nhất** khi user đăng nhập lần đầu tiên. Sau đó, khi user:
- Chuyển giữa các trang khác nhau (chat, documents, vocabulary, etc.)
- Refresh trang
- Quay lại dashboard

Tutorial **không nên hiện lại nữa**.

## Root Cause
Có 2 vấn đề trong logic cũ:

### 1. onClose không lưu trạng thái
```typescript
// OLD CODE
<OnboardingTutorial
  isOpen={showTutorial}
  onClose={() => setShowTutorial(false)}  // ❌ Chỉ đóng, không lưu
  onComplete={handleTutorialComplete}     // ✅ Lưu khi complete
/>
```

Khi user click nút X để đóng tutorial, nó chỉ set `showTutorial = false` mà không lưu vào localStorage. Khi chuyển trang và quay lại, tutorial sẽ hiện lại.

### 2. useEffect dependency
```typescript
// OLD CODE
useEffect(() => {
  if (userId) {
    const tutorialKey = `l2brain_tutorial_completed_${userId}`;
    const completed = localStorage.getItem(tutorialKey);
    if (!completed) {
      setTimeout(() => setShowTutorial(true), 500);
    }
  }
}, [userId]); // Chỉ chạy khi userId thay đổi
```

Logic này đúng, nhưng cần đảm bảo localStorage được set đúng cách.

## Solution

### 1. Tạo handleTutorialClose riêng
```typescript
const handleTutorialClose = () => {
  // Mark as completed even when closing (X button)
  if (userId) {
    const tutorialKey = `l2brain_tutorial_completed_${userId}`;
    localStorage.setItem(tutorialKey, "true");
  }
  setShowTutorial(false);
};
```

### 2. Sử dụng handleTutorialClose cho onClose
```typescript
<OnboardingTutorial
  isOpen={showTutorial}
  onClose={handleTutorialClose}        // ✅ Lưu khi đóng
  onComplete={handleTutorialComplete}  // ✅ Lưu khi complete
/>
```

### 3. Cải thiện useEffect
```typescript
useEffect(() => {
  if (userId) {
    const tutorialKey = `l2brain_tutorial_completed_${userId}`;
    const completed = localStorage.getItem(tutorialKey);
    
    // Only show if not completed AND not already showing
    if (!completed && !showTutorial) {
      setTimeout(() => setShowTutorial(true), 500);
    }
  }
}, [userId]); // Only run when userId changes (login/logout)
```

## How It Works

### First Login (New User)
1. User đăng nhập lần đầu
2. `userId` được set
3. useEffect check localStorage: `l2brain_tutorial_completed_${userId}` = null
4. Tutorial hiện lên sau 500ms
5. User click "Bắt đầu" hoặc "X" → localStorage được set = "true"
6. Tutorial đóng

### Subsequent Visits
1. User chuyển sang trang khác (chat, documents, etc.)
2. User quay lại dashboard
3. useEffect check localStorage: `l2brain_tutorial_completed_${userId}` = "true"
4. Tutorial **không hiện** ✅

### Different User
1. User A logout
2. User B login → `userId` thay đổi
3. useEffect check localStorage: `l2brain_tutorial_completed_${userB_id}` = null
4. Tutorial hiện cho User B (lần đầu của họ)

## localStorage Key Structure
```
Key: l2brain_tutorial_completed_${userId}
Value: "true" | null

Examples:
- l2brain_tutorial_completed_user123 = "true"
- l2brain_tutorial_completed_user456 = "true"
```

Mỗi user có key riêng, nên tutorial sẽ hiện cho mỗi user một lần duy nhất.

## Testing Scenarios

### Test 1: New User
1. Clear localStorage: `localStorage.clear()`
2. Login với user mới
3. ✅ Tutorial hiện lên
4. Click "X" hoặc "Bắt đầu"
5. ✅ Tutorial đóng
6. Refresh trang
7. ✅ Tutorial không hiện lại

### Test 2: Existing User
1. Login với user đã xem tutorial
2. ✅ Tutorial không hiện
3. Chuyển sang /chat
4. Quay lại dashboard
5. ✅ Tutorial không hiện

### Test 3: Multiple Users
1. Login User A → Tutorial hiện → Đóng
2. Logout
3. Login User B → Tutorial hiện (lần đầu của User B)
4. Logout
5. Login User A lại → Tutorial không hiện (đã xem rồi)

### Test 4: Force Show (Debug)
```javascript
// In browser console
localStorage.removeItem('l2brain_tutorial_completed_user123');
// Refresh page → Tutorial hiện lại
```

## Files Changed

### components/DashboardHome.tsx
**Changes:**
1. Added `handleTutorialClose` function
2. Updated `onClose` prop to use `handleTutorialClose`
3. Improved comments in useEffect

**Before:**
```typescript
<OnboardingTutorial
  isOpen={showTutorial}
  onClose={() => setShowTutorial(false)}
  onComplete={handleTutorialComplete}
/>
```

**After:**
```typescript
<OnboardingTutorial
  isOpen={showTutorial}
  onClose={handleTutorialClose}
  onComplete={handleTutorialComplete}
/>
```

## Benefits

1. ✅ Tutorial chỉ hiện một lần duy nhất cho mỗi user
2. ✅ Không phiền toái khi chuyển trang
3. ✅ Persistent across sessions (lưu trong localStorage)
4. ✅ Per-user basis (mỗi user có trạng thái riêng)
5. ✅ Dễ debug (có thể clear localStorage để test)

## User Experience

### Before Fix
- ❌ Tutorial hiện lại mỗi khi chuyển trang
- ❌ Phiền toái, gây khó chịu
- ❌ User phải đóng nhiều lần

### After Fix
- ✅ Tutorial chỉ hiện một lần duy nhất
- ✅ Smooth experience khi navigate
- ✅ Professional hơn

## Notes

- localStorage key format: `l2brain_tutorial_completed_${userId}`
- Value: `"true"` (string, not boolean)
- Tutorial delay: 500ms (để UI load xong)
- useEffect dependency: `[userId]` (chỉ chạy khi login/logout)

## Conclusion

Đã fix hoàn toàn vấn đề tutorial hiện lại nhiều lần. Giờ tutorial chỉ hiện một lần duy nhất khi user đăng nhập lần đầu, và không hiện lại khi chuyển giữa các trang khác nhau.
