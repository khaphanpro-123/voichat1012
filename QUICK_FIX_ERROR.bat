@echo off
echo ========================================
echo QUICK FIX FOR REACT ERROR #31
echo ========================================
echo.

echo Step 1: Clearing build cache...
if exist .next rmdir /s /q .next
if exist node_modules\.cache rmdir /s /q node_modules\.cache
echo ✅ Cache cleared
echo.

echo Step 2: Rebuilding application...
call npm run build
echo.

if %ERRORLEVEL% EQU 0 (
    echo ========================================
    echo ✅ BUILD SUCCESSFUL!
    echo ========================================
    echo.
    echo Next steps:
    echo 1. Test locally: npm run dev
    echo 2. Deploy to Vercel: git add . ^&^& git commit -m "fix error" ^&^& git push
    echo.
) else (
    echo ========================================
    echo ❌ BUILD FAILED
    echo ========================================
    echo.
    echo Please check the error messages above.
    echo Common issues:
    echo - Missing dependencies: npm install
    echo - TypeScript errors: Check the error log
    echo - Import errors: Check file paths
    echo.
)

pause
