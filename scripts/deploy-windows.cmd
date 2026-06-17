@echo off
setlocal

set "PORT=%~1"
if "%PORT%"=="" set "PORT=3001"

cd /d "%~dp0.."

echo Projeto: %CD%
echo Porta do app: %PORT%

for /f "tokens=5" %%P in ('netstat -ano ^| findstr /R /C:":%PORT% .*LISTENING"') do (
  echo Parando processo PID %%P que esta usando a porta %PORT%
  taskkill /PID %%P /F >nul 2>nul
)

echo Rodando npm ci...
call npm ci
if errorlevel 1 goto :error

echo Rodando npm run build...
call npm run build
if errorlevel 1 goto :error

echo.
echo Deploy preparado com sucesso.
echo Para subir o app novamente:
echo   set PORT=%PORT%^&^& node .next\standalone\server.js
exit /b 0

:error
echo.
echo Falha durante o deploy.
exit /b 1
