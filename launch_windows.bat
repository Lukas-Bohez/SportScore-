@echo off
REM TeamScore Launch Script for Windows
REM This script sets up the SQLite database, launches backend and frontend

echo 🚀 Starting TeamScore Application Setup...

REM Change to the project root directory
cd /d "%~dp0"

REM ------------------------------------------------------------
REM SQLite Database Setup
REM ------------------------------------------------------------
echo 📦 Checking SQLite database...

REM Check if database exists
if not exist "backend\scoreboard.db" (
    echo 🏗️ Database not found. Creating new SQLite database...
    backend\venv\Scripts\python.exe backend\init_database.py
    if %errorlevel% neq 0 (
        echo ❌ Failed to create database
        pause
        exit /b 1
    )
    echo ✅ Database created successfully
) else (
    echo ✅ Database already exists at backend\scoreboard.db
)

echo ✅ SQLite database ready

REM Start backend in a new window
echo 🚀 Starting backend server...
start "TeamScore Backend" cmd /k "cd /d "%~dp0backend" && venv\Scripts\python.exe run.py"

REM Wait a moment for backend to start
ping -n 4 127.0.0.1 >nul

REM Start frontend server in a new window
echo 🌐 Starting frontend server...
start "TeamScore Frontend" cmd /k "cd /d "%~dp0" && backend\venv\Scripts\python.exe serve_frontend.py"

REM Wait a moment for frontend to start
ping -n 3 127.0.0.1 >nul

REM Open browser to the application
echo 🌍 Opening TeamScore in browser...
start http://localhost:3000

echo ✅ TeamScore is now running!
echo 📱 Frontend: http://localhost:3000
echo 🚀 Backend: http://localhost:8000
echo 📚 API Docs: http://localhost:8000/docs
echo.
echo 💡 Two server windows have been opened:
echo    - TeamScore Backend (port 8000)
echo    - TeamScore Frontend (port 3000)
echo.
echo ⚠️  Do NOT close the server windows! Close this window instead.
echo    To stop the servers, press Ctrl+C in each server window.

REM Keep the window open
pause