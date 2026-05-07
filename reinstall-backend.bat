@echo off
chcp 65001 >nul
title AI Hub - Reinstall Backend

echo.
echo This will delete and recreate the backend virtual environment.
echo.
pause

cd backend

if exist "venv" (
    echo Removing old venv...
    rmdir /s /q venv
)

echo Creating new venv...
python -m venv venv
if %errorlevel% neq 0 ( echo ❌ Failed & pause & exit /b 1 )

call venv\Scripts\activate.bat
python -m pip install --upgrade pip -q
echo Installing packages (this takes a few minutes)...
pip install -r requirements.txt
if %errorlevel% neq 0 ( echo ❌ Failed & pause & exit /b 1 )

cd ..
echo.
echo ✅ Done — run start.bat
echo.
pause
