@echo off
chcp 65001 >nul
cd /d "%~dp0"
echo Starting Scoreboard Backend in %CD%

REM Find python executable (prefer full path if available)
set "PY=python"
for /f "delims=" %%p in ('where python 2^>nul') do set "PY=%%p"
echo Using Python: %PY%

set "LOGFILE=%~dp0run_server.log"
echo Logging backend output to: %LOGFILE%

REM Run backend (run.py will create venv if needed) and capture output
"%PY%" -u run.py > "%LOGFILE%" 2>&1

echo.
echo Backend process exited. See log: %LOGFILE%
echo Press any key to close this window.
pause
