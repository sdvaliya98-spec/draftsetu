@echo off
title Document Generator - Frontend
echo ========================================
echo   Starting Frontend Development Server
echo ========================================
cd /d %~dp0
echo [INFO] Starting Vite development server on port 5500...
echo [INFO] Access the app at: http://localhost:5500
echo.
npm run dev -- --port 5500
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Failed to start Vite frontend dev server.
    pause
)
pause
