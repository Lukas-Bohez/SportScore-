@echo off
REM TeamScore Launch Script for Windows
REM This script sets up the database, launches backend and frontend

echo 🚀 Starting TeamScore Application Setup...

REM Change to the project root directory
cd /d "%~dp0"

REM Set MySQL path (adjust if different)
set MYSQL_PATH="C:\Program Files\MySQL\MySQL Server 8.0\bin\mysql.exe"

REM Check if MySQL exists
if not exist %MYSQL_PATH% (
    echo ❌ MySQL not found at %MYSQL_PATH%. Please check MySQL installation path.
    echo You can find MySQL path by running: Get-ChildItem "C:\Program Files\MySQL" -Recurse -Filter mysql.exe
    pause
    exit /b 1
)

echo ✅ MySQL found at %MYSQL_PATH%

REM Create database if not exists
echo 📦 Creating database 'scoreboard' if it doesn't exist...
%MYSQL_PATH% -u root -p6669 -e "CREATE DATABASE IF NOT EXISTS scoreboard CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;" 2>nul
if %errorlevel% neq 0 (
    echo ❌ Failed to create database. Please check MySQL credentials in config.py
    pause
    exit /b 1
)

echo ✅ Database created

REM Execute database schema
echo 🏗️ Setting up database schema...
%MYSQL_PATH% -u root -p6669 scoreboard < "backend\database_schema.sql" 2>nul
if %errorlevel% neq 0 (
    echo ❌ Failed to execute database schema
    pause
    exit /b 1
)

echo ✅ Database schema applied

REM Start backend in background
echo 🚀 Starting backend server...
start /b cmd /c "cd backend && python run.py"

REM Wait a moment for backend to start
ping -n 4 127.0.0.1 >nul

REM Start frontend server
echo 🌐 Starting frontend server...
start /b cmd /c "python serve_frontend.py"

REM Wait a moment for frontend to start
ping -n 3 127.0.0.1 >nul

REM Open browser to the application
echo 🌍 Opening TeamScore in browser...
start http://localhost:3000

echo ✅ TeamScore is now running!
echo 📱 Frontend: http://localhost:3000
echo 🚀 Backend: http://localhost:8000
echo 📚 API Docs: http://localhost:8000/docs
echo Press Ctrl+C in the server windows to stop

REM Keep the window open
pause