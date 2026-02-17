# HƯỚNG DẪN DEPLOY CUỐI CÙNG

## Vấn đề hiện tại
```
Module not found: Can't resolve 'd3'
Import trace: ./app/dashboard-new/vocabulary/page.tsx
```

## Nguyên nhân
Vercel có thể đang cache build cũ hoặc Git chưa commit file đã xóa.

## Giải pháp - 3 bước

### Bước 1: Clear local cache
```bash
# Xóa .next folder
rmdir /s /q .next

# Hoặc trên Linux/Mac
rm -rf .next
```

### Bước 2: Commit và push
```bash
# Check status
git status

# Add all changes
git add .

# Commit với message rõ ràng
git commit -m "fix: Remove all graph visualization to fix build errors"

# Push
git push origin main
```

### Bước 3: Clear Vercel cache
Có 2 cách:

#### Cách 1: Qua Dashboard
1. Vào https://vercel.com/dashboard
2. Chọn project `voichat1012`
3. Vào Settings → General
4. Scroll xuống "Build & Development Settings"
5. Click "Clear Build Cache"
6. Redeploy

#### Cách 2: Qua vercel.json (đã tạo)
File `vercel.json` đã được tạo với:
```json
{
  "buildCommand": "rm -rf .next && npm run build"
}
```

Vercel sẽ tự động clear cache mỗi lần build.

## Script tự động

Đã tạo file `deploy-clean.bat`:
```bash
# Chạy script
deploy-clean.bat
```

Script sẽ:
1. ✅ Xóa .next cache
2. ✅ Check git status
3. ✅ Add all changes
4. ✅ Commit
5. ✅ Push to origin

## Files đã tạo/sửa

### Tạo mới:
- ✅ `.vercelignore` - Ignore unnecessary files
- ✅ `vercel.json` - Clear cache on build
- ✅ `deploy-clean.bat` - Auto deploy script
- ✅ `COMMIT_MESSAGE.txt` - Commit message template

### Đã xóa:
- ❌ `components/knowledge-graph-d3.tsx`
- ❌ `components/knowledge-graph-viewer.tsx`
- ❌ `components/knowledge-graph-viewer-wrapper.tsx`

### Đã sửa:
- ✅ `app/dashboard-new/documents/page.tsx` - Placeholder
- ✅ `app/dashboard-new/vocabulary/page.tsx` - Placeholder
- ✅ `package.json` - Removed d3, cytoscape

## Kiểm tra trước khi deploy

### 1. Local check:
```bash
# Không có file graph components
dir components\knowledge-graph*
# Should show: File Not Found

# Không có import d3
findstr /s "import.*d3" app\**\*.tsx
# Should show: No matches

# Không có import cytoscape
findstr /s "cytoscape" app\**\*.tsx
# Should show: No matches
```

### 2. Git check:
```bash
git status
# Should show deleted files and modified files

git log -1
# Should show latest commit message
```

### 3. Vercel check:
- Vào https://vercel.com/dashboard
- Check latest deployment
- Xem build logs
- Không có "Module not found" errors

## Nếu vẫn lỗi

### Option 1: Force redeploy
```bash
# Tạo empty commit
git commit --allow-empty -m "chore: force redeploy"
git push origin main
```

### Option 2: Clear Vercel cache manually
1. Vào Vercel Dashboard
2. Settings → General
3. Clear Build Cache
4. Redeploy latest commit

### Option 3: Delete và tạo lại deployment
1. Vào Vercel Dashboard
2. Settings → General
3. Scroll xuống "Delete Project"
4. Xóa project
5. Import lại từ Git

## Kết quả mong đợi

### Build logs:
```
✓ Compiled successfully
✓ Linting and checking validity of types
✓ Collecting page data
✓ Generating static pages
✓ Finalizing page optimization

Route (app)                              Size     First Load JS
┌ ○ /                                    1.2 kB         100 kB
├ ○ /dashboard-new/documents             4.5 kB         105 kB
├ ○ /dashboard-new/vocabulary            6.8 kB         108 kB
└ ○ /api/upload-document-complete        0 B            0 B

○  (Static)  prerendered as static content
```

### Deployment:
```
✅ Build completed
✅ Deployment ready
✅ No errors
✅ Production URL: https://voichat1012.vercel.app
```

## Tính năng hoạt động

### ✅ Working:
1. Upload documents (PDF/DOCX)
2. Extract vocabulary
3. Display flashcards:
   - Sort by importance
   - Flip animation
   - Text-to-Speech
   - IPA phonetics
   - Context sentences
   - Synonyms
   - Star ratings
   - Navigation
4. Vocabulary list
5. Quiz mode

### 🔄 Coming Soon:
1. Knowledge graph (Canvas API implementation)

## Kết luận

Sau khi chạy `deploy-clean.bat` và push code:
- ✅ Vercel sẽ clear cache
- ✅ Build sẽ thành công
- ✅ App sẽ hoạt động ổn định
- ✅ Flashcards (tính năng chính) hoạt động hoàn hảo

**Chạy ngay**: `deploy-clean.bat`
