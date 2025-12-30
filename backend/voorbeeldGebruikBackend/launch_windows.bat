@echo off
REM TeamScore Launch Script for Windows (adjusted to current folder layout)
REM This script sets up the SQLite database, launches backend and frontend

echo 🚀 Starting TeamScore Application Setup...

REM Determine script directory and repository root (tries a couple of parent locations)
set "SCRIPT_DIR=%~dp0"
set "ROOT=%SCRIPT_DIR%"
REM Normalize ROOT by removing a trailing backslash if present
if "%ROOT:~-1%"=="\" set "ROOT=%ROOT:~0,-1%"

if exist "%ROOT%\backend\init_database.py" (
    goto :FOUND_ROOT
)
set "ROOT=%SCRIPT_DIR%..\..\"
if "%ROOT:~-1%"=="\" set "ROOT=%ROOT:~0,-1%"
if exist "%ROOT%\backend\init_database.py" (
    goto :FOUND_ROOT
)
set "ROOT=%SCRIPT_DIR%..\"
if "%ROOT:~-1%"=="\" set "ROOT=%ROOT:~0,-1%"
if exist "%ROOT%\backend\init_database.py" (
    goto :FOUND_ROOT
)
echo ⚠️ Could not locate repository root automatically; using script directory as root
:FOUND_ROOT

REM Switch to resolved root for relative operations
pushd "%ROOT%" >nul 2>&1 || cd /d "%ROOT%"

REM ------------------------------------------------------------
REM SQLite Database Setup
REM ------------------------------------------------------------
echo 📦 Checking SQLite database...

REM Check if database exists
if not exist "backend\scoreboard.db" (
    echo 🏗️ Database not found. Creating new SQLite database...
    if exist "backend\venv\Scripts\python.exe" (
        "backend\venv\Scripts\python.exe" backend\init_database.py
    ) else (
        python backend\init_database.py
    )
    if %errorlevel% neq 0 (
        echo ❌ Failed to create database
        pause
        popd
        exit /b 1
    )
    echo ✅ Database created successfully
) else (
    echo ✅ Database already exists at backend\scoreboard.db
)

echo ✅ SQLite database ready

REM Start backend in a new window
echo 🚀 Starting backend server...
REM We're already in %ROOT% due to pushd above; use relative paths to avoid quoting issues
start "TeamScore Backend" cmd /k "cd /d "backend\voorbeeldGebruikBackend" && run_server.bat"

REM Wait a moment for backend to start
ping -n 4 127.0.0.1 >nul

REM Start frontend server in a new window
echo 🌐 Starting frontend server...
REM Use relative path so cmd quoting stays simple
start "TeamScore Frontend" cmd /k "cd /d "backend\voorbeeldGebruikBackend" && serve_frontend_server.bat"

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

REM Restore original directory and keep the window open
popd >nul 2>&1
pause