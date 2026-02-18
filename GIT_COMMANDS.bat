@echo off
echo ========================================
echo   DEPLOY DOCUMENTS PAGE FIX
echo ========================================
echo.

echo Step 1: Adding files to git...
git add app/dashboard-new/documents/page.tsx
git add PLAN_C_EXECUTED.md
git add DEPLOY_NOW.md
git add TOM_TAT_PLAN_C.md
git add SO_SANH_TRUOC_SAU.md
git add GIT_COMMANDS.bat

echo.
echo Step 2: Committing changes...
git commit -m "fix: Replace documents with working simple version (Plan A)"

echo.
echo Step 3: Pushing to GitHub...
git push origin main

echo.
echo ========================================
echo   DONE! 
echo ========================================
echo.
echo Next steps:
echo 1. Wait for Vercel auto-deploy (2-3 minutes)
echo 2. Check: https://vercel.com/dashboard
echo 3. Test: https://voichat1012.vercel.app/dashboard-new/documents
echo.
echo Press any key to exit...
pause > nul
