@echo off
echo ========================================
echo RESTART SERVER - Version 5.2.0
echo BM25 Filter Only Mode
echo ========================================
echo.

echo Step 1: Clearing Python cache...
del /s /q *.pyc 2>nul
for /d /r . %%d in (__pycache__) do @if exist "%%d" rd /s /q "%%d" 2>nul
echo    Done!
echo.

echo Step 2: Starting server...
echo.
echo ========================================
echo Server starting...
echo ========================================
echo.
echo CHANGES in v5.2.0:
echo - BM25 now FILTER ONLY (no re-ranking)
echo - Removes hallucinations (BM25=0)
echo - Preserves semantic scores
echo.

python main.py

pause
