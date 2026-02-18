@echo off
echo ========================================
echo   FIX 502 ERROR - DEPLOY
echo ========================================
echo.
echo Da sua:
echo - Tang timeout len 60 giay
echo - Xu ly loi 502 (backend cold start)
echo - Them nut "Thu lai"
echo - Better error messages
echo.
echo ========================================
echo.

echo Step 1: Adding files...
git add app/api/upload-document-complete/route.ts
git add app/dashboard-new/documents/page.tsx
git add FIX_502_ERROR.md
git add DEPLOY_FIX_502.bat

echo.
echo Step 2: Committing...
git commit -m "fix: Handle 502 error with retry button and 60s timeout"

echo.
echo Step 3: Pushing...
git push origin main

echo.
echo ========================================
echo   DONE!
echo ========================================
echo.
echo Sau khi deploy:
echo 1. Doi Vercel deploy (2-3 phut)
echo 2. Test upload file
echo 3. Neu gap 502, doi 10 giay va click "Thu lai"
echo 4. Lan thu 2 se thanh cong
echo.
echo Luu y:
echo - Railway backend can 10-30s de wake up
echo - Request dau tien co the bi 502
echo - Click "Thu lai" sau 10 giay
echo.
echo Press any key to exit...
pause > nul
