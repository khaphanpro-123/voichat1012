@echo off
echo ========================================
echo Deploy Railway Fix: Add spaCy
echo ========================================
echo.

echo Changes:
echo - Add spaCy to requirements.txt (NO model download)
echo - Code will use NLTK fallback if spaCy model not found
echo - Build time: ~3 minutes (under timeout)
echo.

echo Committing changes...
git add python-api/requirements.txt
git add python-api/phrase_centric_extractor.py
git add python-api/FIX_SPACY_IMPORTS.md

git commit -m "Fix: Add spaCy with NLTK fallback"

echo.
echo Pushing to GitHub...
git push origin main

echo.
echo ========================================
echo Deploy Complete!
echo ========================================
echo.
echo Railway will auto-deploy in ~3 minutes
echo spaCy will install but model won't download
echo Code will use NLTK fallback automatically
echo.
pause
