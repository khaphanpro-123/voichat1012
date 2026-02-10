@echo off
echo ========================================
echo CLEARING PYTHON CACHE
echo ========================================

echo.
echo [1/3] Removing __pycache__ directories...
for /d /r . %%d in (__pycache__) do @if exist "%%d" rd /s /q "%%d"
echo Done!

echo.
echo [2/3] Removing .pyc files...
del /s /q *.pyc 2>nul
echo Done!

echo.
echo [3/3] Verifying new code...
python -c "import sys; sys.path.insert(0, '.'); from phrase_centric_extractor import PhraseCentricExtractor; import inspect; code = inspect.getsource(PhraseCentricExtractor._select_cluster_representatives); print('✓ Code loaded'); print('Checking for new behavior...'); assert 'Keep ALL phrases' in code or 'KEEP ALL' in code, 'OLD CODE DETECTED!'; print('✅ NEW CODE VERIFIED - Keep ALL phrases logic found')"

echo.
echo ========================================
echo CACHE CLEARED - PLEASE RESTART SERVER
echo ========================================
echo.
echo Next steps:
echo 1. Stop the server (Ctrl+C if running)
echo 2. Run: python main.py
echo 3. Upload document again
echo.
pause
