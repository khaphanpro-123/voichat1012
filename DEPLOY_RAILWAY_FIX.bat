@echo off
echo ========================================
echo Deploy Railway Fix: Remove spaCy
echo ========================================
echo.

echo Changes:
echo - Remove spaCy completely (NO import)
echo - Use NLTK only for all NLP tasks
echo - Build time: ~2 minutes
echo - NO ModuleNotFoundError
echo.

echo Committing changes...
git add python-api/requirements.txt
git add python-api/phrase_centric_extractor.py
git add python-api/context_intelligence.py
git add python-api/single_word_extractor.py

git commit -m "Fix: Remove spaCy, use NLTK only"

echo.
echo Pushing to GitHub...
git push origin main

echo.
echo ========================================
echo Deploy Complete!
echo ========================================
echo.
echo Railway will auto-deploy in ~2 minutes
echo NO spaCy, NO ModuleNotFoundError
echo Pure NLTK implementation
echo.
pause
