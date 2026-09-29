@echo off
setlocal

set "PORT=%~1"
if "%PORT%"=="" for /f "usebackq tokens=1,* delims==" %%A in ("%~dp0..\.env.local") do (
  if /I "%%A"=="PORT" set "PORT=%%B"
)
if "%PORT%"=="" set "PORT=3001"

powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0deploy-windows.ps1" -Port %PORT%
exit /b %ERRORLEVEL%
