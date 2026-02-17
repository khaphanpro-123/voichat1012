@echo off
echo ========================================
echo CLEAN DEPLOY - Remove all graph code
echo ========================================
echo.

echo [1/5] Removing .next cache...
if exist .next rmdir /s /q .next
echo Done!
echo.

echo [2/5] Checking deleted files...
git status
echo.

echo [3/5] Adding all changes...
git add .
echo Done!
echo.

echo [4/5] Committing...
git commit -m "fix: Remove all graph visualization to fix build errors"
echo Done!
echo.

echo [5/5] Pushing to origin...
git push origin main
echo Done!
echo.

echo ========================================
echo DEPLOY COMPLETE!
echo ========================================
echo.
echo Vercel will auto-deploy from main branch
echo Check: https://vercel.com/dashboard
echo.
pause
