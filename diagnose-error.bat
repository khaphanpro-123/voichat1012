@echo off
echo ========================================
echo ERROR DIAGNOSTIC TOOL
echo ========================================
echo.

echo Checking React and Next.js versions...
call npm list react react-dom next 2>nul
echo.

echo Checking lucide-react installation...
call npm list lucide-react 2>nul
echo.

echo Checking for build errors...
if exist .next\trace (
    echo Found build trace file
    type .next\trace | findstr /i "error"
) else (
    echo No build trace found - run 'npm run build' first
)
echo.

echo Checking TypeScript configuration...
if exist tsconfig.json (
    echo ✅ tsconfig.json exists
) else (
    echo ❌ tsconfig.json missing
)
echo.

echo Checking Next.js configuration...
if exist next.config.js (
    echo ✅ next.config.js exists
    type next.config.js
) else if exist next.config.mjs (
    echo ✅ next.config.mjs exists
    type next.config.mjs
) else (
    echo ⚠️ No Next.js config found
)
echo.

echo Checking for common error files...
if exist .next\server\pages-manifest.json (
    echo ✅ Build completed successfully
) else (
    echo ❌ Build incomplete or failed
)
echo.

echo ========================================
echo DIAGNOSTIC COMPLETE
echo ========================================
echo.
echo Recommendations:
echo 1. If lucide-react is installed, the new code doesn't use it
echo 2. If build is incomplete, run: npm run build
echo 3. If errors persist, check ERROR_ANALYSIS_COMPLETE.md
echo.

pause
