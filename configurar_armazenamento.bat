@echo off
chcp 65001 >nul
title Social Nexus - Armazenamento de Modelos
call "%~dp0config.bat"
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0helper\storage_manager.ps1"
if errorlevel 1 (
  echo.
  echo A configuracao nao foi concluida. Os arquivos originais foram preservados.
)
echo.
pause
