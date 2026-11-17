@echo off
call "%~dp0config.bat"
if not exist "%ACESTEP_DIR%\start_api_server.bat" (
  echo Nao encontrei o ACE-Step em %ACESTEP_DIR%. Veja o config.bat.
  pause
  exit /b 1
)
REM Motor de musica (permite trocar de modelo sozinho quando precisar)
start "ACE-Step (motor de musica) - NAO FECHE" cmd /k "cd /d %ACESTEP_DIR% && set ACESTEP_PROJECT_ROOT=%ACESTEP_DIR%&& set ACESTEP_ON_DEMAND_MODEL_LOAD=true&& set CHECK_UPDATE=false&& start_api_server.bat"
REM Servidor da interface e do separador de voz
start "Social Sound Beat - NAO FECHE" cmd /k "cd /d %~dp0helper && call .venv\Scripts\activate && python server.py"
timeout /t 6 >nul
start "" msedge --app=http://localhost:8002 --window-size=1360,900
