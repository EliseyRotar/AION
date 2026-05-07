@echo off
chcp 65001 >nul
title AI Hub - Install

echo.
echo ═══════════════════════════════════════════════════════════════════
echo    AI HUB ENTERPRISE - INSTALL
echo ═══════════════════════════════════════════════════════════════════
echo.

REM ── Python check ───────────────────────────────────────────────────
python --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Python not found.
    echo    Download from: https://www.python.org/downloads/
    echo    Make sure to check "Add Python to PATH"
    start https://www.python.org/downloads/
    pause & exit /b 1
)
for /f "tokens=2" %%i in ('python --version 2^>^&1') do set PY=%%i
echo ✅ Python %PY%

REM ── Backend venv ───────────────────────────────────────────────────
if not exist "backend\venv" (
    echo.
    echo Creating backend virtual environment...
    cd backend
    python -m venv venv
    if %errorlevel% neq 0 ( echo ❌ Failed to create venv & cd .. & pause & exit /b 1 )
    call venv\Scripts\activate.bat
    python -m pip install --upgrade pip -q
    echo Installing Python packages (this takes a few minutes)...
    pip install -r requirements.txt -q
    if %errorlevel% neq 0 ( echo ❌ Failed to install packages & cd .. & pause & exit /b 1 )
    cd ..
    echo ✅ Backend ready
) else (
    echo ✅ Backend venv exists — updating packages...
    cd backend
    call venv\Scripts\activate.bat
    pip install -r requirements.txt -q --upgrade
    cd ..
)

REM ── .env check ─────────────────────────────────────────────────────
if not exist "backend\.env" (
    echo.
    echo ⚠️  backend\.env not found!
    echo    A template has been created — open it and set your GROQ_API_KEY.
    echo    Get a free key at: https://console.groq.com
)

REM ── Frontend ───────────────────────────────────────────────────────
echo.
if not exist "frontend\node_modules" (
    echo Installing frontend packages...
    cd frontend
    call npm install -q
    if %errorlevel% neq 0 ( echo ❌ npm install failed & cd .. & pause & exit /b 1 )
    cd ..
    echo ✅ Frontend ready
) else (
    echo ✅ Frontend node_modules exists
)

echo.
echo ═══════════════════════════════════════════════════════════════════
echo    ✅ INSTALL COMPLETE
echo ═══════════════════════════════════════════════════════════════════
echo.
echo    Next steps:
echo    1. Open backend\.env and set GROQ_API_KEY=gsk_...
echo       (free key at https://console.groq.com)
echo    2. Run start.bat
echo.
pause
