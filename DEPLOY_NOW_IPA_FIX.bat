@echo off
echo ========================================
echo DEPLOY IPA & MINDMAP FIX
echo ========================================
echo.

echo [1/4] Checking git status...
git status
echo.

echo [2/4] Adding all changes...
git add .
echo.

echo [3/4] Committing changes...
git commit -m "fix: Add IPA phonetics to vocabulary & enhance mindmap debug logging"
echo.

echo [4/4] Pushing to GitHub (auto-deploy Railway + Vercel)...
git push origin main
echo.

echo ========================================
echo DEPLOYMENT INITIATED
echo ========================================
echo.
echo Railway: Auto-deploying Python API...
echo Vercel: Auto-deploying Next.js frontend...
echo.
echo Check deployment status:
echo - Railway: https://railway.app/dashboard
echo - Vercel: https://vercel.com/dashboard
echo.
echo Expected changes:
echo [Backend]
echo - Added IPA generation to Stage 10
echo - Installed eng-to-ipa library
echo.
echo [Frontend]
echo - Enhanced IPA display (blue, mono font)
echo - Added mindmap debug logging
echo.
echo ========================================
echo NEXT STEPS
echo ========================================
echo.
echo 1. Wait 5-10 minutes for deployment
echo 2. Check Railway logs: railway logs
echo 3. Test frontend: Upload document
echo 4. Verify IPA display in vocabulary
echo 5. Check Console for mindmap debug
echo.
echo See DEPLOY_IPA_FIX.md for details
echo.
pause
