@echo off
echo ========================================
echo Starting Visual Language Tutor API
echo STAGE 1-5 Complete System
echo ========================================
echo.
echo Server will start at: http://localhost:8000
echo API Documentation: http://localhost:8000/docs
echo.
echo Press CTRL+C to stop the server
echo ========================================
echo.

python -m uvicorn main:app --reload --host 0.0.0.0 --port 8000
