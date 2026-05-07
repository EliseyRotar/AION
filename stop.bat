@echo off
chcp 65001 >nul
title AI Hub Enterprise - Stop Script

echo.
echo ═══════════════════════════════════════════════════════════════════
echo    🛑 AI HUB ENTERPRISE - STOP SCRIPT
echo ═══════════════════════════════════════════════════════════════════
echo.

echo Stopping Backend Server (port 8000)...
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :8000 ^| findstr LISTENING') do (
    taskkill /F /PID %%a >nul 2>&1
    if %errorlevel% equ 0 (
        echo    ✅ Backend stopped
    )
)

echo Stopping Frontend Server (port 5173)...
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :5173 ^| findstr LISTENING') do (
    taskkill /F /PID %%a >nul 2>&1
    if %errorlevel% equ 0 (
        echo    ✅ Frontend stopped
    )
)

echo.
echo ═══════════════════════════════════════════════════════════════════
echo    ✅ All servers stopped
echo ═══════════════════════════════════════════════════════════════════
echo.
timeout /t 3 /nobreak >nul
