@echo off
echo ========================================
echo RESTART SERVER - Version 5.1.0
echo Enhanced Flashcards Update
echo ========================================
echo.

echo Step 1: Clearing Python cache...
del /s /q *.pyc 2>nul
for /d /r . %%d in (__pycache__) do @if exist "%%d" rd /s /q "%%d" 2>nul
echo    Done!
echo.

echo Step 2: Installing IPA library (optional)...
pip install eng-to-ipa
echo    Done!
echo.

echo Step 3: Starting server...
echo.
echo ========================================
echo Server starting...
echo ========================================
echo.

python main.py

pause
