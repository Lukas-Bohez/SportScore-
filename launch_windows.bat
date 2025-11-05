@echo off
REM TeamScore Launch Script for Windows
REM This script sets up the database, launches backend and frontend

echo 🚀 Starting TeamScore Application Setup...

REM Change to the project root directory
cd /d "%~dp0"

REM Dynamically locate MySQL (mysql.exe)
set "MYSQL_PATH="

REM 1) Respect existing MYSQL_PATH if user set it before calling this script
if defined MYSQL_PATH if exist "%MYSQL_PATH%" goto mysql_found

REM 2) Try finding mysql.exe on PATH
for /f "delims=" %%I in ('where mysql 2^>nul') do (
    set "MYSQL_PATH=%%I"
    goto mysql_found
)

REM 3) Probe common install locations (MySQL and MariaDB) under Program Files
for /f "delims=" %%I in ('dir /b /s "%ProgramFiles%\MySQL\*\bin\mysql.exe" 2^>nul') do (
    set "MYSQL_PATH=%%I"
    goto mysql_found
)
for /f "delims=" %%I in ('dir /b /s "%ProgramFiles(x86)%\MySQL\*\bin\mysql.exe" 2^>nul') do (
    set "MYSQL_PATH=%%I"
    goto mysql_found
)
for /f "delims=" %%I in ('dir /b /s "%ProgramFiles%\MariaDB\*\bin\mysql.exe" 2^>nul') do (
    set "MYSQL_PATH=%%I"
    goto mysql_found
)

REM 4) Not found – guide the user
echo ❌ MySQL (mysql.exe) not found automatically. Please install MySQL or add mysql.exe to PATH.
echo You can locate it from PowerShell with:
echo   Get-Command mysql.exe ^| Select-Object -Expand Source
echo Or search common folders:
echo   Get-ChildItem "C:\Program Files" -Recurse -Filter mysql.exe -ErrorAction SilentlyContinue ^| Select-Object -First 1 -Expand FullName
pause
exit /b 1

:mysql_found
echo ✅ MySQL found at "%MYSQL_PATH%"

REM ------------------------------------------------------------
REM Load DB settings (use backend/database/config.py if available)
REM Defaults match backend/database/config.py
set "DB_USER=root"
set "DB_PASSWORD=6669"
set "DB_HOST=127.0.0.1"
set "DB_PORT=3307"
set "DB_NAME=scoreboard"
set "DB_CHARSET=utf8mb4"
set "DB_COLLATION=utf8mb4_unicode_ci"

REM Try to import DB_CONFIG from Python and override defaults
for /f "tokens=1* delims==" %%A in ('python -c "from backend.database.config import DB_CONFIG as c; import sys; print('USER='+str(c.get('user',''))); print('PASSWORD='+str(c.get('password',''))); print('HOST='+str(c.get('host',''))); print('PORT='+str(c.get('port',''))); print('NAME='+str(c.get('database',''))); print('CHARSET='+str(c.get('charset','utf8mb4'))); print('COLLATION='+str(c.get('collation','utf8mb4_unicode_ci')))" 2^>nul') do (
    if /i "%%A"=="USER" set "DB_USER=%%B"
    if /i "%%A"=="PASSWORD" set "DB_PASSWORD=%%B"
    if /i "%%A"=="HOST" set "DB_HOST=%%B"
    if /i "%%A"=="PORT" set "DB_PORT=%%B"
    if /i "%%A"=="NAME" set "DB_NAME=%%B"
    if /i "%%A"=="CHARSET" set "DB_CHARSET=%%B"
    if /i "%%A"=="COLLATION" set "DB_COLLATION=%%B"
)

echo 🔧 Using DB config: user="%DB_USER%", host="%DB_HOST%", port=%DB_PORT%, db="%DB_NAME%"

REM Create database if not exists
echo 📦 Creating database '%DB_NAME%' if it doesn't exist...
"%MYSQL_PATH%" --user="%DB_USER%" --password=%DB_PASSWORD% --host="%DB_HOST%" --port=%DB_PORT% -e "CREATE DATABASE IF NOT EXISTS `%DB_NAME%` CHARACTER SET %DB_CHARSET% COLLATE %DB_COLLATION%;" 2>nul
if %errorlevel% neq 0 (
    echo ❌ Failed to create database with provided credentials. Verify values in backend\database\config.py or environment variables.
    pause
    exit /b 1
)

echo ✅ Database created

REM Execute database schema
echo 🏗️ Setting up database schema...
"%MYSQL_PATH%" --user="%DB_USER%" --password=%DB_PASSWORD% --host="%DB_HOST%" --port=%DB_PORT% --database="%DB_NAME%" < "backend\database_schema.sql" 2>nul
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