@echo off
REM TeamScore Launch Script for Windows
REM This script sets up the database, launches backend and frontend

echo 🚀 Starting TeamScore Application Setup...

REM Change to the project root directory
cd /d "%~dp0"

REM Find MySQL executable path
echo 🔍 Searching for MySQL executable...
for /f "delims=" %%i in ('powershell -command "try { $path = Get-ChildItem 'C:\Program Files\MySQL', 'C:\Program Files (x86)\MySQL' -Recurse -Filter mysql.exe -ErrorAction SilentlyContinue | Select-Object -First 1 -ExpandProperty FullName; if ($path) { $path } else { '' } } catch { '' }"') do set MYSQL_PATH=%%i

if "%MYSQL_PATH%"=="" (
    echo ❌ MySQL executable not found. Please ensure MySQL is installed.
    echo You can find MySQL path by running: Get-ChildItem "C:\Program Files\MySQL" -Recurse -Filter mysql.exe
    pause
    exit /b 1
)

echo ✅ MySQL found at %MYSQL_PATH%

REM Get database config from config.py
echo 📋 Reading database configuration...
for /f "tokens=1,2,3,4 delims= " %%a in ('python -c "from backend.database.config import DB_CONFIG; print(DB_CONFIG['user'], DB_CONFIG['password'], DB_CONFIG['host'], DB_CONFIG['port'])"') do (
    set DB_USER=%%a
    set DB_PASSWORD=%%b
    set DB_HOST=%%c
    set DB_PORT=%%d
)

echo Using database: user=%DB_USER%, password=%DB_PASSWORD%, host=%DB_HOST%, port=%DB_PORT%

REM Check database structure and rebuild if needed
echo 🔍 Validating database structure...

REM Check if database exists
"%MYSQL_PATH%" -u %DB_USER% -p%DB_PASSWORD% -h %DB_HOST% -P %DB_PORT% -e "SHOW DATABASES LIKE 'scoreboard';" 2>nul | findstr /C:"scoreboard" >nul

if %errorlevel% neq 0 (
    echo 📦 Database does not exist, creating...
    "%MYSQL_PATH%" -u %DB_USER% -p%DB_PASSWORD% -h %DB_HOST% -P %DB_PORT% -e "CREATE DATABASE scoreboard CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;" 2>nul
    if %errorlevel% neq 0 (
        echo ❌ Failed to create database. Please check MySQL credentials and connection.
        pause
        exit /b 1
    )
    echo 🏗️ Creating database structure...
    "%MYSQL_PATH%" -u %DB_USER% -p%DB_PASSWORD% -h %DB_HOST% -P %DB_PORT% scoreboard < "backend\database_schema.sql" 2>nul
    if %errorlevel% neq 0 (
        echo ❌ Failed to create database schema
        pause
        exit /b 1
    )
    echo ✅ Database created successfully
    goto :database_ready
)

REM Database exists, check if structure is correct
set STRUCTURE_OK=1

REM Check for new required tables
"%MYSQL_PATH%" -u %DB_USER% -p%DB_PASSWORD% -h %DB_HOST% -P %DB_PORT% -e "USE scoreboard; SHOW TABLES LIKE 'games';" 2>nul | findstr /C:"games" >nul
if %errorlevel% neq 0 set STRUCTURE_OK=0

REM Check for old tables that shouldn't exist
"%MYSQL_PATH%" -u %DB_USER% -p%DB_PASSWORD% -h %DB_HOST% -P %DB_PORT% -e "USE scoreboard; SHOW TABLES LIKE 'sessions';" 2>nul | findstr /C:"sessions" >nul
if %errorlevel% equ 0 set STRUCTURE_OK=0

"%MYSQL_PATH%" -u %DB_USER% -p%DB_PASSWORD% -h %DB_HOST% -P %DB_PORT% -e "USE scoreboard; SHOW TABLES LIKE 'session_teams';" 2>nul | findstr /C:"session_teams" >nul
if %errorlevel% equ 0 set STRUCTURE_OK=0

"%MYSQL_PATH%" -u %DB_USER% -p%DB_PASSWORD% -h %DB_HOST% -P %DB_PORT% -e "USE scoreboard; SHOW TABLES LIKE 'score_types';" 2>nul | findstr /C:"score_types" >nul
if %errorlevel% equ 0 set STRUCTURE_OK=0

REM If structure is wrong, rebuild
if %STRUCTURE_OK% equ 0 (
    echo ⚠️ Database structure is incorrect or outdated
    echo 🗑️ Dropping and rebuilding database...
    "%MYSQL_PATH%" -u %DB_USER% -p%DB_PASSWORD% -h %DB_HOST% -P %DB_PORT% -e "DROP DATABASE scoreboard;" 2>nul
    "%MYSQL_PATH%" -u %DB_USER% -p%DB_PASSWORD% -h %DB_HOST% -P %DB_PORT% -e "CREATE DATABASE scoreboard CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;" 2>nul
    if %errorlevel% neq 0 (
        echo ❌ Failed to create database. Please check MySQL credentials and connection.
        pause
        exit /b 1
    )
    echo 🏗️ Creating new database structure...
    "%MYSQL_PATH%" -u %DB_USER% -p%DB_PASSWORD% -h %DB_HOST% -P %DB_PORT% scoreboard < "backend\database_schema.sql" 2>nul
    if %errorlevel% neq 0 (
        echo ❌ Failed to create database schema
        pause
        exit /b 1
    )
    echo ✅ Database rebuilt with correct structure
) else (
    echo ✅ Database structure is correct
)

:database_ready

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
