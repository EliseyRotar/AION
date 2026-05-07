@echo off
chcp 65001 >nul
title AI Hub Enterprise

echo.
echo ═══════════════════════════════════════════════════════════════════
echo    🚀 AI HUB ENTERPRISE
echo ═══════════════════════════════════════════════════════════════════
echo.

REM ── Pre-flight checks ──────────────────────────────────────────────
echo [1/3] Checking requirements...

python --version >nul 2>&1
if %errorlevel% neq 0 (
    echo    ❌ Python not found — run install.bat first
    pause & exit /b 1
)
echo    ✅ Python

if not exist "backend\venv" (
    echo    ❌ Backend venv not found — run install.bat first
    pause & exit /b 1
)
echo    ✅ Backend venv

if not exist "frontend\node_modules" (
    echo    ❌ Frontend node_modules not found — run install.bat first
    pause & exit /b 1
)
echo    ✅ Frontend deps

if not exist "backend\.env" (
    echo    ❌ backend\.env not found!
    echo    ℹ️  Copy backend\.env and set your GROQ_API_KEY
    echo    ℹ️  Get a free key at: https://console.groq.com
    pause & exit /b 1
)
echo    ✅ .env found

REM ── Check ports ────────────────────────────────────────────────────
echo.
echo [2/3] Checking ports...

netstat -ano | findstr :8000 | findstr LISTENING >nul 2>&1
if %errorlevel% equ 0 (
    echo    ⚠️  Port 8000 in use
    choice /C YN /N /M "   Kill it? (Y/N): "
    if errorlevel 2 (set SKIP_BACKEND=1) else (
        for /f "tokens=5" %%a in ('netstat -aon ^| findstr :8000 ^| findstr LISTENING') do taskkill /F /PID %%a >nul 2>&1
        echo    ✅ Port 8000 freed
        set SKIP_BACKEND=0
    )
) else (
    echo    ✅ Port 8000 free
    set SKIP_BACKEND=0
)

netstat -ano | findstr :5173 | findstr LISTENING >nul 2>&1
if %errorlevel% equ 0 (
    echo    ⚠️  Port 5173 in use
    choice /C YN /N /M "   Kill it? (Y/N): "
    if errorlevel 2 (set SKIP_FRONTEND=1) else (
        for /f "tokens=5" %%a in ('netstat -aon ^| findstr :5173 ^| findstr LISTENING') do taskkill /F /PID %%a >nul 2>&1
        echo    ✅ Port 5173 freed
        set SKIP_FRONTEND=0
    )
) else (
    echo    ✅ Port 5173 free
    set SKIP_FRONTEND=0
)

REM ── Start servers ──────────────────────────────────────────────────
echo.
echo [3/3] Starting servers...

if "%SKIP_BACKEND%"=="0" (
    echo    🐍 Starting backend on http://localhost:8000 ...
    start "AI Hub Backend" cmd /k "cd backend && venv\Scripts\activate.bat && python -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload"
    timeout /t 3 /nobreak >nul
    echo    ✅ Backend started
)

if "%SKIP_FRONTEND%"=="0" (
    echo    ⚛️  Starting frontend on http://localhost:5173 ...
    start "AI Hub Frontend" cmd /k "cd frontend && npm run dev"
    timeout /t 3 /nobreak >nul
    echo    ✅ Frontend started
)

echo.
echo ═══════════════════════════════════════════════════════════════════
echo    ✅ AI HUB IS RUNNING
echo ═══════════════════════════════════════════════════════════════════
echo.
echo    Frontend:  http://localhost:5173
echo    Backend:   http://localhost:8000
echo    API docs:  http://localhost:8000/docs
echo.
echo    Login: admin@aihub.com / Admin123!
echo.
echo    ⚠️  Don't close the backend/frontend windows!
echo ═══════════════════════════════════════════════════════════════════
echo.

timeout /t 4 /nobreak >nul
start http://localhost:5173

pause >nul
