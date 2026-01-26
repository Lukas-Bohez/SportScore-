@echo off
chcp 65001 >nul
cd /d "%~dp0"
echo Starting Frontend HTTP server in %CD%/frontend

REM Find python executable
set "PY=python"
for /f "delims=" %%p in ('where python 2^>nul') do set "PY=%%p"
echo Using Python: %PY%

set "LOGFILE=%~dp0serve_frontend.log"
echo Logging frontend output to: %LOGFILE%

REM Run frontend server and capture output
"%PY%" -u serve_frontend.py > "%LOGFILE%" 2>&1

echo.
echo Frontend process exited. See log: %LOGFILE%
echo Press any key to close this window.
pause
