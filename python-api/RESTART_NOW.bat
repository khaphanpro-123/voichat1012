@echo off
echo ========================================
echo CLEAR CACHE AND RESTART
echo ========================================
echo.

echo [1/2] Clearing Python cache...
del /s /q *.pyc 2>nul
for /d /r . %%d in (__pycache__) do @if exist "%%d" rd /s /q "%%d"
echo Done!

echo.
echo [2/2] Verifying new code...
python -c "with open('phrase_centric_extractor.py', 'r', encoding='utf-8') as f: content = f.read(); assert 'Assigning cluster metadata to all phrases' in content, 'OLD CODE!'; assert 'Kept ALL' in content, 'OLD CODE!'; print('✅ NEW CODE VERIFIED')"

echo.
echo ========================================
echo CACHE CLEARED - CODE UPDATED
echo ========================================
echo.
echo NOW:
echo 1. Stop your server (Ctrl+C in the other terminal)
echo 2. Run: python main.py
echo 3. Upload document again
echo.
echo You should see:
echo   [3B.4] Assigning cluster metadata to all phrases...
echo   ✓ Kept ALL 35 phrases (no filtering)
echo.
pause
