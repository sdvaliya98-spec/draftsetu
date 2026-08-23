@echo off
title Document Generator - Frontend
echo ========================================
echo   Starting Frontend Development Server
echo ========================================
cd /d %~dp0
echo [INFO] Starting simple HTTP server on port 3000...
echo [INFO] Access the app at: http://localhost:3000
echo.
python -m http.server 3000
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Failed to start Python HTTP server. 
    echo Make sure Python is in your PATH.
    pause
)
pause
