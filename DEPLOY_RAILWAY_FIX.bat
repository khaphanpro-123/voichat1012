@echo off
echo ========================================
echo Deploy Railway Fix: Config Conflicts
echo ========================================
echo.

echo Changes:
echo - Use nixpacks.toml instead of Procfile
echo - Remove all conflicting config files
echo - Simplified deployment configuration
echo.

echo Committing changes...
git add python-api/nixpacks.toml
git add python-api/requirements.txt
git add python-api/embedding_utils.py
git add python-api/phrase_centric_extractor.py
git add python-api/phrase_word_merger.py
git add python-api/single_word_extractor.py
git add python-api/complete_pipeline_12_stages.py
git add python-api/post-install.sh
git add python-api/.railwayignore
git add python-api/RAILWAY_DEPLOY_FIX_SUMMARY.md

echo.
echo Removing deleted files...
git rm python-api/Procfile 2>nul

git commit -m "Fix Railway: Use nixpacks.toml, remove Procfile conflict"

echo.
echo Pushing to GitHub...
git push origin main

echo.
echo ========================================
echo Deploy Complete!
echo ========================================
echo.
echo Railway will auto-deploy in ~2 minutes
echo Check: https://railway.app/project/...
echo.
pause
