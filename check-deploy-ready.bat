@echo off
echo ========================================
echo   DEPLOYMENT READINESS CHECK
echo ========================================
echo.

set READY=1

echo [1/10] Checking Node.js...
node --version >nul 2>&1
if errorlevel 1 (
    echo ❌ Node.js not found! Install from https://nodejs.org
    set READY=0
) else (
    node --version
    echo ✅ Node.js installed
)
echo.

echo [2/10] Checking npm...
npm --version >nul 2>&1
if errorlevel 1 (
    echo ❌ npm not found!
    set READY=0
) else (
    npm --version
    echo ✅ npm installed
)
echo.

echo [3/10] Checking Python...
python --version >nul 2>&1
if errorlevel 1 (
    echo ❌ Python not found! Install Python 3.11
    set READY=0
) else (
    python --version
    echo ✅ Python installed
)
echo.

echo [4/10] Checking Vercel CLI...
vercel --version >nul 2>&1
if errorlevel 1 (
    echo ⚠️  Vercel CLI not found
    echo    Install: npm i -g vercel
    set READY=0
) else (
    vercel --version
    echo ✅ Vercel CLI installed
)
echo.

echo [5/10] Checking Railway CLI...
railway --version >nul 2>&1
if errorlevel 1 (
    echo ⚠️  Railway CLI not found
    echo    Install: npm i -g @railway/cli
    set READY=0
) else (
    railway --version
    echo ✅ Railway CLI installed
)
echo.

echo [6/10] Checking package.json...
if exist package.json (
    echo ✅ package.json found
) else (
    echo ❌ package.json not found!
    set READY=0
)
echo.

echo [7/10] Checking vercel.json...
if exist vercel.json (
    echo ✅ vercel.json found
) else (
    echo ⚠️  vercel.json not found (will be created)
)
echo.

echo [8/10] Checking python-api/railway.json...
if exist python-api\railway.json (
    echo ✅ railway.json found
) else (
    echo ❌ railway.json not found!
    set READY=0
)
echo.

echo [9/10] Checking python-api/requirements-railway.txt...
if exist python-api\requirements-railway.txt (
    echo ✅ requirements-railway.txt found
) else (
    echo ❌ requirements-railway.txt not found!
    set READY=0
)
echo.

echo [10/10] Checking node_modules...
if exist node_modules (
    echo ✅ node_modules found
) else (
    echo ⚠️  node_modules not found
    echo    Run: npm install
    set READY=0
)
echo.

echo ========================================
if %READY%==1 (
    echo ✅ READY TO DEPLOY!
    echo.
    echo Next steps:
    echo 1. Deploy Backend: cd python-api ^&^& railway up
    echo 2. Deploy Frontend: vercel --prod
    echo.
    echo Or run: deploy.bat
) else (
    echo ❌ NOT READY TO DEPLOY
    echo.
    echo Please fix the issues above first.
)
echo ========================================
echo.
pause
