@echo off
echo ========================================
echo   DEPLOYMENT SCRIPT
echo ========================================
echo.

:menu
echo Choose deployment option:
echo 1. Deploy Frontend (Vercel)
echo 2. Deploy Backend (Railway)
echo 3. Deploy Both
echo 4. Check Status
echo 5. Exit
echo.
set /p choice="Enter choice (1-5): "

if "%choice%"=="1" goto deploy_frontend
if "%choice%"=="2" goto deploy_backend
if "%choice%"=="3" goto deploy_both
if "%choice%"=="4" goto check_status
if "%choice%"=="5" goto end
goto menu

:deploy_frontend
echo.
echo ========================================
echo   DEPLOYING FRONTEND TO VERCEL
echo ========================================
echo.
echo Building frontend...
call npm run build
if errorlevel 1 (
    echo ERROR: Build failed!
    pause
    goto menu
)
echo.
echo Deploying to Vercel...
call vercel --prod
echo.
echo Frontend deployed!
pause
goto menu

:deploy_backend
echo.
echo ========================================
echo   DEPLOYING BACKEND TO RAILWAY
echo ========================================
echo.
cd python-api
echo Deploying to Railway...
call railway up
cd ..
echo.
echo Backend deployed!
pause
goto menu

:deploy_both
echo.
echo ========================================
echo   DEPLOYING BOTH FRONTEND & BACKEND
echo ========================================
echo.
echo Step 1: Deploying Backend...
cd python-api
call railway up
cd ..
echo.
echo Step 2: Deploying Frontend...
call npm run build
call vercel --prod
echo.
echo Both deployed!
pause
goto menu

:check_status
echo.
echo ========================================
echo   CHECKING DEPLOYMENT STATUS
echo ========================================
echo.
echo Frontend (Vercel):
call vercel ls
echo.
echo Backend (Railway):
cd python-api
call railway status
cd ..
echo.
pause
goto menu

:end
echo.
echo Goodbye!
exit
