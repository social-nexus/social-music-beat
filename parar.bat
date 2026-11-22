@echo off
REM Encerra o motor de musica e o servidor da interface, liberando a memoria da placa de video.
for %%p in (8001 8002) do (
  for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":%%p" ^| findstr "LISTENING"') do taskkill /F /T /PID %%a >nul 2>&1
)
echo Social Music Beat encerrado.
timeout /t 2 >nul
