@echo off
setlocal
pushd "%~dp0"

where node >nul 2>nul
if errorlevel 1 (
  echo [error] Node.js is not in PATH. Install Node 18+ from https://nodejs.org/ first.
  exit /b 1
)

echo [setup] Installing npm dependencies...
call npm install || goto :error

echo [setup] Dependencies installed successfully.
exit /b 0

:error
echo [error] npm install failed. Resolve the issues above and re-run installreq.bat.
exit /b 1
