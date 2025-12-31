@echo off
echo ========================================
echo   NGROK TUNNEL FOR ENGLISH LEARNING APP
echo ========================================
echo.
echo Dang khoi dong ngrok tunnel cho port 3001...
echo.
echo LUU Y QUAN TRONG:
echo 1. Sau khi ngrok chay, copy URL (vd: https://abc123.ngrok-free.app)
echo 2. Cap nhat NEXTAUTH_URL trong file .env thanh URL do
echo 3. Restart server Next.js (npm run dev)
echo 4. Cau hinh Google OAuth: them URL ngrok vao Authorized redirect URIs
echo    - Vao: https://console.cloud.google.com/apis/credentials
echo    - Them: https://YOUR-NGROK-URL/api/auth/callback/google
echo.
echo ========================================
echo.

ngrok http 3001
