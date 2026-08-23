@echo off
title Document Generator - Backend
echo ========================================
echo   Starting FastAPI Backend Server
echo ========================================
cd /d %~dp0backend

echo [1/3] Checking environment...
if not exist "..\venv\Scripts\python.exe" (
    echo [ERROR] Virtual environment not found at ..\venv
    echo [INFO] Creating virtual environment...
    python -m venv ..\venv
)

echo [2/3] Validating dependencies...
..\venv\Scripts\python.exe -m pip install -r requirements.txt --quiet
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Failed to install dependencies. Check your internet connection.
    pause
    exit /b
)

echo [3/3] Launching FastAPI...
echo.
echo 🚀 API will be available at: http://127.0.0.1:8000
echo 📝 Docs: http://127.0.0.1:8000/docs
echo 🏥 Health: http://127.0.0.1:8000/health
echo.
echo To stop the server, press Ctrl+C
echo.

..\venv\Scripts\python.exe -m uvicorn main:app --reload --host 0.0.0.0 --port 8000 --log-level info

if %ERRORLEVEL% NEQ 0 (
    echo.
    echo [CRITICAL] Backend crashed or failed to start.
    echo Possible causes: 
    echo   - Port 8000 is already in use
    echo   - Code error (check traceback above)
    echo   - Missing .env file
    pause
)
pause
