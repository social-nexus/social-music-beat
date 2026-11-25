@echo off
chcp 65001 >nul
title Social Nexus - Armazenamento de Modelos
call "%~dp0config.bat"
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0helper\storage_manager.ps1"
set "STORAGE_EXIT=%ERRORLEVEL%"
if not "%STORAGE_EXIT%"=="0" (
  echo.
  echo A configuracao nao foi concluida. Os arquivos originais foram preservados.
)
echo.
pause
exit /b %STORAGE_EXIT%
