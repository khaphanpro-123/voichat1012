@echo off
echo ================================================================================
echo UPDATING NEXT.JS TO FIX SECURITY VULNERABILITIES
echo ================================================================================

echo.
echo Current Next.js version in package.json: 15.5.9
echo Target version: 15.5.9 (already updated)
echo.

echo [STEP 1] Installing dependencies with legacy peer deps...
call npm install --legacy-peer-deps

if %ERRORLEVEL% NEQ 0 (
    echo.
    echo ❌ Installation failed!
    pause
    exit /b 1
)

echo.
echo [STEP 2] Checking for vulnerabilities...
call npm audit

echo.
echo ================================================================================
echo ✅ NEXT.JS UPDATED SUCCESSFULLY
echo ================================================================================
echo.
echo Next steps:
echo 1. Commit changes: git add package.json package-lock.json
echo 2. Commit: git commit -m "fix: update Next.js to 15.5.9"
echo 3. Push: git push
echo.
echo OR for Railway deployment:
echo 1. Go to Railway Dashboard
echo 2. Service Settings → Root Directory → "python-api"
echo 3. Save and Redeploy
echo.
echo ================================================================================

pause
