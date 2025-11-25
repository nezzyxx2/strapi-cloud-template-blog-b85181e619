@echo off
setlocal enabledelayedexpansion
pushd "%~dp0"

set STACK_DIR=%CD%
set INSTALL_SCRIPT=%STACK_DIR%\installreq.bat

if not exist "%INSTALL_SCRIPT%" (
  echo [warn] installreq.bat missing. Creating placeholder command.
  echo @echo off>"%STACK_DIR%\installreq.bat"
  echo echo installreq.bat not configured.>>"%STACK_DIR%\installreq.bat"
)

if not exist node_modules (
  echo [setup] Installing npm dependencies via installreq.bat ...
  call "%INSTALL_SCRIPT%" || goto :error
)

call :launch "Admin Data API" "npm run admin-data"
call :launch "Binx AI Proxy" "npm run ai-proxy"
call :launch "Vite dev server" "npm run dev"

echo.
echo =================================================================
echo  Stack boot requested. Outputs stream below in THIS console.
echo  Press CTRL+C to stop every service together.
echo =================================================================

:hold
timeout /t 3600 >nul
goto :hold

goto :eof

:launch
set service=%~1
set command=%~2
echo [launch] !service!
start "ftr-!service!" /b cmd /c "cd /d %STACK_DIR% && %command%"
goto :eof

:error
echo.
echo [error] Failed to complete setup. Resolve the messages above and re-run.
pause
exit /b 1
