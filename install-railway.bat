@echo off
echo ========================================
echo   RAILWAY CLI INSTALLER
echo ========================================
echo.

echo Downloading Railway CLI for Windows...
echo.

powershell -Command "& {Invoke-WebRequest -Uri 'https://github.com/railwayapp/cli/releases/latest/download/railway_windows_amd64.zip' -OutFile 'railway.zip'}"

if exist railway.zip (
    echo.
    echo Extracting...
    powershell -Command "& {Expand-Archive -Path 'railway.zip' -DestinationPath '.' -Force}"
    
    echo.
    echo Cleaning up...
    del railway.zip
    
    echo.
    echo ========================================
    echo ✅ Railway CLI installed successfully!
    echo ========================================
    echo.
    echo The railway.exe file is in the current directory.
    echo.
    echo To use it:
    echo   .\railway login
    echo   .\railway up
    echo.
    echo Or add it to PATH for global access.
    echo.
) else (
    echo.
    echo ❌ Download failed!
    echo.
    echo Please download manually from:
    echo https://github.com/railwayapp/cli/releases/latest
    echo.
)

pause
